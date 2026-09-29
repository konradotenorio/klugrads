import { describe, expect, it } from "vitest";
import {
  chronologicalMonths,
  cropPixels,
  matchHistogram,
  resizeAndPad,
  rotateClockwise,
  validateCrop,
} from "../src/processing";

describe("preprocessing invariants", () => {
  it("matches sparse quantiles with interpolation and truncation", () => {
    const counts = new Array(256).fill(0);
    counts[0] = 2;
    counts[100] = 2;
    expect([...matchHistogram(Uint8Array.of(10, 20, 30, 40), counts)]).toEqual([
      0, 0, 50, 100,
    ]);
  });
  it("preserves identical histogram and rejects empty references", () => {
    const counts = new Array(256).fill(0);
    counts[0] = 1;
    counts[127] = 1;
    counts[255] = 2;
    expect([
      ...matchHistogram(Uint8Array.of(0, 127, 255, 255), counts),
    ]).toEqual([0, 127, 255, 255]);
    expect(() =>
      matchHistogram(Uint8Array.of(0), new Array(256).fill(0)),
    ).toThrow();
  });
  it("rejects reversed, non-integer and out of range crops", () => {
    expect(validateCrop({ x0: 0, y0: 0, x1: 32, y1: 32 }, 32, 32)).toBe(true);
    for (const crop of [
      { x0: 0, y0: 0, x1: 33, y1: 32 },
      { x0: 30, y0: 0, x1: 1, y1: 32 },
      { x0: 0.1, y0: 0, x1: 32, y1: 32 },
    ]) {
      expect(validateCrop(crop, 32, 32)).toBe(false);
    }
  });
  it("crops rows, preserving original samples", () => {
    const pixels = Uint8Array.from({ length: 64 * 64 }, (_, i) => i % 251);
    const out = cropPixels(
      { pixels, width: 64, height: 64 },
      { x0: 4, y0: 8, x1: 36, y1: 40 },
    );
    expect(out.pixels.length).toBe(1024);
    expect(out.pixels[0]).toBe(pixels[8 * 64 + 4]);
    expect(out.pixels[1023]).toBe(pixels[39 * 64 + 35]);
  });
  it("preserves aspect ratio with black centered padding", () => {
    const output = resizeAndPad(new Uint8Array(32 * 64).fill(128), 32, 64);
    expect(output.length).toBe(512 * 512);
    expect(output[127]).toBe(0);
    expect(output[128]).toBe(128);
    expect(output[383]).toBe(128);
    expect(output[384]).toBe(0);
  });
  it("rotates actual pixels without mirroring anatomy", () => {
    const out = rotateClockwise({
      pixels: Uint8Array.of(1, 2, 3, 4, 5, 6),
      width: 2,
      height: 3,
      format: "PNG",
    });
    expect([...out.pixels]).toEqual([5, 3, 1, 6, 4, 2]);
    expect([out.width, out.height]).toEqual([3, 2]);
  });
  it("handles UTC dates and leap years without timezone offsets", () => {
    expect(chronologicalMonths("2020-02-29", "2021-02-28")).toBeCloseTo(
      365 / 30.4375,
    );
    expect(() => chronologicalMonths("2024-02-30", "2025-01-01")).toThrow();
    expect(() => chronologicalMonths("2026-01-01", "2025-01-01")).toThrow();
  });
});
