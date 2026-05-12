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
  const [currentGame, setCurrentGame] = useState<{appid: string|null, name: string|null}>({appid: null, name: null});
  const [focusedBtn, setFocusedBtn] = useState<string|null>(null);

  // Отримуємо поточну гру при відкритті
  useEffect(() => {
    serverApi.callPluginMethod("get_current_game", {}).then((res: any) => {
      if (res.success) setCurrentGame(res.result);
    });
  }, []);

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
  const [outlineFilter, setOutlineFilter] = useState(false);
  const [outlineHmin, setOutlineHmin] = useState(0);
  const [outlineHmax, setOutlineHmax] = useState(255);
  const [outlineRadius, setOutlineRadius] = useState(3);
  const [outlineDark, setOutlineDark] = useState(80);
  const [minXheight, setMinXheight] = useState(10);
  const [secBasic, setSecBasic] = useState(true);
  const [secOutline, setSecOutline] = useState(false);

  // OCR
  const [ocrInterval, setOcrInterval] = useState(1000);
  const [ocrMinLen, setOcrMinLen] = useState(3);
  const [ocrIgnoreWords, setOcrIgnoreWords] = useState("");
  const [ocrTestResult, setOcrTestResult] = useState<string | null>(null);
  const [ocrPsm, setOcrPsm] = useState(6);
  const [ocrOem, setOcrOem] = useState(1);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [typewriterThreshold, setTypewriterThreshold] = useState(80);
  const [ocrSimilarity, setOcrSimilarity] = useState(80);

  // TTS
  const [ttsSpeaker, setTtsSpeaker] = useState(1);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(100);
  const [ttsNoiseScale, setTtsNoiseScale] = useState(67);  // 0.667 * 100
  const [ttsNoiseW, setTtsNoiseW] = useState(80);          // 0.8 * 100
  const [ttsCpuIdle, setTtsCpuIdle] = useState(true);
  const [ttsOmpThreads, setTtsOmpThreads] = useState(1);
  const [ttsNice, setTtsNice] = useState(0);
  const [ttsMallocArena, setTtsMallocArena] = useState(false);
  const [ttsMallocMmap, setTtsMallocMmap] = useState(false);

  const DFL = (window as any).DFL;
  const { PanelSection, PanelSectionRow, Button, ToggleField, SliderField } = DFL || {};

  // При вході в меню
  useEffect(() => {
    if (activeMenu === "image") { loadZone(); fetchImg(); }
    if (activeMenu === "filters") { loadFilters(); }
    if (activeMenu === "ocr") { loadOcrSettings(); }
    if (activeMenu === "tts") { loadTtsSettings(); }
  }, [activeMenu]);

  // Автооновлення превью при зміні фільтрів з debounce
  useEffect(() => {
    if (activeMenu !== "filters" || imgData === null) return;
    const timer = setTimeout(() => { fetchFilteredPreview(); }, 300);
    return () => clearTimeout(timer);
  }, [bw, contrast, brightness, colorFilter, hardness,
      outlineFilter, outlineHmin, outlineHmax, outlineRadius, outlineDark]);

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
      const bw_ = z.bw || false;
      const contrast_ = Math.round((z.contrast || 1.0) * 10);
      const brightness_ = Math.round((z.brightness || 1.0) * 10);
      const colorFilter_ = z.color_filter || "none";
      const hardness_ = z.hardness || 30;
      const outlineFilter_ = z.outline_filter || false;
      const outlineHmin_ = z.outline_hmin ?? 0;
      const outlineHmax_ = z.outline_hmax ?? 255;
      const outlineRadius_ = z.outline_radius ?? 3;
      const outlineDark_ = z.outline_dark ?? 80;
      setBw(bw_); setContrast(contrast_); setBrightness(brightness_);
      setColorFilter(colorFilter_); setHardness(hardness_);
      setOutlineFilter(outlineFilter_);
      setOutlineHmin(outlineHmin_); setOutlineHmax(outlineHmax_);
      setOutlineRadius(outlineRadius_); setOutlineDark(outlineDark_);
      setMinXheight(z.ocr_min_xheight || 10);
      // Одразу показуємо превью з завантаженими значеннями
      const prev = await serverApi.callPluginMethod("get_filtered_preview", {
        bw: bw_, contrast: contrast_ / 10, brightness: brightness_ / 10,
        color_filter: colorFilter_, hardness: hardness_,
        outline_filter: outlineFilter_,
        outline_hmin: outlineHmin_, outline_hmax: outlineHmax_,
        outline_radius: outlineRadius_, outline_dark: outlineDark_,
      });
      if (prev.success && prev.result.success) {
        setImgData(prev.result.image); setErrorMsg(null);
      }
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
  const fetchFilteredPreview = useCallback(async () => {
    const res = await serverApi.callPluginMethod("get_filtered_preview", {
      bw, contrast: contrast / 10, brightness: brightness / 10,
      color_filter: colorFilter, hardness,
      outline_filter: outlineFilter,
      outline_hmin: outlineHmin, outline_hmax: outlineHmax,
      outline_radius: outlineRadius, outline_dark: outlineDark,
    });
    if (res.success && res.result.success) {
      setImgData(res.result.image); setErrorMsg(null);
    } else {
      setErrorMsg(res.result?.error || "Помилка");
    }
  }, [serverApi, bw, contrast, brightness, colorFilter, hardness,
      outlineFilter, outlineHmin, outlineHmax, outlineRadius, outlineDark]);

  const saveFilters = async () => {
    await serverApi.callPluginMethod("save_filters", {
      bw, contrast: contrast / 10, brightness: brightness / 10,
      color_filter: colorFilter, hardness,
      outline_filter: outlineFilter,
      outline_hmin: outlineHmin, outline_hmax: outlineHmax,
      outline_radius: outlineRadius, outline_dark: outlineDark,
      ocr_min_xheight: minXheight,
    });
  };

  const loadTtsSettings = async () => {
    const res = await serverApi.callPluginMethod("get_zone", {});
    if (res.success && res.result.success) {
      const z = res.result.zone;
      setTtsSpeaker(z.tts_speaker ?? 1);
      setTtsSpeed(z.tts_speed ?? 1.0);
      setTtsVolume(z.tts_volume ?? 100);
      setTtsNoiseScale(Math.round((z.tts_noise_scale ?? 0.667) * 100));
      setTtsNoiseW(Math.round((z.tts_noise_w ?? 0.8) * 100));
      setTtsCpuIdle(z.tts_cpu_idle ?? true);
      setTtsOmpThreads(z.tts_omp_threads ?? 1);
      setTtsNice(z.tts_nice ?? 0);
      setTtsMallocArena(z.tts_malloc_arena ?? false);
      setTtsMallocMmap(z.tts_malloc_mmap ?? false);
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
      setOcrOem(z.ocr_oem ?? 1);
      setTypewriterMode(z.typewriter_mode || false);
      setTypewriterThreshold(z.typewriter_threshold || 80);
      setOcrSimilarity(z.ocr_similarity ?? 80);
    }
  };

  const saveZone = async () => {
    await serverApi.callPluginMethod("save_zone", {
      offset_bottom: offsetBottom, width: zoneWidth, height: zoneHeight,
    });
  };

  const startTimer = async () => {
    setTimerActive(true);
    setImgData(null);
    setErrorMsg(null);
    const res = await serverApi.callPluginMethod("start_capture_timer", {});
    if (res.success && res.result.success) {
      setImgData(res.result.image);
    } else {
      setErrorMsg(res.result?.error || "Помилка знімку");
    }
    setTimerActive(false);
  };

  // Тільки знімок без збереження зони (для меню фільтрів)
  const takeScreenshot = async () => {
    setTimerActive(true);
    setImgData(null);
    setErrorMsg(null);
    const res = await serverApi.callPluginMethod("start_capture_timer", {});
    if (res.success && res.result.success) {
      setImgData(res.result.image);
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

  const globalStyle = `
    .Panel button:focus, .Panel button:focus-visible {
      outline: 2px solid #1a9fff !important;
      background-color: #2a4a6a !important;
    }
    .gamepadSlider_SliderField_LabelText__DicFE,
    [class*="SliderField_LabelText"],
    [class*="LabelText"] {
      font-size: 11px !important;
    }
    [class*="SliderField_SliderControlAndNotches"],
    [class*="SliderControlAndNotches"] {
      margin-top: 2px !important;
    }
    [class*="PanelSectionRow"] {
      padding: 4px 16px !important;
    }
  `;

  // ===== МЕНЮ ЗОНИ =====
  if (activeMenu === "image") {
    return (
      <PanelSection title="Зона субтитрів"><style>{globalStyle}</style>
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
          <Button onClick={async () => { await saveZone(); }}
            style={{ width: "100%", backgroundColor: currentGame.name ? "#27ae60" : "#555" }}>
            💾 {currentGame.name ? currentGame.name : "Гра не запущена"}
          </Button>
        </PanelSectionRow>

        <PanelSectionRow>
          <Button disabled={timerActive} onClick={startTimer}
            style={{ width: "100%", backgroundColor: timerActive ? "#555" : "#1a9fff" }}>
            <FaCamera style={{ marginRight: "8px" }} />
            {timerActive ? "Знімаю..." : "Зробити знімок"}
          </Button>
        </PanelSectionRow>
        <PreviewBox imgData={imgData} errorMsg={errorMsg} />
      </PanelSection>
    );
  }

  // ===== МЕНЮ ФІЛЬТРІВ =====
  if (activeMenu === "filters") {
    const colorButtons = ["none", "R", "G", "B", "Y", "W", "S"];
    const colorStyles: any = {
      none: "#3d4450", R: "#c0392b", G: "#27ae60", B: "#2980b9", Y: "#f1c40f", W: "#bdc3c7", S: "#7f8c8d"
    };
    const SecHeader = ({title, expanded, onToggle}: any) => (
      <PanelSectionRow>
        <Button onClick={onToggle} style={{ width: "100%", backgroundColor: expanded ? "#1a4a6a" : "#2a3140", textAlign: "left" as const }}>
          {expanded ? "▲" : "▼"} {title}
        </Button>
      </PanelSectionRow>
    );

    return (
      <PanelSection title="Фільтри зображення"><style>{globalStyle}</style>
        <BackButton />

        {/* Превью зверху завжди видно */}
        <PanelSectionRow>
          <Button disabled={timerActive} onClick={takeScreenshot}
            style={{ width: "100%", backgroundColor: timerActive ? "#555" : "#1a9fff" }}>
            <FaCamera style={{ marginRight: "8px" }} />
            {timerActive ? "Знімаю..." : "Зробити знімок"}
          </Button>
        </PanelSectionRow>
        <PreviewBox imgData={imgData} errorMsg={errorMsg} />

        {/* Секція 1 — Базові фільтри */}
        <SecHeader title="Базові фільтри" expanded={secBasic} onToggle={() => setSecBasic(!secBasic)} />
        {secBasic && (<>
          <PanelSectionRow>
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "4px" }}>Колір тексту субтитрів:</div>
              <div style={{ display: "flex", gap: "3px" }}>
                {colorButtons.map(c => (
                  <button key={c} onClick={() => { setColorFilter(c); fetchFilteredPreview(); }} style={{
                    flex: 1, height: "26px", borderRadius: "4px",
                    border: colorFilter === c ? "2px solid #fff" : "2px solid transparent",
                    backgroundColor: colorStyles[c], cursor: "pointer", padding: 0,
                    color: "#fff", fontSize: "10px", fontWeight: "bold",
                  }}>{c === "none" ? "✕" : c}</button>
                ))}
              </div>
            </div>
          </PanelSectionRow>
          {colorFilter !== "none" && (
            <PanelSectionRow>
              <SliderField label={`Жорсткість: ${hardness}`} value={hardness}
                min={5} max={120} step={5}
                onChange={(v: number) => { setHardness(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
          )}
          {colorFilter === "none" && (
            <PanelSectionRow>
              <ToggleField label="Чорно-білий режим" checked={bw} onChange={(v: boolean) => { setBw(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <SliderField label={`Контраст: ${(contrast / 10).toFixed(1)}x`} value={contrast}
              min={1} max={30} step={1}
              onChange={(v: number) => { setContrast(v); fetchFilteredPreview(); }} />
          </PanelSectionRow>
          <PanelSectionRow>
            <SliderField label={`Яскравість: ${(brightness / 10).toFixed(1)}x`} value={brightness}
              min={1} max={30} step={1}
              onChange={(v: number) => { setBrightness(v); fetchFilteredPreview(); }} />
          </PanelSectionRow>
          <PanelSectionRow>
            <SliderField label={`Мін висота тексту: ${minXheight}px`} value={minXheight}
              min={5} max={50} step={1}
              onChange={(v: number) => setMinXheight(v)} />
          </PanelSectionRow>
        </>)}

        {/* Секція 2 — Контекстний фільтр */}
        <SecHeader title="Обводка (пошук букв)" expanded={secOutline} onToggle={() => setSecOutline(!secOutline)} />
        {secOutline && (<>
          <PanelSectionRow>
            <ToggleField label="Увімкнути" checked={outlineFilter} onChange={(v: boolean) => { setOutlineFilter(v); fetchFilteredPreview(); }} />
          </PanelSectionRow>
          {outlineFilter && (<>
            <PanelSectionRow>
              <SliderField label={`Поріг мін: ${outlineHmin}`} value={outlineHmin}
                min={0} max={255} step={5}
                onChange={(v: number) => { setOutlineHmin(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField label={`Поріг макс: ${outlineHmax}`} value={outlineHmax}
                min={0} max={255} step={5}
                onChange={(v: number) => { setOutlineHmax(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField label={`Радіус обводки: ${outlineRadius}px`} value={outlineRadius}
                min={1} max={15} step={1}
                onChange={(v: number) => { setOutlineRadius(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField label={`Поріг темного: ${outlineDark}`} value={outlineDark}
                min={0} max={128} step={5}
                onChange={(v: number) => { setOutlineDark(v); fetchFilteredPreview(); }} />
            </PanelSectionRow>
          </>)}
        </>)}

        {/* Зберегти */}
        <PanelSectionRow>
          <Button onClick={async () => { await saveFilters(); }}
            style={{ width: "100%", backgroundColor: currentGame.name ? "#27ae60" : "#555" }}>
            💾 {currentGame.name ? currentGame.name : "Гра не запущена"}
          </Button>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (activeMenu === "ocr") {
    return (
      <PanelSection title="Налаштування OCR"><style>{globalStyle}</style>
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

        {/* Поріг схожості субтитрів */}
        <PanelSectionRow>
          <SliderField
            label={`Фільтр повторів: ${ocrSimilarity}%`}
            value={ocrSimilarity}
            min={20} max={99} step={1}
            onChange={(v: number) => setOcrSimilarity(v)}
          />
          <div style={{ color: "#8b929a", fontSize: "10px", marginTop: "2px" }}>
            {ocrSimilarity <= 40 ? "Дуже агресивний (пропускає різні СС)" :
             ocrSimilarity <= 60 ? "Агресивний — менше повторів (рекомендовано)" :
             ocrSimilarity <= 80 ? "Збалансований" :
             "Слабкий — більше повторів"}
          </div>
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
              onFocus={() => {
                try { (window as any).SteamClient.Input.SetKeyboardVisible(true); } catch {}
              }}
              onBlur={() => {
                try { (window as any).SteamClient.Input.SetKeyboardVisible(false); } catch {}
              }}
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
              similarity: ocrSimilarity,
            });
            await serverApi.callPluginMethod("save_typewriter_settings", {
              enabled: typewriterMode,
              threshold: typewriterThreshold,
            });
           
          }} style={{ width: "100%", backgroundColor: currentGame.name ? "#27ae60" : "#555" }}>
            💾 {currentGame.name ? currentGame.name : "Гра не запущена"}
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
      <PanelSection title="Синтез мови (TTS)"><style>{globalStyle}</style>
        <BackButton />

        {/* Вибір спікера */}
        <PanelSectionRow>
          <div style={{ width: "100%" }}>
            <div style={{ color: "#8b929a", fontSize: "11px", marginBottom: "4px" }}>Голос:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
              {[
                {v: 1, l: "Микита", icon: "👨", cat: "Piper"},
                {v: 0, l: "Лада", icon: "👩", cat: "Piper"},
                {v: 2, l: "Тетяна", icon: "👩", cat: "Piper"},
                {v: 4, l: "Даринка", icon: "🧒", cat: "Piper"},
                {v: 5, l: "Anatol", icon: "👨", cat: "RHVoice"},
                {v: 6, l: "Volodymyr", icon: "👨", cat: "RHVoice"},
                {v: 7, l: "Natalia", icon: "👩", cat: "RHVoice"},
                {v: 8, l: "Marianna", icon: "👩", cat: "RHVoice"},
              ].map(({v, l, icon, cat}) => (
                <button key={v} onClick={() => setTtsSpeaker(v)} title={cat} style={{
                  padding: "8px 4px", borderRadius: "4px", border: "none",
                  backgroundColor: ttsSpeaker === v ? "#1a9fff" : "#2a3140",
                  color: "#fff", fontSize: "11px", cursor: "pointer",
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
            min={5} max={25} step={1}
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

        {/* Варіативність голосу — тільки для Piper */}
        {![5, 6, 7, 8].includes(ttsSpeaker) && (
        <PanelSectionRow>
          <SliderField
            label={`Живість голосу: ${ttsNoiseScale}%`}
            value={ttsNoiseScale}
            min={0} max={100} step={1}
            onChange={(v: number) => setTtsNoiseScale(v)}
          />
          <div style={{ color: "#8b929a", fontSize: "10px", marginTop: "2px" }}>
            {ttsNoiseScale <= 65 ? "Монотонний" :
             ttsNoiseScale <= 75 ? "Природній (дефолт)" :
             "Емоційний"}
          </div>
        </PanelSectionRow>
        )}

        {/* Енергія дихання — тільки для Piper */}
        {![5, 6, 7, 8].includes(ttsSpeaker) && (
        <PanelSectionRow>
          <SliderField
            label={`Дихання: ${ttsNoiseW}%`}
            value={ttsNoiseW}
            min={0} max={100} step={1}
            onChange={(v: number) => setTtsNoiseW(v)}
          />
          <div style={{ color: "#8b929a", fontSize: "10px", marginTop: "2px" }}>
            {ttsNoiseW <= 70 ? "Чіткий" :
             ttsNoiseW <= 85 ? "Природній (дефолт)" :
             "М'який"}
          </div>
        </PanelSectionRow>
        )}

        {/* Зберегти */}
        <PanelSectionRow>
          <Button onClick={async () => {
            await serverApi.callPluginMethod("save_tts_settings", {
              speaker: ttsSpeaker, speed: ttsSpeed, volume: ttsVolume,
              noise_scale: ttsNoiseScale / 100, noise_w: ttsNoiseW / 100,
              cpu_idle: ttsCpuIdle, omp_threads: ttsOmpThreads, nice: ttsNice,
              malloc_arena: ttsMallocArena, malloc_mmap: ttsMallocMmap,
            });
           
          }} style={{ width: "100%", backgroundColor: currentGame.name ? "#27ae60" : "#555" }}>
            💾 {currentGame.name ? currentGame.name : "Гра не запущена"}
          </Button>
        </PanelSectionRow>

        {/* Тест TTS */}
        <PanelSectionRow>
          <Button onClick={async () => {
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
  const btnStyle = (id: string) => ({
    width: "100%",
    textAlign: "left" as const,
    backgroundColor: focusedBtn === id ? "#1a9fff" : "#2a3140",
    border: `1px solid ${focusedBtn === id ? "#1a9fff" : "#3d4450"}`,
    borderRadius: "6px",
    transition: "background 0.1s, border-color 0.1s",
  });

  return (
    <PanelSection title="UA Voice Bridge">
      <style>{globalStyle}</style>

      {/* Поточна гра */}
      <PanelSectionRow>
        <div style={{
          width: "100%", background: "#1a2030",
          border: "1px solid #333", borderRadius: "6px",
          padding: "6px 8px", display: "flex", alignItems: "center", gap: "10px"
        }}>
          {currentGame.appid ? (
            <img
              src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${currentGame.appid}/capsule_184x69.jpg`}
              style={{ width: "92px", height: "35px", borderRadius: "3px", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "24px" }}>🎮</span>
          )}
          <div style={{ color: currentGame.name ? "#fff" : "#555", fontSize: "12px", fontWeight: "bold" }}>
            {currentGame.name || "Гра не запущена"}
          </div>
        </div>
      </PanelSectionRow>

      <PanelSectionRow>
        <ToggleField label="Активація воркера" checked={isActive}
          onChange={(v: any) => {
            setIsActive(v);
            localStorage.setItem("ua_voice_worker", v ? "true" : "false");
            serverApi.callPluginMethod("toggle_worker", { active: v });
          }} />
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("image")}
          onFocus={() => setFocusedBtn("image")} onBlur={() => setFocusedBtn(null)}
          style={btnStyle("image")}>
          <FaCamera style={{ marginRight: "8px" }} /> Зона субтитрів
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("filters")}
          onFocus={() => setFocusedBtn("filters")} onBlur={() => setFocusedBtn(null)}
          style={btnStyle("filters")}>
          <FaSlidersH style={{ marginRight: "8px" }} /> Фільтри зображення
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("ocr")}
          onFocus={() => setFocusedBtn("ocr")} onBlur={() => setFocusedBtn(null)}
          style={btnStyle("ocr")}>
          <FaLanguage style={{ marginRight: "8px" }} /> Налаштування OCR
        </Button>
      </PanelSectionRow>
      <PanelSectionRow>
        <Button onClick={() => setActiveMenu("tts")}
          onFocus={() => setFocusedBtn("tts")} onBlur={() => setFocusedBtn(null)}
          style={btnStyle("tts")}>
          <FaVolumeUp style={{ marginRight: "8px" }} /> Синтез мови
        </Button>
      </PanelSectionRow>

      {/* Донати */}
      <PanelSectionRow>
        <div style={{
          width: "100%", background: "#1a2030",
          border: "1px solid #333", borderRadius: "6px",
          padding: "10px", textAlign: "center"
        }}>
          <div style={{ color: "#8b929a", fontSize: "10px", marginBottom: "6px" }}>
            Якщо плагін корисний — буду радий підтримці ☕
          </div>
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://send.monobank.ua/jar/7oNtZZsgCb"
            style={{ width: "120px", height: "120px", borderRadius: "4px" }}
          />
          <div style={{ color: "#555", fontSize: "9px", marginTop: "4px" }}>
            💳 4874 1000 2613 9066
          </div>
        </div>
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