#!/usr/bin/env python3
"""
UA Voice Bridge — головний воркер v2
tesserocr API постійно в пам'яті + TTS в окремому треді
"""
import os, sys, json, time, re, subprocess, signal, threading, io
from difflib import SequenceMatcher

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "bin"))
from PIL import Image, ImageEnhance
import numpy as np
import tesserocr

PLUGIN_DIR  = os.path.dirname(os.path.abspath(__file__))
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
        "ocr_psm": 6,
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
    if cfg.get("brightness", 1.0) != 1.0:
        img = ImageEnhance.Brightness(img).enhance(cfg["brightness"])
    if cfg.get("contrast", 1.0) != 1.0:
        img = ImageEnhance.Contrast(img).enhance(cfg["contrast"])
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
        else:              mask = np.ones(R.shape, dtype=bool)
        result = np.zeros_like(arr, dtype=np.uint8)
        result[mask] = 255
        img = Image.fromarray(result.astype(np.uint8))
    elif cfg.get("bw", False):
        img = img.convert("L").convert("RGB")
    return img

# ── Фільтри тексту ────────────────────────────────────────────────────────────
UA_VOWELS = set("аеєиіїоуюяАЕЄИІЇОУЮЯ")
UA_CONS   = set("бвгґджзйклмнпрстфхцчшщБВГҐДЖЗЙКЛМНПРСТФХЦЧШЩ")
ALL_LETTERS = set("абвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
ALLOWED = {"c++","json","usb","ok","pc","npc","hp","mp","xp","ui","ai"}

def is_weird(word):
    if not word: return True
    if word.lower() in ALLOWED: return False
    if not any(c in ALL_LETTERS for c in word): return True
    non = [c for c in word if c not in ALL_LETTERS and not c.isdigit()]
    if len(set(non)) >= 3: return True
    if re.search(r"(.)\1{2,}", word): return True
    if len(re.findall(r"[а-яА-ЯіІїЇєЄa-zA-Z]\d", word)) >= 3: return True
    vp = "".join(UA_VOWELS) + "aeiouAEIOU"
    if re.search(rf"[{re.escape(vp)}]{{4,}}", word): return True
    cp = "".join(UA_CONS) + "bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ"
    if re.search(rf"[{re.escape(cp)}]{{5,}}", word): return True
    # Слова 1-2 літери — тільки якщо в ALL_LETTERS і немає цифр
    clean = word.strip(".,!?:;-'\"")
    if len(clean) <= 2 and not all(c in ALL_LETTERS for c in clean): return True
    return False

def ctx_replace(text):
    u = r"[а-яА-ЯіІїЇєЄa-zA-Z]"
    for d, r in [("0","О"),("1","І")]:
        text = re.sub(rf"(?<={u}){d}(?={u})", r, text)
        text = re.sub(rf"(?<={u}){d}", r, text)
        text = re.sub(rf"{d}(?={u})", r, text)
    return text

def filter_text(text, cfg):
    text = re.sub(r"[|~#@^*<>{}\\]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = ctx_replace(text)
    words = text.split()
    good_words = [w for w in words if not is_weird(w)]

    if len(words) > 2:
        # Якщо менше половини слів нормальні — шум
        if len(good_words) / len(words) < 0.5:
            return ""
        # Якщо більше 30% слів однобуквені — шум
        single = sum(1 for w in good_words if len(w.strip(".,!?:;-")) <= 1)
        if len(good_words) > 3 and single / len(good_words) > 0.3:
            return ""

    text = " ".join(good_words)
    text = re.sub(r"(?<!\w)[-*_=+](?!\w)", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) < int(cfg.get("ocr_min_len", 3)): return ""
    ignore = cfg.get("ocr_ignore_words", "")
    if ignore:
        for w in [x.strip() for x in ignore.split(",") if x.strip()]:
            if text.lower() == w.lower(): return ""
            text = re.sub(rf"(?i)^{re.escape(w)}[\s:,-]*", "", text).strip()
    return text

SHORT_WORDS = {
    # 1 літера
    "а", "б", "в", "г", "з", "і", "й", "к", "о", "у", "я",
    # 2 літери
    "аж", "би", "бо", "до", "за", "із", "їй", "їм", "їх",
    "на", "не", "ні", "по", "та", "те", "то", "ту", "ти", "ми",
    "чи", "ж",
    # 3 літери
    "але", "або", "аби", "вже", "все", "всі", "два", "для",
    "ось", "там", "тут", "хто", "що", "це", "ці", "цей",
    "той", "тих", "тій", "теж", "вся", "ще", "між", "без",
    "при", "над", "під", "від", "про", "раз", "він", "вас",
    "нас", "нею", "ним", "них", "ній",
    # 4 літери — дієслова і займенники
    "чую", "маю", "іду", "мав", "дав", "міг", "зна", "жив",
    "вони", "воно", "вона", "мене", "тебе", "його", "нами",
    "вами", "ними", "собі", "тому", "цьому", "якщо", "коли",
    "хоча", "поки", "буду", "хочу", "можу", "знаю", "іноді",
    # ігрові
    "ok", "hp", "mp", "xp", "pc", "npc",
}

def trim_incomplete_word(text):
    """Відрізає останнє слово якщо воно виглядає як обрізане"""
    if not text:
        return text
    words = text.split()
    if len(words) <= 1:
        return text
    last = words[-1].rstrip(".,!?:;")
    # Відрізаємо тільки слова <= 3 літери яких немає в списку
    if len(last) <= 3 and last.lower() not in SHORT_WORDS:
        return " ".join(words[:-1])
    return text
def similarity(a, b):
    if not a or not b: return 0.0
    return SequenceMatcher(None, a, b).ratio()

def new_part(old, new):
    ow, nw = old.split(), new.split()
    c = 0
    for i, w in enumerate(ow):
        if i < len(nw) and similarity(w, nw[i]) > 0.7:
            c += 1
        else:
            break
    return " ".join(nw[c:]).strip()

def starts_with_last(last, new):
    """Перевіряє чи new є продовженням last"""
    if not last or not new: return False
    last_words = last.split()[:3]
    new_words = new.split()[:3]
    matches = sum(1 for a, b in zip(last_words, new_words) if similarity(a, b) > 0.8)
    return matches >= min(2, len(last_words))

def decide(last, new, cfg):
    tw = cfg.get("typewriter_mode", False)
    thr = cfg.get("typewriter_threshold", 80) / 100.0
    if not new: return ""
    if not last: return new
    r = similarity(last, new)
    # Той самий текст з артефактами — пропускаємо
    if r > 0.95: return ""
    # Без typewriter — читаємо все нове
    if not tw: return new
    # Typewriter: це продовження якщо починається так само АБО ratio >= threshold
    is_continuation = starts_with_last(last, new) or (r >= thr and len(new) > len(last))
    if is_continuation:
        p = new_part(last, new)
        return p if p else ""
    # Нова фраза
    return new

# ── TTS — постійний Piper процес ─────────────────────────────────────────────
_piper_proc = None
_piper_lock = threading.Lock()

def start_piper(cfg):
    global _piper_proc
    speaker = int(cfg.get("tts_speaker", 1))
    speed   = float(cfg.get("tts_speed", 0.8))
    _piper_proc = subprocess.Popen(
        [PIPER_BIN, "--model", MODEL,
         "--speaker", str(speaker),
         "--length_scale", str(speed),
         "--output_raw"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=piper_env, cwd=PIPER_DIR,
    )
    # aplay читає raw audio з stdout Piper
    subprocess.Popen(
        ["aplay", "-r", "22050", "-f", "S16_LE", "-t", "raw", "-"],
        stdin=_piper_proc.stdout,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=piper_env,
    )
    # Тред що читає stderr Piper і виводить в лог
    def _log_stderr():
        for line in _piper_proc.stderr:
            line = line.decode().strip()
            if "Real-time factor" in line or "Loaded" in line:
                # infer= час це і є синтез
                print(f"[Piper] {line}", flush=True)
    threading.Thread(target=_log_stderr, daemon=True).start()
    print("Piper запущено", flush=True)

def speak(text, cfg):
    global _piper_proc
    with _piper_lock:
        # Перезапускаємо якщо процес впав
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
    subprocess.run([
        "gst-launch-1.0", "pipewiresrc", "num-buffers=1", "!",
        "videoconvert", "!",
        "videocrop", f"top={top}", f"bottom={bot}", f"left={l}", f"right={r}", "!",
        "pngenc", "snapshot=true", "!", "filesink", f"location={tmp}"
    ], capture_output=True, timeout=10)
    if os.path.exists(tmp) and os.path.getsize(tmp) > 0:
        os.rename(tmp, final)
        return final
    return None

# ── Головний цикл ─────────────────────────────────────────────────────────────
def main():
    print(f"=== ВОРКЕР ЗАПУЩЕНО {time.strftime('%c')} ===", flush=True)

    cfg = load_config()
    cfg_mtime = os.path.getmtime(CONFIG_PATH) if os.path.exists(CONFIG_PATH) else 0

    # Ініціалізація tesserocr — один раз!
    t0 = time.monotonic()
    ocr_api = tesserocr.PyTessBaseAPI(lang="ukr", path=TESSDATA, psm=cfg.get("ocr_psm", 6))
    print(f"tesserocr готовий за {(time.monotonic()-t0)*1000:.0f} мс", flush=True)

    # Запускаємо Piper один раз
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

        # Перечитуємо конфіг тільки якщо змінився
        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if mtime != cfg_mtime:
                old_speaker = cfg.get("tts_speaker", 1)
                old_speed = cfg.get("tts_speed", 0.8)
                cfg = load_config()
                cfg_mtime = mtime
                ocr_api.SetVariable("tessedit_pageseg_mode", str(cfg.get("ocr_psm", 6)))
                # Якщо голос або швидкість змінились — перезапускаємо Piper
                if cfg.get("tts_speaker", 1) != old_speaker or cfg.get("tts_speed", 0.8) != old_speed:
                    if _piper_proc and _piper_proc.poll() is None:
                        _piper_proc.terminate()
                    start_piper(cfg)
                    print("Piper перезапущено з новими налаштуваннями", flush=True)
                else:
                    print("Конфіг перечитано", flush=True)
        except: pass

        interval = cfg.get("ocr_interval", 1000) / 1000.0

        # 1. Знімок
        img_path = take_screenshot(cfg)
        if not img_path:
            time.sleep(interval)
            continue

        # 2. Фільтри + OCR
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

        # 3. Typewriter + TTS
        speak_text = decide(last_text, new_text, cfg)
        if speak_text:
            tts_text = trim_incomplete_word(speak_text)
            last_text = trim_incomplete_word(new_text)
            if tts_text:
                print(f"TTS: {tts_text}", flush=True)
                speak(tts_text, cfg)

        # 4. Чекаємо залишок інтервалу
        elapsed = time.monotonic() - t_start
        wait = interval - elapsed
        if wait > 0:
            time.sleep(wait)

if __name__ == "__main__":
    main()