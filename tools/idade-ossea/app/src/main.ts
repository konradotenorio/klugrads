import "./style.css";
import { klugMobile } from "./klugrads";
import { decodeFile } from "./decode";
import {
  chronologicalMonths,
  rotateClockwise,
  validateCrop,
} from "./processing";
import type { Crop, GrayImage, Result } from "./types";
import { buildReportPdf, type ReportInput, type ReportLabels } from "./report";
import { renderReport } from "./report-view";
import { createImageReview } from "./image-review";
import { readProfessionalAssessment } from "./professional";
import {
  detectLang,
  LANG_STORAGE,
  LANGUAGES,
  lang,
  setLang,
  t,
  type Key,
  type Lang,
} from "./i18n";

setLang(detectLang());

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const fileInput = el<HTMLInputElement>("file-input");
const sex = el<HTMLSelectElement>("sex");
const dob = el<HTMLInputElement>("dob");
const exam = el<HTMLInputElement>("exam-date");
const confirmed = el<HTMLInputElement>("confirm-hand");
const canvas = el<HTMLCanvasElement>("image-canvas");
const ctx = canvas.getContext("2d")!;
const source = document.createElement("canvas");
const sourceCtx = source.getContext("2d")!;
const base = new URL(import.meta.env.BASE_URL, document.baseURI).href;
// Public weights may live on a separate host; same origin unless VITE_WEIGHTS_BASE is set.
const weightsBase = new URL(import.meta.env.VITE_WEIGHTS_BASE || "./", base)
  .href;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
exam.value = today();
let image: GrayImage | undefined;
let filename = "";
let crop: Crop = { x0: 0, y0: 0, x1: 0, y1: 0 };
let worker: Worker | undefined;
let result: Result | undefined;
let busy = false,
  fileGeneration = 0;
let dragging: { x: number; y: number } | undefined;
const imageReview = createImageReview(() => {
  if (!image || busy || !validateCrop(crop, image.width, image.height)) return undefined;
  return { source, crop };
});
for (const id of ["review-image", "review-result-image"])
  el(id).addEventListener("click", () => imageReview.open());
const ageText = (months: number) => {
  const rounded = Math.round(months),
    years = Math.floor(rounded / 12),
    m = rounded % 12;
  return t("age.years", {
    years,
    yearWord: t(years === 1 ? "age.year" : "age.yearPlural"),
    months: m,
    monthWord: t(m === 1 ? "age.month" : "age.monthPlural"),
  });
};
const localDate = (s: string) => {
  const [year, month, day] = s.split("-");
  return t("date.format", { year, month, day });
};

function error(message: string) {
  el("error").textContent = message;
  el("error").hidden = false;
}
function notice(message: string) {
  el("notice").textContent = message;
  el("notice").hidden = false;
}
let statusKey: Key = "model.initial";
function status(key: Key) {
  statusKey = key;
  el("model-status").textContent = t(key);
}
function invalidateResult() {
  imageReview.close();
  result = undefined;
  el<HTMLFormElement>("professional-form").reset();
  el<HTMLDetailsElement>("professional-entry").open = false;
  el("professional-error").hidden = true;
  el("professional-remove").hidden = true;
  el("result").hidden = true;
  el("step-3").classList.remove("active");
}
function refresh() {
  let validDates = true;
  el("chrono").textContent = "—";
  try {
    if (!exam.value) validDates = false;
    if (dob.value && exam.value)
      el("chrono").textContent = ageText(
        chronologicalMonths(dob.value, exam.value),
      );
  } catch {
    validDates = false;
    el("chrono").textContent = t("msg.checkDates");
  }
  el<HTMLButtonElement>("analyze").disabled =
    busy ||
    !image ||
    !sex.value ||
    !confirmed.checked ||
    !validDates ||
    !validateCrop(crop, image.width, image.height);
}
function setBusy(value: boolean) {
  busy = value;
  if (value) dragging = undefined;
  el<HTMLFieldSetElement>("exam-fields").disabled = value;
  for (const id of [
    "prepare",
    "clear-cache",
    "rotate",
    "full-crop",
    "replace",
    "review-image",
  ])
    el<HTMLButtonElement>(id).disabled = value;
  for (const id of ["x0", "y0", "x1", "y1"])
    el<HTMLInputElement>(id).disabled = value;
  fileInput.disabled = value;
  el("cancel").hidden = !value;
  el("progress-area").hidden = !value;
  refresh();
}
function syncCrop() {
  for (const key of ["x0", "y0", "x1", "y1"] as const)
    el<HTMLInputElement>(key).value = String(crop[key]);
  confirmed.checked = false;
  invalidateResult();
  refresh();
  draw();
}
function draw() {
  if (!image) return;
  ctx.drawImage(source, 0, 0);
  ctx.fillStyle = "#08130ba8";
  ctx.fillRect(0, 0, image.width, crop.y0);
  ctx.fillRect(0, crop.y1, image.width, image.height - crop.y1);
  ctx.fillRect(0, crop.y0, crop.x0, crop.y1 - crop.y0);
  ctx.fillRect(crop.x1, crop.y0, image.width - crop.x1, crop.y1 - crop.y0);
  ctx.strokeStyle = "#d5e7b8";
  ctx.lineWidth = Math.max(2, image.width / 350);
  ctx.setLineDash([image.width / 100, image.width / 150]);
  ctx.strokeRect(crop.x0, crop.y0, crop.x1 - crop.x0, crop.y1 - crop.y0);
  ctx.setLineDash([]);
}
function showImage() {
  if (!image) return;
  source.width = canvas.width = image.width;
  source.height = canvas.height = image.height;
  const rgba = sourceCtx.createImageData(image.width, image.height);
  for (let i = 0; i < image.pixels.length; i++) {
    rgba.data[4 * i] =
      rgba.data[4 * i + 1] =
      rgba.data[4 * i + 2] =
        image.pixels[i];
    rgba.data[4 * i + 3] = 255;
  }
  sourceCtx.putImageData(rgba, 0, 0);
  crop = { x0: 0, y0: 0, x1: image.width, y1: image.height };
  syncCrop();
  el("viewer").hidden = false;
  el("dropzone").hidden = true;
  el("image-format").textContent = image.format;
  el("file-info").textContent =
    `${filename} · ${image.width} × ${image.height}`;
  el("step-2").classList.add("active");
}
async function openFile(file: File) {
  if (busy) return;
  const generation = ++fileGeneration;
  invalidateResult();
  image = undefined;
  el("viewer").hidden = true;
  el("dropzone").hidden = false;
  el("error").hidden = el("notice").hidden = true;
  setBusy(true);
  el("progress-label").textContent = t("progress.opening");
  el("progress-percent").textContent = "";
  el<HTMLProgressElement>("progress").removeAttribute("value");
  try {
    const decoded = await decodeFile(file);
    if (generation !== fileGeneration) return;
    image = decoded;
    filename = file.name;
    const entered = sex.value || dob.value;
    sex.value = image.sex || "";
    dob.value = image.dob || "";
    exam.value = image.examDate || today();
    showImage();
    if (image.sex || image.dob || image.examDate) notice(t("msg.dicomFilled"));
    else if (entered) notice(t("msg.fieldsCleared"));
  } catch (e) {
    if (generation === fileGeneration)
      error(e instanceof Error ? e.message : t("msg.openFailed"));
  } finally {
    if (generation === fileGeneration) setBusy(false);
  }
}
const choose = () => {
  if (!busy) fileInput.click();
};
fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) void openFile(fileInput.files[0]);
  fileInput.value = "";
});
el("dropzone").addEventListener("click", choose);
el("dropzone").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    choose();
  }
});
el("replace").addEventListener("click", choose);
for (const name of ["dragenter", "dragover"])
  el("dropzone").addEventListener(name, (e) => {
    e.preventDefault();
    if (!busy) el("dropzone").classList.add("dragging");
  });
for (const name of ["dragleave", "drop"])
  el("dropzone").addEventListener(name, (e) => {
    e.preventDefault();
    el("dropzone").classList.remove("dragging");
  });
el("dropzone").addEventListener("drop", (event) => {
  const files = (event as DragEvent).dataTransfer?.files;
  if (files?.length && !busy) {
    if (files.length !== 1) error(t("msg.oneFile"));
    else void openFile(files[0]);
  }
});
function pointer(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(
    rect.width / image!.width,
    rect.height / image!.height,
  );
  return {
    x: Math.round(
      Math.max(
        0,
        Math.min(
          image!.width,
          (event.clientX -
            rect.left -
            (rect.width - image!.width * scale) / 2) /
            scale,
        ),
      ),
    ),
    y: Math.round(
      Math.max(
        0,
        Math.min(
          image!.height,
          (event.clientY -
            rect.top -
            (rect.height - image!.height * scale) / 2) /
            scale,
        ),
      ),
    ),
  };
}
canvas.addEventListener("pointerdown", (event) => {
  if (!image || busy) return;
  dragging = pointer(event);
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging || !image) return;
  const p = pointer(event);
  crop = {
    x0: Math.min(p.x, dragging.x),
    y0: Math.min(p.y, dragging.y),
    x1: Math.max(p.x, dragging.x),
    y1: Math.max(p.y, dragging.y),
  };
  syncCrop();
});
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(name, () => {
    dragging = undefined;
  });
for (const key of ["x0", "y0", "x1", "y1"] as const)
  el<HTMLInputElement>(key).addEventListener("input", () => {
    crop[key] = Number(el<HTMLInputElement>(key).value);
    confirmed.checked = false;
    invalidateResult();
    refresh();
    if (image && validateCrop(crop, image.width, image.height)) draw();
  });
el("rotate").addEventListener("click", () => {
  if (image && !busy) {
    image = rotateClockwise(image);
    showImage();
  }
});
el("full-crop").addEventListener("click", () => {
  if (image) {
    crop = { x0: 0, y0: 0, x1: image.width, y1: image.height };
    syncCrop();
  }
});
for (const input of [sex, dob, exam, confirmed])
  input.addEventListener("input", () => {
    invalidateResult();
    refresh();
  });

function finishWorker() {
  if (worker) {
    worker.onmessage = worker.onerror = null;
    worker.terminate();
  }
  worker = undefined;
  setBusy(false);
}
function run(mode: "prepare" | "infer") {
  if (busy) return;
  if (mode === "infer" && (!image || !sex.value || !confirmed.checked)) return;
  // terminate() does not retract a message the worker already posted, so a
  // result can still arrive after a reset that cleared the examination fields.
  const generation = ++fileGeneration;
  el("error").hidden = el("notice").hidden = true;
  invalidateResult();
  setBusy(true);
  el("progress-label").textContent = t("progress.model");
  el("progress-percent").textContent = "";
  el<HTMLProgressElement>("progress").value = 0;
  el("progress-detail").textContent =
    mode === "infer" ? t("progress.infer") : t("progress.prepare");
  worker = new Worker(new URL("./inference.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onerror = (event) => {
    if (generation !== fileGeneration) return;
    error(event.message || t("msg.workerStopped"));
    finishWorker();
  };
  worker.onmessage = ({ data }) => {
    if (generation !== fileGeneration) return;
    if (data.type === "progress") {
      const stages: Record<string, Key> = {
        cache: "progress.cache",
        download: "progress.download",
        compute: "progress.compute",
        done: "progress.done",
      };
      el("progress-label").textContent = t("progress.fold", {
        stage: t(stages[data.stage]),
        fold: data.fold + 1,
      });
      const percent = Math.round(
        (100 *
          (data.fold +
            (data.stage === "compute"
              ? 0.7
              : data.stage === "done"
                ? 1
                : data.fraction * (mode === "infer" ? 0.65 : 1)))) /
          3,
      );
      el<HTMLProgressElement>("progress").value = percent;
      el("progress-percent").textContent = `${percent}%`;
    } else if (data.type === "notice") notice(data.message);
    else if (data.type === "error") {
      error(data.message);
      finishWorker();
    } else if (data.type === "ready") {
      finishWorker();
      status("model.ready");
      if (el("notice").hidden) notice(t("msg.readyNotice"));
    } else if (data.type === "result") {
      result = {
        ...data,
        crop: { ...crop },
        sex: sex.value as "male" | "female",
        dob: dob.value,
        examDate: exam.value,
      };
      finishWorker();
      showResult(result!, true);
      status("model.executed");
    }
  };
  worker.postMessage({
    base,
    weightsBase,
    lang: lang(),
    mode,
    image: mode === "infer" ? image : undefined,
    crop,
    sex: sex.value,
  });
}
el("prepare").addEventListener("click", () => run("prepare"));
el("analysis-form").addEventListener("submit", (e) => {
  e.preventDefault();
  refresh();
  if (!el<HTMLButtonElement>("analyze").disabled) run("infer");
});
el("cancel").addEventListener("click", () => {
  ++fileGeneration;
  finishWorker();
  notice(t("msg.cancelled"));
});
el("clear-cache").addEventListener("click", async () => {
  try {
    for (const key of await caches.keys())
      if (
        key.startsWith("bone-age-weights-") ||
        key === "bone-age-model-metadata"
      )
        await caches.delete(key);
    status("model.cleared");
    notice(t("msg.cacheCleared"));
  } catch {
    error(t("msg.cacheBlocked"));
  }
});
const resultChrono = (r: Result) => {
  if (!r.dob) return undefined;
  try {
    return chronologicalMonths(r.dob, r.examDate);
  } catch {
    return undefined;
  }
};
function showResult(r: Result, scroll = false) {
  const radiograph = analysedCanvas(r);
  if (!radiograph) return;
  renderReport(reportInput(r, radiograph), radiograph);
  el("professional-remove").hidden = !r.professional;
  const professionalDate = el<HTMLInputElement>("professional-date");
  professionalDate.min = r.examDate;
  professionalDate.max = today();
  el("result").hidden = false;
  el("step-3").classList.add("active");
  if (scroll)
    el("result").scrollIntoView({ behavior: "smooth", block: "start" });
}
// Shared screen/PDF preview: oriented crop before histogram matching/resizing.
const REPORT_IMAGE_MAX = 1400;
function analysedCanvas(r: Result): HTMLCanvasElement | undefined {
  const width = r.crop.x1 - r.crop.x0,
    height = r.crop.y1 - r.crop.y0;
  if (!source.width || width < 1 || height < 1) return undefined;
  const scale = Math.min(1, REPORT_IMAGE_MAX / Math.max(width, height));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(width * scale));
  out.height = Math.max(1, Math.round(height * scale));
  const context = out.getContext("2d");
  if (!context) return undefined;
  context.drawImage(
    source,
    r.crop.x0,
    r.crop.y0,
    width,
    height,
    0,
    0,
    out.width,
    out.height,
  );
  return out;
}
function reportInput(r: Result, radiograph: HTMLCanvasElement): ReportInput {
  const chrono = resultChrono(r);
  return {
    months: r.months,
    folds: [...r.folds],
    seconds: r.seconds,
    modelId: r.model,
    modelRevision: r.revision,
    sex: r.sex,
    dateOfBirth: r.dob,
    examinationDate: r.examDate,
    chronologicalMonths: chrono,
    crop: { ...r.crop },
    fileName: filename,
    locale: t("app.locale"),
    image: {
      jpeg: new Uint8Array(),
      width: radiograph.width,
      height: radiograph.height,
    },
    labels: reportLabels(r, chrono),
    professional: r.professional ? { ...r.professional } : undefined,
  };
}
function reportLabels(r: Result, chrono: number | undefined): ReportLabels {
  return {
    professionalComparison: {
      heading: t("professional.heading"),
      ageLabel: t("professional.ageLabel"),
      differenceLabel: t("professional.differenceLabel"),
      sourceLabel: t("professional.source"),
      methodLabel: t("professional.method"),
      dateLabel: t("professional.date"),
      notice: t("professional.notice"),
    },
    productName: t("pdf.productName"),
    experimentalBadge: t("workspace.badge"),
    documentTitle: t("pdf.title"),
    documentSubtitle: t("pdf.subtitle"),
    generatedOnTemplate: t("pdf.generatedOn"),
    estimatedBoneAgeLabel: t("result.estimated"),
    estimatedAgeText: ageText(r.months),
    estimatedBoneAgeCaption: t("pdf.ensembleCaption"),
    chronologicalAgeLabel: t("result.chrono"),
    chronologicalAgeText: chrono === undefined ? undefined : ageText(chrono),
    differenceLabel: t("result.difference"),
    differenceCaption: t("result.differenceNote"),
    notInformedValue: t("result.noChrono"),
    notComputedValue: t("report.notComputed"),
    examDataHeading: t("form.title"),
    sexLabel: t("pdf.sexLabel"),
    sexValue: t(r.sex === "male" ? "sex.male" : "sex.female"),
    dateOfBirthLabel: t("pdf.dobLabel"),
    examinationDateLabel: t("form.examDate"),
    sourceFileLabel: t("pdf.fileLabel"),
    analysedImageSizeLabel: t("pdf.imageSizeLabel"),
    radiographHeading: t("pdf.radiograph"),
    radiographCaption: t("pdf.radiographCaption"),
    technicalHeading: t("pdf.technical"),
    ensembleMeanLabel: t("pdf.ensembleMean"),
    networkOutputLabelTemplate: t("pdf.networkOutput"),
    runtimeLabel: t("pdf.runtime"),
    cropLabel: t("pdf.cropLabel"),
    modelLabel: t("pdf.modelLabel"),
    modelRevisionLabel: t("pdf.revisionLabel"),
    executionEnvironmentLabel: t("pdf.environmentLabel"),
    executionEnvironmentValue: t("pdf.environmentValue"),
    preprocessingLabel: t("pdf.preprocessingLabel"),
    preprocessingValue: t("pdf.preprocessingValue"),
    referencesHeading: t("pdf.references"),
    referenceModelLine: t("pdf.refModel"),
    referenceArchitectureLine: t("pdf.refArchitecture"),
    referenceDatasetLine: t("pdf.refDataset"),
    referenceLicenseLine: t("pdf.refLicense"),
    referenceApplicationLine: t("pdf.refApplication"),
    disclaimerHeading: t("pdf.disclaimerHeading"),
    disclaimerText: t("report.disclaimer"),
    privacyNote: t("report.privacy"),
    siteUrl: t("pdf.siteName"),
    siteLink: t("pdf.siteUrl"),
    promoEyebrow: t("pdf.promoEyebrow"),
    promoHeading: t("pdf.promoHeading"),
    promoText: t("pdf.promoText"),
    promoQrCaption: t("pdf.promoQr"),
    pageNumberTemplate: t("pdf.pageNumber"),
    monthsValueTemplate: t("report.monthsValue"),
    secondsValueTemplate: t("pdf.secondsValue"),
    differenceValueTemplate: t("result.differenceMonths"),
    cropValueTemplate: t("pdf.cropValue"),
    imageSizeValueTemplate: t("pdf.imageSizeValue"),
  };
}
el("professional-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!result) return;
  el("professional-error").hidden = true;
  try {
    result.professional = readProfessionalAssessment({
      years: el<HTMLInputElement>("professional-years").value,
      months: el<HTMLInputElement>("professional-months").value,
      method: el<HTMLInputElement>("professional-method").value,
      source: el<HTMLInputElement>("professional-source").value,
      date: el<HTMLInputElement>("professional-date").value,
      sameExam: el<HTMLInputElement>("professional-same-exam").checked,
    }, result.examDate, today());
    showResult(result);
    el<HTMLDetailsElement>("professional-entry").open = false;
    el("professional-entry-summary").focus();
  } catch (cause) {
    el("professional-error").textContent = cause instanceof Error ? cause.message : t("professional.fieldsError");
    el("professional-error").hidden = false;
  }
});
el("professional-remove").addEventListener("click", () => {
  if (!result) return;
  result.professional = undefined;
  el<HTMLFormElement>("professional-form").reset();
  el("professional-error").hidden = true;
  showResult(result);
});
el("download-report").addEventListener("click", () => {
  if (!result) return;
  const r = result;
  const radiograph = analysedCanvas(r);
  if (!radiograph) return error(t("msg.reportFailed"));
  // Snapshot metadata, language and crop before the asynchronous JPEG export.
  const input = reportInput(r, radiograph);
  const downloadName = `${t("report.filename")}-${r.examDate}.pdf`;
  void (async () => {
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        radiograph.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("no image");
      const pdf = buildReportPdf({
        ...input,
        generatedAt: new Date().toISOString(),
        image: {
          ...input.image,
          jpeg: new Uint8Array(await blob.arrayBuffer()),
        },
      });
      const url = URL.createObjectURL(
        new Blob([pdf], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      error(t("msg.reportFailed"));
    }
  })();
});
el("reset").addEventListener("click", () => {
  ++fileGeneration;
  finishWorker();
  invalidateResult();
  image = undefined;
  filename = "";
  dragging = undefined;
  source.width = source.height = canvas.width = canvas.height = 0;
  sex.value = dob.value = fileInput.value = "";
  exam.value = today();
  confirmed.checked = false;
  el("viewer").hidden = true;
  el("dropzone").hidden = false;
  el("error").hidden = el("notice").hidden = true;
  el("image-format").textContent = t("image.localFile");
  el("file-info").textContent = "";
  el("step-2").classList.remove("active");
  refresh();
});
if ("serviceWorker" in navigator && import.meta.env.PROD && !klugMobile) {
  // Updates are offered, never forced: reloading during an analysis would throw
  // away minutes of local computation.
  let updating = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) location.reload();
  });
  navigator.serviceWorker
    .register(new URL("sw.js", base), { scope: new URL("./", base).pathname })
    .then((registration) => {
      const offer = (worker: ServiceWorker | null) => {
        // With no controller this is the first install, not an update.
        if (!worker || !navigator.serviceWorker.controller) return;
        const show = () => {
          if (worker.state !== "installed") return;
          const box = el("notice");
          box.textContent = `${t("msg.updateAvailable")} `;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "text-button";
          button.textContent = t("msg.updateNow");
          button.addEventListener("click", () => {
            updating = true;
            worker.postMessage({ type: "skip-waiting" });
          });
          box.append(button);
          box.hidden = false;
        };
        show();
        worker.addEventListener("statechange", show);
      };
      offer(registration.waiting);
      registration.addEventListener("updatefound", () =>
        offer(registration.installing),
      );
    })
    .catch(() => notice(t("msg.noOffline")));
}
// Static copy carries data-i18n (text), data-i18n-html (text with markup) and
// the attribute variants below. Values come from our own dictionary, never from
// user input, so innerHTML is safe here.
const I18N_ATTRIBUTES: [string, string, string][] = [
  ["[data-i18n-title]", "title", "i18nTitle"],
  ["[data-i18n-aria-label]", "aria-label", "i18nAriaLabel"],
  ["[data-i18n-content]", "content", "i18nContent"],
];
function applyTranslations() {
  document.documentElement.lang = t("app.htmlLang");
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]"))
    node.textContent = t(node.dataset.i18n as Key);
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n-html]"))
    node.innerHTML = t(node.dataset.i18nHtml as Key);
  for (const [selector, attribute, dataset] of I18N_ATTRIBUTES)
    for (const node of document.querySelectorAll<HTMLElement>(selector))
      node.setAttribute(attribute, t(node.dataset[dataset] as Key));
}
function applyLang(value: Lang, persist: boolean) {
  setLang(value);
  if (persist)
    try {
      localStorage.setItem(LANG_STORAGE, value);
    } catch {
      /* Private modes reject storage; the choice then lasts for this page only. */
    }
  for (const code of LANGUAGES)
    el(`lang-${code}`).setAttribute("aria-pressed", String(code === value));
  applyTranslations();
  el("model-status").textContent = t(statusKey);
  el("image-format").textContent = image ? image.format : t("image.localFile");
  if (image)
    el("file-info").textContent =
      `${filename} · ${image.width} × ${image.height}`;
  // Transient messages were written in the previous language; drop them.
  el("error").hidden = el("notice").hidden = true;
  if (result) showResult(result);
  refresh();
}
for (const code of LANGUAGES)
  el(`lang-${code}`).addEventListener("click", () => applyLang(code, true));
applyLang(lang(), false);
