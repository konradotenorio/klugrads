import { expect, it } from "vitest";
import UTIF from "utif";
import { decodeFile } from "../src/decode";

function dicom(photo = "MONOCHROME2", syntax = "1.2.840.10008.1.2.1") {
  const chunks: Uint8Array[] = [
    new Uint8Array(128),
    new TextEncoder().encode("DICM"),
  ];
  const text = (s: string) =>
    new TextEncoder().encode(s.length % 2 ? s + " " : s);
  const us = (n: number) => {
    const a = new Uint8Array(2);
    new DataView(a.buffer).setUint16(0, n, true);
    return a;
  };
  const tag = (
    group: number,
    element: number,
    vr: string,
    data: Uint8Array,
  ) => {
    const long = vr === "OW",
      h = new Uint8Array(long ? 12 : 8),
      v = new DataView(h.buffer);
    v.setUint16(0, group, true);
    v.setUint16(2, element, true);
    h.set(new TextEncoder().encode(vr), 4);
    if (long) v.setUint32(8, data.length, true);
    else v.setUint16(6, data.length, true);
    chunks.push(h, data);
  };
  tag(2, 16, "UI", text(syntax));
  tag(8, 32, "DA", text("20260101"));
  tag(16, 48, "DA", text("20200101"));
  tag(16, 64, "CS", text("M"));
  tag(40, 2, "US", us(1));
  tag(40, 4, "CS", text(photo));
  tag(40, 16, "US", us(32));
  tag(40, 17, "US", us(32));
  tag(40, 256, "US", us(16));
  tag(40, 257, "US", us(12));
  tag(40, 258, "US", us(11));
  tag(40, 259, "US", us(0));
  const pixels = new Uint8Array(32 * 32 * 2),
    view = new DataView(pixels.buffer);
  for (let i = 0; i < 1024; i++) view.setUint16(i * 2, i, true);
  tag(0x7fe0, 16, "OW", pixels);
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new File([bytes], "SYNTHETIC_NO_EXTENSION");
}

it("reads a synthetic extensionless 16-bit DICOM and extracts only useful metadata", async () => {
  const image = await decodeFile(dicom());
  expect([image.width, image.height, image.format]).toEqual([32, 32, "DICOM"]);
  expect(image.pixels[0]).toBe(0);
  expect(image.pixels[1023]).toBe(255);
  expect([image.sex, image.dob, image.examDate]).toEqual([
    "male",
    "2020-01-01",
    "2026-01-01",
  ]);
});
it("inverts MONOCHROME1 and rejects unsupported compression explicitly", async () => {
  const image = await decodeFile(dicom("MONOCHROME1"));
  expect(image.pixels[0]).toBe(255);
  expect(image.pixels[1023]).toBe(0);
  await expect(
    decodeFile(dicom("MONOCHROME2", "1.2.840.10008.1.2.4.90")),
  ).rejects.toThrow("Compressão DICOM não suportada");
});
it("decodes a single-page TIFF locally", async () => {
  const rgba = new Uint8Array(32 * 32 * 4);
  for (let i = 0; i < 1024; i++) {
    rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = i % 256;
    rgba[4 * i + 3] = 255;
  }
  const encoded = UTIF.encodeImage(rgba, 32, 32);
  const image = await decodeFile(new File([encoded], "synthetic.tif"));
  expect([image.width, image.height, image.format]).toEqual([32, 32, "TIFF"]);
  expect(image.pixels[0]).toBe(0);
  expect(image.pixels[255]).toBe(255);
});
