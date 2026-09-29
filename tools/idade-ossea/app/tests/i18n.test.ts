import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dictionaries, setLang, t, type Key } from "../src/i18n";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const sources = readdirSync(new URL("../src", import.meta.url))
  .filter((name) => name.endsWith(".ts"))
  .map((name) => read(`src/${name}`));

const keys = (lang: "pt" | "en") => Object.keys(dictionaries[lang]).sort();
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("translate exactly the same keys", () => {
    expect(keys("en")).toEqual(keys("pt"));
  });

  it("keep the same placeholders in both languages", () => {
    for (const key of keys("pt") as Key[])
      expect({ key, vars: placeholders(dictionaries.en[key]) }).toEqual({
        key,
        vars: placeholders(dictionaries.pt[key]),
      });
  });

  it("leave no empty translation", () => {
    for (const lang of ["pt", "en"] as const)
      for (const key of keys(lang) as Key[])
        expect(dictionaries[lang][key].trim().length).toBeGreaterThan(0);
  });
});

describe("keys referenced by the app", () => {
  it("exist for every data-i18n attribute in the markup", () => {
    const used = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(used.length).toBeGreaterThan(40);
    for (const key of used) expect(dictionaries.pt).toHaveProperty([key]);
  });

  it("exist for every t(\"…\") call in the sources", () => {
    const used = sources.flatMap((source) =>
      [...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    expect(used.length).toBeGreaterThan(40);
    for (const key of used) expect(dictionaries.pt).toHaveProperty([key]);
  });

  it("cover the model status keys the language switch re-renders", () => {
    for (const key of ["model.initial", "model.ready", "model.executed", "model.cleared"])
      expect(dictionaries.pt).toHaveProperty([key]);
  });
});

describe("t", () => {
  it("returns the current language and interpolates variables", () => {
    setLang("pt");
    expect(t("progress.fold", { stage: "Calculando", fold: 2 })).toBe(
      "Calculando · rede 2/3",
    );
    setLang("en");
    expect(t("progress.fold", { stage: "Computing", fold: 2 })).toBe(
      "Computing · network 2/3",
    );
  });

  it("formats dates in the local convention of each language", () => {
    const vars = { year: "2026", month: "09", day: "05" };
    setLang("pt");
    expect(t("date.format", vars)).toBe("05/09/2026");
    setLang("en");
    expect(t("date.format", vars)).toBe("09/05/2026");
  });

  it("keeps an unknown placeholder rather than emitting undefined", () => {
    setLang("pt");
    expect(t("result.examOn", {})).toBe("Exame em {date}");
  });

  it("gives the report a language-specific file name", () => {
    setLang("pt");
    expect(t("report.filename")).toBe("idade-ossea");
    setLang("en");
    expect(t("report.filename")).toBe("bone-age");
    setLang("pt");
  });
});
