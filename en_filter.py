#!/usr/bin/env python3
"""
en_filter.py — фільтри тексту для англійської мови (OCR субтитрів)
Використовується в worker.py коли мова субтитрів = EN
"""
import re
from difflib import SequenceMatcher

# ── Символьні набори ──────────────────────────────────────────────────────────
EN_VOWELS   = set('aeiouAEIOU')
EN_CONS     = set('bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ')
ALL_LETTERS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

ALLOWED_WORDS = {'ok', 'pc', 'npc', 'hp', 'mp', 'xp', 'ui', 'ai', 'vr', 'ar',
                 'id', 'dna', 'fbi', 'cia', 'usa', 'omni', 'ed209'}

SHORT_WORDS = {
    # 1 літера
    'a', 'i',
    # 2 літери
    'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in',
    'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'so', 'to',
    'up', 'us', 'we',
    # 3 літери
    'all', 'and', 'any', 'are', 'but', 'can', 'day', 'did', 'end', 'far',
    'for', 'get', 'god', 'got', 'gun', 'guy', 'had', 'has', 'her', 'him',
    'his', 'hit', 'how', 'its', 'let', 'lot', 'man', 'may', 'new', 'not',
    'now', 'off', 'old', 'one', 'our', 'out', 'own', 'put', 'run', 'sad',
    'say', 'see', 'she', 'sir', 'the', 'too', 'try', 'two', 'use', 'war',
    'was', 'way', 'who', 'why', 'win', 'yes', 'yet', 'you',
    # ігрові
    'hp', 'mp', 'xp',
}

# ── is_weird — перевірка артефактів OCR ───────────────────────────────────────
UI_PATTERNS = [
    r'^quit to (menu|game)',
    r'^(back|bacl|bacк)\s+select',
    r'^quit\s+(to\s+)?menu',
    r'^press\s+[a-z]\s+to\b',
    r'^hold\s+[a-z]\s+to\b',
]

def is_ui_text(text: str) -> bool:
    """Повертає True якщо текст — UI кнопки/підказки"""
    t = text.lower().strip()
    for pattern in UI_PATTERNS:
        if re.match(pattern, t):
            return True
    # Тільки для ДУЖЕ коротких фраз (≤3 слів) де більшість — UI слова
    words = t.split()
    ui_words = {'quit', 'select', 'menu', 'bacl', 'baci'}
    if len(words) <= 3:
        matches = sum(1 for w in words if w in ui_words)
        if matches >= 2:
            return True
    return False

def is_weird(word: str) -> bool:
    """Повертає True якщо слово виглядає як артефакт OCR"""
    if not word: return True
    w = word.lower()
    if w in ALLOWED_WORDS: return False
    if w in SHORT_WORDS: return False

    # Немає жодної літери
    if not any(c in ALL_LETTERS for c in word): return True

    letters = [c for c in word if c in ALL_LETTERS]
    if not letters: return True

    # Забагато нелітерних символів
    non = [c for c in word if c not in ALL_LETTERS and not c.isdigit() and c not in "'-"]
    if len(set(non)) >= 2: return True

    # 3+ однакових символи підряд
    if re.search(r'([a-zA-Z])\1{2,}', word): return True

    # Без жодної голосної (для слів 3+ літер) — крім дозволених
    if len(letters) >= 3:
        vowels = sum(1 for c in letters if c.lower() in 'aeiou')
        if vowels == 0: return True

    # 5+ приголосних підряд
    if re.search(r'[bcdfghjklmnpqrstvwxyz]{5,}', word.lower()): return True

    return False

def is_junk_fragment(word: str) -> bool:
    """Короткий беззмістовний уламок OCR: 1-2 літери не зі словника коротких слів"""
    clean = word.strip(".,!?:;-'\"").lower()
    if not clean: return True
    if clean in SHORT_WORDS or clean in ALLOWED_WORDS: return False
    # 1-2 літери без апострофа і не в словнику → уламок
    letters = [c for c in clean if c in ALL_LETTERS]
    if len(letters) <= 2 and "'" not in word and not any(c.isdigit() for c in clean):
        return True
    return False

# ── Спрощений filter_text для EN ──────────────────────────────────────────────
def filter_text_en(text: str, cfg: dict) -> str:
    """
    Фільтр для англійських субтитрів.
    Відсіює OCR сміття ДО Groq. Дозволені знаки: літери, цифри, ? ! . , ' -
    """
    if not text: return ""

    # Нормалізація апострофів
    text = text.replace('\u02bc', "'").replace('`', "'").replace('\u2019', "'")

    # Багато знаків пунктуації підряд → один
    text = re.sub(r'[!?.,]{2,}', '.', text)

    # Залишаємо ТІЛЬКИ дозволені символи: літери, цифри, пробіл, ? ! . , ' -
    text = re.sub(r"[^a-zA-Z0-9\s?!.,'\-]", '', text)

    # Прибираємо знаки на початку
    text = re.sub(r"^[^a-zA-Z0-9]+", '', text)

    # Нормалізація пробілів
    text = re.sub(r'\s+', ' ', text).strip()

    # Мінімальна довжина
    if len(text) < int(cfg.get('ocr_min_len', 3)):
        return ""

    # Відсіюємо UI кнопки до Groq
    if is_ui_text(text):
        return ""

    # Фільтрація слів
    words = text.split()
    good_words = []
    weird_count = 0
    junk_count = 0
    for w in words:
        clean = w.strip(".,!?:;-'\"")
        if not clean: continue
        # Чисто числа/пунктуація — пропускаємо (Groq розбереться)
        if all(c.isdigit() for c in clean):
            good_words.append(w)
            continue
        if is_weird(clean):
            weird_count += 1
            continue
        if is_junk_fragment(w):
            junk_count += 1
            continue
        good_words.append(w)

    if not good_words: return ""

    # ГЕЙТ: рахуємо сміття (weird + junk уламки)
    bad = weird_count + junk_count
    total = bad + len(good_words)
    # Якщо 40%+ сміття — весь рядок сміття
    if total > 0 and bad / total >= 0.4:
        return ""

    # Додатковий гейт: якщо ВСІ слова короткі (≤2 літери) і жодне не у словнику — сміття
    # (валідні "No", "OK", "Go" лишаються бо вони в SHORT_WORDS/ALLOWED)
    non_dict_short = [w for w in good_words
                      if len(w.strip(".,!?:;-'\"")) <= 2
                      and w.strip(".,!?:;-'\"").lower() not in SHORT_WORDS
                      and w.strip(".,!?:;-'\"").lower() not in ALLOWED_WORDS]
    real_words = [w for w in good_words if len(w.strip(".,!?:;-'\"")) >= 3]
    # Якщо немає нормальних слів І є непотрібні короткі уламки — сміття
    if not real_words and non_dict_short:
        return ""

    text = ' '.join(good_words)
    text = re.sub(r'\s+', ' ', text).strip()

    if len(text) < int(cfg.get('ocr_min_len', 3)):
        return ""

    return text

# ── Similarity і decide (та сама логіка що в uk_filter) ──────────────────────
def similarity(a: str, b: str) -> float:
    if not a or not b: return 0.0
    return SequenceMatcher(None, a, b).ratio()

def normalize(text: str) -> str:
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

def decide(last: str, new: str, cfg: dict) -> str:
    """Фільтр повторів — та сама логіка що в uk_filter"""
    if not new: return ""
    if not last: return new

    sim_threshold = cfg.get('ocr_similarity', 80) / 100.0
    tw = cfg.get('typewriter_mode', False)
    thr = cfg.get('typewriter_threshold', 80) / 100.0

    r = similarity(normalize(last), normalize(new))
    r_norm = similarity(
        normalize(last)[:len(normalize(new))],
        normalize(new)
    ) if len(normalize(last)) > len(normalize(new)) else r

    if tw:
        if len(new) > len(last):
            is_continuation = r >= thr
            if is_continuation:
                # Повертаємо нову частину
                old_words = last.split()
                new_words = new.split()
                common = 0
                for i, w in enumerate(old_words):
                    if i < len(new_words) and w.lower() == new_words[i].lower():
                        common += 1
                    else:
                        break
                new_part = ' '.join(new_words[common:])
                return new_part if new_part else ""
            return new
        if r >= sim_threshold or r_norm >= sim_threshold:
            return ""
        return new

    if r >= sim_threshold or r_norm >= sim_threshold:
        return ""
    return new

def trim_incomplete_word(text: str) -> str:
    """Відрізає останнє слово якщо воно виглядає як обрізане"""
    if not text: return text
    words = text.split()
    if len(words) <= 1: return text
    last = words[-1].rstrip(".,!?:;-")
    if len(last) <= 2 and last.lower() not in SHORT_WORDS:
        return ' '.join(words[:-1])
    return text
