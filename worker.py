#!/usr/bin/env python3
"""
UA Voice Bridge — головний воркер v2
tesserocr API постійно в пам'яті + Piper постійний процес
"""
import os, sys, json, time, subprocess, signal, threading

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))

# Додаємо bin/ і tesserocr.libs до шляхів
sys.path.insert(0, os.path.join(PLUGIN_DIR, "bin"))
sys.path.insert(0, PLUGIN_DIR)
_tess_libs = os.path.join(PLUGIN_DIR, "bin", "tesserocr.libs")
if os.path.exists(_tess_libs):
    os.environ["LD_LIBRARY_PATH"] = _tess_libs + ":" + os.environ.get("LD_LIBRARY_PATH", "")

from PIL import Image, ImageEnhance
import numpy as np
import tesserocr

# Фільтри тексту — окремий модуль
from uk_filter import filter_text, normalize, decide, trim_incomplete_word, UA_VOWELS

CONFIG_PATH = "/home/deck/.config/ua_voice_plugin/config.json"
TESSDATA    = os.path.join(PLUGIN_DIR, "tessdata/")
PIPER_DIR   = os.path.join(PLUGIN_DIR, "piper")
PIPER_BIN   = os.path.join(PIPER_DIR, "piper")
MODEL       = os.path.join(PIPER_DIR, "uk_UA-ukrainian_tts-medium.onnx")
SCREEN_W, SCREEN_H = 1280, 800

piper_env = {
    "PATH": "/usr/local/bin:/usr/bin:/usr/sbin",
    "HOME": "/home/deck",
    "XDG_RUNTIME_DIR": "/run/user/1000",
    "PULSE_RUNTIME_PATH": "/run/user/1000/pulse",
    "LD_LIBRARY_PATH": PIPER_DIR,
}

# ── Конфіг ────────────────────────────────────────────────────────────────────
def load_config():
    defaults = {
        "offset_bottom": 50, "width": 900, "height": 80,
        "bw": False, "contrast": 1.0, "brightness": 1.0,
        "color_filter": "none", "hardness": 30,
        "ocr_interval": 1000, "ocr_min_len": 3, "ocr_ignore_words": "",
        "ocr_psm": 6, "ocr_similarity": 80,
        "typewriter_mode": False, "typewriter_threshold": 80,
        "tts_speaker": 1, "tts_speed": 0.8,
    }
    try:
        with open(CONFIG_PATH) as f:
            return {**defaults, **json.load(f)}
    except:
        return defaults

# ── Фільтри зображення ────────────────────────────────────────────────────────
def apply_filters(img, cfg):
    # Різкість (до кольорового фільтру)
    sharpen = int(cfg.get("sharpen", 0))
    sharpen_radius = float(cfg.get("sharpen_radius", 2.0))
    if sharpen > 0:
        from PIL import ImageFilter
        img = img.filter(ImageFilter.UnsharpMask(
            radius=sharpen_radius, percent=sharpen, threshold=3))
    if cfg.get("brightness", 1.0) != 1.0:
        img = ImageEnhance.Brightness(img).enhance(cfg["brightness"])
    if cfg.get("contrast", 1.0) != 1.0:
        img = ImageEnhance.Contrast(img).enhance(cfg["contrast"])
    color    = cfg.get("color_filter", "none")
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
        else:              mask = np.ones(R.shape, dtype=bool)
        result = np.zeros_like(arr, dtype=np.uint8)
        result[mask] = 255
        img = Image.fromarray(result.astype(np.uint8))
    elif cfg.get("bw", False):
        img = img.convert("L").convert("RGB")
    return img


# ── TTS — постійний Piper процес ─────────────────────────────────────────────
_piper_proc = None
_piper_lock = threading.Lock()

def start_piper(cfg):
    global _piper_proc
    speaker     = int(cfg.get("tts_speaker", 1))
    speed       = float(cfg.get("tts_speed", 1.0))
    noise_scale = float(cfg.get("tts_noise_scale", 0.667))
    noise_w     = float(cfg.get("tts_noise_w", 0.8))
    _piper_proc = subprocess.Popen(
        [PIPER_BIN, "--model", MODEL,
         "--speaker",     str(speaker),
         "--length_scale", str(speed),
         "--noise_scale",  str(noise_scale),
         "--noise_w",      str(noise_w),
         "--output_raw"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=piper_env, cwd=PIPER_DIR,
    )
    subprocess.Popen(
        ["aplay", "-r", "22050", "-f", "S16_LE", "-t", "raw", "-"],
        stdin=_piper_proc.stdout,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=piper_env,
    )
    def _log_stderr():
        for line in _piper_proc.stderr:
            line = line.decode().strip()
            if "Real-time factor" in line or "Loaded" in line:
                print(f"[Piper] {line}", flush=True)
    threading.Thread(target=_log_stderr, daemon=True).start()
    print("Piper запущено", flush=True)

def speak(text, cfg):
    global _piper_proc
    with _piper_lock:
        if _piper_proc is None or _piper_proc.poll() is not None:
            start_piper(cfg)
        try:
            _piper_proc.stdin.write((text + "\n").encode("utf-8"))
            _piper_proc.stdin.flush()
        except Exception as e:
            print(f"Piper write error: {e}", file=sys.stderr)
            _piper_proc = None

# ── Знімок ────────────────────────────────────────────────────────────────────
def take_screenshot(cfg):
    w = cfg["width"]; h = cfg["height"]; ob = cfg["offset_bottom"]
    l = (SCREEN_W - w) // 2; r = (SCREEN_W - w) // 2
    top = SCREEN_H - ob - h; bot = ob
    tmp = "/dev/shm/ua_tmp.png"; final = "/dev/shm/deck_bottom.png"
    try:
        subprocess.run([
            "gst-launch-1.0", "pipewiresrc", "num-buffers=1", "!",
            "videoconvert", "!",
            "videocrop", f"top={top}", f"bottom={bot}", f"left={l}", f"right={r}", "!",
            "pngenc", "snapshot=true", "!", "filesink", f"location={tmp}"
        ], capture_output=True, timeout=3)
    except subprocess.TimeoutExpired:
        return None
    if os.path.exists(tmp) and os.path.getsize(tmp) > 0:
        os.rename(tmp, final)
        return final
    return None

# ── Головний цикл ─────────────────────────────────────────────────────────────
def main():
    print(f"=== ВОРКЕР ЗАПУЩЕНО {time.strftime('%c')} ===", flush=True)

    cfg = load_config()
    cfg_mtime = os.path.getmtime(CONFIG_PATH) if os.path.exists(CONFIG_PATH) else 0

    t0 = time.monotonic()
    ocr_api = tesserocr.PyTessBaseAPI(lang="ukr", path=TESSDATA, oem=1, psm=cfg.get("ocr_psm", 6))
    print(f"tesserocr готовий за {(time.monotonic()-t0)*1000:.0f} мс", flush=True)

    start_piper(cfg)

    last_text = ""
    running = True

    def stop(sig, frame):
        nonlocal running
        running = False
        ocr_api.End()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    while running:
        t_start = time.monotonic()

        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if mtime != cfg_mtime:
                old_speaker = cfg.get("tts_speaker", 1)
                old_speed   = cfg.get("tts_speed", 0.8)
                cfg = load_config()
                cfg_mtime = mtime
                last_text = ""  # скидаємо при зміні гри/конфігу
                ocr_api.SetVariable("tessedit_pageseg_mode", str(cfg.get("ocr_psm", 6)))
                if (cfg.get("tts_speaker", 1) != old_speaker or
                    cfg.get("tts_speed", 1.0) != old_speed):
                    if _piper_proc and _piper_proc.poll() is None:
                        _piper_proc.terminate()
                    start_piper(cfg)
                    print("Piper перезапущено", flush=True)
                else:
                    print("Конфіг перечитано", flush=True)
        except: pass

        interval = cfg.get("ocr_interval", 1000) / 1000.0

        img_path = take_screenshot(cfg)
        if not img_path:
            time.sleep(interval)
            continue

        try:
            t_ocr = time.monotonic()
            img = Image.open(img_path)
            img = apply_filters(img, cfg)
            ocr_api.SetImage(img.convert("L"))
            raw = ocr_api.GetUTF8Text().strip()
            new_text = filter_text(raw, cfg)
            print(f"OCR: {new_text} [{(time.monotonic()-t_ocr)*1000:.0f}мс]", flush=True)
        except Exception as e:
            print(f"OCR error: {e}", file=sys.stderr)
            time.sleep(interval)
            continue

        if not new_text:
            time.sleep(interval)
            continue

        speak_text = decide(last_text, new_text, cfg)
        if speak_text:
            last_text = new_text
            tts_text = trim_incomplete_word(speak_text)
            if tts_text:
                print(f"TTS: {tts_text}", flush=True)
                speak(tts_text, cfg)

        elapsed = time.monotonic() - t_start
        wait = interval - elapsed
        if wait > 0:
            time.sleep(wait)

if __name__ == "__main__":
    main()