import type { ReportInput } from "./report";

export function fill(template: string, values: Record<string, string>): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}

export function formatNumber(
  value: number,
  locale: string,
  digits: number,
): string {
  if (!Number.isFinite(value)) return String(value);
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

export function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : String(value);
}

export function formatIsoDate(iso: string, locale: string): string {
  const text = String(iso ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return text;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (Number.isNaN(date.getTime())) return text;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return text;
  }
}

/** Descriptive axis only: its domain is not a clinical reference interval. */
export function scaleOf(values: number[], x = 0, width = 100) {
  const finite = values.filter(Number.isFinite);
  const low = finite.length ? Math.min(...finite) : 0;
  const high = finite.length ? Math.max(...finite) : 0;
  const pad = Math.max((high - low) * 0.75, 6);
  const min = Math.max(0, low - pad);
  const max = high + pad;
  const span = max - min || 1;
  return {
    min,
    max,
    at: (value: number) =>
      x + ((Math.min(Math.max(value, min), max) - min) / span) * width,
  };
}

/** One set of values, rounding rules and field order for the screen and PDF. */
export function presentReport(input: ReportInput) {
  const l = input.labels;
  const locale = input.locale || "en-US";
  const decimal = (value: number, digits: number) =>
    formatNumber(value, locale, digits);
  const monthsValue = (value: number, digits = 1) =>
    fill(l.monthsValueTemplate, { months: decimal(value, digits) });
  const chronological = Number.isFinite(input.chronologicalMonths)
    ? input.chronologicalMonths
    : undefined;
  const difference =
    chronological === undefined ? undefined : input.months - chronological;
  const folds = (Array.isArray(input.folds) ? input.folds : []).map(
    (value, index) => ({
      label: fill(l.networkOutputLabelTemplate, { index: String(index + 1) }),
      value: monthsValue(value, 4),
      months: value,
    }),
  );
  const examFields = [
    { label: l.sexLabel, value: l.sexValue },
    {
      label: l.dateOfBirthLabel,
      value: input.dateOfBirth
        ? formatIsoDate(input.dateOfBirth, locale)
        : l.notInformedValue,
    },
    {
      label: l.examinationDateLabel,
      value: formatIsoDate(input.examinationDate, locale),
    },
    { label: l.sourceFileLabel, value: input.fileName },
    {
      label: l.analysedImageSizeLabel,
      value:
        input.image.width > 0 && input.image.height > 0
          ? fill(l.imageSizeValueTemplate, {
              width: formatInteger(input.image.width),
              height: formatInteger(input.image.height),
            })
          : l.notInformedValue,
    },
  ];
  const technicalFields = [
    {
      label: l.runtimeLabel,
      value: fill(l.secondsValueTemplate, {
        seconds: decimal(input.seconds, 1),
      }),
    },
    { label: l.modelLabel, value: input.modelId },
    { label: l.modelRevisionLabel, value: input.modelRevision },
    { label: l.executionEnvironmentLabel, value: l.executionEnvironmentValue },
    {
      label: l.cropLabel,
      value: fill(l.cropValueTemplate, {
        x0: formatInteger(input.crop.x0),
        y0: formatInteger(input.crop.y0),
        x1: formatInteger(input.crop.x1),
        y1: formatInteger(input.crop.y1),
      }),
    },
  ];
  const professional = input.professional;
  const comparisonLabels = l.professionalComparison;
  const professionalDifference = professional ? input.months - professional.months : undefined;
  const comparison = professional && comparisonLabels ? {
    fields: [
      { label: comparisonLabels.ageLabel, value: monthsValue(professional.months) },
      { label: comparisonLabels.differenceLabel, value: fill(l.differenceValueTemplate, {
        sign: professionalDifference! < 0 ? "-" : "+", months: decimal(Math.abs(professionalDifference!), 1),
      }) },
      { label: comparisonLabels.sourceLabel, value: professional.source },
      { label: comparisonLabels.methodLabel, value: professional.method },
      { label: comparisonLabels.dateLabel, value: formatIsoDate(professional.date, locale) },
    ],
  } : undefined;
  return {
    professional: comparison,
    chronological,
    difference,
    monthsValue,
    estimatedValue: monthsValue(input.months),
    chronologicalValue:
      chronological === undefined
        ? l.notInformedValue
        : monthsValue(chronological),
    differenceValue:
      difference === undefined
        ? l.notComputedValue
        : fill(l.differenceValueTemplate, {
            sign: difference < 0 ? "-" : "+",
            months: decimal(Math.abs(difference), 1),
          }),
    meanValue: monthsValue(input.months, 4),
    examFields,
    technicalFields,
    folds,
    references: [
      l.referenceModelLine,
      l.referenceArchitectureLine,
      l.referenceDatasetLine,
      l.referenceLicenseLine,
      l.referenceApplicationLine,
    ],
  };
}
