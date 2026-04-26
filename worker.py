#!/usr/bin/env python3
import os, sys, json, time, subprocess, signal, threading

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))

# ANSI кольори (без підкреслювання)
WHITE = '\033[37m'
BLUE = '\033[34m'
RED = '\033[31m'
RESET = '\033[0m'
sys.path.insert(0, os.path.join(PLUGIN_DIR, "bin"))
sys.path.insert(0, PLUGIN_DIR)
_tess_libs = os.path.join(PLUGIN_DIR, "bin", "tesserocr.libs")
if os.path.exists(_tess_libs):
    os.environ["LD_LIBRARY_PATH"] = _tess_libs + ":" + os.environ.get("LD_LIBRARY_PATH", "")

from PIL import Image, ImageEnhance
import numpy as np
import tesserocr
try:
    from scipy import ndimage
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

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

def load_config():
    defaults = {
        "offset_bottom": 50, "width": 900, "height": 80,
        "bw": False, "contrast": 1.0, "brightness": 1.0,
        "color_filter": "none", "hardness": 30,
        "outline_filter": False, "outline_hmin": 0, "outline_hmax": 255,
        "outline_radius": 3, "outline_dark": 80,
        "ocr_interval": 1000, "ocr_min_len": 3, "ocr_ignore_words": "",
        "ocr_psm": 6, "ocr_similarity": 80, "ocr_min_xheight": 10,
        "typewriter_mode": False, "typewriter_threshold": 80,
        "tts_speaker": 1, "tts_speed": 0.8,
    }
    try:
        with open(CONFIG_PATH) as f:
            return {**defaults, **json.load(f)}
    except:
        return defaults

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
            elif color == "S": mask = (np.abs(R-G) < hardness) & (np.abs(G-B) < hardness) & (R > 100)
            else: mask = np.ones(R.shape, dtype=bool)
            result = np.zeros_like(arr, dtype=np.uint8)
            result[mask] = 255
            img = Image.fromarray(result.astype(np.uint8))
        elif cfg.get("bw", False):
            img = img.convert("L").convert("RGB")
    return img

_piper_proc = None
_piper_lock = threading.Lock()

def start_piper(cfg):
    global _piper_proc
    speaker = int(cfg.get("tts_speaker", 1))
    speed = float(cfg.get("tts_speed", 1.0))
    noise_scale = float(cfg.get("tts_noise_scale", 0.667))
    noise_w = float(cfg.get("tts_noise_w", 0.8))
    _piper_proc = subprocess.Popen(
        [PIPER_BIN, "--model", MODEL,
         "--speaker", str(speaker), "--length_scale", str(speed),
         "--noise_scale", str(noise_scale), "--noise_w", str(noise_w),
         "--output_raw"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env=piper_env, cwd=PIPER_DIR,
    )
    subprocess.Popen(
        ["aplay", "-r", "22050", "-f", "S16_LE", "-t", "raw", "-"],
        stdin=_piper_proc.stdout, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, env=piper_env,
    )
    def _log_stderr():
        for line in _piper_proc.stderr:
            line = line.decode().strip()
            if "Real-time factor" in line or "Loaded" in line:
                print(f"[Piper] {line}", flush=True)
    threading.Thread(target=_log_stderr, daemon=True).start()
    print("✅ Piper запущено", flush=True)

def speak(text, cfg):
    global _piper_proc
    with _piper_lock:
        if _piper_proc is None or _piper_proc.poll() is not None:
            start_piper(cfg)
        try:
            _piper_proc.stdin.write((text + "\n").encode("utf-8"))
            _piper_proc.stdin.flush()
        except Exception as e:
            print(f"❌ Piper write error: {e}", file=sys.stderr)
            _piper_proc = None

def take_screenshot(cfg):
    w = cfg["width"]; h = cfg["height"]; ob = cfg["offset_bottom"]
    l = (SCREEN_W - w) // 2; r = (SCREEN_W - w) // 2
    top = SCREEN_H - ob - h; bot = ob
    tmp = "/dev/shm/ua_tmp.png"; final = "/dev/shm/deck_bottom.png"
    try:
        subprocess.run([
            "gst-launch-1.0", "pipewiresrc", "num-buffers=1", "!",
            "videoconvert", "!", "videocrop",
            f"top={top}", f"bottom={bot}", f"left={l}", f"right={r}", "!",
            "pngenc", "snapshot=true", "!", "filesink", f"location={tmp}"
        ], capture_output=True, timeout=3)
    except subprocess.TimeoutExpired:
        return None
    if os.path.exists(tmp) and os.path.getsize(tmp) > 0:
        os.rename(tmp, final)
        return final
    return None

def main():
    print(f"\n{'='*60}", flush=True)
    print(f"🎬 ВОРКЕР v1.0.4 ЗАПУЩЕНО | {time.strftime('%H:%M:%S')}", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"scipy: {'✅ Доступна' if HAS_SCIPY else '⚠️  Недоступна'}", flush=True)
    print(f"{'='*60}\n", flush=True)

    cfg = load_config()
    cfg_mtime = os.path.getmtime(CONFIG_PATH) if os.path.exists(CONFIG_PATH) else 0

    t0 = time.monotonic()
    ocr_api = tesserocr.PyTessBaseAPI(lang="ukr", path=TESSDATA, oem=1, psm=cfg.get("ocr_psm", 6))
    print(f"⏱️  Тесserocr ініціалізація: {(time.monotonic()-t0)*1000:.0f}мс\n", flush=True)

    start_piper(cfg)
    last_text = ""
    running = True
    cycle_count = 0

    def stop(sig, frame):
        nonlocal running
        running = False
        ocr_api.End()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    while running:
        cycle_count += 1
        t_cycle_start = time.monotonic()

        # 1. CONFIG CHECK
        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if mtime != cfg_mtime:
                cfg = load_config()
                cfg_mtime = mtime
                last_text = ""
                ocr_api.SetVariable("tessedit_pageseg_mode", str(cfg.get("ocr_psm", 6)))
        except: pass

        interval = cfg.get("ocr_interval", 1000) / 1000.0

        # 2. SCREENSHOT
        t_ss = time.monotonic()
        img_path = take_screenshot(cfg)
        t_ss_ms = (time.monotonic() - t_ss) * 1000
        print(f"SNAPSHOT: {t_ss_ms:.0f}мс", flush=True)
        
        if not img_path:
            time.sleep(interval)
            continue

        # 3. OCR
        t_ocr = time.monotonic()
        try:
            img = Image.open(img_path)
            img = apply_filters(img, cfg)
            ocr_api.SetImage(img.convert("L"))
            ocr_api.SetVariable("textord_min_xheight", str(int(cfg.get("ocr_min_xheight", 10))))
            raw = ocr_api.GetUTF8Text().strip()
            new_text = filter_text(raw, cfg)
            t_ocr_ms = (time.monotonic() - t_ocr) * 1000
            
            if new_text:
                print(f"{WHITE}OCR: {t_ocr_ms:.0f}мс → \"{new_text}\"{RESET}", flush=True)
            else:
                print(f"{WHITE}OCR: {t_ocr_ms:.0f}мс → (пусто){RESET}", flush=True)
        except Exception as e:
            print(f"❌ OCR error: {e}", file=sys.stderr)
            time.sleep(interval)
            continue

        if not new_text:
            time.sleep(interval)
            continue

        # 4. DECIDE (Фільтр повторів)
        t_decide = time.monotonic()
        speak_text = decide(last_text, new_text, cfg)
        t_decide_ms = (time.monotonic() - t_decide) * 1000
        
        if not speak_text:
            # Повтор - червоний OCR текст
            print(f"{RED}OCR: {t_ocr_ms:.0f}мс → \"{new_text}\"{RESET}", flush=True)
        
        # 5. TTS
        t_tts = time.monotonic()
        if speak_text:
            last_text = new_text
            tts_text = trim_incomplete_word(speak_text)
            if tts_text:
                speak(tts_text, cfg)
                t_tts_ms = (time.monotonic() - t_tts) * 1000
                print(f"{BLUE}TTS: {t_tts_ms:.0f}мс → \"{tts_text}\"{RESET}", flush=True)
            else:
                pass  # текст обрізаний, нічого не пишемо
        else:
            t_tts_ms = 0

        # TOTAL
        t_cycle_total = (time.monotonic() - t_cycle_start) * 1000

        elapsed = time.monotonic() - t_cycle_start
        wait = interval - elapsed
        if wait > 0:
            time.sleep(wait)

if __name__ == "__main__":
    main()