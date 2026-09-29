import { describe, expect, it } from "vitest";
import { presentReport, scaleOf } from "../src/report-presentation";
import {
  buildReportPdf,
  encodeWinAnsi,
  measureText,
  wrapText,
  type ReportInput,
  type ReportLabels,
} from "../src/report";

/* ----------------------------------------------------------- byte helpers */

/** Decodes bytes one-to-one, so string indices are byte offsets. */
function latin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** A syntactically complete baseline JPEG, small enough to inspect by hand. */
function makeJpeg(width: number, height: number, components = 3): Uint8Array {
  const frame = [
    0xff,
    0xc0,
    0x00,
    8 + components * 3,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    components,
  ];
  for (let i = 0; i < components; i++) frame.push(i + 1, 0x11, 0x00);
  return Uint8Array.from([
    0xff,
    0xd8,
    ...frame,
    0xff,
    0xda,
    0x00,
    0x08,
    0x01,
    0x01,
    0x00,
    0x00,
    0x3f,
    0x00,
    // Entropy-coded payload with bytes that must never be escaped or
    // re-encoded: "(", "\", ")", NUL and a stuffed 0xFF00.
    0x28,
    0x5c,
    0x29,
    0x00,
    0xff,
    0x00,
    0xa9,
    0xe7,
    0xff,
    0xd9,
  ]);
}

/* ------------------------------------------------------- structural parser */

interface ParsedObject {
  number: number;
  offset: number;
  body: string;
  streamLength?: number;
  streamStart?: number;
}

/**
 * Re-reads the file the way a consumer would: follows startxref, walks the
 * cross reference table and checks every recorded offset against the bytes.
 */
function parsePdf(pdf: Uint8Array) {
  const text = latin1(pdf);
  expect(text.startsWith("%PDF-")).toBe(true);
  expect(text.endsWith("%%EOF")).toBe(true);

  const tail = /startxref\n(\d+)\n%%EOF$/.exec(text);
  expect(tail).not.toBeNull();
  const xrefStart = Number((tail as RegExpExecArray)[1]);
  expect(text.slice(xrefStart, xrefStart + 4)).toBe("xref");

  const header = /^xref\n0 (\d+)\n/.exec(text.slice(xrefStart, xrefStart + 64));
  expect(header).not.toBeNull();
  const size = Number((header as RegExpExecArray)[1]);
  const first = xrefStart + (header as RegExpExecArray)[0].length;

  const offsets: number[] = [];
  for (let i = 0; i < size; i++) {
    const entry = text.slice(first + i * 20, first + i * 20 + 20);
    expect(entry).toHaveLength(20);
    expect(entry.slice(18)).toBe("\r\n");
    offsets.push(Number(entry.slice(0, 10)));
    if (i === 0) {
      expect(entry).toBe("0000000000 65535 f\r\n");
      continue;
    }
    expect(entry.slice(11, 16)).toBe("00000");
    expect(entry.slice(17, 18)).toBe("n");
    // The whole point of the table: the offset must land on the object.
    expect(text.startsWith(`${i} 0 obj\n`, offsets[i])).toBe(true);
  }

  expect(text).toContain(`trailer\n<< /Size ${size} /Root 1 0 R`);

  const objects: ParsedObject[] = [];
  for (let i = 1; i < size; i++) {
    const end = i + 1 < size ? offsets[i + 1] : xrefStart;
    const body = text.slice(offsets[i], end);
    const object: ParsedObject = { number: i, offset: offsets[i], body };
    const streamAt = body.indexOf("\nstream\n");
    if (streamAt >= 0) {
      const declared = /\/Length (\d+)/.exec(body.slice(0, streamAt));
      expect(declared).not.toBeNull();
      const length = Number((declared as RegExpExecArray)[1]);
      const start = offsets[i] + streamAt + "\nstream\n".length;
      // /Length must be exactly the byte count that precedes "endstream".
      expect(text.startsWith("\nendstream", start + length)).toBe(true);
      object.streamLength = length;
      object.streamStart = start;
    }
    objects.push(object);
  }

  const pageCount = Number(
    (/\/Type \/Pages \/Count (\d+)/.exec(text) as RegExpExecArray)[1],
  );
  const drawn = text.split("/Type /Page /Parent").length - 1;
  expect(drawn).toBe(pageCount);

  return { text, offsets, size, objects, pageCount };
}

function countDrawnStrings(pdf: Uint8Array): number {
  return latin1(pdf).split(") Tj ET").length - 1;
}

/* --------------------------------------------------------------- fixtures */

const labels: ReportLabels = {
  productName: "bone age",
  experimentalBadge: "USO EXPERIMENTAL",
  documentTitle: "Estimativa experimental de idade óssea",
  documentSubtitle:
    "Maturação óssea calculada localmente no navegador a partir de uma radiografia de mão esquerda em PA.",
  generatedOnTemplate: "Gerado em {datetime}",

  estimatedBoneAgeLabel: "Idade óssea estimada",
  estimatedAgeText: "11 anos e 2 meses",
  estimatedBoneAgeCaption: "Média das três redes do ensemble.",
  chronologicalAgeLabel: "Idade cronológica",
  chronologicalAgeText: "11 anos e 0 meses",
  differenceLabel: "Diferença estimada",
  differenceCaption: "Comparação descritiva, sem classificação diagnóstica.",
  notInformedValue: "Não informada",
  notComputedValue: "Não calculada",

  examDataHeading: "Dados do exame",
  sexLabel: "Sexo biológico",
  sexValue: "feminino",
  dateOfBirthLabel: "Data de nascimento",
  examinationDateLabel: "Data do exame",
  sourceFileLabel: "Arquivo de origem",
  analysedImageSizeLabel: "Imagem analisada",

  radiographHeading: "Radiografia analisada",
  radiographCaption:
    "Imagem como analisada: orientada, recortada e com ajuste de histograma.",

  technicalHeading: "Detalhes da execução local",
  ensembleMeanLabel: "Média do ensemble",
  networkOutputLabelTemplate: "Rede {index}",
  runtimeLabel: "Tempo de execução",
  cropLabel: "Recorte [x0, y0, x1, y1]",
  modelLabel: "Modelo",
  modelRevisionLabel: "Revisão fixada",
  executionEnvironmentLabel: "Ambiente de execução",
  executionEnvironmentValue:
    "ONNX FP32, WebAssembly/CPU, três redes em sequência",
  preprocessingLabel: "Pré-processamento",
  preprocessingValue:
    "Decodificação local, recorte manual, ajuste de histograma, interpolação bilinear e padding para 512 × 512.",

  referencesHeading: "Referências e atribuição",
  referenceModelLine:
    "Modelo ianpan/bone-age, publicado por Ian Pan (huggingface.co/ianpan).",
  referenceArchitectureLine:
    "Arquitetura: ensemble de três redes ConvNeXtV2-tiny, 84,1 milhões de parâmetros.",
  referenceDatasetLine:
    "Treinamento: RSNA Pediatric Bone Age 2017, 14.036 radiografias de mão esquerda em PA; erro médio absoluto de 4,16 meses no conjunto de teste.",
  referenceLicenseLine:
    "Pesos redistribuídos sob a Apache License 2.0, com o aviso de modificação.",
  referenceApplicationLine:
    "Código da aplicação: github.com/feliperun/bone-age, licença MIT.",

  disclaimerHeading: "Aviso",
  disclaimerText:
    "Documento experimental. Não é um laudo e não estabelece diagnóstico. O modelo não foi aprovado para uso clínico e o erro médio publicado no conjunto de teste não representa a margem de erro para uma pessoa. Apenas o laudo de um radiologista tem valor diagnóstico.",
  privacyNote: "Nenhuma imagem ou dado do exame saiu deste navegador.",
  pageNumberTemplate: "Página {page} de {total}",

  siteUrl: "bone-age.app",
  siteLink: "https://bone-age.app",
  promoEyebrow: "GRATUITO · SEM CADASTRO · PROCESSAMENTO LOCAL",
  promoHeading: "Calcule a idade óssea de outra radiografia",
  promoText:
    "Abra a imagem no navegador, recorte a mão esquerda e receba a estimativa em minutos. Nenhum arquivo sai do seu dispositivo.",
  promoQrCaption: "Aponte a câmera",

  monthsValueTemplate: "{months} meses",
  secondsValueTemplate: "{seconds} s",
  differenceValueTemplate: "{sign}{months} meses",
  cropValueTemplate: "[{x0}, {y0}, {x1}, {y1}]",
  imageSizeValueTemplate: "{width} × {height} px",
};

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    months: 134.2481,
    folds: [133.9912, 134.5027, 134.2504],
    seconds: 42.71,
    modelId: "ianpan/bone-age",
    modelRevision: "2ab81275b84e9f518f04584177221a1d8c1dc1a5",
    sex: "female",
    dateOfBirth: "2015-07-17",
    examinationDate: "2026-09-05",
    chronologicalMonths: 133.6,
    crop: { x0: 120, y0: 84, x1: 1144, y1: 1620 },
    fileName: "radiografia-mao-esquerda.dcm",
    locale: "pt-BR",
    generatedAt: "2026-09-05T14:32:00Z",
    image: { jpeg: makeJpeg(1024, 1536), width: 1024, height: 1536 },
    labels,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ tests */

describe("shared screen/PDF presentation", () => {
  it("keeps a transcribed assessment separate from the AI and chronological age", () => {
    const data = input({
      professional: { months: 120, method: "Greulich-Pyle", source: "Example service", date: "2026-09-05" },
      labels: { ...labels, professionalComparison: {
        heading: "Supplied professional assessment", ageLabel: "Supplied bone age",
        differenceLabel: "AI minus supplied assessment", sourceLabel: "Source", methodLabel: "Method",
        dateLabel: "Assessment date", notice: "User-transcribed. Same examination. Not authenticated.",
      } },
    });
    const p = presentReport(data);
    expect(p.professional?.fields[0].value).toBe("120,0 meses");
    expect(p.professional?.fields[1].value).toBe("+14,2 meses");
    expect(p.estimatedValue).toBe("134,2 meses");
    expect(p.differenceValue).toBe("+0,6 meses");
    const pdf = parsePdf(buildReportPdf(data));
    expect(pdf.pageCount).toBe(3);
    for (const field of p.professional!.fields) expect(pdf.text).toContain(encodeWinAnsi(field.value));
    expect(presentReport(input()).professional).toBeUndefined();
  });
  it.each([120, 134.2481, 150, undefined, NaN])(
    "keeps the same displayed ages and fields for chronological age %s",
    (chronologicalMonths) => {
      const data = input({ chronologicalMonths });
      const p = presentReport(data);
      const pdf = latin1(buildReportPdf(data));
      for (const value of [
        p.estimatedValue,
        p.chronologicalValue,
        p.differenceValue,
        p.meanValue,
        ...p.folds.map((f) => f.value),
        ...p.examFields.map((f) => f.value),
      ]) {
        expect(pdf).toContain(`(${encodeWinAnsi(value)}) Tj`);
      }
      expect(p.estimatedValue).toBe("134,2 meses");
      expect(p.meanValue).toBe("134,2481 meses");
      if (!Number.isFinite(chronologicalMonths)) {
        expect(p.chronologicalValue).toBe("Não informada");
        expect(p.differenceValue).toBe("Não calculada");
      }
    },
  );

  it("distinguishes signed differences, missing age and newborn age", () => {
    expect(
      presentReport(input({ chronologicalMonths: 150 })).differenceValue,
    ).toBe("-15,8 meses");
    expect(
      presentReport(input({ chronologicalMonths: 120 })).differenceValue,
    ).toBe("+14,2 meses");
    expect(
      presentReport(input({ months: 0, chronologicalMonths: 0 }))
        .differenceValue,
    ).toBe("+0,0 meses");
    expect(
      presentReport(input({ chronologicalMonths: 0 })).chronologicalValue,
    ).toBe("0,0 meses");
  });

  it.each([[0, 0], [134.2], [134.2, 134.2], [0, 239], [120, 160]])(
    "maps the same age scale into PDF points and screen percentages: %j",
    (...values) => {
      const screen = scaleOf(values);
      const pdf = scaleOf(values, 42, 500);
      expect(screen.min).toBeGreaterThanOrEqual(0);
      expect(screen.max).toBeGreaterThan(screen.min);
      for (const value of values) {
        expect(screen.at(value)).toBeGreaterThanOrEqual(0);
        expect(screen.at(value)).toBeLessThanOrEqual(100);
        expect(pdf.at(value)).toBeCloseTo(42 + screen.at(value) * 5);
      }
    },
  );
});

describe("PDF container", () => {
  it("opens with the signature, closes with %%EOF and keeps a valid xref", () => {
    const parsed = parsePdf(buildReportPdf(input()));
    expect(parsed.size).toBeGreaterThan(6);
    expect(parsed.text).toContain("/Type /Catalog /Pages 2 0 R");
    expect(parsed.text).toContain("/BaseFont /Helvetica /Encoding /WinAnsi");
    expect(parsed.text).toContain(
      "/BaseFont /Helvetica-Bold /Encoding /WinAnsi",
    );
    expect(parsed.text).toContain("/MediaBox [0 0 595.276 841.89]");
  });

  it("keeps every recorded offset in step with the emitted bytes", () => {
    // A second, differently sized document must not reuse stale offsets.
    const parsed = parsePdf(
      buildReportPdf(
        input({
          image: { jpeg: makeJpeg(600, 400), width: 600, height: 400 },
          fileName: "outro.png",
        }),
      ),
    );
    for (const object of parsed.objects) {
      expect(
        parsed.text.startsWith(`${object.number} 0 obj\n`, object.offset),
      ).toBe(true);
      expect(object.body).toContain("endobj");
    }
  });

  it("fits the report in no more than two pages", () => {
    const parsed = parsePdf(buildReportPdf(input()));
    expect(parsed.pageCount).toBeGreaterThanOrEqual(1);
    expect(parsed.pageCount).toBeLessThanOrEqual(2);
  });
});

describe("embedded radiograph", () => {
  it("copies the JPEG into a /DCTDecode stream with a matching /Length", () => {
    const jpeg = makeJpeg(1024, 1536);
    const pdf = buildReportPdf(
      input({ image: { jpeg, width: 1024, height: 1536 } }),
    );
    const parsed = parsePdf(pdf);
    const image = parsed.objects.find((object) =>
      object.body.includes("/DCTDecode"),
    );
    expect(image).toBeDefined();
    const found = image as ParsedObject;
    expect(found.body).toContain("/Subtype /Image");
    expect(found.body).toContain("/Width 1024 /Height 1536");
    expect(found.body).toContain("/ColorSpace /DeviceRGB");
    expect(found.body).toContain("/BitsPerComponent 8");
    expect(found.streamLength).toBe(jpeg.length);

    const start = found.streamStart as number;
    expect([...pdf.slice(start, start + jpeg.length)]).toEqual([...jpeg]);
    // And it really is the only copy: the bytes were not escaped anywhere.
    expect(indexOfBytes(pdf, jpeg)).toBe(start);
    expect(parsed.text).toContain("/Im0 Do");
  });

  it("reads the colour space from the JPEG frame header", () => {
    const gray = buildReportPdf(
      input({ image: { jpeg: makeJpeg(64, 64, 1), width: 64, height: 64 } }),
    );
    expect(latin1(gray)).toContain("/ColorSpace /DeviceGray");
    const cmyk = buildReportPdf(
      input({ image: { jpeg: makeJpeg(64, 64, 4), width: 64, height: 64 } }),
    );
    expect(latin1(cmyk)).toContain("/ColorSpace /DeviceCMYK");
  });

  it("scales to fit its box, preserving the aspect ratio", () => {
    const draw = (pdf: Uint8Array) => {
      const match =
        /q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm \/Im0 Do Q/.exec(
          latin1(pdf),
        );
      expect(match).not.toBeNull();
      const found = match as RegExpExecArray;
      return {
        width: Number(found[1]),
        height: Number(found[2]),
        x: Number(found[3]),
      };
    };

    const wide = draw(
      buildReportPdf(
        input({ image: { jpeg: makeJpeg(4000, 90), width: 4000, height: 90 } }),
      ),
    );
    expect(wide.width).toBeLessThanOrEqual(499.276 - 32);
    expect(wide.width / wide.height).toBeCloseTo(4000 / 90, 1);

    const tall = draw(
      buildReportPdf(
        input({ image: { jpeg: makeJpeg(90, 4000), width: 90, height: 4000 } }),
      ),
    );
    expect(tall.height).toBeLessThanOrEqual(360 - 24);
    expect(tall.width / tall.height).toBeCloseTo(90 / 4000, 3);
    // Centred in the text column whatever the shape.
    expect(tall.x).toBeCloseTo(48 + (499.276 - tall.width) / 2, 2);
  });

  it("still produces a valid document without an image", () => {
    const pdf = buildReportPdf(
      input({ image: { jpeg: new Uint8Array(0), width: 0, height: 0 } }),
    );
    const parsed = parsePdf(pdf);
    expect(parsed.text).not.toContain("/DCTDecode");
    expect(parsed.text).not.toContain("/XObject");
    expect(parsed.text).toContain("Não informada");
  });
});

describe("cp1252 text encoding", () => {
  it("writes Portuguese accents as single WinAnsi bytes", () => {
    const pdf = buildReportPdf(input());
    // "ção" -> E7 E3 6F, "á" -> E1, "ê" -> EA, "õ" -> F5, "ú" -> FA, "×" -> D7
    expect(indexOfBytes(pdf, Uint8Array.of(0xe7, 0xe3, 0x6f))).toBeGreaterThan(
      0,
    );
    expect(indexOfBytes(pdf, Uint8Array.of(0xe1))).toBeGreaterThan(0);
    expect(indexOfBytes(pdf, Uint8Array.of(0xea))).toBeGreaterThan(0);
    expect(indexOfBytes(pdf, Uint8Array.of(0xd7))).toBeGreaterThan(0);
    // No UTF-8 leftovers: "ç" must never appear as C3 A7.
    expect(indexOfBytes(pdf, Uint8Array.of(0xc3, 0xa7))).toBe(-1);
  });

  it("maps every printable cp1252 code point to its own byte", () => {
    expect(
      [...encodeWinAnsi("áçãéíóúâêôõ")].map((c) => c.charCodeAt(0)),
    ).toEqual([
      0xe1, 0xe7, 0xe3, 0xe9, 0xed, 0xf3, 0xfa, 0xe2, 0xea, 0xf4, 0xf5,
    ]);
    expect(encodeWinAnsi("•–—…’“”™").charCodeAt(0)).toBe(0x95);
    expect([...encodeWinAnsi("•–—…’“”™")].map((c) => c.charCodeAt(0))).toEqual(
      [0x95, 0x96, 0x97, 0x85, 0x92, 0x93, 0x94, 0x99],
    );
  });

  it("degrades characters outside cp1252 instead of corrupting bytes", () => {
    expect(encodeWinAnsi("Ā ā ŏ Ż")).toBe("A a o Z");
    expect(encodeWinAnsi("→ ≥ −")).toBe("-> >= -");
    expect(encodeWinAnsi("日本 😀")).toBe("?? ?");
    for (const ch of encodeWinAnsi("日本 😀 Ā → ✓")) {
      expect(ch.charCodeAt(0)).toBeLessThan(0x100);
    }
    // Newlines and tabs never reach the stream as control bytes.
    expect(encodeWinAnsi("a\nb\tc\r\nd")).toBe("a b c  d");
  });

  it("escapes backslashes and both parentheses", () => {
    const pdf = buildReportPdf(
      input({ fileName: "C:\\exames\\radiografia (mao) final.dcm" }),
    );
    const text = latin1(pdf);
    expect(text).toContain("C:\\\\exames\\\\radiografia \\(mao\\) final.dcm");
    // Never an unescaped parenthesis inside a drawn string.
    const drawn = text.match(/\(((?:[^()\\]|\\.)*)\) Tj/g);
    expect(drawn).not.toBeNull();
    expect((drawn as string[]).length).toBeGreaterThan(20);
  });
});

describe("measurement and wrapping", () => {
  it("measures with the Helvetica AFM widths", () => {
    // space 278 + A 667 + V 667 = 1612/1000 em.
    expect(measureText(" AV", false, 10)).toBeCloseTo(16.12, 6);
    // Bold A is wider than regular A (722 vs 667).
    expect(measureText("A", true, 10)).toBeCloseTo(7.22, 6);
    // Accented glyphs carry their own advance, not the replacement's.
    expect(measureText("ç", false, 10)).toBeCloseTo(5.0, 6);
    expect(measureText("é", false, 10)).toBeCloseTo(5.56, 6);
  });

  it("wraps a paragraph into lines that all fit the column", () => {
    const lines = wrapText(labels.disclaimerText, false, 8.5, 200);
    expect(lines.length).toBeGreaterThan(4);
    for (const line of lines) {
      expect(measureText(line, false, 8.5)).toBeLessThanOrEqual(200);
    }
    expect(lines.join(" ").replace(/\s+/g, " ")).toBe(
      encodeWinAnsi(labels.disclaimerText),
    );
  });

  it("splits words that cannot fit and honours hard newlines", () => {
    const long = "a".repeat(400);
    const lines = wrapText(long, false, 9, 337);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(long);
    for (const line of lines) {
      expect(measureText(line, false, 9)).toBeLessThanOrEqual(337);
    }
    expect(wrapText("um\ndois", false, 9, 500)).toEqual(["um", "dois"]);
  });

  it("emits one drawn string per wrapped line", () => {
    const longText = `${labels.disclaimerText} ${labels.disclaimerText} ${labels.disclaimerText}`;
    // The callout leaves room for the drawn warning sign: 40 pt on the left,
    // 22 pt on the right of the 499.276 pt column.
    const expected = wrapText(longText, false, 8, 499.276 - 62).length;
    expect(expected).toBeGreaterThan(6);
    const short = countDrawnStrings(
      buildReportPdf(
        input({ labels: { ...labels, disclaimerText: "Curto." } }),
      ),
    );
    const long = countDrawnStrings(
      buildReportPdf(
        input({ labels: { ...labels, disclaimerText: longText } }),
      ),
    );
    expect(long - short).toBeGreaterThanOrEqual(expected - 1);
  });
});

describe("locale formatting", () => {
  it("formats numbers and dates for the requested locale", () => {
    const pt = latin1(buildReportPdf(input()));
    expect(pt).toContain("134,2 meses");
    expect(pt).toContain("134,2481 meses");
    expect(pt).toContain("05/09/2026");
    expect(pt).toContain("17/07/2015");
    expect(pt).toContain("42,7 s");
    expect(pt).toContain("[120, 84, 1144, 1620]");

    const en = latin1(buildReportPdf(input({ locale: "en-US" })));
    expect(en).toContain("134.2 meses");
    expect(en).toContain("09/05/2026");
    expect(en).toContain("07/17/2015");
  });

  it("signs the difference against the chronological age", () => {
    expect(latin1(buildReportPdf(input()))).toContain("+0,6 meses");
    expect(
      latin1(buildReportPdf(input({ chronologicalMonths: 140 }))),
    ).toContain("-5,8 meses");
  });
});

describe("the site on the page", () => {
  const count = (text: string, needle: string) => text.split(needle).length - 1;

  it("prints the address and the closing invitation", () => {
    const text = latin1(buildReportPdf(input()));
    expect(count(text, "bone-age.app")).toBeGreaterThanOrEqual(3);
    expect(text).toContain("Calcule a idade");
    expect(text).toContain("Aponte a c\u00e2mera");
    expect(text).toContain("GRATUITO");
  });

  it("makes the address clickable on every page", () => {
    const pdf = buildReportPdf(input());
    const parsed = parsePdf(pdf);
    const links = parsed.objects.filter((object) =>
      object.body.includes("/Subtype /Link"),
    );
    // One masthead per page, plus the closing card.
    expect(links.length).toBe(parsed.pageCount + 1);
    for (const object of links) {
      expect(object.body).toContain(
        "/A << /S /URI /URI (https://bone-age.app) >>",
      );
      const rect = /\/Rect \[([-\d. ]+)\]/.exec(object.body);
      expect(rect).not.toBeNull();
      const [x0, y0, x1, y1] = (rect as RegExpExecArray)[1]
        .split(" ")
        .map(Number);
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
      expect(x1).toBeLessThanOrEqual(595.276);
      expect(y1).toBeLessThanOrEqual(841.89);
    }
    const pages = parsed.objects.filter((object) =>
      object.body.includes("/Type /Page /Parent"),
    );
    for (const page of pages) expect(page.body).toContain("/Annots [");
  });

  it("follows a different address into both the link and the code", () => {
    const text = latin1(
      buildReportPdf(
        input({
          labels: {
            ...labels,
            siteUrl: "example.test",
            siteLink: "https://example.test/from-report",
          },
        }),
      ),
    );
    expect(text).toContain("/URI (https://example.test/from-report)");
    expect(text).toContain("example.test");
    expect(text).not.toContain("https://bone-age.app");
  });

  it("draws the QR code, and prints the card without one when it cannot", () => {
    const rectangles = (pdf: Uint8Array) => count(latin1(pdf), " re");
    const withCode = buildReportPdf(input());
    const withoutCode = buildReportPdf(
      input({ labels: { ...labels, siteLink: "" } }),
    );
    // Every dark run of the matrix is one rectangle in the closing card.
    expect(rectangles(withCode)).toBeGreaterThan(rectangles(withoutCode) + 60);
    // Without an address there is no code and no annotation, but the
    // invitation and the printed name still go out.
    const bare = latin1(withoutCode);
    expect(bare).not.toContain("/Subtype /Link");
    expect(bare).toContain("Calcule a idade");
    expect(bare).toContain("bone-age.app");
  });

  it("paints the green bands from the two document shadings", () => {
    const parsed = parsePdf(buildReportPdf(input()));
    expect(count(parsed.text, "/ShadingType 2")).toBe(2);
    expect(parsed.text).toContain("/Shading << /Sh0 6 0 R /Sh1 7 0 R >>");
    expect(parsed.text).toContain("/Sh0 sh");
    expect(parsed.text).toContain("/Sh1 sh");
  });
});

describe("edge cases", () => {
  it("handles a missing date of birth and an undefined chronological age", () => {
    const pdf = buildReportPdf(
      input({ dateOfBirth: "", chronologicalMonths: undefined }),
    );
    const parsed = parsePdf(pdf);
    expect(parsed.text).toContain("N\u00e3o informada");
    expect(parsed.text).toContain("N\u00e3o calculada");
    expect(parsed.text).not.toContain("undefined");
    expect(parsed.text).not.toContain("NaN");
  });

  it("survives a file name with no break opportunities", () => {
    const fileName = `${"radiografia".repeat(30)}.dcm`;
    const parsed = parsePdf(buildReportPdf(input({ fileName })));
    // 337 pt is the value column; every wrapped fragment must fit it.
    const lines = wrapText(fileName, false, 9, 337.276);
    expect(lines.length).toBeGreaterThan(3);
    expect(lines.join("")).toBe(fileName);
    expect(parsed.pageCount).toBeLessThanOrEqual(3);
  });

  it("stays valid for extreme image shapes and empty optional labels", () => {
    for (const [width, height] of [
      [6000, 40],
      [40, 6000],
      [1, 1],
      [512, 512],
    ] as const) {
      const parsed = parsePdf(
        buildReportPdf(
          input({
            image: { jpeg: makeJpeg(width, height), width, height },
          }),
        ),
      );
      expect(parsed.text).toContain("/DCTDecode");
    }

    const bare = { ...labels };
    delete bare.generatedOnTemplate;
    delete bare.chronologicalAgeText;
    const parsed = parsePdf(
      buildReportPdf(input({ labels: bare, generatedAt: undefined })),
    );
    expect(parsed.text).not.toContain("Gerado em");
  });

  it("carries the disclaimer and the attribution on the document", () => {
    const text = latin1(buildReportPdf(input()));
    expect(text).toContain("Aviso");
    expect(text).toContain("ianpan/bone-age");
    expect(text).toContain("2ab81275b84e9f518f04584177221a1d8c1dc1a5");
    expect(text).toContain("Apache License 2.0");
    expect(text).toContain("ConvNeXtV2-tiny");
    expect(text).toContain("RSNA Pediatric Bone Age 2017");
    // Wrapped, so only the opening fragment is contiguous.
    expect(text).toContain("Documento experimental.");
  });
});
