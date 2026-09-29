import { describe, expect, it } from "vitest";
import { encodeQr } from "../src/qr";

/** The matrix as one string per row, "1" for a dark module. */
const rows = (text: string) =>
  encodeQr(text).modules.map((row) => row.map((m) => (m ? "1" : "0")).join(""));

// Version 2, error correction M, mask 5 — the code the report prints. Read
// back with an independent decoder (zxing-cpp) as "https://bone-age.app"
// before it was written down here.
const SITE = [
  "1111111011000111101111111",
  "1000001000000110001000001",
  "1011101001011010001011101",
  "1011101010001110101011101",
  "1011101011111101001011101",
  "1000001011100110101000001",
  "1111111010101010101111111",
  "0000000011110001000000000",
  "1000101110101000011111001",
  "1010100011111101100011010",
  "1101101000111001001011100",
  "0101010011011000001000110",
  "0011101111110110011101111",
  "1111110000001011100010010",
  "0000101001011111001111100",
  "0011100110110101111110110",
  "1110001100001100111111100",
  "0000000011000110100010000",
  "1111111011000000101010000",
  "1000001000101010100011110",
  "1011101010110110111111111",
  "1011101001001001011100111",
  "1011101000111110011001010",
  "1000001001010101000111110",
  "1111111010001100011000111",
];

// The 15-bit format strings of error correction level M, masks 0 to 7,
// straight out of ISO/IEC 18004 annex C.
const FORMATS = [
  "101010000010010",
  "101000100100101",
  "101111001111100",
  "101101101001011",
  "100010111111001",
  "100000011001110",
  "100111110010111",
  "100101010100000",
];

/** Reads the first copy of the format information out of a matrix. */
function formatString(matrix: string[]): string {
  const bits: string[] = [];
  for (let i = 0; i <= 5; i++) bits[i] = matrix[i][8];
  bits[6] = matrix[7][8];
  bits[7] = matrix[8][8];
  bits[8] = matrix[8][7];
  for (let i = 9; i <= 14; i++) bits[i] = matrix[8][14 - i];
  return bits.reverse().join("");
}

describe("the encoded matrix", () => {
  it("reproduces the published code for the site address", () => {
    expect(rows("https://bone-age.app")).toEqual(SITE);
  });

  it("is square, quiet-zone free and sized 4 × version + 17", () => {
    for (const [text, size] of [
      ["a", 21],
      ["https://bone-age.app", 25],
      ["https://bone-age.app/?from=report&lang=pt", 29],
    ] as const) {
      const matrix = rows(text);
      expect(matrix).toHaveLength(size);
      for (const row of matrix) expect(row).toHaveLength(size);
      // No margin inside the matrix: the finder starts at the first module.
      expect(matrix[0][0]).toBe("1");
    }
  });

  it("grows one version at a time as the payload does", () => {
    const sizes = [10, 30, 60, 90].map((length) => rows("x".repeat(length)).length);
    expect(sizes).toEqual([21, 29, 33, 41]);
    // Version 6 at level M is the ceiling this encoder claims.
    expect(() => encodeQr("x".repeat(107))).toThrow(RangeError);
    expect(rows("x".repeat(106))).toHaveLength(41);
  });

  it("places the three finders, the timing patterns and the dark module", () => {
    const matrix = rows("https://bone-age.app");
    const size = matrix.length;
    const finder = (row: number, column: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
          expect(matrix[row + r][column + c]).toBe(ring === 2 ? "0" : "1");
        }
      }
    };
    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);
    for (let i = 8; i < size - 8; i++) {
      expect(matrix[6][i]).toBe(i % 2 === 0 ? "1" : "0");
      expect(matrix[i][6]).toBe(i % 2 === 0 ? "1" : "0");
    }
    expect(matrix[size - 8][8]).toBe("1");
  });

  it("writes a format string that names one of the eight masks", () => {
    for (const text of ["a", "bone-age.app", "https://bone-age.app"]) {
      const matrix = rows(text);
      const format = formatString(matrix);
      expect(FORMATS).toContain(format);
      // The second copy has to agree with the first, bit for bit.
      const size = matrix.length;
      const bits = format.split("").reverse();
      for (let i = 0; i <= 7; i++) expect(matrix[8][size - 1 - i]).toBe(bits[i]);
      for (let i = 8; i <= 14; i++) expect(matrix[size - 15 + i][8]).toBe(bits[i]);
    }
  });

  it("encodes text as UTF-8 and stays deterministic", () => {
    expect(rows("ção")).toEqual(rows("ção"));
    // Three characters, five bytes: the accented ones take two each.
    expect(rows("ção")).not.toEqual(rows("cao"));
    expect(rows("x".repeat(5)).length).toBe(21);
  });
});
