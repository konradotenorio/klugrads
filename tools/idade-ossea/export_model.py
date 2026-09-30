# Copiado sem alterações de feliperun/bone-age (scripts/export_web_model.py, commit 625898a, licença MIT).
# Exporta as 3 redes do modelo ianpan/bone-age (Ian Pan, Apache-2.0) para ONNX FP32, valida cada uma contra o PyTorch
# original e grava manifest.json + reference.json. Uso: python tools/idade-ossea/export_model.py --output saida/models
# Copyright (c) 2026 feliperun — ver licencas/feliperun-bone-age-MIT.txt
"""Export the pinned ensemble for local WASM inference; validate every fold."""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
import onnx
import onnxruntime as ort
import torch
from huggingface_hub import hf_hub_download
from transformers import AutoModel

MODEL_ID = "ianpan/bone-age"
REVISION = "2ab81275b84e9f518f04584177221a1d8c1dc1a5"


class WebFold(torch.nn.Module):
    """Equivalent sex channel without boolean-index ScatterND for portability."""
    def __init__(self, net):
        super().__init__()
        self.net = net

    def forward(self, image, female):
        sex_channel = torch.ones_like(image) * female.reshape(1, 1, 1, 1) * 255.0
        x = self.net.normalize(torch.cat([image, sex_channel], dim=1))
        features = self.net.pooling(self.net.backbone(x))
        logits = self.net.linear(self.net.dropout(features))
        return (logits.softmax(1) * torch.arange(240, device=image.device)).sum(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("web/public/models"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2)
    torch.manual_seed(20260905)
    model = AutoModel.from_pretrained(MODEL_ID, revision=REVISION,
                                      trust_remote_code=True).eval()
    ref_path = hf_hub_download(MODEL_ID, "ref_img.png", revision=REVISION)
    ref = cv2.imread(ref_path, 0)
    counts = np.bincount(ref.ravel(), minlength=256)
    reference = {"counts": counts.tolist()}
    (args.output / "reference.json").write_text(json.dumps(reference))
    image = torch.randint(0, 256, (1, 1, 512, 512)).float()
    female = torch.tensor([0.0])
    entries = []
    for i in range(3):
        net = getattr(model, f"net{i}")
        wrapper = WebFold(net).eval()
        path = args.output / f"bone-age-{i}.onnx"
        print(f"Exporting {path}", flush=True)
        torch.onnx.export(wrapper, (image, female), str(path),
                          input_names=["image", "female"], output_names=["months"],
                          opset_version=17, dynamo=False)
        onnx.checker.check_model(str(path))
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
        errors = []
        with torch.inference_mode():
            for sex in [0.0, 1.0]:
                female = torch.tensor([sex])
                expected = net(image, female).item()
                actual = session.run(None, {"image": image.numpy(), "female": female.numpy()})[0].item()
                error = abs(expected - actual)
                print(f"fold={i} female={sex}: torch={expected:.6f} onnx={actual:.6f} error={error:.6f}", flush=True)
                if error > 0.002:
                    raise AssertionError(f"ONNX numerical validation failed: {error}")
                errors.append(error)
        del session
        entries.append({"file": path.name, "bytes": path.stat().st_size,
                        "sha256": hashlib.file_digest(path.open("rb"), "sha256").hexdigest(),
                        "maxValidationErrorMonths": max(errors)})
    manifest = {"id": MODEL_ID, "revision": REVISION, "format": "ONNX FP32",
                "opset": 17, "inputSize": 512, "license": "Apache-2.0",
                "reference": "reference.json", "models": entries,
                "totalBytes": sum(entry["bytes"] for entry in entries)}
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Validated all 3 folds. Total: {manifest['totalBytes'] / 1e6:.1f} MB", flush=True)


if __name__ == "__main__":
    main()
