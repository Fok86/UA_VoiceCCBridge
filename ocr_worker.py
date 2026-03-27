#!/usr/bin/env python3
import sys
import os
import re
import json
import subprocess
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "bin"))

from PIL import Image, ImageEnhance
import numpy as np

UKRAINIAN_VOWELS = set('аеєиіїоуюяАЕЄИІЇОУЮЯ')
UKRAINIAN_CONSONANTS = set('бвгґджзйклмнпрстфхцчшщБВГҐДЖЗЙКЛМНПРСТФХЦЧШЩ')
ALL_LETTERS = set('абвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
ALLOWED_WORDS = {'c++', 'json', 'usb', 'ok', 'pc', 'npc', 'hp', 'mp', 'xp', 'ui', 'ai'}

def load_config(path):
    defaults = {
        "bw": False, "contrast": 1.0, "brightness": 1.0,
        "color_filter": "none", "hardness": 30,
        "ocr_min_len": 3, "ocr_ignore_words": "",
        "ocr_psm": 6, "ocr_oem": 3,
    }
    try:
        with open(path) as f:
            return {**defaults, **json.load(f)}
    except:
        return defaults

def apply_filters(img, cfg):
    if cfg["brightness"] != 1.0:
        img = ImageEnhance.Brightness(img).enhance(cfg["brightness"])
    if cfg["contrast"] != 1.0:
        img = ImageEnhance.Contrast(img).enhance(cfg["contrast"])

    color = cfg["color_filter"]
    hardness = int(cfg["hardness"])

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
    elif cfg["bw"]:
        img = img.convert("L").convert("RGB")

    return img

def is_weird_word(word: str) -> bool:
    """Повертає True якщо слово є сміттям"""
    if not word:
        return True

    w_lower = word.lower()

    # Дозволені технічні слова
    if w_lower in ALLOWED_WORDS:
        return False

    # Службові символи
    if re.search(r'[\x00-\x1F\x7F]', word):
        return True

    # Немає жодної літери
    if not any(c in ALL_LETTERS for c in word):
        return True

    # 3+ різних не-літерних символів
    non_letters = [c for c in word if c not in ALL_LETTERS and not c.isdigit()]
    if len(set(non_letters)) >= 3:
        return True

    # 3+ однакових символів підряд (ааа, ---, ...)
    if re.search(r'(.)\1{2,}', word):
        return True

    # Машинний текст: патерн літера-цифра-літера-цифра (3+ рази)
    if len(re.findall(r'[а-яА-ЯіІїЇєЄa-zA-Z]\d', word)) >= 3:
        return True

    # 4+ голосних підряд
    vowel_pattern = ''.join(UKRAINIAN_VOWELS) + 'aeiouAEIOU'
    if re.search(rf'[{re.escape(vowel_pattern)}]{{4,}}', word):
        return True

    # 4+ приголосних підряд (крім нормальних укр комбінацій)
    consonant_pattern = ''.join(UKRAINIAN_CONSONANTS) + 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ'
    if re.search(rf'[{re.escape(consonant_pattern)}]{{5,}}', word):
        return True

    # Коротке слово (≤2) — дозволяємо тільки якщо чисто літерне
    if len(word) <= 2 and not all(c in ALL_LETTERS for c in word):
        return True

    return False

def context_replace(text: str) -> str:
    """Контекстна заміна: 0→О, 1→І тільки поруч з літерами"""
    ukr_eng = r'[а-яА-ЯіІїЇєЄa-zA-Z]'
    text = re.sub(rf'(?<={ukr_eng})0(?={ukr_eng})', 'О', text)
    text = re.sub(rf'(?<={ukr_eng})0', 'О', text)
    text = re.sub(rf'0(?={ukr_eng})', 'О', text)
    text = re.sub(rf'(?<={ukr_eng})1(?={ukr_eng})', 'І', text)
    text = re.sub(rf'(?<={ukr_eng})1', 'І', text)
    text = re.sub(rf'1(?={ukr_eng})', 'І', text)
    return text

def filter_text(text: str, cfg: dict) -> str:
    # Базове очищення
    text = re.sub(r'[|~#@^*<>{}\\]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Контекстна заміна цифр
    text = context_replace(text)

    # Фільтр по словах
    words = text.split()
    clean_words = [w for w in words if not is_weird_word(w)]
    text = ' '.join(clean_words)

    # Видалення ізольованих спецсимволів
    text = re.sub(r'(?<!\w)[-*_=+](?!\w)', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Мінімальна довжина
    if len(text) < int(cfg.get("ocr_min_len", 3)):
        return ""

    # Ігнорування слів
    ignore_raw = cfg.get("ocr_ignore_words", "")
    if ignore_raw:
        for word in [w.strip() for w in ignore_raw.split(",") if w.strip()]:
            if text.lower() == word.lower():
                return ""
            text = re.sub(rf'(?i)^{re.escape(word)}[\s:,-]*', '', text).strip()

    return text

TESSDATA_PATH = os.path.join(os.path.dirname(__file__), "tessdata/")

def run_ocr(img, cfg):
    w, h = img.size
    if h < 32:
        scale = 32 / h
        img = img.resize((int(w * scale), 32), Image.LANCZOS)

    psm = cfg.get("ocr_psm", 6)
    img_gray = img.convert("L")

    try:
        import tesserocr
        with tesserocr.PyTessBaseAPI(lang="ukr", path=TESSDATA_PATH,
                                     psm=tesserocr.PSM(psm)) as api:
            api.SetImage(img_gray)
            text = api.GetUTF8Text().strip()
    except Exception:
        # Fallback до subprocess якщо tesserocr недоступний
        try:
            buf = io.BytesIO()
            img_gray.save(buf, format="PNG")
            buf.seek(0)
            result = subprocess.run(
                ["tesseract", "stdin", "stdout", "-l", "ukr",
                 "--psm", str(psm), "--oem", "3",
                 "-c", "preserve_interword_spaces=1"],
                input=buf.read(), capture_output=True, timeout=5,
                env={**os.environ, "LD_LIBRARY_PATH": "/usr/lib"}
            )
            text = result.stdout.decode().strip()
        except Exception:
            return ""

    return filter_text(text, cfg)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    img_path = sys.argv[1]
    cfg_path = sys.argv[2]
    if not os.path.exists(img_path):
        sys.exit(1)
    cfg = load_config(cfg_path)
    img = Image.open(img_path)
    img = apply_filters(img, cfg)
    text = run_ocr(img, cfg)
    if text:
        print(text)