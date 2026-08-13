#!/usr/bin/env python3
"""
groq_translate.py — переклад/очищення тексту через Groq API
Викликається з worker.py і main.py через subprocess

Аргументи:
  sys.argv[1] — Groq API ключ
  sys.argv[2] — модель (llama-3.1-8b-instant або llama-3.3-70b-versatile)
  sys.argv[3] — мова субтитрів (uk або en)
  sys.argv[4] — чи перекладати (true/false)
  sys.argv[5] — текст для обробки
"""

import sys
import os
import json

# Форсуємо UTF-8 для stdin/stdout/stderr (Groq повертає українські символи)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

def get_system_prompt(lang: str, translate: bool) -> str:
    if lang == "en" and translate:
        return (
            "Ти перекладач субтитрів відеоігор з англійської на українську. "
            "Текст з OCR може мати артефакти (0→o, 1→i/l, | →l). "
            "Правила:\n"
            "1. Якщо це UI кнопки (Back, Select, Quit, Menu, Press X) — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "2. Якщо це OCR сміття без змісту (випадкові букви) — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "3. Виправ OCR помилки і перекладай природньо розмовною УКРАЇНСЬКОЮ\n"
            "4. Зберігай власні назви (Alan Wake, Stephen King тощо)\n"
            "5. Відповідай ТІЛЬКИ українським перекладом або порожнім рядком"
        )
    elif lang == "en":
        return (
            "Ти фільтр OCR субтитрів відеоігор (англійська мова). "
            "Правила:\n"
            "1. Якщо це UI кнопки (Back, Select, Quit, Menu тощо) — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "2. Якщо це OCR сміття — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "3. Виправ OCR помилки і поверни чистий англійський текст\n"
            "4. Відповідай ТІЛЬКИ очищеним текстом або порожнім рядком"
        )
    else:  # uk
        return (
            "Ти фільтр OCR субтитрів відеоігор (українська мова). "
            "Правила:\n"
            "1. Якщо це UI кнопки (НАЗАД, ОБРАТИ, МЕНЮ тощо) — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "2. Якщо це OCR сміття без змісту — відповідай ПОРОЖНІМ РЯДКОМ\n"
            "3. Виправ OCR помилки (0→о, 1→і) і поверни чистий текст\n"
            "4. Відповідай ТІЛЬКИ очищеним текстом або порожнім рядком"
        )

def translate(api_key: str, model: str, lang: str, translate_mode: bool, text: str) -> str:
    try:
        print(f"GROQ_START: lang={lang} translate={translate_mode} model={model} text={text!r}", file=sys.stderr)
        from groq import Groq
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": get_system_prompt(lang, translate_mode)},
                {"role": "user", "content": text}
            ],
            max_tokens=300,
            temperature=0,
        )
        result = response.choices[0].message.content.strip()
        print(f"GROQ_OK: {result!r}", file=sys.stderr)
        return result
    except Exception as e:
        print(f"GROQ_ERROR: {e}", file=sys.stderr)
        return ""

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("", end="")
        sys.exit(0)

    api_key      = sys.argv[1]
    model        = sys.argv[2]
    lang         = sys.argv[3]         # uk / en
    do_translate = sys.argv[4].lower() == "true"
    text         = sys.argv[5]

    if not api_key or not text.strip():
        print("", end="")
        sys.exit(0)

    result = translate(api_key, model, lang, do_translate, text)
    print(result, end="")
