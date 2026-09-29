import type { Crop, GrayImage } from "./types";
import { t } from "./i18n";

export function validateCrop(crop: Crop, width: number, height: number) {
  const { x0, y0, x1, y1 } = crop;
  return (
    [x0, y0, x1, y1].every(Number.isInteger) &&
    x0 >= 0 &&
    y0 >= 0 &&
    x1 <= width &&
    y1 <= height &&
    x1 - x0 >= 32 &&
    y1 - y0 >= 32
  );
}

export function cropPixels(
  image: Pick<GrayImage, "pixels" | "width" | "height">,
  crop: Crop,
) {
  if (!validateCrop(crop, image.width, image.height))
    throw new Error(
      t("processing.cropTooSmall"),
    );
  const width = crop.x1 - crop.x0,
    height = crop.y1 - crop.y0;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    pixels.set(
      image.pixels.subarray(
        (y + crop.y0) * image.width + crop.x0,
        (y + crop.y0) * image.width + crop.x1,
      ),
      y * width,
    );
  }
  return { pixels, width, height };
}

// np.unique + cumulative quantiles + np.interp, as in skimage.match_histograms.
export function matchHistogram(pixels: Uint8Array, referenceCounts: number[]) {
  if (
    referenceCounts.length !== 256 ||
    referenceCounts.some((n) => n < 0 || !Number.isFinite(n))
  ) {
    throw new Error(t("processing.badReference"));
  }
  const counts = new Float64Array(256);
  for (const value of pixels) counts[value]++;
  const refTotal = referenceCounts.reduce((a, b) => a + b, 0);
  if (!refTotal || !pixels.length) throw new Error(t("processing.emptyHistogram"));
  const quantiles: number[] = [],
    values: number[] = [];
  let cumulative = 0;
  referenceCounts.forEach((count, value) => {
    cumulative += count;
    if (count) {
      quantiles.push(cumulative / refTotal);
      values.push(value);
    }
  });
  const lookup = new Uint8Array(256);
  cumulative = 0;
  let j = 0;
  for (let value = 0; value < 256; value++) {
    if (!counts[value]) continue;
    cumulative += counts[value];
    const q = cumulative / pixels.length;
    while (j < quantiles.length - 1 && quantiles[j] < q) j++;
    let interpolated = values[j];
    if (j > 0 && q < quantiles[j]) {
      const t = (q - quantiles[j - 1]) / (quantiles[j] - quantiles[j - 1]);
      interpolated = values[j - 1] + t * (values[j] - values[j - 1]);
    }
    lookup[value] = Math.trunc(interpolated);
  }
  return Uint8Array.from(pixels, (value) => lookup[value]);
}

function roundEven(x: number) {
  const f = Math.floor(x);
  return x - f === 0.5 ? f + (f % 2) : Math.round(x);
}

// OpenCV-style half-pixel bilinear interpolation, preserving aspect ratio.
// Integer interpolation may differ from OpenCV SIMD by at most one gray level.
export function resizeAndPad(
  pixels: Uint8Array,
  width: number,
  height: number,
  size = 512,
) {
  const scale = size / Math.max(width, height);
  const w = roundEven(width * scale),
    h = roundEven(height * scale);
  const out = new Float32Array(size * size);
  const left = Math.floor((size - w) / 2),
    top = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    const sy = Math.max(
      0,
      Math.min(height - 1, ((y + 0.5) * height) / h - 0.5),
    );
    const y0 = Math.floor(sy),
      y1 = Math.min(height - 1, y0 + 1),
      fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = Math.max(
        0,
        Math.min(width - 1, ((x + 0.5) * width) / w - 0.5),
      );
      const x0 = Math.floor(sx),
        x1 = Math.min(width - 1, x0 + 1),
        fx = sx - x0;
      const a =
        pixels[y0 * width + x0] * (1 - fx) + pixels[y0 * width + x1] * fx;
      const b =
        pixels[y1 * width + x0] * (1 - fx) + pixels[y1 * width + x1] * fx;
      out[(y + top) * size + x + left] = Math.round(a * (1 - fy) + b * fy);
    }
  }
  return out;
}

export function rotateClockwise(image: GrayImage): GrayImage {
  const { width, height, pixels } = image;
  const rotated = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      rotated[x * height + height - y - 1] = pixels[y * width + x];
    }
  return { ...image, pixels: rotated, width: height, height: width };
}

export function chronologicalMonths(dob: string, exam: string) {
  const parse = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
      throw new Error(t("processing.badDates"));
    const date = new Date(`${s}T00:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== s
    )
      throw new Error(t("processing.badDates"));
    return date.getTime();
  };
  const days = (parse(exam) - parse(dob)) / 86400000;
  if (days < 0)
    throw new Error(t("processing.birthAfterExam"));
  if (days > 20 * 365.25)
    throw new Error(
      t("processing.tooOld"),
    );
  return days / 30.4375;
}
