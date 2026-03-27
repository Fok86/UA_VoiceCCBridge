import { definePlugin } from "@decky/api";
import React, { FC, useState, useEffect, useCallback } from "react";
import { FaCamera, FaLanguage, FaVolumeUp, FaArrowLeft, FaPowerOff, FaSlidersH } from "react-icons/fa";

const SCREEN_W = 1280;

const PreviewBox: FC<{ imgData: string | null; errorMsg: string | null }> = ({ imgData, errorMsg }) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const scaleRef = React.useRef(1);
  const offsetRef = React.useRef({ x: 0, y: 0 });
  const lastTouch = React.useRef<any>(null);
  const lastDist = React.useRef<number>(0);

  const DFL = (window as any).DFL;
  const { PanelSectionRow } = DFL || {};

  const applyTransform = () => {
    if (!imgRef.current) return;
    const s = scaleRef.current;
    const o = offsetRef.current;
    imgRef.current.style.transform = `scale(${s}) translate(${o.x / s}px, ${o.y / s}px)`;
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDist.current = getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      const delta = dist / lastDist.current;
      lastDist.current = dist;
      scaleRef.current = Math.min(Math.max(scaleRef.current * delta, 1), 5);
      applyTransform();
    } else if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
      applyTransform();
    }
  };

  const onDoubleTap = () => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  return (
    <PanelSectionRow>
      <div style={{ width: "100%", boxSizing: "border-box" }}>
        {!imgData
          ? <div style={{ background: "#000", border: "1px solid #444", borderRadius: "4px",
              minHeight: "60px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ color: "orange", textAlign: "center", padding: "8px", fontSize: "11px" }}>
                {errorMsg || "Знімок відсутній"}
              </div>
            </div>
          : <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onDoubleClick={onDoubleTap}
              style={{
                background: "#000", border: "1px solid #444", borderRadius: "4px",
                overflow: "hidden", touchAction: "none", cursor: "grab", height: "100px",
                display: "flex", justifyContent: "center", alignItems: "center",
              }}>
              <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${imgData}`}
                style={{
                  width: "100%", display: "block", transformOrigin: "center",
                  userSelect: "none", willChange: "transform",
                }}
              />
            </div>
        }
      </div>
    </PanelSectionRow>
  );
};

const Content: FC<{ serverApi: any }> = ({ serverApi }) => {
  const [activeMenu, setActiveMenu] = useState("main");
  const [imgData, setImgData] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(localStorage.getItem("ua_voice_worker") === "true");
  const [timerActive, setTimerActive] = useState(false);
  const [zoneExpanded, setZoneExpanded] = useState(false);

  // Зона
  const [offsetBottom, setOffsetBottom] = useState(50);
  const [zoneWidth, setZoneWidth] = useState(900);
  const [zoneHeight, setZoneHeight] = useState(80);

  // Фільтри
  const [bw, setBw] = useState(false);
  const [contrast, setContrast] = useState(10);
  const [brightness, setBrightness] = useState(10);
  const [colorFilter, setColorFilter] = useState("none");
  const [hardness, setHardness] = useState(30);

  // OCR
  const [ocrInterval, setOcrInterval] = useState(1000);
  const [ocrMinLen, setOcrMinLen] = useState(3);
  const [ocrIgnoreWords, setOcrIgnoreWords] = useState("");
  const [ocrTestResult, setOcrTestResult] = useState<string | null>(null);
  const [ocrPsm, setOcrPsm] = useState(6);
  const [ocrOem, setOcrOem] = useState(3);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [typewriterThreshold, setTypewriterThreshold] = useState(80);

  // TTS
  const [ttsSpeaker, setTtsSpeaker] = useState(1);
  const [ttsSpeed, setTtsSpeed] = useState(0.8);
  const [ttsVolume, setTtsVolume] = useState(100);

  const DFL = (window as any).DFL;
  const { PanelSection, PanelSectionRow, Button, ToggleField, SliderField } = DFL || {};

  useEffect(() => {
    if (activeMenu === "image") { loadZone(); fetchImg(); }
    if (activeMenu === "filters") { loadFilters(); fetchImg(); }
    if (activeMenu === "ocr") { loadOcrSettings(); }
    if (activeMenu === "tts") { loadTtsSettings(); }
  }, [activeMenu]);

  const loadZone = async () => {
    const res = await serverApi.callPluginMethod("get_zone", {});
    if (res.success && res.result.success) {
      const z = res.result.zone;
      setOffsetBottom(z.offset_bottom);
      setZoneWidth(z.width);
      setZoneHeight(z.height);
    }
  };

  const loadFilters = async () => {
    const res = await serverApi.callPluginMethod("get_zone", {});
    if (res.success && res.result.success) {
      const z = res.result.zone;
      setBw(z.bw || false);
      setContrast(Math.round((z.contrast || 1.0) * 10));
      setBrightness(Math.round((z.brightness || 1.0) * 10));
      setColorFilter(z.color_filter || "none");
      setHardness(z.hardness || 30);
    }
  };

  const fetchImg = async () => {
    const res = await serverApi.callPluginMethod("get_cal_img", {});
    if (res.success && res.result.success) {
      setImgData(res.result.image);
      setErrorMsg(null);
    } else {
      setErrorMsg(res.result?.error || "Знімок відсутній");
    }
  };

  // Превью фільтрів з дебounce
  const fetchFilteredPreview = useCallback(async (
    _bw: boolean, _contrast: number, _brightness: number,
    _colorFilter: string, _hardness: number
  ) => {
    const res = await serverApi.callPluginMethod("get_filtered_preview", {
      bw: _bw,
      contrast: _contrast / 10,
      brightness: _brightness / 10,
      color_filter: _colorFilter,
      hardness: _hardness,
    });
    if (res.success && res.result.success) {
      setImgData(res.result.image);
      setErrorMsg(null);
    } else {
      setErrorMsg(res.result?.error || "Помилка");
    }
  }, [serverApi]);

  const saveFilters = async () => {
    await serverApi.callPluginMethod("save_filters", {
      bw, contrast: contrast / 10, brightness: brightness / 10,
      color_filter: colorFilter, hardness,
    });
  };

  const loadTtsSettings = async () => {
    const res = await serverApi.callPluginMethod("get_zone", {});
    if (res.success && res.result.success) {
      const z = res.result.zone;
      setTtsSpeaker(z.tts_speaker ?? 1);
      setTtsSpeed(z.tts_speed ?? 0.8);
      setTtsVolume(z.tts_volume ?? 100);
    }
  };

  const loadOcrSettings = async () => {
    const res = await serverApi.callPluginMethod("get_zone", {});
    if (res.success && res.result.success) {
      const z = res.result.zone;
      setOcrInterval(z.ocr_interval || 1000);
      setOcrMinLen(z.ocr_min_len || 3);
      setOcrIgnoreWords(z.ocr_ignore_words || "");
      setOcrPsm(z.ocr_psm || 6);
      setOcrOem(z.ocr_oem || 3);
      setTypewriterMode(z.typewriter_mode || false);
      setTypewriterThreshold(z.typewriter_threshold || 80);
    }
  };

  const saveZone = async () => {
    await serverApi.callPluginMethod("save_zone", {
      offset_bottom: offsetBottom, width: zoneWidth, height: zoneHeight,
    });
  };

  const startTimer = async () => {
    await saveZone();
    setTimerActive(true);
    setImgData(null);
    setErrorMsg("Йде відлік 5с... Закрий меню і відкрий гру!");
    const res = await serverApi.callPluginMethod("start_capture_timer", {});
    if (res.success && res.result.success) {
      setImgData(res.result.image);
      setErrorMsg(null);
    } else {
      setErrorMsg(res.result?.error || "Помилка знімку");
    }
    setTimerActive(false);
  };

  const BackButton = () => (
    <PanelSectionRow>
      <Button onClick={() => setActiveMenu("main")} style={{ width: "100%", backgroundColor: "#3d4450" }}>
        <FaArrowLeft style={{ marginRight: "8px" }} /> Назад
      </Button>
    </PanelSectionRow>
  );

  // ===== МЕНЮ ЗОНИ =====
  if (activeMenu === "image") {
    return (
      <PanelSection title="Зона субтитрів">
        <BackButton />
        <PanelSectionRow>
          <Button onClick={() => setZoneExpanded(!zoneExpanded)}
            style={{ width: "100%", backgroundColor: "#2a3140" }}>
            {zoneExpanded ? "▲" : "▼"} Налаштування зони
          </Button>
        </PanelSectionRow>

        {zoneExpanded && (<>
          <PanelSectionRow>
            <SliderField label={`Від низу: ${offsetBottom}px`} value={offsetBottom}
              min={0} max={300} step={5} onChange={(v: number) => setOffsetBottom(v)} />
          </PanelSectionRow>
          <PanelSectionRow>
            <SliderField label={`Ширина: ${zoneWidth}px`} value={zoneWidth}
              min={400} max={SCREEN_W} step={10} onChange={(v: number) => setZoneWidth(v)} />
          </PanelSectionRow>
          <PanelSectionRow>
            <SliderField label={`Висота: ${zoneHeight}px`} value={zoneHeight}
              min={20} max={250} step={5} onChange={(v: number) => setZoneHeight(v)} />
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ width: "100%", boxSizing: "border-box", padding: "0 4px" }}>
              <div style={{
                position: "relative", width: "100%",
                paddingTop: `${(800 / 1280) * 100}%`,
                background: "#1a1a2e", border: "1px solid #444",
                borderRadius: "4px", overflow: "hidden", boxSizing: "border-box",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                  backgroundSize: "10% 12.5%",
                }} />
                <div style={{
                  position: "absolute",
                  left: `${((SCREEN_W - zoneWidth) / 2 / SCREEN_W) * 100}%`,
                  top: `${((800 - offsetBottom - zoneHeight) / 800) * 100}%`,
                  width: `${(zoneWidth / SCREEN_W) * 100}%`,
                  height: `${(zoneHeight / 800) * 100}%`,
                  border: "2px solid #00ff00", boxShadow: "0 0 4px #00ff00",
                  borderRadius: "2px", boxSizing: "border-box",
                }} />
                <div style={{
                  position: "absolute",
                  left: `${((SCREEN_W - zoneWidth) / 2 / SCREEN_W) * 100}%`,
                  top: `${((800 - offsetBottom - zoneHeight) / 800) * 100 + 1}%`,
                  color: "#00ff00", fontSize: "8px", whiteSpace: "nowrap", paddingLeft: "2px",
                }}>{zoneWidth}×{zoneHeight}</div>
              </div>
            </div>
          </PanelSectionRow>
        </>)}

        <PanelSectionRow>
          <Button disabled={timerActive} onClick={startTimer}
            style={{ width: "100%", backgroundColor: timerActive ? "#555" : "#1a9fff" }}>
            <FaCamera style={{ marginRight: "8px" }} />
            {timerActive ? "Чекаю 5 секунд..." : "Зробити знімок зони (5 сек)"}
          </Button>
        </PanelSectionRow>
        <PreviewBox imgData={imgData} errorMsg={errorMsg} />
      </PanelSection>
    );
  }

  // ===== МЕНЮ ФІЛЬТРІВ =====
  if (activeMenu === "filters") {
    const colorButtons = ["none", "R", "G", "B", "Y", "W"];
    const colorStyles: any = {
      none: "#3d4450", R: "#c0392b", G: "#27ae60", B: "#2980b9", Y: "#f1c40f", W: "#bdc3c7"
    };

    return (
      <PanelSection title="Фільтри зображення">
        <BackButton />

        {/* Кольорова маска */}
        <PanelSectionRow>
          <div style={{ width: "100%", boxSizing: "border-box" }}>
            <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "6px" }}>Колір тексту субтитрів:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px", boxSizing: "border-box" }}>
              {colorButtons.map(c => (
                <button key={c} onClick={() => {
                  setColorFilter(c);
                  fetchFilteredPreview(bw, contrast, brightness, c, hardness);
                }} style={{
                  height: "24px",
                  borderRadius: "4px",
                  border: colorFilter === c ? "2px solid #fff" : "2px solid transparent",
                  backgroundColor: colorStyles[c],
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "12px",
                }}>
                  {c === "none" ? "✕" : ""}
                </button>
              ))}
            </div>
          </div>
        </PanelSectionRow>

        {/* Жорсткість маски (тільки якщо обрано колір) */}
        {colorFilter !== "none" && (
          <PanelSectionRow>
            <SliderField label={`Жорсткість: ${hardness}`} value={hardness}
              min={5} max={120} step={5}
              onChange={(v: number) => {
                setHardness(v);
                fetchFilteredPreview(bw, contrast, brightness, colorFilter, v);
              }} />
          </PanelSectionRow>
        )}

        {/* ЧБ (тільки якщо немає кольорової маски) */}
        {colorFilter === "none" && (
          <PanelSectionRow>
            <ToggleField label="Чорно-білий режим" checked={bw} onChange={(v: boolean) => {
              setBw(v);
              fetchFilteredPreview(v, contrast, brightness, colorFilter, hardness);
            }} />
          </PanelSectionRow>
        )}

        {/* Контраст */}
        <PanelSectionRow>
          <SliderField label={`Контраст: ${(contrast / 10).toFixed(1)}x`} value={contrast}
            min={1} max={30} step={1}
            onChange={(v: number) => {
              setContrast(v);
              fetchFilteredPreview(bw, v, brightness, colorFilter, hardness);
            }} />
        </PanelSectionRow>

        {/* Яскравість */}
        <PanelSectionRow>
          <SliderField label={`Яскравість: ${(brightness / 10).toFixed(1)}x`} value={brightness}
            min={1} max={30} step={1}
            onChange={(v: number) => {
              setBrightness(v);
              fetchFilteredPreview(bw, contrast, v, colorFilter, hardness);
            }} />
        </PanelSectionRow>

        {/* Кнопка зберегти */}
        <PanelSectionRow>
          <Button onClick={async () => { await saveFilters(); }}
            style={{ width: "100%", backgroundColor: "#27ae60" }}>
            💾 Зберегти фільтри
          </Button>
        </PanelSectionRow>

        {/* Превью */}
        <PreviewBox imgData={imgData} errorMsg={errorMsg} />
      </PanelSection>
    );
  }

  if (activeMenu === "ocr") {
    return (
      <PanelSection title="Налаштування OCR">
        <BackButton />

        {/* Частота сканування */}
        <PanelSectionRow>
          <SliderField
            label={`Частота: ${ocrInterval}мс`}
            value={ocrInterval}
            min={300} max={3000} step={100}
            onChange={(v: number) => setOcrInterval(v)}
          />
        </PanelSectionRow>

        {/* Мінімальна довжина тексту */}
        <PanelSectionRow>
          <SliderField
            label={`Мін. символів: ${ocrMinLen}`}
            value={ocrMinLen}
            min={1} max={20} step={1}
            onChange={(v: number) => setOcrMinLen(v)}
          />
        </PanelSectionRow>

        {/* Ігнорувати слова */}
        <PanelSectionRow>
          <div style={{ width: "100%" }}>
            <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "4px" }}>
              Ігнорувати слова (через кому):
            </div>
            <input
              type="text"
              value={ocrIgnoreWords}
              onChange={(e: any) => setOcrIgnoreWords(e.target.value)}
              placeholder="Геральт, Йеннефер, Цирі..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#2a3140", border: "1px solid #555",
                borderRadius: "4px", color: "#fff",
                padding: "6px 8px", fontSize: "12px",
              }}
            />
          </div>
        </PanelSectionRow>

        {/* Режим друкарської машинки */}
        <PanelSectionRow>
          <ToggleField
            label="Режим друкарської машинки"
            checked={typewriterMode}
            onChange={(v: boolean) => setTypewriterMode(v)}
          />
        </PanelSectionRow>

        {typewriterMode && (
          <PanelSectionRow>
            <SliderField
              label={`Поріг схожості: ${typewriterThreshold}%`}
              value={typewriterThreshold}
              min={60} max={100} step={10}
              onChange={(v: number) => setTypewriterThreshold(v)}
            />
            <div style={{ color: "#8b929a", fontSize: "10px", marginTop: "2px" }}>
              {typewriterThreshold <= 60 ? "Агресивний (брудна картинка)" :
               typewriterThreshold <= 80 ? "Збалансований (дефолт)" :
               "Точний (чиста картинка)"}
            </div>
          </PanelSectionRow>
        )}

        {/* PSM вибір */}
        <PanelSectionRow>
          <div style={{ width: "100%" }}>
            <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "4px" }}>PSM режим:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
              {[
                {v: 6, l: "PSM 6"},
                {v: 7, l: "PSM 7"},
                {v: 8, l: "PSM 8"},
                {v: 11, l: "PSM 11"},
              ].map(({v, l}) => (
                <button key={v} onClick={() => setOcrPsm(v)} style={{
                  padding: "4px", borderRadius: "4px", border: "none",
                  backgroundColor: ocrPsm === v ? "#1a9fff" : "#2a3140",
                  color: "#fff", fontSize: "11px", cursor: "pointer",
                }}>{l}</button>
              ))}
            </div>
            <div style={{ color: "#555", fontSize: "10px", marginTop: "3px" }}>
              {ocrPsm === 6 ? "Блок тексту (дефолт)" :
               ocrPsm === 7 ? "Один рядок" :
               ocrPsm === 8 ? "Одне слово" : "Розріджений текст"}
            </div>
          </div>
        </PanelSectionRow>

        {/* Кнопка зберегти */}
        <PanelSectionRow>
          <Button onClick={async () => {
            await serverApi.callPluginMethod("save_ocr_settings", {
              interval: ocrInterval,
              min_len: ocrMinLen,
              ignore_words: ocrIgnoreWords,
              psm: ocrPsm,
              oem: ocrOem,
            });
            await serverApi.callPluginMethod("save_typewriter_settings", {
              enabled: typewriterMode,
              threshold: typewriterThreshold,
            });
          }} style={{ width: "100%", backgroundColor: "#27ae60" }}>
            💾 Зберегти
          </Button>
        </PanelSectionRow>

        {/* Кнопка тест OCR */}
        <PanelSectionRow>
          <Button onClick={async () => {
            setOcrTestResult("Розпізнаю...");
            const res = await serverApi.callPluginMethod("test_ocr", {});
            if (res.success && res.result.success) {
              setOcrTestResult(res.result.text);
              setImgData(res.result.image);
            } else {
              setOcrTestResult(res.result?.error || "Помилка");
            }
          }} style={{ width: "100%", backgroundColor: "#1a9fff" }}>
            🔍 Тест OCR
          </Button>
        </PanelSectionRow>

        {/* Результат тесту */}
        {ocrTestResult && (
          <PanelSectionRow>
            <div style={{
              width: "100%", background: "#1a2030",
              border: "1px solid #444", borderRadius: "4px",
              padding: "8px", fontSize: "12px", color: "#fff",
              wordBreak: "break-word",
            }}>
              <div style={{ color: "#8b929a", fontSize: "10px", marginBottom: "4px" }}>Результат:</div>
              {ocrTestResult}
            </div>
          </PanelSectionRow>
        )}

        {/* Превью */}
        <PreviewBox imgData={imgData} errorMsg={errorMsg} />
      </PanelSection>
    );
  }

  if (activeMenu === "tts") {
    return (
      <PanelSection title="Синтез мови (TTS)">
        <BackButton />

        {/* Вибір спікера */}
        <PanelSectionRow>
          <div style={{ width: "100%" }}>
            <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "4px" }}>Голос:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
              {[
                {v: 0, l: "Lada", icon: "👩"},
                {v: 1, l: "Mykyta", icon: "👨"},
                {v: 2, l: "Tetiana", icon: "👩"},
              ].map(({v, l, icon}) => (
                <button key={v} onClick={() => setTtsSpeaker(v)} style={{
                  padding: "8px 4px", borderRadius: "4px", border: "none",
                  backgroundColor: ttsSpeaker === v ? "#1a9fff" : "#2a3140",
                  color: "#fff", fontSize: "12px", cursor: "pointer",
                }}>{icon} {l}</button>
              ))}
            </div>
          </div>
        </PanelSectionRow>

        {/* Швидкість */}
        <PanelSectionRow>
          <SliderField
            label={`Швидкість: ${ttsSpeed.toFixed(1)}x`}
            value={Math.round(ttsSpeed * 10)}
            min={5} max={15} step={1}
            onChange={(v: number) => setTtsSpeed(v / 10)}
          />
        </PanelSectionRow>

        {/* Гучність */}
        <PanelSectionRow>
          <SliderField
            label={`Гучність: ${ttsVolume}%`}
            value={ttsVolume}
            min={10} max={100} step={5}
            onChange={(v: number) => setTtsVolume(v)}
          />
        </PanelSectionRow>

        {/* Зберегти */}
        <PanelSectionRow>
          <Button onClick={async () => {
            await serverApi.callPluginMethod("save_tts_settings", {
              speaker: ttsSpeaker,
              speed: ttsSpeed,
              volume: ttsVolume,
            });
          }} style={{ width: "100%", backgroundColor: "#27ae60" }}>
            💾 Зберегти
          </Button>
        </PanelSectionRow>

        {/* Тест TTS */}
        <PanelSectionRow>
          <Button onClick={async () => {
            await serverApi.callPluginMethod("save_tts_settings", {
              speaker: ttsSpeaker, speed: ttsSpeed, volume: ttsVolume,
            });
            await serverApi.callPluginMethod("test_tts", {
              text: "Привіт! Це тест синтезу мови українською."
            });
          }} style={{ width: "100%", backgroundColor: "#1a9fff" }}>
            🔊 Тест голосу
          </Button>
        </PanelSectionRow>

      </PanelSection>
    );
  }

  // ===== ГОЛОВНЕ МЕНЮ =====
  return (
    <PanelSection title="UA Voice Bridge">
      <PanelSectionRow>
        <ToggleField label="Активація воркера" checked={isActive}
          onChange={(v: any) => {
            setIsActive(v);
            localStorage.setItem("ua_voice_worker", v ? "true" : "false");
            serverApi.callPluginMethod("toggle_worker", { active: v });
          }} />
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("image")} style={{ width: "100%", textAlign: "left" }}>
          <FaCamera style={{ marginRight: "8px" }} /> Зона субтитрів
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("filters")} style={{ width: "100%", textAlign: "left" }}>
          <FaSlidersH style={{ marginRight: "8px" }} /> Фільтри зображення
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("ocr")} style={{ width: "100%", textAlign: "left" }}>
          <FaLanguage style={{ marginRight: "8px" }} /> Налаштування OCR
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("tts")} style={{ width: "100%", textAlign: "left" }}>
          <FaVolumeUp style={{ marginRight: "8px" }} /> Синтез мови
        </Button>
      </PanelSectionRow>
    </PanelSection>
  );
};

// @ts-ignore
export default definePlugin((serverApi: any) => {
  return {
    name: "UA_VoiceCCBridge",
    content: <Content serverApi={serverApi} />,
    icon: <FaPowerOff />,
  };
});