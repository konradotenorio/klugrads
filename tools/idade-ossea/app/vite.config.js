import { defineConfig, loadEnv } from "vite";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

// Relative assets keep the app working under any path and in local previews.
export default defineConfig(({ mode }) => {
  // The page's own CSP must allow the host that serves the public weights.
  const weightsBase = loadEnv(mode, process.cwd(), "VITE_").VITE_WEIGHTS_BASE;
  const weightsOrigin = /^https?:\/\//.test(weightsBase || "")
    ? new URL(weightsBase).origin
    : "";
  return {
    base: "./",
    worker: { format: "es" },
    plugins: [
      {
        name: "weights-origin-csp",
        transformIndexHtml: {
          order: "pre",
          handler: (html) =>
            html.replace(" __WEIGHTS_ORIGIN__", weightsOrigin && ` ${weightsOrigin}`),
        },
      },
      {
        name: "local-wasm-runtime",
        closeBundle() {
          mkdirSync("dist/runtime", { recursive: true });
          for (const file of [
            "ort-wasm-simd-threaded.wasm",
            "ort-wasm-simd-threaded.mjs",
          ]) {
            copyFileSync(
              resolve("node_modules/onnxruntime-web/dist", file),
              resolve("dist/runtime", file),
            );
          }
          const walk = (directory, prefix = "") =>
            readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
              const path = prefix + entry.name;
              return entry.isDirectory()
                ? walk(resolve(directory, entry.name), path + "/")
                : [path];
            });
          const files = walk("dist").filter(
            (path) =>
              !path.endsWith(".onnx") &&
              path !== "sw.js" &&
              !path.startsWith("demo/"),
          );
          const version = createHash("sha256");
          version.update(readFileSync("sw-template.js"));
          for (const path of files)
            version.update(readFileSync(resolve("dist", path)));
          const template = readFileSync("sw-template.js", "utf8")
            .replace("__VERSION__", version.digest("hex").slice(0, 16))
            .replace(
              "__PRECACHE__",
              JSON.stringify(["./", ...files.map((path) => "./" + path)]),
            );
          writeFileSync("dist/sw.js", template);
        },
        configureServer(server) {
          server.middlewares.use("/runtime", async (req, res, next) => {
            const file = req.url?.split("?")[0]?.slice(1);
            if (
              ![
                "ort-wasm-simd-threaded.wasm",
                "ort-wasm-simd-threaded.mjs",
              ].includes(file)
            )
              return next();
            const { readFile } = await import("node:fs/promises");
            res.setHeader(
              "Content-Type",
              file.endsWith(".wasm") ? "application/wasm" : "text/javascript",
            );
            res.end(
              await readFile(resolve("node_modules/onnxruntime-web/dist", file)),
            );
          });
        },
      },
    ],
  };
});
