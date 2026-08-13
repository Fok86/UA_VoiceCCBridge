<div align="center">

<img src="assets/banner.png" alt="UA Voice CC Bridge" width="100%"/>

# UA Voice CC Bridge

**Плагін для Steam Deck який озвучує субтитри українською мовою**

[![Version](https://img.shields.io/badge/version-1.1.0-blue?style=for-the-badge)](https://github.com/Fok86/UA_VoiceCCBridge/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Steam%20Deck-1a9fff?style=for-the-badge&logo=steam)](https://store.steampowered.com/steamdeck)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Decky](https://img.shields.io/badge/Decky%20Loader-required-orange?style=for-the-badge)](https://github.com/SteamDeckHomebrew/decky-loader)

</div>

---

> ⚠️ **Важливо:** Основний режим озвучує субтитри які **вже є в грі** українською. Для ігор **без** українських субтитрів є окремий режим **🤖 ШІ-перекладача** (Groq) — читає англійські субтитри та перекладає українською на льоту.

## ⚡ Як це працює

**Режим озвучення (українські субтитри в грі):**
```
Знімок екрану → OCR (Tesseract) → Синтез мови (Piper / RHVoice) → Звук
    ~200мс           ~100мс                  ~160мс
```
> Загальна затримка: **~300мс**

**Режим ШІ-перекладача (англійські субтитри):**
```
Знімок → OCR → Фільтр → Groq (переклад) → Синтез → Звук
                          ~800мс
```
> Groq викликається тільки для нових фраз — повтори не витрачають токени

---

## ✨ Можливості

| | |
|---|---|
| 🎯 | Розпізнавання субтитрів в будь-якій грі |
| 🔊 | **8 голосів** українською (Piper + RHVoice) |
| 🤖 | **ШІ-перекладач** англійських субтитрів (Groq) |
| 👦👧 | Автовизначення статі мовця → чоловічий/жіночий голос |
| 🎮 | Знімок екрану по кнопці **L4+R4** під час гри |
| 🎯 | Профілі налаштувань для кожної гри окремо |
| ⌨️ | Режим "Друкарська машинка" |
| 🎛️ | Повне налаштування зони, фільтрів, OCR і TTS |
| 👁️ | Превью в реальному часі |

---

## 🔊 Голоси

<table>
<tr>
<td width="50%">

### 🧠 Piper (нейронний синтез)
| Голос | Тип |
|-------|-----|
| 👨 Микита | чоловічий |
| 👩 Лада | жіночий |
| 👩 Тетяна | жіночий |
| 🧒 Даринка | дитячий |

</td>
<td width="50%">

### ⚡ RHVoice (легкий синтез)
| Голос | Тип |
|-------|-----|
| 👨 Anatol | чоловічий |
| 👨 Volodymyr | чоловічий |
| 👩 Natalia | жіночий |
| 👩 Marianna | жіночий |

</td>
</tr>
</table>

> 💡 **RHVoice** споживає значно менше ресурсів CPU — **не краде FPS у важких іграх!**

---

## 📦 Встановлення

**1.** Завантаж zip з **[Releases](https://github.com/Fok86/UA_VoiceCCBridge/releases/latest)**

**2.** Розпакуй в `/home/deck/homebrew/plugins/`

**3.** Перезапусти Decky:
```bash
sudo systemctl restart plugin_loader
```

---

## 🚀 Перший запуск

```
1. Запусти гру з українськими субтитрами
2. Плагін → "Зона субтитрів" → Зробити знімок → Зберегти
3. "Фільтри зображення" → Вибери колір субтитрів → Зберегти  
4. "OCR" → Тест OCR → перевір розпізнавання
5. "Синтез мови" → Вибери голос → Тест → Зберегти
✅ Готово!
```

---

## 🤖 ШІ-перекладач

Для ігор без українських субтитрів. Читає англійські субтитри, очищує від OCR-сміття та перекладає українською через [Groq](https://groq.com).

**Налаштування:**
1. Створи безкоштовний API-ключ на [console.groq.com](https://console.groq.com) (кнопка **API Keys → Create Key**)
2. У **десктоп-режимі** Steam Deck відкрий файл ключа:
   ```
   /home/deck/homebrew/plugins/UA_VoiceCCBridge/api_key.txt
   ```
3. Встав туди свій ключ (замість тексту-заглушки) і збережи
4. У плагіні: меню **🤖 ШІ перекладач** → обери мову субтитрів (🇬🇧 англійська) → увімкни переклад → обери модель **8B** (швидша) або **70B** (точніша)

> 💡 Ключ вводиться через файл бо в ігровому режимі Steam Deck екранна клавіатура незручна. Статус ключа видно в меню плагіна.

> 💡 Безкоштовний тариф Groq має денний ліміт токенів. Плагін економить їх — перекладає лише нові фрази, ігноруючи повтори.

## 🎮 Знімок по кнопці L4+R4

Під час гри натисни **L4+R4** одночасно — плагін заморозить повний знімок екрану. Потім у меню "Зона субтитрів" / "Фільтр зображення" можна спокійно налаштувати зону чи фільтри по цьому кадру, не перериваючи гру.

> Вмикається перемикачем у меню "Зона субтитрів".

---

## 🛠️ Технічні деталі

| Компонент | Технологія |
|-----------|-----------|
| OCR | [Tesseract 5](https://github.com/tesseract-ocr/tesseract) + [tesserocr](https://github.com/sirfz/tesserocr) |
| TTS (Piper) | [Piper](https://github.com/rhasspy/piper) + [ukrainian-tts](https://github.com/robinhad/ukrainian-tts) |
| TTS (RHVoice) | [RHVoice](https://github.com/RHVoice/RHVoice) |
| ШІ-переклад | [Groq](https://groq.com) (Llama 3.1 / 3.3) |
| EQ | SoX — Sound eXchange |
| Знімок | GStreamer + PipeWire |
| Задні кнопки | hidraw (протокол контролера Valve) |
| UI | React + Decky Loader SDK |

---

## 💙 Підтримати проєкт

<div align="center">

**Якщо плагін корисний — підтримай розробку!**

🏦 **Monobank:** [send.monobank.ua/jar/7oNtZZsgCb](https://send.monobank.ua/jar/7oNtZZsgCb)

💳 **Картка:** `4874 1000 2613 9066`

![QR донат](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://send.monobank.ua/jar/7oNtZZsgCb)

</div>

---

<div align="center">

MIT License • Зроблено з ❤️ для українських гравців

</div>