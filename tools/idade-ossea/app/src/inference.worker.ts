import * as ort from "onnxruntime-web/wasm";
import { cropPixels, matchHistogram, resizeAndPad } from "./processing";
import type { Manifest, ModelFile } from "./types";
import { setLang, t } from "./i18n";

const tell = (data: object) => self.postMessage(data);
const sha256 = async (data: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data))),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

// Model metadata can live on another origin, outside the service worker precache.
// Revalidate when online, fall back to the copy kept for offline use.
const METADATA_CACHE = "bone-age-model-metadata";
async function loadMetadata(url: URL) {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(METADATA_CACHE);
  } catch {
    /* Private modes without cache storage still work while online. */
  }
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    try {
      await cache?.put(url, response.clone());
    } catch {
      /* No space for the offline copy; the response itself is still usable. */
    }
    return response;
  } catch (networkError) {
    const cached = await cache?.match(url);
    if (cached) return cached;
    throw networkError;
  }
}

async function loadWeights(
  weightsBase: string,
  manifest: Manifest,
  entry: ModelFile,
  index: number,
) {
  const url = new URL(
    `models/${entry.file}?sha256=${entry.sha256}`,
    weightsBase,
  ).href;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(`bone-age-weights-${manifest.revision}`);
  } catch {
    tell({
      type: "notice",
      message:
        t("worker.noCache"),
    });
  }
  const cached = await cache?.match(url);
  if (cached) {
    const data = new Uint8Array(await cached.arrayBuffer());
    if (
      data.byteLength === entry.bytes &&
      (await sha256(data)) === entry.sha256
    ) {
      tell({ type: "progress", stage: "cache", fold: index, fraction: 1 });
      return data;
    }
    await cache?.delete(url);
  }
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      t("worker.downloadFailed", { fold: index + 1, status: response.status }),
    );
  const data = new Uint8Array(entry.bytes);
  const reader = response.body!.getReader();
  let offset = 0,
    lastUpdate = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (offset + value.length > data.length)
      throw new Error(t("worker.badSize"));
    data.set(value, offset);
    offset += value.length;
    if (performance.now() - lastUpdate > 120) {
      tell({
        type: "progress",
        stage: "download",
        fold: index,
        fraction: offset / entry.bytes,
      });
      lastUpdate = performance.now();
    }
  }
  if (offset !== entry.bytes || (await sha256(data)) !== entry.sha256)
    throw new Error(
      t("worker.integrity"),
    );
  try {
    await cache?.put(
      url,
      new Response(data, {
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
  } catch {
    tell({
      type: "notice",
      message:
        t("worker.noSpace"),
    });
  }
  return data;
}

self.onmessage = async ({ data }) => {
  try {
    const { base, weightsBase, mode } = data;
    setLang(data.lang);
    const manifestResponse = await loadMetadata(
      new URL("models/manifest.json", weightsBase),
    ).catch(() => undefined);
    if (!manifestResponse)
      throw new Error(t("worker.unavailable"));
    const manifest: Manifest = await manifestResponse.json();
    if (manifest.models.length !== 3)
      throw new Error(t("worker.badManifest"));
    ort.env.wasm.wasmPaths = new URL("runtime/", base).href;
    // The host supplies no COOP/COEP. Single-thread WASM works without SharedArrayBuffer.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.logLevel = "error";
    const started = performance.now();
    let input: Float32Array | undefined;
    if (mode === "infer") {
      const referenceResponse = await loadMetadata(
        new URL(`models/${manifest.reference}`, weightsBase),
      ).catch(() => undefined);
      if (!referenceResponse)
        throw new Error(t("worker.noReference"));
      const reference = await referenceResponse.json();
      const crop = cropPixels(data.image, data.crop);
      if (crop.pixels.every((value) => value === crop.pixels[0]))
        throw new Error(
          t("worker.noContrast"),
        );
      const pixels = matchHistogram(crop.pixels, reference.counts);
      input = resizeAndPad(pixels, crop.width, crop.height);
    }
    const folds: number[] = [];
    for (let i = 0; i < manifest.models.length; i++) {
      const weights = await loadWeights(
        weightsBase,
        manifest,
        manifest.models[i],
        i,
      );
      if (mode === "infer") {
        tell({ type: "progress", stage: "compute", fold: i, fraction: 0 });
        const session = await ort.InferenceSession.create(weights, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });
        try {
          const imageTensor = new ort.Tensor(
            "float32",
            input!,
            [1, 1, 512, 512],
          );
          const sexTensor = new ort.Tensor(
            "float32",
            Float32Array.of(data.sex === "female" ? 1 : 0),
            [1],
          );
          const output = await session.run({
            image: imageTensor,
            female: sexTensor,
          });
          const months = Number(output.months.data[0]);
          imageTensor.dispose();
          sexTensor.dispose();
          output.months.dispose();
          if (!Number.isFinite(months) || months < 0 || months > 239)
            throw new Error(t("worker.badOutput"));
          folds.push(months);
        } finally {
          await session.release();
        }
      }
      tell({ type: "progress", stage: "done", fold: i, fraction: 1 });
    }
    if (mode === "prepare") tell({ type: "ready" });
    else
      tell({
        type: "result",
        months: folds.reduce((a, b) => a + b, 0) / folds.length,
        folds,
        seconds: (performance.now() - started) / 1000,
        revision: manifest.revision,
        model: manifest.id,
      });
  } catch (error) {
    tell({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : t("worker.failed"),
    });
  }
};
