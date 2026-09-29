// PDF report generator for the local bone-age estimate.
//
// Pure: no DOM, no window, no network, no dependencies. It takes the analysis
// data plus every display string and returns the finished PDF bytes.
//
// The file is written by hand: base-14 Helvetica with /WinAnsiEncoding for the
// text, /DCTDecode for the radiograph (the JPEG bytes are copied verbatim, not
// re-encoded), axial shadings for the green bands, /Link annotations over the
// site address, an uncompressed content stream per page and a classic cross
// reference table whose offsets are measured on the emitted bytes.
//
// NOT ONE user-visible word lives here. Everything the reader sees arrives in
// `labels`; numbers and dates are formatted with `Intl` from `locale` and
// substituted into the `{placeholder}` templates the labels carry. The one
// drawn mark, the warning sign in the disclaimer, is geometry, not a glyph.

import { encodeQr, type QrCode } from "./qr";
import type { ProfessionalAssessment } from "./professional";
import {
  fill,
  formatInteger,
  presentReport,
  scaleOf,
} from "./report-presentation";

/* ------------------------------------------------------------------ types */

export interface ReportCrop {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The analysed radiograph, already oriented and cropped, as JPEG bytes. */
export interface ReportImage {
  /** Raw JPEG file bytes; embedded unchanged with /DCTDecode. */
  jpeg: Uint8Array;
  /** Pixel width of the JPEG. */
  width: number;
  /** Pixel height of the JPEG. */
  height: number;
}

/**
 * Every string the reader can see. Flat on purpose: each field maps to one
 * i18n key. Templates use `{placeholder}` markers, listed per field.
 */
export interface ReportLabels {
  professionalComparison?: {
    heading: string;
    ageLabel: string;
    differenceLabel: string;
    sourceLabel: string;
    methodLabel: string;
    dateLabel: string;
    notice: string;
  };
  /** Product name printed at the top left of every page. */
  productName: string;
  /** Short badge at the top right, e.g. "USO EXPERIMENTAL". */
  experimentalBadge: string;
  /** Main document title. */
  documentTitle: string;
  /** One-line description under the title. */
  documentSubtitle: string;
  /** Optional line under the subtitle. Template: {datetime}. */
  generatedOnTemplate?: string;

  /** Caption above the headline value, e.g. "Idade óssea estimada". */
  estimatedBoneAgeLabel: string;
  /** Pre-composed human age of the estimate, e.g. "11 anos e 2 meses". */
  estimatedAgeText: string;
  /** Small note under the headline value, e.g. "média das três redes". */
  estimatedBoneAgeCaption: string;
  /** Caption of the chronological-age column. */
  chronologicalAgeLabel: string;
  /** Optional pre-composed human chronological age. */
  chronologicalAgeText?: string;
  /** Caption of the difference column. */
  differenceLabel: string;
  /** Small note under the difference, e.g. "comparação descritiva". */
  differenceCaption: string;
  /** Value shown when the date of birth or chronological age is missing. */
  notInformedValue: string;
  /** Value shown when the difference cannot be computed. */
  notComputedValue: string;

  /** Heading of the exam-data table. */
  examDataHeading: string;
  /** Row label for the biological sex. */
  sexLabel: string;
  /** Already-translated sex word for this exam ("feminino" / "male"). */
  sexValue: string;
  /** Row label for the date of birth. */
  dateOfBirthLabel: string;
  /** Row label for the examination date. */
  examinationDateLabel: string;
  /** Row label for the source file name. */
  sourceFileLabel: string;
  /** Row label for the analysed image pixel size. */
  analysedImageSizeLabel: string;

  /** Heading above the radiograph. */
  radiographHeading: string;
  /** Caption printed under the radiograph. */
  radiographCaption: string;

  /** Heading of the technical block. */
  technicalHeading: string;
  /** Row label for the ensemble mean. */
  ensembleMeanLabel: string;
  /** Row label for one network output. Template: {index}. */
  networkOutputLabelTemplate: string;
  /** Row label for the elapsed time. */
  runtimeLabel: string;
  /** Row label for the crop coordinates. */
  cropLabel: string;
  /** Row label for the model identifier. */
  modelLabel: string;
  /** Row label for the pinned model revision. */
  modelRevisionLabel: string;
  /** Row label for the execution environment. */
  executionEnvironmentLabel: string;
  /** Description of the runtime, e.g. "ONNX FP32 · WebAssembly/CPU". */
  executionEnvironmentValue: string;
  /** Row label for the preprocessing chain. */
  preprocessingLabel: string;
  /** Description of the preprocessing chain. */
  preprocessingValue: string;

  /** Heading of the references block. */
  referencesHeading: string;
  /** Model, its author/publisher and the source URL. */
  referenceModelLine: string;
  /** Network architecture and parameter count. */
  referenceArchitectureLine: string;
  /** Training dataset, sample count and published error. */
  referenceDatasetLine: string;
  /** Licence of the redistributed weights and the modification notice. */
  referenceLicenseLine: string;
  /** Application code, its licence and repository. */
  referenceApplicationLine: string;

  /** Heading inside the disclaimer callout. */
  disclaimerHeading: string;
  /** Full experimental / non-diagnostic disclaimer. */
  disclaimerText: string;
  /** Privacy line printed in the page footer. */
  privacyNote: string;

  /** Site address as printed on every page, e.g. "bone-age.app". */
  siteUrl: string;
  /** Absolute address behind the printed one and inside the QR code. */
  siteLink: string;
  /** Small tracked line opening the closing invitation. */
  promoEyebrow: string;
  /** Heading of the closing invitation. */
  promoHeading: string;
  /** What the reader gets by opening the site, in a line or two. */
  promoText: string;
  /** Caption printed under the QR code. */
  promoQrCaption: string;
  /** Page footer counter. Template: {page}, {total}. */
  pageNumberTemplate: string;

  /** A month value. Template: {months}. */
  monthsValueTemplate: string;
  /** An elapsed time. Template: {seconds}. */
  secondsValueTemplate: string;
  /** A signed month difference. Template: {sign}, {months}. */
  differenceValueTemplate: string;
  /** Crop coordinates. Template: {x0}, {y0}, {x1}, {y1}. */
  cropValueTemplate: string;
  /** Pixel size of the analysed image. Template: {width}, {height}. */
  imageSizeValueTemplate: string;
}

export interface ReportInput {
  professional?: ProfessionalAssessment;
  /** Ensemble estimate in months. */
  months: number;
  /** The three individual network outputs, in months. */
  folds: number[];
  /** Elapsed seconds, including model loading. */
  seconds: number;
  /** Model identifier, e.g. "ianpan/bone-age". */
  modelId: string;
  /** Pinned model revision reported at runtime. */
  modelRevision: string;
  /** Biological sex given to the network. */
  sex: "male" | "female";
  /** Date of birth as "YYYY-MM-DD"; empty when not informed. */
  dateOfBirth: string;
  /** Examination date as "YYYY-MM-DD". */
  examinationDate: string;
  /** Chronological age in months, or undefined when no date of birth. */
  chronologicalMonths?: number;
  /** Crop applied to the oriented image. */
  crop: ReportCrop;
  /** Name of the file the operator opened. */
  fileName: string;
  /** BCP 47 locale used for number and date formatting. */
  locale: string;
  /** Optional ISO timestamp of the report generation. */
  generatedAt?: string;
  /** The analysed radiograph. */
  image: ReportImage;
  /** Every display string. */
  labels: ReportLabels;
}

/* ------------------------------------------------- WinAnsi (cp1252) codec */

const COMBINING = /[\u0300-\u036f]/g;

// The 27 cp1252 positions between 0x80 and 0x9F that are not Latin-1.
const WIN_ANSI_HIGH: Record<string, number | undefined> = {
  "€": 0x80,
  "‚": 0x82,
  ƒ: 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  ˆ: 0x88,
  "‰": 0x89,
  Š: 0x8a,
  "‹": 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  š: 0x9a,
  "›": 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

// Characters outside cp1252 worth spelling out instead of dropping to "?".
const TRANSLITERATE: Record<string, string | undefined> = {
  "\u2212": "-", // minus sign
  "\u2010": "-", // hyphen
  "\u2011": "-", // non-breaking hyphen
  "\u2012": "-", // figure dash
  "\u2015": "-", // horizontal bar
  "\u2043": "-", // hyphen bullet
  "\u2044": "/", // fraction slash
  "\u2002": " ", // en space
  "\u2003": " ", // em space
  "\u2007": " ", // figure space
  "\u2009": " ", // thin space
  "\u200a": " ", // hair space
  "\u202f": " ", // narrow no-break space
  "\u2192": "->",
  "\u2190": "<-",
  "\u2265": ">=",
  "\u2264": "<=",
  "\u2260": "!=",
};

function encodeChar(ch: string, depth: number): string {
  const code = ch.codePointAt(0);
  if (code === undefined) return "";
  if (code === 0x09 || code === 0x0a || code === 0x0d) return " ";
  if (code >= 0x20 && code <= 0x7e) return ch;
  if (code >= 0xa0 && code <= 0xff) return ch;
  const high = WIN_ANSI_HIGH[ch];
  if (high !== undefined) return String.fromCharCode(high);
  if (depth < 3) {
    const spelled = TRANSLITERATE[ch];
    if (spelled !== undefined && spelled !== ch) {
      return encodeWinAnsi(spelled, depth + 1);
    }
    const stripped = ch.normalize("NFD").replace(COMBINING, "");
    if (stripped.length > 0 && stripped !== ch) {
      return encodeWinAnsi(stripped, depth + 1);
    }
  }
  return "?";
}

/**
 * Encode text to cp1252 / WinAnsiEncoding, returned as a "byte string" whose
 * every char code is the byte value. Characters outside cp1252 degrade to
 * their unaccented base letter, to a spelled-out equivalent, or to "?" — they
 * never emit a byte the font cannot show.
 */
export function encodeWinAnsi(text: string, depth = 0): string {
  let out = "";
  for (const ch of String(text ?? "")) out += encodeChar(ch, depth);
  return out;
}

/* --------------------------------------------------- Helvetica AFM widths */

// Glyph advance widths in 1/1000 em for WinAnsiEncoding codes 32..255.
// Undefined WinAnsi codes (127, 129, 141, 143, 144, 157) carry 0; the encoder
// above never emits them.
const HELVETICA: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584, 0, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000,
  667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000,
  500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737,
  370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333,
  333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722,
  667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778,
  584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556,
  889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556,
  556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];

const HELVETICA_BOLD: readonly number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584, 0, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000,
  667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000,
  556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737,
  370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333,
  333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722,
  667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778,
  584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556,
  889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611,
  611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];

/**
 * Advance width, in points, of an already WinAnsi-encoded byte string.
 * `tracking` is the extra advance the text operator adds after every glyph,
 * counted between the glyphs only, the way the drawn ink measures.
 */
function widthOfEncoded(
  bytes: string,
  bold: boolean,
  size: number,
  tracking = 0,
): number {
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let units = 0;
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes.charCodeAt(i);
    units += code >= 32 && code <= 255 ? table[code - 32] : 0;
  }
  return (units * size) / 1000 + tracking * Math.max(bytes.length - 1, 0);
}

/** Advance width, in points, of `text` set in Helvetica at `size`. */
export function measureText(
  text: string,
  bold: boolean,
  size: number,
  tracking = 0,
): number {
  return widthOfEncoded(encodeWinAnsi(text), bold, size, tracking);
}

function breakWord(
  word: string,
  bold: boolean,
  size: number,
  max: number,
  tracking: number,
) {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < word.length; i++) {
    const ch = word.charAt(i);
    if (
      current !== "" &&
      widthOfEncoded(current + ch, bold, size, tracking) > max
    ) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current !== "") parts.push(current);
  return parts.length > 0 ? parts : [""];
}

function wrapEncoded(
  bytes: string,
  bold: boolean,
  size: number,
  max: number,
  tracking: number,
): string[] {
  const words = bytes.split(" ").filter((word) => word.length > 0);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  let index = 0;
  while (index < words.length) {
    const word = words[index];
    if (current === "") {
      if (widthOfEncoded(word, bold, size, tracking) <= max) {
        current = word;
      } else {
        const parts = breakWord(word, bold, size, max, tracking);
        for (let i = 0; i < parts.length - 1; i++) lines.push(parts[i]);
        current = parts[parts.length - 1];
      }
      index++;
    } else if (
      widthOfEncoded(`${current} ${word}`, bold, size, tracking) <= max
    ) {
      current = `${current} ${word}`;
      index++;
    } else {
      lines.push(current);
      current = "";
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/**
 * Word-wrap `text` to `max` points using the real Helvetica advance widths.
 * Returns WinAnsi-encoded byte strings, one per rendered line. Hard newlines
 * in the source start a new line; words longer than the column are split.
 */
export function wrapText(
  text: string,
  bold: boolean,
  size: number,
  max: number,
  tracking = 0,
): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text ?? "").split(/\r\n|\r|\n/)) {
    const encoded = encodeWinAnsi(paragraph).trim();
    if (encoded === "") {
      lines.push("");
      continue;
    }
    for (const line of wrapEncoded(
      encoded,
      bold,
      size,
      Math.max(max, 1),
      tracking,
    )) {
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines : [""];
}

/* ------------------------------------------------------ formatting helpers */

function formatIsoDateTime(iso: string, locale: string): string {
  const text = String(iso ?? "").trim();
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return text;
  }
}

/* ------------------------------------------------------------ page canvas */

const PAGE_WIDTH = 595.276;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const COLUMN = PAGE_WIDTH - MARGIN_X * 2;
const RIGHT_EDGE = MARGIN_X + COLUMN;
// The masthead: tall on the cover, slim on every page after it.
const COVER_BAND = 132;
const BAND = 42;
const FOOTER_RULE = 62;
const FOOTER_BASELINE = FOOTER_RULE - 12;
const CONTENT_BOTTOM = FOOTER_RULE + 22;
const ASCENT = 0.78;
// A circular arc of 90 degrees as a cubic Bézier.
const KAPPA = 0.5523;

type Rgb = readonly [number, number, number];

// The page palette, an extension of tokens.css into the darker greens the
// printed page can afford.
const INK: Rgb = [0.153, 0.212, 0.173]; // --ink    #27362c
const GREEN: Rgb = [0.157, 0.333, 0.278]; // --green  #285547
const DEEP: Rgb = [0.063, 0.184, 0.145]; // masthead #102f25
const MID: Rgb = [0.184, 0.404, 0.333]; // masthead #2f6755
const MINT: Rgb = [0.635, 0.784, 0.722]; // on green #a2c8b8
const PALE: Rgb = [0.804, 0.878, 0.843]; // on green #cde0d7
const MUTED: Rgb = [0.467, 0.506, 0.443]; // --muted  #778171
const RULE: Rgb = [0.875, 0.894, 0.851]; // --line   #dfe4d9
const SOFT: Rgb = [0.945, 0.957, 0.933]; // card fill #f1f4ee
const WHITE: Rgb = [1, 1, 1];
const CANVAS: Rgb = [0.075, 0.11, 0.098]; // plate     #131c19
const WARN_FILL: Rgb = [0.957, 0.941, 0.89]; // badge bg     #f4f0e3
const WARN_LINE: Rgb = [0.863, 0.843, 0.776]; // badge border #dcd7c6
const WARN_INK: Rgb = [0.514, 0.447, 0.29]; // badge ink    #83724a

/** Advance width of an encoded string in a given style. */
function styleWidth(bytes: string, style: Style): number {
  return widthOfEncoded(bytes, style.bold, style.size, style.tracking ?? 0);
}

interface Style {
  bold: boolean;
  size: number;
  color: Rgb;
  leading: number;
  /** Extra advance after every glyph, in points. */
  tracking?: number;
}

/** A clickable rectangle, resolved into a /Link annotation at the end. */
interface Link {
  page: number;
  rect: readonly [number, number, number, number];
  uri: string;
}

interface Doc {
  pages: string[][];
  ops: string[];
  y: number;
  links: Link[];
  labels: ReportLabels;
  /** Pre-formatted "generated on" line, empty when there is none. */
  generated: string;
  /** The site QR, encoded once and painted on the closing card. */
  qr?: QrCode;
}

/** PDF real number: fixed notation, at most three decimals, no "-0". */
function num(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 1000) / 1000;
  const text = (rounded === 0 ? 0 : rounded).toFixed(3);
  const trimmed = text.replace(/\.?0+$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

function color(rgb: Rgb): string {
  return `${num(rgb[0])} ${num(rgb[1])} ${num(rgb[2])}`;
}

function escapeString(bytes: string): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes.charAt(i);
    if (ch === "\\" || ch === "(" || ch === ")") out += "\\";
    out += ch;
  }
  return out;
}

/* ------------------------------------------------------------------- text */

function textOp(
  bytes: string,
  x: number,
  baseline: number,
  style: Style,
): string {
  const tracking = style.tracking ?? 0;
  return [
    "BT",
    `/${style.bold ? "F2" : "F1"} ${num(style.size)} Tf`,
    `${num(tracking)} Tc`,
    `${color(style.color)} rg`,
    `1 0 0 1 ${num(x)} ${num(baseline)} Tm`,
    `(${escapeString(bytes)}) Tj`,
    "ET",
  ].join(" ");
}

function drawEncoded(
  doc: Doc,
  bytes: string,
  x: number,
  baseline: number,
  style: Style,
) {
  if (bytes === "") return;
  doc.ops.push(textOp(bytes, x, baseline, style));
}

function drawLeft(
  doc: Doc,
  text: string,
  x: number,
  baseline: number,
  style: Style,
) {
  drawEncoded(doc, encodeWinAnsi(text), x, baseline, style);
}

function drawRight(
  doc: Doc,
  text: string,
  right: number,
  baseline: number,
  style: Style,
) {
  const bytes = encodeWinAnsi(text);
  drawEncoded(doc, bytes, right - styleWidth(bytes, style), baseline, style);
}

function drawCentre(
  doc: Doc,
  text: string,
  centre: number,
  baseline: number,
  style: Style,
) {
  const bytes = encodeWinAnsi(text);
  drawEncoded(
    doc,
    bytes,
    centre - styleWidth(bytes, style) / 2,
    baseline,
    style,
  );
}

/* ----------------------------------------------------------------- shapes */

function hairline(doc: Doc, x: number, y: number, width: number, rgb = RULE) {
  doc.ops.push(
    `${color(rgb)} RG 0.6 w ${num(x)} ${num(y)} m ${num(x + width)} ${num(y)} l S`,
  );
}

function vertical(
  doc: Doc,
  x: number,
  top: number,
  height: number,
  rgb = RULE,
) {
  doc.ops.push(
    `${color(rgb)} RG 0.6 w ${num(x)} ${num(top)} m ${num(x)} ${num(top - height)} l S`,
  );
}

/** Path of a rectangle whose corners are rounded by `radius`. */
function roundedPath(
  x: number,
  bottom: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return `${num(x)} ${num(bottom)} ${num(width)} ${num(height)} re`;
  }
  const k = r * KAPPA;
  const right = x + width;
  const top = bottom + height;
  return [
    `${num(x + r)} ${num(bottom)} m`,
    `${num(right - r)} ${num(bottom)} l`,
    `${num(right - r + k)} ${num(bottom)} ${num(right)} ${num(bottom + r - k)} ${num(right)} ${num(bottom + r)} c`,
    `${num(right)} ${num(top - r)} l`,
    `${num(right)} ${num(top - r + k)} ${num(right - r + k)} ${num(top)} ${num(right - r)} ${num(top)} c`,
    `${num(x + r)} ${num(top)} l`,
    `${num(x + r - k)} ${num(top)} ${num(x)} ${num(top - r + k)} ${num(x)} ${num(top - r)} c`,
    `${num(x)} ${num(bottom + r)} l`,
    `${num(x)} ${num(bottom + r - k)} ${num(x + r - k)} ${num(bottom)} ${num(x + r)} ${num(bottom)} c`,
    "h",
  ].join(" ");
}

function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA;
  return [
    `${num(cx + r)} ${num(cy)} m`,
    `${num(cx + r)} ${num(cy + k)} ${num(cx + k)} ${num(cy + r)} ${num(cx)} ${num(cy + r)} c`,
    `${num(cx - k)} ${num(cy + r)} ${num(cx - r)} ${num(cy + k)} ${num(cx - r)} ${num(cy)} c`,
    `${num(cx - r)} ${num(cy - k)} ${num(cx - k)} ${num(cy - r)} ${num(cx)} ${num(cy - r)} c`,
    `${num(cx + k)} ${num(cy - r)} ${num(cx + r)} ${num(cy - k)} ${num(cx + r)} ${num(cy)} c`,
    "h",
  ].join(" ");
}

function fillPath(doc: Doc, path: string, rgb: Rgb) {
  doc.ops.push(`${color(rgb)} rg ${path} f`);
}

function strokePath(doc: Doc, path: string, rgb: Rgb, width = 0.6) {
  doc.ops.push(`${color(rgb)} RG ${num(width)} w ${path} S`);
}

function card(
  doc: Doc,
  x: number,
  bottom: number,
  width: number,
  height: number,
  radius: number,
  fill: Rgb,
  border?: Rgb,
) {
  const path = roundedPath(x, bottom, width, height, radius);
  fillPath(doc, path, fill);
  if (border) strokePath(doc, path, border);
}

/** Paints one of the document shadings through a path used as a clip. */
function gradient(
  doc: Doc,
  name: string,
  path: string,
  x: number,
  bottom: number,
  width: number,
  height: number,
) {
  doc.ops.push(
    `q ${path} W n ${num(width)} 0 0 ${num(height)} ${num(x)} ${num(bottom)} cm /${name} sh Q`,
  );
}

function link(
  doc: Doc,
  uri: string,
  x: number,
  bottom: number,
  width: number,
  height: number,
) {
  if (!uri) return;
  doc.links.push({
    page: doc.pages.length - 1,
    rect: [x, bottom, x + width, bottom + height],
    uri,
  });
}

/* --------------------------------------------------------- text stacking */

interface Block {
  text: string;
  style: Style;
  gapBefore: number;
}

interface PlacedLine {
  bytes: string;
  style: Style;
  top: number;
}

interface Stack {
  lines: PlacedLine[];
  height: number;
}

function layoutStack(blocks: Block[], width: number): Stack {
  const lines: PlacedLine[] = [];
  let height = 0;
  for (const block of blocks) {
    if (!block.text) continue;
    height += block.gapBefore;
    for (const bytes of wrapText(
      block.text,
      block.style.bold,
      block.style.size,
      width,
      block.style.tracking ?? 0,
    )) {
      lines.push({ bytes, style: block.style, top: height });
      height += block.style.leading;
    }
  }
  return { lines, height };
}

function paintStack(doc: Doc, stack: Stack, x: number, top: number) {
  for (const line of stack.lines) {
    drawEncoded(
      doc,
      line.bytes,
      x,
      top - line.top - line.style.size * ASCENT,
      line.style,
    );
  }
}

/** Draws a wrapped paragraph at the flow position, breaking pages as needed. */
function flowText(
  doc: Doc,
  text: string,
  style: Style,
  x: number,
  width: number,
  gapBefore = 0,
) {
  if (!text) return;
  doc.y -= gapBefore;
  for (const bytes of wrapText(
    text,
    style.bold,
    style.size,
    width,
    style.tracking ?? 0,
  )) {
    ensure(doc, style.leading);
    drawEncoded(doc, bytes, x, doc.y - style.size * ASCENT, style);
    doc.y -= style.leading;
  }
}

/* ------------------------------------------------------------- furniture */

/** Product name and site, on the green band that opens every page. */
function masthead(doc: Doc) {
  const cover = doc.pages.length === 1;
  const height = cover ? COVER_BAND : BAND;
  const bottom = PAGE_HEIGHT - height;
  const labels = doc.labels;
  gradient(
    doc,
    "Sh0",
    `0 ${num(bottom)} ${num(PAGE_WIDTH)} ${num(height)} re`,
    0,
    bottom,
    PAGE_WIDTH,
    height,
  );

  const eyebrow = PAGE_HEIGHT - (cover ? 34 : 26);
  drawLeft(doc, labels.productName, MARGIN_X, eyebrow, {
    bold: true,
    size: cover ? 12.5 : 10.5,
    color: WHITE,
    leading: 14,
    tracking: 0.3,
  });
  const site: Style = {
    bold: false,
    size: cover ? 9 : 8,
    color: MINT,
    leading: 12,
  };
  const siteWidth = styleWidth(encodeWinAnsi(labels.siteUrl), site);
  drawRight(doc, labels.siteUrl, RIGHT_EDGE, eyebrow, site);
  link(
    doc,
    labels.siteLink,
    RIGHT_EDGE - siteWidth,
    eyebrow - 4,
    siteWidth,
    15,
  );

  if (!cover) {
    doc.y = bottom - 26;
    return;
  }

  hairline(doc, MARGIN_X, PAGE_HEIGHT - 48, COLUMN, [0.239, 0.443, 0.373]);

  // The badge sits on its own pill, right-aligned with the title.
  const badge: Style = {
    bold: true,
    size: 6.8,
    color: MINT,
    leading: 9,
    tracking: 0.9,
  };
  const badgeBytes = encodeWinAnsi(labels.experimentalBadge);
  const badgeWidth = styleWidth(badgeBytes, badge);
  const pillWidth = badgeWidth + 18;
  strokePath(
    doc,
    roundedPath(RIGHT_EDGE - pillWidth, PAGE_HEIGHT - 82, pillWidth, 16, 8),
    [0.294, 0.51, 0.435],
    0.8,
  );
  drawEncoded(
    doc,
    badgeBytes,
    RIGHT_EDGE - pillWidth + 9,
    PAGE_HEIGHT - 77.5,
    badge,
  );
  if (doc.generated) {
    drawRight(doc, doc.generated, RIGHT_EDGE, PAGE_HEIGHT - 98, {
      bold: false,
      size: 7.5,
      color: PALE,
      leading: 10,
    });
  }

  const titleWidth = COLUMN - pillWidth - 24;
  const title = layoutStack(
    [
      {
        text: labels.documentTitle,
        style: { bold: true, size: 20, color: WHITE, leading: 23 },
        gapBefore: 0,
      },
      {
        text: labels.documentSubtitle,
        style: { bold: false, size: 8.6, color: MINT, leading: 12 },
        gapBefore: 6,
      },
    ],
    titleWidth,
  );
  paintStack(doc, title, MARGIN_X, PAGE_HEIGHT - 62);
  doc.y = bottom - 28;
}

function beginPage(doc: Doc) {
  doc.ops = [];
  doc.pages.push(doc.ops);
  masthead(doc);
}

function ensure(doc: Doc, height: number) {
  if (doc.y - height < CONTENT_BOTTOM) beginPage(doc);
}

/** Small tracked heading over a hairline the brand colour picks up. */
function sectionHeading(doc: Doc, text: string) {
  ensure(doc, 46);
  drawLeft(doc, text, MARGIN_X, doc.y - 9 * ASCENT, {
    bold: true,
    size: 9,
    color: INK,
    leading: 12,
    tracking: 0.5,
  });
  doc.y -= 15;
  hairline(doc, MARGIN_X, doc.y, COLUMN);
  doc.ops.push(
    `${color(GREEN)} RG 1.4 w ${num(MARGIN_X)} ${num(doc.y)} m ${num(MARGIN_X + 34)} ${num(doc.y)} l S`,
  );
  doc.y -= 14;
}

/* ------------------------------------------------------------ small parts */

interface Field {
  label: string;
  value: string;
}

const CHIP_LABEL: Style = {
  bold: false,
  size: 6.8,
  color: MUTED,
  leading: 9.5,
  tracking: 0.4,
};
const CHIP_VALUE: Style = { bold: false, size: 8.6, color: INK, leading: 11 };

/**
 * A row of soft chips, each a caption over its value. `spans` says how many
 * of the row's `columns` each chip covers, so consecutive rows line up on the
 * same grid however many chips they carry.
 */
function chipRow(doc: Doc, fields: Field[], spans: number[], columns: number) {
  const gap = 8;
  const unit = (COLUMN - gap * (columns - 1)) / columns;
  const widths = spans.map((span) => unit * span + gap * (span - 1));
  const stacks = fields.map((field, i) =>
    layoutStack(
      [
        { text: field.label, style: CHIP_LABEL, gapBefore: 0 },
        { text: field.value, style: CHIP_VALUE, gapBefore: 3 },
      ],
      widths[i] - 22,
    ),
  );
  const height =
    stacks.reduce((tallest, stack) => Math.max(tallest, stack.height), 0) + 20;
  ensure(doc, height);
  let x = MARGIN_X;
  for (let i = 0; i < fields.length; i++) {
    card(doc, x, doc.y - height, widths[i], height, 6, SOFT);
    paintStack(doc, stacks[i], x + 11, doc.y - 11);
    x += widths[i] + gap;
  }
  doc.y -= height;
}

/** Two columns of quiet key/value pairs under a shared hairline grid. */
function fieldGrid(doc: Doc, fields: Field[], columns: number) {
  const gap = 18;
  const width = (COLUMN - gap * (columns - 1)) / columns;
  const label: Style = { ...CHIP_LABEL, size: 7 };
  const value: Style = { bold: false, size: 8.8, color: INK, leading: 11.5 };
  for (let i = 0; i < fields.length; i += columns) {
    const row = fields.slice(i, i + columns);
    const stacks = row.map((field) =>
      layoutStack(
        [
          { text: field.label, style: label, gapBefore: 0 },
          { text: field.value, style: value, gapBefore: 2 },
        ],
        width,
      ),
    );
    const height =
      stacks.reduce((tallest, stack) => Math.max(tallest, stack.height), 0) +
      15;
    ensure(doc, height);
    hairline(doc, MARGIN_X, doc.y, COLUMN);
    for (let column = 0; column < stacks.length; column++) {
      paintStack(
        doc,
        stacks[column],
        MARGIN_X + column * (width + gap),
        doc.y - 9,
      );
    }
    doc.y -= height;
  }
}

/* ---------------------------------------------------------------- charts */

interface Marker {
  value: number;
  label: string;
  /** Above the track for the estimate, below it for the reference. */
  above: boolean;
  color: Rgb;
}

/**
 * The comparison track: one rounded rail, the stretch between the two ages
 * picked out, and a labelled marker for each of them.
 */
function comparisonScale(
  doc: Doc,
  x: number,
  top: number,
  width: number,
  markers: Marker[],
  endLabel: (value: number) => string,
) {
  const scale = scaleOf(
    markers.map((marker) => marker.value),
    x,
    width,
  );
  const rail = top - 16;
  fillPath(
    doc,
    roundedPath(x, rail - 3.5, width, 7, 3.5),
    [0.898, 0.918, 0.878],
  );
  if (markers.length > 1) {
    // The stretch between the two ages, which is what the reader is after.
    const from = Math.min(...markers.map((marker) => scale.at(marker.value)));
    const to = Math.max(...markers.map((marker) => scale.at(marker.value)));
    fillPath(
      doc,
      roundedPath(from, rail - 3.5, to - from, 7, 3.5),
      [0.706, 0.82, 0.769],
    );
  }

  const caption: Style = { bold: false, size: 6.6, color: MUTED, leading: 9 };
  for (const marker of markers) {
    const at = scale.at(marker.value);
    fillPath(doc, circlePath(at, rail, marker.above ? 5.5 : 4), marker.color);
    if (marker.above) fillPath(doc, circlePath(at, rail, 2), WHITE);
    const bytes = encodeWinAnsi(marker.label);
    const style: Style = marker.above
      ? { ...caption, bold: true, color: GREEN }
      : caption;
    const half = styleWidth(bytes, style) / 2;
    const centre = Math.min(Math.max(at, x + half), x + width - half);
    drawEncoded(
      doc,
      bytes,
      centre - half,
      marker.above ? rail + 11 : rail - 15,
      style,
    );
  }

  const ends: Style = { bold: false, size: 6.2, color: MUTED, leading: 8 };
  drawLeft(doc, endLabel(scale.min), x, rail - 15, ends);
  drawRight(doc, endLabel(scale.max), x + width, rail - 15, ends);
  return 42;
}

/**
 * One lane per network: the name, a dot on the shared scale, the exact value.
 * Reads as agreement at a glance, which fourteen identical rows never did.
 */
function foldChart(
  doc: Doc,
  names: string[],
  values: number[],
  mean: number,
  meanLabel: string,
  meanValue: string,
  format: (value: number) => string,
) {
  const nameWidth = 52;
  const valueWidth = 78;
  const trackX = MARGIN_X + nameWidth;
  const trackWidth = COLUMN - nameWidth - valueWidth;
  const lane = 15;
  const height = lane * values.length + 38;
  ensure(doc, height);
  const scale = scaleOf([...values, mean], trackX, trackWidth);

  const top = doc.y - 24;
  const meanAt = scale.at(mean);
  doc.ops.push(
    `${color(GREEN)} RG 0.8 w [1.6 1.6] 0 d ${num(meanAt)} ${num(top + 6)} m ` +
      `${num(meanAt)} ${num(top - lane * values.length + 4)} l S [] 0 d`,
  );
  drawCentre(doc, meanValue, meanAt, top + 9, {
    bold: true,
    size: 7.6,
    color: GREEN,
    leading: 10,
  });
  drawCentre(doc, meanLabel, meanAt, top + 19, {
    bold: false,
    size: 6.4,
    color: MUTED,
    leading: 9,
    tracking: 0.3,
  });

  for (let i = 0; i < values.length; i++) {
    const y = top - lane * i - 6;
    hairline(doc, trackX, y, trackWidth, [0.929, 0.941, 0.914]);
    drawLeft(doc, names[i], MARGIN_X, y - 2.4, {
      bold: false,
      size: 7.4,
      color: MUTED,
      leading: 10,
    });
    fillPath(doc, circlePath(scale.at(values[i]), y, 3.4), GREEN);
    drawRight(doc, format(values[i]), RIGHT_EDGE, y - 2.6, {
      bold: false,
      size: 7.8,
      color: INK,
      leading: 10,
    });
  }
  doc.y -= height;
}

/* -------------------------------------------------------------- QR blocks */

/** Paints the matrix as one path, merging each row's runs of dark modules. */
function drawQr(
  doc: Doc,
  code: QrCode,
  x: number,
  bottom: number,
  size: number,
  rgb: Rgb,
) {
  const unit = size / code.size;
  const parts: string[] = [];
  for (let row = 0; row < code.size; row++) {
    let start = -1;
    for (let column = 0; column <= code.size; column++) {
      const dark = column < code.size && code.modules[row][column];
      if (dark && start < 0) start = column;
      if (!dark && start >= 0) {
        // A hair of bleed keeps viewers from drawing seams between the runs.
        parts.push(
          `${num(x + start * unit)} ${num(bottom + size - (row + 1) * unit)} ` +
            `${num((column - start) * unit + 0.04)} ${num(unit + 0.04)} re`,
        );
        start = -1;
      }
    }
  }
  doc.ops.push(`${color(rgb)} rg ${parts.join(" ")} f`);
}

/* ---------------------------------------------------------- JPEG sniffing */

/** Number of components declared by the JPEG SOF marker, 0 when unknown. */
function jpegComponents(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 0;
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    let marker = bytes[i + 1];
    while (marker === 0xff && i + 2 < bytes.length) {
      i++;
      marker = bytes[i + 1];
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    if (i + 3 >= bytes.length) break;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) return 0;
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) return i + 9 < bytes.length ? bytes[i + 9] : 0;
    if (marker === 0xda) return 0;
    i += 2 + length;
  }
  return 0;
}

function colorSpaceOf(components: number): string {
  if (components === 1) return "/DeviceGray";
  if (components === 4) return "/DeviceCMYK";
  return "/DeviceRGB";
}

/* --------------------------------------------------------- byte assembly */

function latin1Bytes(text: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

interface PdfObject {
  dict: string;
  stream?: Uint8Array;
}

function serialize(objects: PdfObject[]): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushText = (text: string) => push(latin1Bytes(text));

  pushText("%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n");

  const offsets: number[] = new Array(objects.length + 1).fill(0);
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    offsets[i + 1] = length;
    pushText(`${i + 1} 0 obj\n`);
    pushText(object.dict);
    if (object.stream) {
      pushText("\nstream\n");
      push(object.stream);
      pushText("\nendstream");
    }
    pushText("\nendobj\n");
  }

  const xrefOffset = length;
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f\r\n`;
  for (let i = 1; i <= objects.length; i++) {
    table += `${String(offsets[i]).padStart(10, "0")} 00000 n\r\n`;
  }
  table += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\n`;
  table += `startxref\n${xrefOffset}\n%%EOF`;
  pushText(table);

  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/* ------------------------------------------------------------- the report */

const CATALOG = 1;
const PAGES = 2;
const FONT_REGULAR = 3;
const FONT_BOLD = 4;
const INFO = 5;
const SHADE_BAND = 6;
const SHADE_CARD = 7;
const IMAGE = 8;

function shading(from: Rgb, to: Rgb, coords: string): string {
  return (
    "<< /ShadingType 2 /ColorSpace /DeviceRGB" +
    ` /Coords [${coords}]` +
    " /Function << /FunctionType 2 /Domain [0 1]" +
    ` /C0 [${color(from)}] /C1 [${color(to)}] /N 1 >>` +
    " /Extend [true true] >>"
  );
}

/** Builds the two-page PDF report and returns its bytes. */
// Uint8Array<ArrayBuffer>, not the ArrayBufferLike default: the caller hands
// these bytes straight to Blob, which does not accept a SharedArrayBuffer view.
export function buildReportPdf(input: ReportInput): Uint8Array<ArrayBuffer> {
  const labels = input.labels;
  const locale = input.locale || "en-US";
  const presentation = presentReport(input);
  const { monthsValue, chronological } = presentation;

  const jpeg = input.image.jpeg;
  const imageWidth = input.image.width;
  const imageHeight = input.image.height;
  const hasImage =
    jpeg instanceof Uint8Array &&
    jpeg.length > 0 &&
    Number.isFinite(imageWidth) &&
    Number.isFinite(imageHeight) &&
    imageWidth > 0 &&
    imageHeight > 0;

  let qr: QrCode | undefined;
  try {
    // The closing card is the reason the QR exists; if the address cannot be
    // encoded the card still prints, with the written link alone.
    if (labels.siteLink) qr = encodeQr(labels.siteLink);
  } catch {
    qr = undefined;
  }

  const doc: Doc = {
    pages: [],
    ops: [],
    y: 0,
    links: [],
    labels,
    generated:
      labels.generatedOnTemplate && input.generatedAt
        ? fill(labels.generatedOnTemplate, {
            datetime: formatIsoDateTime(input.generatedAt, locale),
          })
        : "",
    qr,
  };
  beginPage(doc);

  /* -- headline card ---------------------------------------------------- */

  const eyebrow: Style = {
    bold: false,
    size: 6.9,
    color: MUTED,
    leading: 9.6,
    tracking: 0.7,
  };
  const caption: Style = { bold: false, size: 6.9, color: MUTED, leading: 9.6 };

  const headline = layoutStack(
    [
      { text: labels.estimatedBoneAgeLabel, style: eyebrow, gapBefore: 0 },
      {
        text: presentation.estimatedValue,
        style: { bold: true, size: 26, color: GREEN, leading: 30 },
        gapBefore: 6,
      },
      {
        text: labels.estimatedAgeText,
        style: { bold: false, size: 10.5, color: INK, leading: 14 },
        gapBefore: 2,
      },
      { text: labels.estimatedBoneAgeCaption, style: caption, gapBefore: 5 },
    ],
    180,
  );
  const chronoStack = layoutStack(
    [
      { text: labels.chronologicalAgeLabel, style: eyebrow, gapBefore: 0 },
      {
        text: presentation.chronologicalValue,
        style: { bold: true, size: 14, color: INK, leading: 18 },
        gapBefore: 6,
      },
      {
        text:
          chronological === undefined
            ? ""
            : (labels.chronologicalAgeText ?? ""),
        style: caption,
        gapBefore: 3,
      },
    ],
    108,
  );
  const differenceStack = layoutStack(
    [
      { text: labels.differenceLabel, style: eyebrow, gapBefore: 0 },
      {
        text: presentation.differenceValue,
        style: { bold: true, size: 14, color: INK, leading: 18 },
        gapBefore: 6,
      },
      { text: labels.differenceCaption, style: caption, gapBefore: 3 },
    ],
    107,
  );

  const bodyHeight = Math.max(
    headline.height,
    chronoStack.height,
    differenceStack.height,
  );
  const scaleHeight = 42;
  const cardHeight = 18 + bodyHeight + 14 + scaleHeight + 16;
  ensure(doc, cardHeight);
  const cardBottom = doc.y - cardHeight;
  card(doc, MARGIN_X, cardBottom, COLUMN, cardHeight, 12, WHITE, RULE);
  const bodyTop = doc.y - 18;
  paintStack(doc, headline, MARGIN_X + 20, bodyTop);
  vertical(doc, MARGIN_X + 216, bodyTop + 4, bodyHeight);
  paintStack(doc, chronoStack, MARGIN_X + 232, bodyTop);
  vertical(doc, MARGIN_X + 356, bodyTop + 4, bodyHeight);
  paintStack(doc, differenceStack, MARGIN_X + 372, bodyTop);

  const markers: Marker[] = [
    {
      value: input.months,
      label: labels.estimatedBoneAgeLabel,
      above: true,
      color: GREEN,
    },
  ];
  if (chronological !== undefined) {
    markers.push({
      value: chronological,
      label: labels.chronologicalAgeLabel,
      above: false,
      color: INK,
    });
  }
  comparisonScale(
    doc,
    MARGIN_X + 20,
    bodyTop - bodyHeight - 14,
    COLUMN - 40,
    markers,
    (value) => monthsValue(value, 0),
  );
  doc.y = cardBottom - 24;

  /* -- exam data -------------------------------------------------------- */

  sectionHeading(doc, labels.examDataHeading);
  chipRow(doc, presentation.examFields.slice(0, 3), [1, 1, 1], 3);
  doc.y -= 8;
  chipRow(
    doc,
    presentation.examFields
      .slice(3)
      .map((field, index) =>
        index === 1 && !hasImage
          ? { ...field, value: labels.notInformedValue }
          : field,
      ),
    [2, 1],
    3,
  );

  /* -- radiograph ------------------------------------------------------- */

  if (presentation.professional && labels.professionalComparison) {
    doc.y -= 20;
    sectionHeading(doc, labels.professionalComparison.heading);
    chipRow(doc, presentation.professional.fields.slice(0, 2), [1, 1], 3);
    doc.y -= 10;
    fieldGrid(doc, presentation.professional.fields.slice(2), 2);
    const note = layoutStack([
      { text: labels.professionalComparison.notice, style: caption, gapBefore: 0 },
    ], COLUMN);
    ensure(doc, note.height + 12);
    paintStack(doc, note, MARGIN_X, doc.y - 8);
    doc.y -= note.height + 12;
    // The optional comparison gets space on the cover; keep the image and
    // execution together on their own pages instead of shrinking the image.
    if (hasImage) beginPage(doc);
  }

  if (hasImage) {
    const captionStack = layoutStack(
      [{ text: labels.radiographCaption, style: caption, gapBefore: 0 }],
      COLUMN,
    );
    const reserve = captionStack.height + 10;
    doc.y -= 20;
    ensure(doc, 46 + reserve + 150);
    sectionHeading(doc, labels.radiographHeading);
    const room = Math.max(doc.y - CONTENT_BOTTOM - reserve, 90);
    const scale = Math.min(
      (COLUMN - 32) / imageWidth,
      (Math.min(360, room) - 24) / imageHeight,
    );
    const drawWidth = Math.max(imageWidth * scale, 1);
    const drawHeight = Math.max(imageHeight * scale, 1);
    const plateHeight = drawHeight + 24;
    const plateWidth = Math.min(drawWidth + 24, COLUMN);
    const plateX = MARGIN_X + (COLUMN - plateWidth) / 2;
    const plateBottom = doc.y - plateHeight;
    card(doc, plateX, plateBottom, plateWidth, plateHeight, 10, CANVAS);
    doc.ops.push(
      `q ${num(drawWidth)} 0 0 ${num(drawHeight)} ` +
        `${num(MARGIN_X + (COLUMN - drawWidth) / 2)} ${num(plateBottom + 12)} cm /Im0 Do Q`,
    );
    doc.y = plateBottom - 10;
    paintStack(doc, captionStack, MARGIN_X, doc.y);
    doc.y -= captionStack.height;
    // The execution half opens the next page, whatever room is left here.
    beginPage(doc);
  } else {
    doc.y -= 22;
  }

  /* -- execution -------------------------------------------------------- */

  sectionHeading(doc, labels.technicalHeading);
  const folds = Array.isArray(input.folds) ? input.folds : [];
  const meanRow: Field[] =
    folds.length > 0
      ? []
      : [
          {
            label: labels.ensembleMeanLabel,
            value: monthsValue(input.months, 4),
          },
        ];
  if (folds.length > 0) {
    foldChart(
      doc,
      folds.map((_fold, index) =>
        fill(labels.networkOutputLabelTemplate, { index: String(index + 1) }),
      ),
      folds,
      input.months,
      labels.ensembleMeanLabel,
      monthsValue(input.months, 4),
      (value) => monthsValue(value, 4),
    );
    doc.y -= 8;
  }
  fieldGrid(doc, [...meanRow, ...presentation.technicalFields], 2);
  fieldGrid(
    doc,
    [{ label: labels.preprocessingLabel, value: labels.preprocessingValue }],
    1,
  );

  /* -- references ------------------------------------------------------- */

  doc.y -= 16;
  sectionHeading(doc, labels.referencesHeading);
  const referenceStyle: Style = {
    bold: false,
    size: 8,
    color: MUTED,
    leading: 11,
  };
  for (const reference of presentation.references) {
    if (!reference) continue;
    const stack = layoutStack(
      [{ text: reference, style: referenceStyle, gapBefore: 0 }],
      COLUMN - 16,
    );
    ensure(doc, stack.height + 6);
    fillPath(doc, roundedPath(MARGIN_X + 1, doc.y - 6.4, 3, 3, 0.7), GREEN);
    paintStack(doc, stack, MARGIN_X + 16, doc.y);
    doc.y -= stack.height + 6;
  }

  /* -- disclaimer ------------------------------------------------------- */

  const disclaimerStack = layoutStack(
    [
      {
        text: labels.disclaimerHeading,
        style: {
          bold: true,
          size: 8.6,
          color: WARN_INK,
          leading: 12,
          tracking: 0.4,
        },
        gapBefore: 0,
      },
      {
        text: labels.disclaimerText,
        style: { bold: false, size: 8, color: WARN_INK, leading: 11.5 },
        gapBefore: 3,
      },
    ],
    COLUMN - 62,
  );
  const warnHeight = disclaimerStack.height + 28;
  doc.y -= 14;
  ensure(doc, warnHeight);
  const warnBottom = doc.y - warnHeight;
  card(doc, MARGIN_X, warnBottom, COLUMN, warnHeight, 8, WARN_FILL, WARN_LINE);
  // A drawn mark rather than a glyph: no word of this document lives in code.
  const markX = MARGIN_X + 22;
  const markY = doc.y - 20;
  fillPath(doc, circlePath(markX, markY, 7.5), WARN_INK);
  fillPath(doc, roundedPath(markX - 0.9, markY - 1, 1.8, 5.6, 0.9), WARN_FILL);
  fillPath(doc, circlePath(markX, markY - 3.6, 1), WARN_FILL);
  paintStack(doc, disclaimerStack, MARGIN_X + 40, doc.y - 14);
  doc.y = warnBottom;

  /* -- the card that sends the reader to the site ----------------------- */

  const qrPanel = qr ? 96 : 0;
  const promoWidth = COLUMN - 36 - (qr ? qrPanel + 18 : 0);
  const promoStack = layoutStack(
    [
      {
        text: labels.promoEyebrow,
        style: {
          bold: true,
          size: 6.6,
          color: MINT,
          leading: 9.5,
          tracking: 1,
        },
        gapBefore: 0,
      },
      {
        text: labels.promoHeading,
        style: { bold: true, size: 13.5, color: WHITE, leading: 16.5 },
        gapBefore: 8,
      },
      {
        text: labels.promoText,
        style: { bold: false, size: 8.2, color: MINT, leading: 11.5 },
        gapBefore: 6,
      },
    ],
    promoWidth,
  );
  const urlStyle: Style = { bold: true, size: 13, color: WHITE, leading: 16 };
  const promoBody = Math.max(promoStack.height + 26, qr ? qrPanel + 16 : 0);
  const promoHeight = promoBody + 36;
  doc.y -= 16;
  ensure(doc, promoHeight);
  const promoBottom = doc.y - promoHeight;
  const promoPath = roundedPath(MARGIN_X, promoBottom, COLUMN, promoHeight, 12);
  gradient(doc, "Sh1", promoPath, MARGIN_X, promoBottom, COLUMN, promoHeight);
  // The words and the address ride centred against the taller QR panel.
  const written = promoStack.height + 14 + urlStyle.size;
  const writtenTop = promoBottom + (promoHeight + written) / 2;
  paintStack(doc, promoStack, MARGIN_X + 18, writtenTop);

  const urlBaseline =
    writtenTop - promoStack.height - 14 - urlStyle.size * ASCENT;
  const urlBytes = encodeWinAnsi(labels.siteUrl);
  const urlWidth = styleWidth(urlBytes, urlStyle);
  drawEncoded(doc, urlBytes, MARGIN_X + 18, urlBaseline, urlStyle);
  hairline(doc, MARGIN_X + 18, urlBaseline - 5, urlWidth, MINT);

  if (qr) {
    const panelX = RIGHT_EDGE - 18 - qrPanel;
    const panelBottom = promoBottom + (promoHeight - (qrPanel + 16)) / 2;
    card(doc, panelX, panelBottom, qrPanel, qrPanel + 16, 8, WHITE);
    drawQr(doc, qr, panelX + 10, panelBottom + 22, qrPanel - 20, DEEP);
    drawCentre(
      doc,
      labels.promoQrCaption,
      panelX + qrPanel / 2,
      panelBottom + 8,
      {
        bold: false,
        size: 6.2,
        color: GREEN,
        leading: 8,
        tracking: 0.2,
      },
    );
  }
  link(doc, labels.siteLink, MARGIN_X, promoBottom, COLUMN, promoHeight);
  doc.y = promoBottom;

  /* -- footers ---------------------------------------------------------- */

  const footerStyle: Style = {
    bold: false,
    size: 7,
    color: MUTED,
    leading: 10,
  };
  const total = doc.pages.length;
  for (let i = 0; i < total; i++) {
    doc.ops = doc.pages[i];
    hairline(doc, MARGIN_X, FOOTER_RULE, COLUMN);
    drawLeft(doc, labels.privacyNote, MARGIN_X, FOOTER_BASELINE, footerStyle);
    drawRight(
      doc,
      fill(labels.pageNumberTemplate, {
        page: String(i + 1),
        total: String(total),
      }),
      RIGHT_EDGE,
      FOOTER_BASELINE,
      footerStyle,
    );
  }

  /* -- objects ---------------------------------------------------------- */

  const firstPage = hasImage ? IMAGE + 1 : IMAGE;
  const firstContent = firstPage + total;
  const firstAnnot = firstContent + total;
  const kids: string[] = [];
  for (let i = 0; i < total; i++) kids.push(`${firstPage + i} 0 R`);
  const resources =
    `/Resources << /Font << /F1 ${FONT_REGULAR} 0 R /F2 ${FONT_BOLD} 0 R >>` +
    ` /Shading << /Sh0 ${SHADE_BAND} 0 R /Sh1 ${SHADE_CARD} 0 R >>` +
    (hasImage ? ` /XObject << /Im0 ${IMAGE} 0 R >>` : "") +
    " >>";

  const objects: PdfObject[] = [];
  objects[CATALOG - 1] = {
    dict: `<< /Type /Catalog /Pages ${PAGES} 0 R >>`,
  };
  objects[PAGES - 1] = {
    dict: `<< /Type /Pages /Count ${total} /Kids [${kids.join(" ")}] >>`,
  };
  objects[FONT_REGULAR - 1] = {
    dict:
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica" +
      " /Encoding /WinAnsiEncoding >>",
  };
  objects[FONT_BOLD - 1] = {
    dict:
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold" +
      " /Encoding /WinAnsiEncoding >>",
  };
  objects[INFO - 1] = {
    dict: `<< /Title (${escapeString(encodeWinAnsi(labels.documentTitle))}) >>`,
  };
  objects[SHADE_BAND - 1] = { dict: shading(DEEP, MID, "0 0 1 1") };
  objects[SHADE_CARD - 1] = { dict: shading(MID, DEEP, "0 0 1 1") };
  if (hasImage) {
    objects[IMAGE - 1] = {
      dict:
        "<< /Type /XObject /Subtype /Image" +
        ` /Width ${formatInteger(imageWidth)} /Height ${formatInteger(imageHeight)}` +
        ` /ColorSpace ${colorSpaceOf(jpegComponents(jpeg))}` +
        ` /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
      stream: jpeg,
    };
  }
  const annotations: string[][] = Array.from({ length: total }, () => []);
  let annotNumber = firstAnnot;
  for (const entry of doc.links) {
    if (entry.page < 0 || entry.page >= total) continue;
    objects[annotNumber - 1] = {
      dict:
        "<< /Type /Annot /Subtype /Link /Border [0 0 0]" +
        ` /Rect [${entry.rect.map(num).join(" ")}]` +
        ` /A << /S /URI /URI (${escapeString(encodeWinAnsi(entry.uri))}) >> >>`,
    };
    annotations[entry.page].push(`${annotNumber} 0 R`);
    annotNumber++;
  }
  for (let i = 0; i < total; i++) {
    const annots = annotations[i];
    objects[firstPage + i - 1] = {
      dict:
        `<< /Type /Page /Parent ${PAGES} 0 R` +
        ` /MediaBox [0 0 ${num(PAGE_WIDTH)} ${num(PAGE_HEIGHT)}]` +
        ` ${resources} /Contents ${firstContent + i} 0 R` +
        (annots.length > 0 ? ` /Annots [${annots.join(" ")}]` : "") +
        " >>",
    };
    const content = doc.pages[i].join("\n");
    objects[firstContent + i - 1] = {
      dict: `<< /Length ${content.length} >>`,
      stream: latin1Bytes(content),
    };
  }

  return serialize(objects);
}
