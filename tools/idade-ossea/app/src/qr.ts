// QR Code encoder for the short URL printed on the PDF report.
//
// Pure: no DOM, no network, no dependencies, in the same spirit as the PDF
// writer next door. Deliberately narrow — byte mode, error correction level M,
// versions 1 to 6 (up to 106 bytes) — which covers any link this app prints
// and keeps the whole encoder auditable.
//
// ISO/IEC 18004. The matrix comes back without the quiet zone; whoever draws
// it adds the four modules of margin the standard asks for.

/** A square matrix of modules; `true` is a dark module. */
export interface QrCode {
  /** Side of the matrix in modules, 4 × version + 17. */
  size: number;
  /** Row-major modules, `modules[row][column]`. */
  modules: boolean[][];
}

/* ------------------------------------------------------------ code tables */

// Level M, versions 1..6. Every block of a version carries the same number of
// data codewords, which is why no second group appears here.
interface VersionSpec {
  /** Total codewords, data plus error correction. */
  total: number;
  /** Error correction codewords per block. */
  ecPerBlock: number;
  /** Number of blocks. */
  blocks: number;
}

const VERSIONS: readonly VersionSpec[] = [
  { total: 26, ecPerBlock: 10, blocks: 1 }, // 1
  { total: 44, ecPerBlock: 16, blocks: 1 }, // 2
  { total: 70, ecPerBlock: 26, blocks: 1 }, // 3
  { total: 100, ecPerBlock: 18, blocks: 2 }, // 4
  { total: 134, ecPerBlock: 24, blocks: 2 }, // 5
  { total: 172, ecPerBlock: 16, blocks: 4 }, // 6
];

// Row and column centres of the alignment patterns, per version.
const ALIGNMENT: readonly (readonly number[])[] = [
  [], // 1
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34], // 6
];

const dataCodewords = (spec: VersionSpec) =>
  spec.total - spec.ecPerBlock * spec.blocks;

/* --------------------------------------------------------- GF(256) and RS */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d; // the QR primitive polynomial
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

const mul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];

/** Generator polynomial of degree `degree`, highest power first. */
function generator(degree: number): Uint8Array {
  let poly = Uint8Array.of(1);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** The `degree` error correction codewords of one data block. */
function remainder(data: Uint8Array, degree: number): Uint8Array {
  const poly = generator(degree);
  const out = new Uint8Array(degree);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.copyWithin(0, 1);
    out[degree - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < degree; i++) out[i] ^= mul(poly[i + 1], factor);
    }
  }
  return out;
}

/* ------------------------------------------------------------- bit stream */

class Bits {
  readonly bytes: number[] = [];
  private length = 0;

  push(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) {
      const bit = (value >>> i) & 1;
      if (this.length % 8 === 0) this.bytes.push(0);
      if (bit) this.bytes[this.bytes.length - 1] |= 0x80 >>> this.length % 8;
      this.length++;
    }
  }

  get bitLength() {
    return this.length;
  }
}

/* ----------------------------------------------------------- the encoding */

function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of String(text ?? "")) {
    const code = ch.codePointAt(0) as number;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return Uint8Array.from(out);
}

/** Data plus error correction codewords, interleaved as the standard wants. */
function codewords(payload: Uint8Array, spec: VersionSpec): Uint8Array {
  const capacity = dataCodewords(spec);
  const bits = new Bits();
  bits.push(0b0100, 4); // byte mode
  bits.push(payload.length, 8); // count, 8 bits up to version 9
  for (const byte of payload) bits.push(byte, 8);
  const terminator = Math.min(4, capacity * 8 - bits.bitLength);
  bits.push(0, terminator);
  while (bits.bitLength % 8 !== 0) bits.push(0, 1);
  const data = bits.bytes.slice();
  for (let pad = 0; data.length < capacity; pad++) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  }

  const perBlock = capacity / spec.blocks;
  const blocks: Uint8Array[] = [];
  const checks: Uint8Array[] = [];
  for (let i = 0; i < spec.blocks; i++) {
    const block = Uint8Array.from(data.slice(i * perBlock, (i + 1) * perBlock));
    blocks.push(block);
    checks.push(remainder(block, spec.ecPerBlock));
  }

  const out: number[] = [];
  for (let i = 0; i < perBlock; i++) for (const block of blocks) out.push(block[i]);
  for (let i = 0; i < spec.ecPerBlock; i++) for (const ec of checks) out.push(ec[i]);
  return Uint8Array.from(out);
}

/* -------------------------------------------------------------- the matrix */

type Grid = (boolean | undefined)[][];

function square(grid: Grid, row: number, column: number, size: number) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ring = Math.max(
        Math.abs(r - (size - 1) / 2),
        Math.abs(c - (size - 1) / 2),
      );
      grid[row + r][column + c] = size === 7 ? ring !== 2 : ring !== 1;
    }
  }
}

function reserve(grid: Grid, row: number, column: number) {
  if (row >= 0 && row < grid.length && column >= 0 && column < grid.length) {
    if (grid[row][column] === undefined) grid[row][column] = false;
  }
}

function functionPatterns(version: number): Grid {
  const size = version * 4 + 17;
  const grid: Grid = Array.from({ length: size }, () =>
    new Array<boolean | undefined>(size).fill(undefined),
  );

  for (const [row, column] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ]) {
    square(grid, row, column, 7);
    // Separators: the quiet ring around each finder.
    for (let i = -1; i <= 7; i++) {
      reserve(grid, row - 1, column + i);
      reserve(grid, row + 7, column + i);
      reserve(grid, row + i, column - 1);
      reserve(grid, row + i, column + 7);
    }
  }

  const centres = ALIGNMENT[version - 1];
  for (const row of centres) {
    for (const column of centres) {
      if (grid[row][column] !== undefined) continue; // over a finder
      square(grid, row - 2, column - 2, 5);
    }
  }

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Format information, written after masking, plus the always-dark module.
  for (let i = 0; i < 9; i++) {
    reserve(grid, 8, i);
    reserve(grid, i, 8);
  }
  for (let i = 0; i < 8; i++) {
    reserve(grid, 8, size - 1 - i);
    reserve(grid, size - 1 - i, 8);
  }
  grid[size - 8][8] = true;

  return grid;
}

function placeData(grid: Grid, stream: Uint8Array) {
  const size = grid.length;
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the vertical timing pattern owns column 6
    for (let step = 0; step < size; step++) {
      const upward = ((right + 1) & 2) === 0;
      const row = upward ? size - 1 - step : step;
      for (const column of [right, right - 1]) {
        if (grid[row][column] !== undefined) continue;
        const byte = stream[bit >> 3];
        grid[row][column] =
          bit >> 3 < stream.length && (byte & (0x80 >>> bit % 8)) !== 0;
        bit++;
      }
    }
  }
}

const MASKS: readonly ((row: number, column: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Format information: 5 data bits, BCH(15,5) remainder, standard mask. */
function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask; // 00 = error correction level M
  let value = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (value & (1 << (i + 10))) value ^= 0b10100110111 << i;
  }
  return ((data << 10) | value) ^ 0b101010000010010;
}

function writeFormat(modules: boolean[][], mask: number) {
  const size = modules.length;
  const bits = formatBits(mask);
  const bit = (i: number) => ((bits >> i) & 1) === 1;
  // First copy: down the left of the top-right finder, then left along row 8.
  for (let i = 0; i <= 5; i++) modules[i][8] = bit(i);
  modules[7][8] = bit(6);
  modules[8][8] = bit(7);
  modules[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) modules[8][14 - i] = bit(i);
  // Second copy: up column 8 from the bottom, then along row 8 on the right.
  for (let i = 0; i <= 7; i++) modules[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) modules[size - 15 + i][8] = bit(i);
  modules[size - 8][8] = true; // the module that is always dark
}

/** The four penalty rules of the standard; the lowest score wins. */
function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Rule 3 looks for the finder-like sequence, either way round.
  const FINDER_LIKE = [
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  ].map((pattern) => pattern.map((bit) => bit === 1));

  const line = (get: (index: number) => boolean) => {
    let run = 1;
    for (let i = 1; i < size; i++) {
      if (get(i) === get(i - 1)) {
        run++;
      } else {
        if (run >= 5) score += run - 2; // rule 1
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
    for (let i = 0; i + 11 <= size; i++) {
      for (const pattern of FINDER_LIKE) {
        let hit = true;
        for (let k = 0; k < 11 && hit; k++) hit = get(i + k) === pattern[k];
        if (hit) score += 40;
      }
    }
  };

  for (let i = 0; i < size; i++) {
    line((index) => modules[i][index]);
    line((index) => modules[index][i]);
  }

  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) dark++;
      // Rule 2: every same-coloured 2 x 2 block.
      if (r + 1 < size && c + 1 < size) {
        const value = modules[r][c];
        if (
          value === modules[r][c + 1] &&
          value === modules[r + 1][c] &&
          value === modules[r + 1][c + 1]
        ) {
          score += 3;
        }
      }
    }
  }

  // Rule 4: how far the dark share strays from half the matrix.
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/**
 * Encodes `text` as a QR Code, choosing the smallest version that fits.
 * Throws when the text needs more than version 6 at error correction M.
 */
export function encodeQr(text: string): QrCode {
  const payload = utf8(text);
  const version = VERSIONS.findIndex(
    (spec) => payload.length + 2 <= dataCodewords(spec),
  );
  if (version < 0) throw new RangeError("qr: text too long");
  const spec = VERSIONS[version];

  const template = functionPatterns(version + 1);
  const reserved = template.map((row) => row.map((cell) => cell !== undefined));
  placeData(template, codewords(payload, spec));
  const plain = template.map((row) => row.map((cell) => cell === true));

  let best: boolean[][] | undefined;
  let bestScore = Infinity;
  for (let mask = 0; mask < MASKS.length; mask++) {
    const candidate = plain.map((row, r) =>
      row.map(
        (cell, c) => cell !== (!reserved[r][c] && MASKS[mask](r, c)),
      ),
    );
    writeFormat(candidate, mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const modules = best as boolean[][];
  return { size: modules.length, modules };
}
