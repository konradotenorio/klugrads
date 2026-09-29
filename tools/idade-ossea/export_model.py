"""Exporta UMA rede (net0) do modelo ianpan/bone-age para ONNX FP32, para rodar no navegador.

Adaptado de feliperun/bone-age (scripts/export_web_model.py, licença MIT), que exporta
as três redes do conjunto original. Aqui exportamos só a primeira (decisão do projeto:
um modelo, ~1/3 do download). O modelo original é de Ian Pan (Apache-2.0).

Saída (pasta --output):
  bone-age-0.onnx   rede exportada
  reference.json    histograma da imagem de referência (usado no casamento de histograma)
  manifest.json     tamanho e SHA-256 do arquivo, revisão e licença
  LEIA-ME.txt + licenças de terceiros
Cada exportação é conferida contra a rede PyTorch original (falha se o erro passar de 0,002 mês).
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
import onnx
import onnxruntime as ort
import torch
from huggingface_hub import hf_hub_download
from transformers import AutoModel

MODEL_ID = "ianpan/bone-age"
REVISION = "2ab81275b84e9f518f04584177221a1d8c1dc1a5"   # a mesma revisão validada pelo feliperun/bone-age
FOLD = 0


class WebFold(torch.nn.Module):
    """Canal de sexo equivalente, sem indexação booleana (ScatterND), para portabilidade em WASM."""
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
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--output", type=Path, default=Path("modelo-idade-ossea"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2)
    torch.manual_seed(20260905)

    model = AutoModel.from_pretrained(MODEL_ID, revision=REVISION, trust_remote_code=True).eval()
    ref = cv2.imread(hf_hub_download(MODEL_ID, "ref_img.png", revision=REVISION), 0)
    (args.output / "reference.json").write_text(json.dumps({"counts": np.bincount(ref.ravel(), minlength=256).tolist()}))

    net = getattr(model, f"net{FOLD}")
    wrapper = WebFold(net).eval()
    path = args.output / f"bone-age-{FOLD}.onnx"
    image = torch.randint(0, 256, (1, 1, 512, 512)).float()
    torch.onnx.export(wrapper, (image, torch.tensor([0.0])), str(path),
                      input_names=["image", "female"], output_names=["months"],
                      opset_version=17, dynamo=False)
    onnx.checker.check_model(str(path))

    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
    worst = 0.0
    with torch.inference_mode():
        for sex in (0.0, 1.0):
            female = torch.tensor([sex])
            expected = net(image, female).item()
            actual = session.run(None, {"image": image.numpy(), "female": female.numpy()})[0].item()
            error = abs(expected - actual)
            print(f"female={sex}: torch={expected:.6f} onnx={actual:.6f} erro={error:.6f}", flush=True)
            if error > 0.002:
                raise AssertionError(f"validação numérica falhou: {error}")
            worst = max(worst, error)

    data = path.read_bytes()
    manifest = {
        "id": MODEL_ID, "revision": REVISION, "fold": FOLD, "format": "ONNX FP32", "opset": 17,
        "inputSize": 512, "license": "Apache-2.0", "reference": "reference.json",
        "models": [{"file": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                    "maxValidationErrorMonths": worst}],
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    here = Path(__file__).resolve().parent
    for src in (here.parent.parent / "licencas").glob("*.txt"):
        shutil.copy(src, args.output / src.name)
    (args.output / "LEIA-ME.txt").write_text(
        "Modelo de idade óssea para o KlugRads.\n"
        f"Origem: {MODEL_ID} (Ian Pan, Apache-2.0), revisão {REVISION}.\n"
        f"Alterações: apenas a rede net{FOLD} foi exportada para ONNX FP32; o canal de sexo foi reescrito\n"
        "de forma equivalente (sem indexação booleana) para rodar em WebAssembly. Pesos treinados preservados.\n"
        "Uso educacional e de pesquisa; sem aprovação regulatória e sem validação clínica.\n", encoding="utf-8")
    print(f"Pronto: {path.name} — {len(data)/1e6:.1f} MB — sha256 {manifest['models'][0]['sha256'][:16]}…", flush=True)


if __name__ == "__main__":
    main()
