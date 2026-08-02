#!/usr/bin/env python3
"""
uk_filter.py — фільтри тексту для української мови
Використовується в worker.py для очищення OCR результатів
"""
import re
from difflib import SequenceMatcher

try:
    from names_uk import NAME_GENDER
except Exception:
    NAME_GENDER = {}

# ── Символьні набори ──────────────────────────────────────────────────────────
UA_VOWELS = set('аеєиіїоуюяАЕЄИІЇОУЮЯ')
UA_CONS   = set('бвгґджзйклмнпрстфхцчшщБВГҐДЖЗЙКЛМНПРСТФХЦЧШЩ')
ALL_LETTERS = set(
    'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
    'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'
    'abcdefghijklmnopqrstuvwxyz'
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
)
ALLOWED_WORDS = {'c++', 'json', 'usb', 'ok', 'pc', 'npc', 'hp', 'mp', 'xp', 'ui', 'ai'}

SHORT_WORDS = {
    # 1 літера
    "а", "б", "в", "г", "з", "і", "й", "к", "о", "у", "я",
    # 2 літери
    "аж", "би", "бо", "до", "за", "із", "їй", "їм", "їх",
    "на", "не", "ні", "по", "та", "те", "то", "ту", "ти", "ми", "чи", "ж",
    # 3 літери
    "але", "або", "аби", "вже", "все", "всі", "два", "для",
    "ось", "там", "тут", "хто", "що", "це", "ці", "цей",
    "той", "тих", "тій", "теж", "вся", "ще", "між", "без",
    "при", "над", "під", "від", "про", "раз", "він", "вас",
    "нас", "нею", "ним", "них", "ній", "дня", "рік",
    "цим", "тим", "сим", "всім", "нам", "вам", "нею",
    # 4 літери
    "чую", "маю", "іду", "мав", "дав", "міг", "жив",
    "вони", "воно", "вона", "мене", "тебе", "його", "нами",
    "вами", "ними", "собі", "тому", "якщо", "коли",
    "хоча", "поки", "буду", "хочу", "можу", "знаю", "іноді",
    # ігрові
    "ok", "hp", "mp", "xp", "pc", "npc",
}

# ── Визначення статі персонажа ────────────────────────────────────────────────

# Явні словники — мають пріоритет над морфологією
FEMALE_CHARS = {
    'офіціантка', 'медсестра', 'санітарка', 'лікарка', 'вчителька',
    'учителька', 'директорка', 'касирка', 'продавчиня', 'продавщиця',
    'пожежниця', 'поліцейська', 'слідча', 'детективка', 'журналістка',
    'секретарка', 'адміністраторка', 'менеджерка', 'операторка',
    'бабуся', 'мама', 'матір', 'сестра', 'дочка', 'тітка', 'дружина',
    'наречена', 'королева', 'принцеса', 'відьма', 'чаклунка', 'ельфійка',
    'господиня', 'служниця', 'покоївка', 'прибиральниця', 'кухарка',
    'безхатня', 'перехожа', 'незнайомка',
}

MALE_CHARS = {
    'офіціант', 'медбрат', 'санітар', 'лікар', 'вчитель', 'учитель',
    'директор', 'касир', 'продавець', 'пожежник', 'поліцейський',
    'слідчий', 'детектив', 'журналіст', 'секретар', 'адміністратор',
    'менеджер', 'оператор', 'охоронець', 'сторож', 'водій', 'таксист',
    'дідусь', 'тато', 'батько', 'брат', 'син', 'дядько', 'чоловік',
    'наречений', 'король', 'принц', 'чаклун', 'ельф', 'гном', 'орк',
    'господар', 'слуга', 'кухар', 'безхатько', 'перехожий', 'незнайомець',
    'капітан', 'сержант', 'офіцер', 'солдат', 'генерал', 'майор',
    'детектив', 'агент', 'шеф', 'бос', 'бармен', 'портьє',
    # складені (пишуться разом або перевіряються як ціла фраза)
    'медбрат', 'медбрата',
}

# Морфологічні суфікси (якщо слово не в словнику)
FEMALE_SUFFIXES = (
    'иця', 'ниця', 'льниця', 'ільниця', 'авиця',
    'ійка', 'арка', 'єрка', 'орка', 'анка', 'янка',
    'ерка', 'єнка', 'инка', 'іянка', 'ойка',
    'ша', 'иха', 'уха', 'аль',
    'ка',   # останній — найширший, тому в кінці
)

MALE_SUFFIXES = (
    'ник', 'льник', 'івник', 'овник',
    'ець', 'нець', 'рець', 'вець',
    'ар', 'яр', 'ер', 'єр', 'ор',
    'ій', 'ній', 'дній', 'жній',
    'ант', 'ент', 'іст', 'аст',
)

def detect_gender(name: str) -> str:
    """
    Визначає стать персонажа за назвою/іменем.
    Повертає: 'F' — жіночий, 'M' — чоловічий, '' — невідомо.
    """
    if not name:
        return ''
    w = name.strip().lower().replace('ʼ', "'").replace('`', "'")
    # Пряме співпадіння
    if w in FEMALE_CHARS:
        return 'F'
    if w in MALE_CHARS:
        return 'M'
    # Складені фрази без пробілу: "мед брат" → "медбрат"
    w_nospace = w.replace(' ', '')
    if w_nospace in FEMALE_CHARS:
        return 'F'
    if w_nospace in MALE_CHARS:
        return 'M'
    # Словник особистих імен
    if w in NAME_GENDER:
        return NAME_GENDER[w]
    # Морфологія по останньому слову фрази
    last_word = w.split()[-1] if ' ' in w else w
    for suf in FEMALE_SUFFIXES:
        if last_word.endswith(suf) and len(last_word) > len(suf) + 1:
            return 'F'
    for suf in MALE_SUFFIXES:
        if last_word.endswith(suf) and len(last_word) > len(suf) + 1:
            return 'M'
    return ''

# ── Перевірка слова ───────────────────────────────────────────────────────────
def is_weird(word):
    """Повертає True якщо слово виглядає як артефакт OCR"""
    if not word: return True
    if word.lower() in ALLOWED_WORDS: return False
    if not any(c in ALL_LETTERS for c in word): return True
    non = [c for c in word if c not in ALL_LETTERS and not c.isdigit()]
    if len(set(non)) >= 3: return True
    if re.search(r'([а-яА-ЯіІїЇєЄa-zA-Z])\1{2,}', word):
        return len(word) <= 2  # Дозволяємо повторення двох літер, а не трьох
    if len(re.findall(r'[а-яА-ЯіІїЇєЄa-zA-Z]\d', word)) >= 3: return True
    vp = ''.join(UA_VOWELS) + 'aeiouAEIOU'
    if re.search(rf'[{re.escape(vp)}]{{4,}}', word): return True
    cp = ''.join(UA_CONS) + 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ'
    if re.search(rf'[{re.escape(cp)}]{{4,}}', word): return True
    # Слово без жодної голосної
    letters_only = [c for c in word if c in ALL_LETTERS]
    if len(letters_only) >= 3:
        vowels = sum(1 for c in letters_only if c in UA_VOWELS or c.lower() in 'aeiou')
        if vowels == 0: return True
    clean = word.strip(".,!?:;-'\"")
    if len(clean) <= 2 and not all(c in ALL_LETTERS for c in clean): return True
    if re.match(r'^[ьЬ]', word): return True
    # if len(word) >= 3 and word[0] in UA_CONS and word[1] in 'ьЬ' and word[2] in UA_CONS:
    #     return True  # Дозволяємо закінчення "ця" без голосної
    return False

# ── Контекстна заміна ─────────────────────────────────────────────────────────
def ctx_replace(text):
    """Замінює 0→О, 1→І в контексті літер"""
    u = r'[а-яА-ЯіІїЇєЄa-zA-Z]'
    for d, r in [('0', 'О'), ('1', 'І')]:
        text = re.sub(rf'(?<={u}){d}(?={u})', r, text)
        text = re.sub(rf'(?<={u}){d}', r, text)
        text = re.sub(rf'{d}(?={u})', r, text)
    return text

# ── Фільтр тексту ─────────────────────────────────────────────────────────────
def filter_text(text, cfg):
    """Очищає OCR текст від артефактів"""
    # Нормалізуємо апострофи (типографський ʼ, гравіс ` → прямий ')
    text = text.replace('ʼ', "'").replace('`', "'").replace('’', "'")
    text = re.sub(r'[|~#@^*<>{}\\]', '', text)
    # Багато знаків пунктуації підряд → крапка
    text = re.sub(r'[!?.,]{2,}', '.', text)
    text = re.sub(r'[!?.,]{2,}', '.', text)  # багато знаків → одна крапка
    text = re.sub(r'^\W+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()  # Прибираємо зайві пробіли, але залишаємо текст
    
    # Визначаємо стать персонажа і прибираємо ім'я з початку
    # Формати: "ОФІЦІАНТКА: текст" / "МЕД БРАТ: текст"
    # Тільки якщо після назви персонажа є ':' або ','
    gender_tag = ''
    if cfg.get('ocr_ignore_char_names', True):
        m = re.match(r"^([А-ЯІЇЄа-яієї][А-ЯІЇЄа-яієї'ʼ\s]{0,40}?)\s*[:,;]\s*", text) or \
            re.match(r"^([А-ЯІЇЄ][А-ЯІЇЄ\s'ʼ]{3,40}?)\s+(?=[а-яіїєa-z])", text)
        if m:
            char_name = m.group(1).strip()
            parts = [p.lower() for p in char_name.split()]
            gender = ''
            # ФАЗА 1: особисте ім'я має пріоритет над роллю
            #   "ОФІЦЕР ГРЕЙС" → Грейс=F (а не офіцер=M)
            #   "ДЕТЕКТИВ САРА КОННОР" → Сара=F (ім'я раніше прізвища)
            for part in parts:
                pn = part.replace('ʼ', "'").replace('`', "'")
                if pn in NAME_GENDER:
                    gender = NAME_GENDER[pn]
                    break
                # Якщо злите слово (OCR прибрав пробіл) — шукаємо ім'я як підрядок
                if len(pn) > 5:
                    for name, g in NAME_GENDER.items():
                        if len(name) > 3 and name in pn:
                            gender = g
                            break
                    if gender:
                        break
            # ФАЗА 2: якщо імені нема — роль/суфікс (по кожному слову + складене)
            if not gender:
                for part in parts:
                    g = detect_gender(part)
                    if g:
                        gender = g
                        break
            if not gender:
                gender = detect_gender(char_name.replace(' ', '').lower())
            if gender:
                gender_tag = f'[{gender}]'
            text = text[m.end():].strip()
    
    text = ctx_replace(text)
    words = text.split()
    # Очищаємо хвіст кожного слова від нелітерних символів
    def clean_word_tail(w):
        # Захоплюємо слово з внутрішніми дефісами/апострофами: "Олд-Сіті", "Нью-Вегас", "м'ясо"
        m = re.match(r"([а-яА-ЯіІїЇєЄa-zA-Z']+(?:-[а-яА-ЯіІїЇєЄa-zA-Z']+)*)(.*)", w)
        if not m:
            return w
        letters = m.group(1)
        tail = m.group(2)
        # Залишаємо . , ! ? (+ : якщо увімкнено ігнорування імен)
        if cfg.get('ocr_ignore_char_names', True):
            tail = re.sub(r'[^.,!?:;]', '', tail)
        else:
            tail = re.sub(r'[^.,!?]', '', tail)
        # Багато знаків → крапка
        if len(tail) > 1:
            tail = '.'
        return letters + tail
    words = [clean_word_tail(w) for w in words]
    good_words = [w for w in words if not is_weird(w)]

    if len(words) > 1:
        if not good_words or len(good_words) / len(words) < 0.5:
            return ""
        all_chars = ''.join(good_words)
        avg_len = sum(len(w.strip('.,!?:;-')) for w in good_words) / len(good_words)
        if avg_len < 2.5:
            return ""
        if len(all_chars) > 3:
            vowels = sum(1 for c in all_chars if c in UA_VOWELS or c.lower() in 'aeiou')
            if vowels / len(all_chars) < 0.20:
                return ""

    if len(words) > 2:
        single = sum(1 for w in good_words if len(w.strip('.,!?:;-')) <= 1 and w.strip('.,!?:;-').lower() not in SHORT_WORDS)
        if len(good_words) > 3 and single / len(good_words) > 0.4:
            return ""

    text = ' '.join(good_words)
    text = re.sub(r'(?<!\w)[-*_=+](?!\w)', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) < int(cfg.get('ocr_min_len', 3)):
        return ""
    ignore = cfg.get('ocr_ignore_words', '')
    if ignore:
        for w in [x.strip() for x in ignore.split(',') if x.strip()]:
            if text.lower() == w.lower(): return ""
            text = re.sub(rf'(?i)^{re.escape(w)}[\s:,-]*', '', text).strip()
    # Додаємо мітку статі якщо визначили
    if gender_tag and text:
        text = f'{gender_tag}{text}'
    return text

# ── Нормалізація ──────────────────────────────────────────────────────────────
def normalize(text):
    """Прибирає пунктуацію і приводить до нижнього регістру"""
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

# ── Обрізання обрізаного слова ────────────────────────────────────────────────
def trim_incomplete_word(text):
    """Відрізає останнє слово якщо воно виглядає як обрізане (менше 4 літер)"""
    if not text: return text
    words = text.split()
    if len(words) <= 1: return text
    last = words[-1].rstrip('.,!?:;-')
    if len(last) <= 3 and last.lower() not in SHORT_WORDS:
        return ' '.join(words[:-1])
    return text

# ── Схожість і typewriter ─────────────────────────────────────────────────────
def similarity(a, b):
    if not a or not b: return 0.0
    return SequenceMatcher(None, a, b).ratio()

def new_part(old, new):
    ow, nw = old.split(), new.split()
    c = 0
    for i, w in enumerate(ow):
        if i < len(nw) and w.lower().rstrip('.,!?:;') == nw[i].lower().rstrip('.,!?:;'):
            c += 1
        else:
            break
    return ' '.join(nw[c:]).strip()

def starts_with_last(last, new):
    if not last or not new: return False
    last_words = last.split()[:3]
    new_words  = new.split()[:3]
    matches = sum(1 for a, b in zip(last_words, new_words) if similarity(a, b) > 0.8)
    return matches >= min(2, len(last_words))

def decide(last, new, cfg):
    tw = cfg.get('typewriter_mode', False)
    thr = cfg.get('typewriter_threshold', 80) / 100.0
    sim_threshold = cfg.get('ocr_similarity', 80) / 100.0

    if not new: return ""
    if not last: return new

    r = similarity(last, new)
    r_norm = similarity(normalize(last), normalize(new))

    if tw:
        # В typewriter режимі: якщо новий текст довший — завжди шукаємо нову частину
        if len(new) > len(last):
            is_continuation = starts_with_last(last, new) or r >= thr
            if is_continuation:
                p = new_part(last, new)
                return p if p else ""
            return new
        # Якщо однакової довжини або коротший — перевіряємо схожість
        if r >= sim_threshold or r_norm >= sim_threshold:
            return ""
        return new
    else:
        # Звичайний режим — фільтруємо по схожості
        if r >= sim_threshold or r_norm >= sim_threshold:
            return ""
        return new