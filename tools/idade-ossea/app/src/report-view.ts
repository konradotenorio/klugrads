import type { ReportInput } from "./report";
import { presentReport, scaleOf } from "./report-presentation";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

function fields(id: string, rows: { label: string; value: string }[]) {
  el(id).replaceChildren(
    ...rows.map(({ label, value }) => {
      const cell = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      cell.append(term, description);
      return cell;
    }),
  );
}

export function renderReport(
  input: ReportInput,
  radiograph: HTMLCanvasElement,
) {
  const p = presentReport(input);
  const l = input.labels;
  el("result-months").textContent = p.estimatedValue;
  el("result-age").textContent = l.estimatedAgeText;
  el("result-chrono").textContent = p.chronologicalValue;
  el("result-chrono-age").textContent = l.chronologicalAgeText || "";
  el("result-difference").textContent = p.differenceValue;
  el("professional-comparison").hidden = !p.professional;
  fields("professional-comparison-data", p.professional?.fields || []);
  fields("result-exam-data", p.examFields);
  fields("execution-details", [
    ...p.technicalFields,
    { label: l.preprocessingLabel, value: l.preprocessingValue },
  ]);

  const values = [
    input.months,
    ...(p.chronological === undefined ? [] : [p.chronological]),
  ];
  const axis = scaleOf(values);
  el("age-scale-min").textContent = p.monthsValue(axis.min, 0);
  el("age-scale-max").textContent = p.monthsValue(axis.max, 0);
  el("age-estimate-marker").style.left = `${axis.at(input.months)}%`;
  el("age-chrono-marker").hidden = p.chronological === undefined;
  el("age-chrono-legend").hidden = p.chronological === undefined;
  el("age-comparison-span").hidden = p.chronological === undefined;
  if (p.chronological !== undefined) {
    el("age-chrono-marker").style.left = `${axis.at(p.chronological)}%`;
    el("age-comparison-span").style.left =
      `${Math.min(...values.map(axis.at))}%`;
    el("age-comparison-span").style.width =
      `${Math.abs(axis.at(input.months) - axis.at(p.chronological))}%`;
  }

  const plate = el<HTMLCanvasElement>("result-radiograph");
  plate.width = radiograph.width;
  plate.height = radiograph.height;
  plate.getContext("2d")!.drawImage(radiograph, 0, 0);

  const foldAxis = scaleOf([...input.folds, input.months]);
  el("result-mean").textContent = p.meanValue;
  el("result-networks").replaceChildren(
    ...p.folds.map((fold) => {
      const row = document.createElement("div");
      row.className = "network-row";
      const name = document.createElement("span");
      name.textContent = fold.label;
      const rail = document.createElement("span");
      rail.className = "network-rail";
      rail.setAttribute("aria-hidden", "true");
      const mean = document.createElement("i");
      mean.className = "network-mean";
      mean.style.left = `${foldAxis.at(input.months)}%`;
      const dot = document.createElement("i");
      dot.className = "network-dot";
      dot.style.left = `${foldAxis.at(fold.months)}%`;
      rail.append(mean, dot);
      const value = document.createElement("span");
      value.textContent = fold.value;
      row.append(name, rail, value);
      return row;
    }),
  );
  el("result-references").replaceChildren(
    ...p.references.map((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    }),
  );
}
