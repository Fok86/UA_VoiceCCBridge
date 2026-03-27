#!/usr/bin/env python3
# Викликається з main.py: preview_worker.py <image_path> <config_json>
# Повертає base64 JPEG зображення з фільтрами

import sys
import os
import json
import base64
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "bin"))

from PIL import Image, ImageEnhance
import numpy as np

def apply_filters(img, cfg):
    if cfg.get("brightness", 1.0) != 1.0:
        img = ImageEnhance.Brightness(img).enhance(cfg["brightness"])
    if cfg.get("contrast", 1.0) != 1.0:
        img = ImageEnhance.Contrast(img).enhance(cfg["contrast"])

    color = cfg.get("color_filter", "none")
    hardness = int(cfg.get("hardness", 30))

    if color != "none":
        arr = np.array(img.convert("RGB"), dtype=np.int16)
        R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        if color == "R":   mask = (R - np.maximum(G, B)) > hardness
        elif color == "G": mask = (G - np.maximum(R, B)) > hardness
        elif color == "B": mask = (B - np.maximum(R, G)) > hardness
        elif color == "Y": mask = (np.minimum(R, G) - B) > hardness
        elif color == "W": mask = np.minimum(np.minimum(R, G), B) > (255 - hardness)
        else:              mask = np.ones(R.shape, dtype=bool)
        result = np.zeros_like(arr, dtype=np.uint8)
        result[mask] = 255
        img = Image.fromarray(result.astype(np.uint8))
    elif cfg.get("bw", False):
        img = img.convert("L").convert("RGB")

    return img

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    img_path = sys.argv[1]
    cfg = json.loads(sys.argv[2])

    img = Image.open(img_path)
    img = apply_filters(img, cfg)

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=80)
    print(base64.b64encode(buf.getvalue()).decode("utf-8"))