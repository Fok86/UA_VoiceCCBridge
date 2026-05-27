<div align="center">

![UA Voice CC Bridge](assets/banner.png)

### Плагін для Steam Deck який озвучує субтитри в іграх українською мовою 🇺🇦

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Steam%20Deck-1a9fff?style=for-the-badge&logo=steam)](https://www.steamdeck.com/)
[![Decky Loader](https://img.shields.io/badge/Requires-Decky%20Loader-blue?style=for-the-badge)](https://github.com/SteamDeckHomebrew/decky-loader)
[![Language](https://img.shields.io/badge/🇺🇦-Ukrainian%20TTS-ffd700?style=for-the-badge)](#)

</div>

---

## ⚡ Як це працює

Плагін робить знімок зони субтитрів, розпізнає текст через OCR і миттєво озвучує його.

```
Знімок екрану → OCR (Tesseract) → Синтез мови (Piper) → Звук
    ~200мс           ~100мс              ~160мс
```

> **Загальна затримка: ~300мс** від появи субтитрів до озвучення

---

## 🎮 Можливості

| Функція | Опис |
|--------|------|
| 🎯 **OCR** | Розпізнавання субтитрів в будь-якій грі |
| 🔊 **TTS** | Синтез мови українською — 3 голоси: Микита, Лада, Тетяна |
| ⌨️ **Друкарська машинка** | Озвучення по мірі появи тексту |
| 👁️ **Превью** | Перегляд зображення з фільтрами в реальному часі |
| 🎛️ **Налаштування** | Зона субтитрів, фільтри, OCR інтервал, швидкість і гучність голосу |

---

## ⚠️ Важливо

> Плагін **НЕ робить переклад**. Він лише озвучує субтитри які вже є в грі.
> Гра повинна мати **вбудовану українську локалізацію** — інакше плагін буде читати текст іншою мовою або не працювати коректно.

---

## 📦 Встановлення

1. Встановіть [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) на Steam Deck
2. Завантажте [останній реліз](../../releases/latest) плагіна
3. Скопіюйте папку `UA_VoiceCCBridge` в `/home/deck/homebrew/plugins/`
4. Перезапустіть Decky Loader

---

## 🕹️ Використання

1. Відкрийте меню Decky (кнопка `···` на Steam Deck)
2. Знайдіть **UA Voice CC Bridge**
3. Налаштуйте **Зону субтитрів** через відповідне меню
4. Увімкніть **Активація воркера**
5. Грайте з озвученими субтитрами! 🎮

---

## ⚙️ Налаштування

<details>
<summary><b>🖼️ Зона субтитрів</b></summary>

Вкажіть де на екрані знаходяться субтитри. Кнопка **Зробити знімок** допоможе перевірити правильність зони.

</details>

<details>
<summary><b>🎨 Фільтри зображення</b></summary>

Налаштуйте контраст, яскравість та кольоровий фільтр для кращого розпізнавання тексту.

</details>

<details>
<summary><b>🔍 OCR</b></summary>

- **Інтервал** — як часто робити знімок (мс)
- **Мін. довжина** — мінімальна кількість символів для озвучення

</details>

<details>
<summary><b>🗣️ TTS (Синтез мови)</b></summary>

- **Голос** — Lada / Mykyta (за замовчуванням) / Tetiana
- **Швидкість** — швидкість читання
- **Гучність** — гучність голосу

</details>

---

## 🔧 Технічний стек

| Компонент | Технологія |
|-----------|------------|
| OCR | [Tesseract](https://github.com/tesseract-ocr/tesseract) + [tesserocr](https://github.com/sirfz/tesserocr) |
| TTS | [Piper](https://github.com/rhasspy/piper) + [ukrainian-tts](https://github.com/robinhad/ukrainian-tts) |
| Capture | GStreamer + PipeWire |
| UI | React + Decky Loader SDK |

---

## ☕ Підтримати проєкт

<div align="center">

![pixel art](assets/pixel_ua.png)

Якщо плагін корисний — підтримай розробку!

**Monobank:** [send.monobank.ua/jar/7oNtZZsgCb](https://send.monobank.ua/jar/7oNtZZsgCb)

💳 `4874 1000 2613 9066`

[![QR донат](https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://send.monobank.ua/jar/7oNtZZsgCb)](https://send.monobank.ua/jar/7oNtZZsgCb)

</div>

---

<div align="center">

Зроблено з ❤️ для українських гравців

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>
