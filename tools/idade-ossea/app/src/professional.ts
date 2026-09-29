import { t } from "./i18n";

/** User-transcribed assessment of the same examination, not authenticated. */
export interface ProfessionalAssessment {
  months: number;
  method: string;
  source: string;
  date: string;
}

export function readProfessionalAssessment(
  raw: { years: string; months: string; method: string; source: string; date: string; sameExam: boolean },
  examinationDate: string,
  today: string,
): ProfessionalAssessment {
  if (!raw.sameExam) throw new Error(t("professional.sameExamError"));
  const years = Number(raw.years), months = Number(raw.months);
  if (!raw.years.trim() || !raw.months.trim() || !Number.isInteger(years)
    || !Number.isInteger(months) || years < 0 || months < 0 || months > 11
    || years * 12 + months > 240)
    throw new Error(t("professional.ageError"));
  const source = raw.source.trim(), method = raw.method.trim();
  if (!source || !method || source.length > 120 || method.length > 80)
    throw new Error(t("professional.fieldsError"));
  const parsed = new Date(`${raw.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== raw.date
    || raw.date < examinationDate || raw.date > today)
    throw new Error(t("professional.dateError"));
  return { months: years * 12 + months, method, source, date: raw.date };
}
