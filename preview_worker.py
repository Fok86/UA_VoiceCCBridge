#!/usr/bin/env python3
import sys, os, json, base64, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "bin"))
from PIL import Image, ImageEnhance
import numpy as np

try:
    from scipy import ndimage
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

def apply_filters(img, cfg):
    if cfg.get("brightness", 1.0) != 1.0:
        img = ImageEnhance.Brightness(img).enhance(cfg["brightness"])
    if cfg.get("contrast", 1.0) != 1.0:
        img = ImageEnhance.Contrast(img).enhance(cfg["contrast"])

    if cfg.get("outline_filter", False):
        def _dilate(m, r):
            if HAS_SCIPY:
                y, x = np.ogrid[-r:r+1, -r:r+1]
                kernel = (x*x + y*y <= r*r).astype(np.uint8)
                return ndimage.binary_dilation(m, structure=kernel).astype(bool)
            else:
                a = m.astype(np.uint8)
                res = np.zeros_like(a)
                for dy in range(-r, r+1):
                    for dx in range(-r, r+1):
                        if dy*dy + dx*dx <= r*r:
                            res |= np.roll(np.roll(a, dy, axis=0), dx, axis=1)
                return res.astype(bool)
        color = cfg.get("color_filter", "W")
        oh_min = int(cfg.get("outline_hmin", 0))
        oh_max = int(cfg.get("outline_hmax", 255))
        dark_thr = int(cfg.get("outline_dark", 80))
        radius = int(cfg.get("outline_radius", 3))
        arr = np.array(img.convert("RGB"), dtype=np.int16)
        R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        if   color == "R": diff = R - np.maximum(G, B); mask = (diff >= oh_min) & (diff <= oh_max)
        elif color == "G": diff = G - np.maximum(R, B); mask = (diff >= oh_min) & (diff <= oh_max)
        elif color == "B": diff = B - np.maximum(R, G); mask = (diff >= oh_min) & (diff <= oh_max)
        elif color == "Y": diff = np.minimum(R,G) - B;  mask = (diff >= oh_min) & (diff <= oh_max)
        elif color == "W":
            val = np.minimum(np.minimum(R, G), B)
            mask = (val >= (255 - oh_max)) & (val <= (255 - oh_min))
        elif color == "S":
            diff = np.maximum(np.maximum(np.abs(R-G), np.abs(G-B)), np.abs(R-B))
            mask = (diff <= oh_max) & ((R+G+B)//3 >= oh_min)
        else: mask = np.ones(R.shape, dtype=bool)
        gray = np.array(img.convert("L"))
        dilated = _dilate(mask, radius)
        outline_zone = dilated & ~mask
        dark_in_outline = (gray < dark_thr) & outline_zone
        has_dark = _dilate(dark_in_outline, radius)
        result = np.zeros_like(gray)
        result[mask & has_dark] = 255
        img = Image.fromarray(result).convert("RGB")
    else:
        color = cfg.get("color_filter", "none")
        hardness = int(cfg.get("hardness", 30))
        if color != "none":
            arr = np.array(img.convert("RGB"), dtype=np.int16)
            R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]
            if   color == "R": mask = (R - np.maximum(G, B)) > hardness
            elif color == "G": mask = (G - np.maximum(R, B)) > hardness
            elif color == "B": mask = (B - np.maximum(R, G)) > hardness
            elif color == "Y": mask = (np.minimum(R, G) - B) > hardness
            elif color == "W": mask = np.minimum(np.minimum(R, G), B) > (255 - hardness)
            elif color == "S": mask = (np.abs(R.astype(np.int16) - G) < hardness) & (np.abs(G.astype(np.int16) - B) < hardness) & (R > 100)
            else: mask = np.ones(R.shape, dtype=bool)
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
