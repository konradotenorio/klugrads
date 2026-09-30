import dicomParser from "dicom-parser";
import UTIF from "utif";
import type { GrayImage } from "./types";
import { t } from "./i18n";

const MAX_PIXELS = 24_000_000;
function dimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > MAX_PIXELS
  ) {
    throw new Error(t("decode.badSize"));
  }
}
function isoDate(s?: string) {
  return s && /^\d{8}$/.test(s)
    ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    : undefined;
}
function fromRGBA(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    // Match OpenCV grayscale weights; composite transparent pixels onto black.
    pixels[i] = Math.round(
      ((0.299 * rgba[4 * i] +
        0.587 * rgba[4 * i + 1] +
        0.114 * rgba[4 * i + 2]) *
        rgba[4 * i + 3]) /
        255,
    );
  }
  return pixels;
}
async function decodeBitmap(
  blob: Blob,
): Promise<Pick<GrayImage, "pixels" | "width" | "height">> {
  const bitmap = await createImageBitmap(blob);
  try {
    dimensions(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    return {
      pixels: fromRGBA(
        ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
        bitmap.width,
        bitmap.height,
      ),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

async function decodeDicom(bytes: Uint8Array): Promise<GrayImage> {
  let ds: ReturnType<typeof dicomParser.parseDicom>;
  try {
    ds = dicomParser.parseDicom(bytes);
  } catch {
    throw new Error(
      t("decode.dicomUnreadable"),
    );
  }
  const width = ds.uint16("x00280011")!,
    height = ds.uint16("x00280010")!;
  dimensions(width, height);
  if (Number(ds.string("x00280008") || 1) !== 1)
    throw new Error(
      t("decode.dicomMultiframe"),
    );
  const photo = ds.string("x00280004")?.trim();
  if (!["MONOCHROME1", "MONOCHROME2"].includes(photo || ""))
    throw new Error(t("decode.dicomMonochrome"));
  if ((ds.uint16("x00280002") || 1) !== 1)
    throw new Error(t("decode.dicomChannels"));
  const ts = ds.string("x00020010")?.trim();
  const element = ds.elements.x7fe00010;
  if (!element) throw new Error(t("decode.noPixels"));
  const metadata = {
    sex: ({ M: "male", F: "female" } as const)[
      ds.string("x00100040") as "M" | "F"
    ],
    dob: isoDate(ds.string("x00100030")),
    examDate: isoDate(ds.string("x00080020")),
  };
  let values: Float64Array;
  const bits = ds.uint16("x00280100")!,
    stored = ds.uint16("x00280101") || bits;
  const signed = ds.uint16("x00280103") === 1;
  if (ts === "1.2.840.10008.1.2.4.50") {
    const jpeg = dicomParser.readEncapsulatedImageFrame(ds, element, 0);
    const decoded = await decodeBitmap(
      new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
    );
    if (decoded.width !== width || decoded.height !== height)
      throw new Error(t("decode.dicomJpegSize"));
    values = Float64Array.from(decoded.pixels);
  } else {
    if (
      ![
        "1.2.840.10008.1.2",
        "1.2.840.10008.1.2.1",
        "1.2.840.10008.1.2.2",
      ].includes(ts || "")
    ) {
      throw new Error(
        t("decode.dicomCompression", {
          transfer: ts || t("decode.unknownTransfer"),
        }),
      );
    }
    if (
      ![8, 16].includes(bits) ||
      stored < 1 ||
      stored > bits ||
      (ds.uint16("x00280102") ?? stored - 1) !== stored - 1
    ) {
      throw new Error(
        t("decode.dicomBits"),
      );
    }
    const n = width * height,
      size = bits / 8;
    if (
      element.length < n * size ||
      element.dataOffset + n * size > bytes.length
    )
      throw new Error(t("decode.truncated"));
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset + element.dataOffset,
      n * size,
    );
    const little = ts !== "1.2.840.10008.1.2.2",
      mask = (1 << stored) - 1;
    values = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v =
        (bits === 8 ? view.getUint8(i) : view.getUint16(i * 2, little)) & mask;
      if (signed && v >= 2 ** (stored - 1)) v -= 2 ** stored;
      values[i] = v;
    }
  }

  // Same order as upstream load_image_from_dicom: VOI, MONOCHROME1, min/max.
  const lut = ds.elements.x00283010?.items?.[0]?.dataSet;
  if (lut?.elements.x00283002 && lut.elements.x00283006) {
    const count = lut.uint16("x00283002", 0) || 65536;
    const first = signed
      ? lut.int16("x00283002", 1)!
      : lut.uint16("x00283002", 1)!;
    const depth = lut.uint16("x00283002", 2)!;
    if (![8, 10, 11, 12, 13, 14, 15, 16].includes(depth))
      throw new Error(t("decode.dicomLut"));
    const data = lut.elements.x00283006;
    const word = data.length >= count * 2;
    if (data.length < count * (word ? 2 : 1))
      throw new Error("VOI LUT truncada.");
    for (let i = 0; i < values.length; i++) {
      const index = Math.max(
        0,
        Math.min(count - 1, Math.trunc(values[i]) - first),
      );
      values[i] = word
        ? lut.uint16("x00283006", index)!
        : lut.byteArray[data.dataOffset + index];
    }
  } else {
    const center = Number.parseFloat(ds.string("x00281050") || "NaN");
    const window = Number.parseFloat(ds.string("x00281051") || "NaN");
    const func = ds.string("x00281056")?.trim() || "LINEAR";
    if (Number.isFinite(center) && Number.isFinite(window)) {
      if (
        !["LINEAR", "LINEAR_EXACT", "SIGMOID"].includes(func) ||
        window < (func === "LINEAR" ? 1 : Number.MIN_VALUE)
      ) {
        throw new Error(t("decode.dicomWindow"));
      }
      for (let i = 0; i < values.length; i++) {
        if (func === "SIGMOID")
          values[i] = 1 / (1 + Math.exp((-4 * (values[i] - center)) / window));
        else if (func === "LINEAR" && window === 1)
          values[i] = values[i] <= center - 0.5 ? 0 : 1;
        else {
          const c = func === "LINEAR" ? center - 0.5 : center;
          const w = func === "LINEAR" ? window - 1 : window;
          values[i] = Math.max(0, Math.min(1, (values[i] - c) / w + 0.5));
        }
      }
    }
  }
  let min = Infinity,
    max = -Infinity;
  for (const v of values) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!(max > min))
    throw new Error(t("decode.empty"));
  const pixels = new Uint8Array(values.length);
  for (let i = 0; i < pixels.length; i++) {
    const v = photo === "MONOCHROME1" ? max - values[i] : values[i] - min;
    pixels[i] = Math.trunc((v / (max - min)) * 255);
  }
  return { pixels, width, height, format: "DICOM", ...metadata };
}

export async function decodeFile(file: File): Promise<GrayImage> {
  if (file.size > 100 * 1024 * 1024)
    throw new Error(t("decode.tooLarge"));
  if (!file.size) throw new Error(t("decode.emptyFile"));
  const buffer = await file.arrayBuffer(),
    bytes = new Uint8Array(buffer);
  const isDicom =
    bytes.length > 132 &&
    String.fromCharCode(...bytes.subarray(128, 132)) === "DICM";
  if (isDicom || /\.dcm$/i.test(file.name)) return decodeDicom(bytes);
  const isTiff =
    (bytes[0] === 73 && bytes[1] === 73 && bytes[2] === 42) ||
    (bytes[0] === 77 && bytes[1] === 77 && bytes[3] === 42);
  if (isTiff) {
    const pages = UTIF.decode(buffer);
    if (!pages.length) throw new Error(t("decode.tiffEmpty"));
    if (pages.length !== 1)
      throw new Error(
        t("decode.tiffPages"),
      );
    const page = pages[0];
    dimensions((page.t256 as number[])[0], (page.t257 as number[])[0]);
    UTIF.decodeImage(buffer, page);
    const { width, height } = page;
    return {
      pixels: fromRGBA(UTIF.toRGBA8(page), width, height),
      width,
      height,
      format: "TIFF",
    };
  }
  if (
    !/^image\/(png|jpeg|webp|bmp|avif)$/.test(file.type) &&
    !/\.(png|jpe?g|webp|bmp|avif)$/i.test(file.name)
  ) {
    throw new Error(
      t("decode.unknownFormat"),
    );
  }
  try {
    return {
      ...(await decodeBitmap(file)),
      format: file.name.split(".").pop()!.toUpperCase(),
    };
  } catch {
    throw new Error(
      t("decode.failed"),
    );
  }
}
