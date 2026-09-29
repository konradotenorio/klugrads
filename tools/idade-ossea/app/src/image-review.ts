import type { Crop } from "./types";

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** A local visual inspection aid. No image-quality or anatomy classification. */
export function createImageReview(getImage: () => { source: HTMLCanvasElement; crop: Crop } | undefined) {
  const dialog = el<HTMLDialogElement>("image-review");
  const canvas = el<HTMLCanvasElement>("review-canvas");
  const viewport = el("review-viewport");
  const zoom = el<HTMLInputElement>("review-zoom");
  let mode: "crop" | "full" = "crop";

  function resize() {
    if (!dialog.open || !canvas.width || !canvas.height) return;
    const fit = Math.min((viewport.clientWidth - 32) / canvas.width,
      (viewport.clientHeight - 32) / canvas.height);
    const factor = fit * Number(zoom.value);
    canvas.style.width = `${Math.max(1, canvas.width * factor)}px`;
    canvas.style.height = `${Math.max(1, canvas.height * factor)}px`;
    el("review-zoom-value").textContent = `${Math.round(Number(zoom.value) * 100)}%`;
  }
  function draw() {
    const image = getImage();
    if (!image) return;
    const region = mode === "crop" ? image.crop
      : { x0: 0, y0: 0, x1: image.source.width, y1: image.source.height };
    const width = region.x1 - region.x0, height = region.y1 - region.y0;
    const scale = Math.min(1, 2400 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")!.drawImage(image.source, region.x0, region.y0, width, height,
      0, 0, canvas.width, canvas.height);
    for (const option of ["crop", "full"])
      el(`review-${option}`).setAttribute("aria-pressed", String(mode === option));
    zoom.value = "1";
    resize();
    viewport.scrollTo(0, 0);
  }
  for (const option of ["crop", "full"] as const)
    el(`review-${option}`).addEventListener("click", () => { mode = option; draw(); });
  el("review-close").addEventListener("click", () => dialog.close());
  el("review-fit").addEventListener("click", () => { zoom.value = "1"; resize(); viewport.scrollTo(0, 0); });
  zoom.addEventListener("input", resize);
  window.addEventListener("resize", resize);
  dialog.addEventListener("close", () => { canvas.width = canvas.height = 0; });
  return {
    open() {
      if (!getImage()) return;
      mode = "crop";
      dialog.showModal();
      draw();
    },
    close() { if (dialog.open) dialog.close(); },
  };
}
