var plugin_export = (function () {
    'use strict';

    const manifest = {"name":"UA_VoiceCCBridge"};
    const API_VERSION = 2;
    const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
    if (!internalAPIConnection) {
        throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
    }
    let api;
    try {
        api = internalAPIConnection.connect(API_VERSION, manifest.name);
    }
    catch {
        api = internalAPIConnection.connect(1, manifest.name);
        console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
    }
    if (api._version != API_VERSION) {
        console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
    }
    const definePlugin = (fn) => {
        return (...args) => {
            return fn(...args);
        };
    };

    var DefaultContext = {
      color: undefined,
      size: undefined,
      className: undefined,
      style: undefined,
      attr: undefined
    };
    var IconContext = SP_REACT.createContext && SP_REACT.createContext(DefaultContext);

    var __assign = window && window.__assign || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    var __rest = window && window.__rest || function (s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
      return t;
    };
    function Tree2Element(tree) {
      return tree && tree.map(function (node, i) {
        return SP_REACT.createElement(node.tag, __assign({
          key: i
        }, node.attr), Tree2Element(node.child));
      });
    }
    function GenIcon(data) {
      // eslint-disable-next-line react/display-name
      return function (props) {
        return SP_REACT.createElement(IconBase, __assign({
          attr: __assign({}, data.attr)
        }, props), Tree2Element(data.child));
      };
    }
    function IconBase(props) {
      var elem = function (conf) {
        var attr = props.attr,
          size = props.size,
          title = props.title,
          svgProps = __rest(props, ["attr", "size", "title"]);
        var computedSize = size || conf.size || "1em";
        var className;
        if (conf.className) className = conf.className;
        if (props.className) className = (className ? className + " " : "") + props.className;
        return SP_REACT.createElement("svg", __assign({
          stroke: "currentColor",
          fill: "currentColor",
          strokeWidth: "0"
        }, conf.attr, attr, svgProps, {
          className: className,
          style: __assign(__assign({
            color: props.color || conf.color
          }, conf.style), props.style),
          height: computedSize,
          width: computedSize,
          xmlns: "http://www.w3.org/2000/svg"
        }), title && SP_REACT.createElement("title", null, title), props.children);
      };
      return IconContext !== undefined ? SP_REACT.createElement(IconContext.Consumer, null, function (conf) {
        return elem(conf);
      }) : elem(DefaultContext);
    }

    // THIS FILE IS AUTO GENERATED
    function FaArrowLeft (props) {
      return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"}}]})(props);
    }function FaCamera (props) {
      return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M512 144v288c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h88l12.3-32.9c7-18.7 24.9-31.1 44.9-31.1h125.5c20 0 37.9 12.4 44.9 31.1L376 96h88c26.5 0 48 21.5 48 48zM376 288c0-66.2-53.8-120-120-120s-120 53.8-120 120 53.8 120 120 120 120-53.8 120-120zm-32 0c0 48.5-39.5 88-88 88s-88-39.5-88-88 39.5-88 88-88 88 39.5 88 88z"}}]})(props);
    }function FaLanguage (props) {
      return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M152.1 236.2c-3.5-12.1-7.8-33.2-7.8-33.2h-.5s-4.3 21.1-7.8 33.2l-11.1 37.5H163zM616 96H336v320h280c13.3 0 24-10.7 24-24V120c0-13.3-10.7-24-24-24zm-24 120c0 6.6-5.4 12-12 12h-11.4c-6.9 23.6-21.7 47.4-42.7 69.9 8.4 6.4 17.1 12.5 26.1 18 5.5 3.4 7.3 10.5 4.1 16.2l-7.9 13.9c-3.4 5.9-10.9 7.8-16.7 4.3-12.6-7.8-24.5-16.1-35.4-24.9-10.9 8.7-22.7 17.1-35.4 24.9-5.8 3.5-13.3 1.6-16.7-4.3l-7.9-13.9c-3.2-5.6-1.4-12.8 4.2-16.2 9.3-5.7 18-11.7 26.1-18-7.9-8.4-14.9-17-21-25.7-4-5.7-2.2-13.6 3.7-17.1l6.5-3.9 7.3-4.3c5.4-3.2 12.4-1.7 16 3.4 5 7 10.8 14 17.4 20.9 13.5-14.2 23.8-28.9 30-43.2H412c-6.6 0-12-5.4-12-12v-16c0-6.6 5.4-12 12-12h64v-16c0-6.6 5.4-12 12-12h16c6.6 0 12 5.4 12 12v16h64c6.6 0 12 5.4 12 12zM0 120v272c0 13.3 10.7 24 24 24h280V96H24c-13.3 0-24 10.7-24 24zm58.9 216.1L116.4 167c1.7-4.9 6.2-8.1 11.4-8.1h32.5c5.1 0 9.7 3.3 11.4 8.1l57.5 169.1c2.6 7.8-3.1 15.9-11.4 15.9h-22.9a12 12 0 0 1-11.5-8.6l-9.4-31.9h-60.2l-9.1 31.8c-1.5 5.1-6.2 8.7-11.5 8.7H70.3c-8.2 0-14-8.1-11.4-15.9z"}}]})(props);
    }function FaPowerOff (props) {
      return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M400 54.1c63 45 104 118.6 104 201.9 0 136.8-110.8 247.7-247.5 248C120 504.3 8.2 393 8 256.4 7.9 173.1 48.9 99.3 111.8 54.2c11.7-8.3 28-4.8 35 7.7L162.6 90c5.9 10.5 3.1 23.8-6.6 31-41.5 30.8-68 79.6-68 134.9-.1 92.3 74.5 168.1 168 168.1 91.6 0 168.6-74.2 168-169.1-.3-51.8-24.7-101.8-68.1-134-9.7-7.2-12.4-20.5-6.5-30.9l15.8-28.1c7-12.4 23.2-16.1 34.8-7.8zM296 264V24c0-13.3-10.7-24-24-24h-32c-13.3 0-24 10.7-24 24v240c0 13.3 10.7 24 24 24h32c13.3 0 24-10.7 24-24z"}}]})(props);
    }function FaSlidersH (props) {
      return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M496 384H160v-16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v16H16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h80v16c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-16h336c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm0-160h-80v-16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v16H16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h336v16c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-16h80c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm0-160H288V48c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v16H16C7.2 64 0 71.2 0 80v32c0 8.8 7.2 16 16 16h208v16c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16v-16h208c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16z"}}]})(props);
    }function FaVolumeUp (props) {
      return GenIcon({"attr":{"viewBox":"0 0 576 512"},"child":[{"tag":"path","attr":{"d":"M215.03 71.05L126.06 160H24c-13.26 0-24 10.74-24 24v144c0 13.25 10.74 24 24 24h102.06l88.97 88.95c15.03 15.03 40.97 4.47 40.97-16.97V88.02c0-21.46-25.96-31.98-40.97-16.97zm233.32-51.08c-11.17-7.33-26.18-4.24-33.51 6.95-7.34 11.17-4.22 26.18 6.95 33.51 66.27 43.49 105.82 116.6 105.82 195.58 0 78.98-39.55 152.09-105.82 195.58-11.17 7.32-14.29 22.34-6.95 33.5 7.04 10.71 21.93 14.56 33.51 6.95C528.27 439.58 576 351.33 576 256S528.27 72.43 448.35 19.97zM480 256c0-63.53-32.06-121.94-85.77-156.24-11.19-7.14-26.03-3.82-33.12 7.46s-3.78 26.21 7.41 33.36C408.27 165.97 432 209.11 432 256s-23.73 90.03-63.48 115.42c-11.19 7.14-14.5 22.07-7.41 33.36 6.51 10.36 21.12 15.14 33.12 7.46C447.94 377.94 480 319.54 480 256zm-141.77-76.87c-11.58-6.33-26.19-2.16-32.61 9.45-6.39 11.61-2.16 26.2 9.45 32.61C327.98 228.28 336 241.63 336 256c0 14.38-8.02 27.72-20.92 34.81-11.61 6.41-15.84 21-9.45 32.61 6.43 11.66 21.05 15.8 32.61 9.45 28.23-15.55 45.77-45 45.77-76.88s-17.54-61.32-45.78-76.86z"}}]})(props);
    }

    const SCREEN_W = 1280;
    const PreviewBox = ({ imgData, errorMsg }) => {
        const imgRef = SP_REACT.useRef(null);
        const scaleRef = SP_REACT.useRef(1);
        const offsetRef = SP_REACT.useRef({ x: 0, y: 0 });
        const lastTouch = SP_REACT.useRef(null);
        const lastDist = SP_REACT.useRef(0);
        const DFL = window.DFL;
        const { PanelSectionRow } = DFL || {};
        const applyTransform = () => {
            if (!imgRef.current)
                return;
            const s = scaleRef.current;
            const o = offsetRef.current;
            imgRef.current.style.transform = `scale(${s}) translate(${o.x / s}px, ${o.y / s}px)`;
        };
        const getDistance = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const onTouchStart = (e) => {
            if (e.touches.length === 2) {
                lastDist.current = getDistance(e.touches[0], e.touches[1]);
            }
            else if (e.touches.length === 1) {
                lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };
        const onTouchMove = (e) => {
            if (e.touches.length === 2) {
                const dist = getDistance(e.touches[0], e.touches[1]);
                const delta = dist / lastDist.current;
                lastDist.current = dist;
                scaleRef.current = Math.min(Math.max(scaleRef.current * delta, 1), 5);
                applyTransform();
            }
            else if (e.touches.length === 1 && lastTouch.current) {
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
        return (SP_REACT.createElement(PanelSectionRow, null,
            SP_REACT.createElement("div", { style: { width: "100%", boxSizing: "border-box" } }, !imgData
                ? SP_REACT.createElement("div", { style: { background: "#000", border: "1px solid #444", borderRadius: "4px",
                        minHeight: "60px", display: "flex", justifyContent: "center", alignItems: "center" } },
                    SP_REACT.createElement("div", { style: { color: "orange", textAlign: "center", padding: "8px", fontSize: "11px" } }, errorMsg || "Знімок відсутній"))
                : SP_REACT.createElement("div", { onTouchStart: onTouchStart, onTouchMove: onTouchMove, onDoubleClick: onDoubleTap, style: {
                        background: "#000", border: "1px solid #444", borderRadius: "4px",
                        overflow: "hidden", touchAction: "none", cursor: "grab", height: "100px",
                        display: "flex", justifyContent: "center", alignItems: "center",
                    } },
                    SP_REACT.createElement("img", { ref: imgRef, src: `data:image/jpeg;base64,${imgData}`, style: {
                            width: "100%", display: "block", transformOrigin: "center",
                            userSelect: "none", willChange: "transform",
                        } })))));
    };
    const Content = ({ serverApi }) => {
        const [activeMenu, setActiveMenu] = SP_REACT.useState("main");
        const [imgData, setImgData] = SP_REACT.useState(null);
        const [errorMsg, setErrorMsg] = SP_REACT.useState(null);
        const [isActive, setIsActive] = SP_REACT.useState(localStorage.getItem("ua_voice_worker") === "true");
        const [timerActive, setTimerActive] = SP_REACT.useState(false);
        const [zoneExpanded, setZoneExpanded] = SP_REACT.useState(false);
        // Зона
        const [offsetBottom, setOffsetBottom] = SP_REACT.useState(50);
        const [zoneWidth, setZoneWidth] = SP_REACT.useState(900);
        const [zoneHeight, setZoneHeight] = SP_REACT.useState(80);
        // Фільтри
        const [bw, setBw] = SP_REACT.useState(false);
        const [contrast, setContrast] = SP_REACT.useState(10);
        const [brightness, setBrightness] = SP_REACT.useState(10);
        const [colorFilter, setColorFilter] = SP_REACT.useState("none");
        const [hardness, setHardness] = SP_REACT.useState(30);
        // OCR
        const [ocrInterval, setOcrInterval] = SP_REACT.useState(1000);
        const [ocrMinLen, setOcrMinLen] = SP_REACT.useState(3);
        const [ocrIgnoreWords, setOcrIgnoreWords] = SP_REACT.useState("");
        const [ocrTestResult, setOcrTestResult] = SP_REACT.useState(null);
        const [ocrPsm, setOcrPsm] = SP_REACT.useState(6);
        const [ocrOem, setOcrOem] = SP_REACT.useState(3);
        const [typewriterMode, setTypewriterMode] = SP_REACT.useState(false);
        const [typewriterThreshold, setTypewriterThreshold] = SP_REACT.useState(80);
        // TTS
        const [ttsSpeaker, setTtsSpeaker] = SP_REACT.useState(1);
        const [ttsSpeed, setTtsSpeed] = SP_REACT.useState(0.8);
        const [ttsVolume, setTtsVolume] = SP_REACT.useState(100);
        const DFL = window.DFL;
        const { PanelSection, PanelSectionRow, Button, ToggleField, SliderField } = DFL || {};
        SP_REACT.useEffect(() => {
            if (activeMenu === "image") {
                loadZone();
                fetchImg();
            }
            if (activeMenu === "filters") {
                loadFilters();
                fetchImg();
            }
            if (activeMenu === "ocr") {
                loadOcrSettings();
            }
            if (activeMenu === "tts") {
                loadTtsSettings();
            }
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
            }
            else {
                setErrorMsg(res.result?.error || "Знімок відсутній");
            }
        };
        // Превью фільтрів з дебounce
        const fetchFilteredPreview = SP_REACT.useCallback(async (_bw, _contrast, _brightness, _colorFilter, _hardness) => {
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
            }
            else {
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
            }
            else {
                setErrorMsg(res.result?.error || "Помилка знімку");
            }
            setTimerActive(false);
        };
        const BackButton = () => (SP_REACT.createElement(PanelSectionRow, null,
            SP_REACT.createElement(Button, { onClick: () => setActiveMenu("main"), style: { width: "100%", backgroundColor: "#3d4450" } },
                SP_REACT.createElement(FaArrowLeft, { style: { marginRight: "8px" } }),
                " \u041D\u0430\u0437\u0430\u0434")));
        // ===== МЕНЮ ЗОНИ =====
        if (activeMenu === "image") {
            return (SP_REACT.createElement(PanelSection, { title: "\u0417\u043E\u043D\u0430 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432" },
                SP_REACT.createElement(BackButton, null),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: () => setZoneExpanded(!zoneExpanded), style: { width: "100%", backgroundColor: "#2a3140" } },
                        zoneExpanded ? "▲" : "▼",
                        " \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u043E\u043D\u0438")),
                zoneExpanded && (SP_REACT.createElement(SP_REACT.Fragment, null,
                    SP_REACT.createElement(PanelSectionRow, null,
                        SP_REACT.createElement(SliderField, { label: `Від низу: ${offsetBottom}px`, value: offsetBottom, min: 0, max: 300, step: 5, onChange: (v) => setOffsetBottom(v) })),
                    SP_REACT.createElement(PanelSectionRow, null,
                        SP_REACT.createElement(SliderField, { label: `Ширина: ${zoneWidth}px`, value: zoneWidth, min: 400, max: SCREEN_W, step: 10, onChange: (v) => setZoneWidth(v) })),
                    SP_REACT.createElement(PanelSectionRow, null,
                        SP_REACT.createElement(SliderField, { label: `Висота: ${zoneHeight}px`, value: zoneHeight, min: 20, max: 250, step: 5, onChange: (v) => setZoneHeight(v) })),
                    SP_REACT.createElement(PanelSectionRow, null,
                        SP_REACT.createElement("div", { style: { width: "100%", boxSizing: "border-box", padding: "0 4px" } },
                            SP_REACT.createElement("div", { style: {
                                    position: "relative", width: "100%",
                                    paddingTop: `${(800 / 1280) * 100}%`,
                                    background: "#1a1a2e", border: "1px solid #444",
                                    borderRadius: "4px", overflow: "hidden", boxSizing: "border-box",
                                } },
                                SP_REACT.createElement("div", { style: {
                                        position: "absolute", inset: 0,
                                        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                                        backgroundSize: "10% 12.5%",
                                    } }),
                                SP_REACT.createElement("div", { style: {
                                        position: "absolute",
                                        left: `${((SCREEN_W - zoneWidth) / 2 / SCREEN_W) * 100}%`,
                                        top: `${((800 - offsetBottom - zoneHeight) / 800) * 100}%`,
                                        width: `${(zoneWidth / SCREEN_W) * 100}%`,
                                        height: `${(zoneHeight / 800) * 100}%`,
                                        border: "2px solid #00ff00", boxShadow: "0 0 4px #00ff00",
                                        borderRadius: "2px", boxSizing: "border-box",
                                    } }),
                                SP_REACT.createElement("div", { style: {
                                        position: "absolute",
                                        left: `${((SCREEN_W - zoneWidth) / 2 / SCREEN_W) * 100}%`,
                                        top: `${((800 - offsetBottom - zoneHeight) / 800) * 100 + 1}%`,
                                        color: "#00ff00", fontSize: "8px", whiteSpace: "nowrap", paddingLeft: "2px",
                                    } },
                                    zoneWidth,
                                    "\u00D7",
                                    zoneHeight)))))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { disabled: timerActive, onClick: startTimer, style: { width: "100%", backgroundColor: timerActive ? "#555" : "#1a9fff" } },
                        SP_REACT.createElement(FaCamera, { style: { marginRight: "8px" } }),
                        timerActive ? "Чекаю 5 секунд..." : "Зробити знімок зони (5 сек)")),
                SP_REACT.createElement(PreviewBox, { imgData: imgData, errorMsg: errorMsg })));
        }
        // ===== МЕНЮ ФІЛЬТРІВ =====
        if (activeMenu === "filters") {
            const colorButtons = ["none", "R", "G", "B", "Y", "W"];
            const colorStyles = {
                none: "#3d4450", R: "#c0392b", G: "#27ae60", B: "#2980b9", Y: "#f1c40f", W: "#bdc3c7"
            };
            return (SP_REACT.createElement(PanelSection, { title: "\u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F" },
                SP_REACT.createElement(BackButton, null),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement("div", { style: { width: "100%", boxSizing: "border-box" } },
                        SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "11px", marginBottom: "6px" } }, "\u041A\u043E\u043B\u0456\u0440 \u0442\u0435\u043A\u0441\u0442\u0443 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432:"),
                        SP_REACT.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px", boxSizing: "border-box" } }, colorButtons.map(c => (SP_REACT.createElement("button", { key: c, onClick: () => {
                                setColorFilter(c);
                                fetchFilteredPreview(bw, contrast, brightness, c, hardness);
                            }, style: {
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
                            } }, c === "none" ? "✕" : "")))))),
                colorFilter !== "none" && (SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Жорсткість: ${hardness}`, value: hardness, min: 5, max: 120, step: 5, onChange: (v) => {
                            setHardness(v);
                            fetchFilteredPreview(bw, contrast, brightness, colorFilter, v);
                        } }))),
                colorFilter === "none" && (SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(ToggleField, { label: "\u0427\u043E\u0440\u043D\u043E-\u0431\u0456\u043B\u0438\u0439 \u0440\u0435\u0436\u0438\u043C", checked: bw, onChange: (v) => {
                            setBw(v);
                            fetchFilteredPreview(v, contrast, brightness, colorFilter, hardness);
                        } }))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Контраст: ${(contrast / 10).toFixed(1)}x`, value: contrast, min: 1, max: 30, step: 1, onChange: (v) => {
                            setContrast(v);
                            fetchFilteredPreview(bw, v, brightness, colorFilter, hardness);
                        } })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Яскравість: ${(brightness / 10).toFixed(1)}x`, value: brightness, min: 1, max: 30, step: 1, onChange: (v) => {
                            setBrightness(v);
                            fetchFilteredPreview(bw, contrast, v, colorFilter, hardness);
                        } })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: async () => { await saveFilters(); }, style: { width: "100%", backgroundColor: "#27ae60" } }, "\uD83D\uDCBE \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0444\u0456\u043B\u044C\u0442\u0440\u0438")),
                SP_REACT.createElement(PreviewBox, { imgData: imgData, errorMsg: errorMsg })));
        }
        if (activeMenu === "ocr") {
            return (SP_REACT.createElement(PanelSection, { title: "\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F OCR" },
                SP_REACT.createElement(BackButton, null),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Частота: ${ocrInterval}мс`, value: ocrInterval, min: 300, max: 3000, step: 100, onChange: (v) => setOcrInterval(v) })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Мін. символів: ${ocrMinLen}`, value: ocrMinLen, min: 1, max: 20, step: 1, onChange: (v) => setOcrMinLen(v) })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement("div", { style: { width: "100%" } },
                        SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "11px", marginBottom: "4px" } }, "\u0406\u0433\u043D\u043E\u0440\u0443\u0432\u0430\u0442\u0438 \u0441\u043B\u043E\u0432\u0430 (\u0447\u0435\u0440\u0435\u0437 \u043A\u043E\u043C\u0443):"),
                        SP_REACT.createElement("input", { type: "text", value: ocrIgnoreWords, onChange: (e) => setOcrIgnoreWords(e.target.value), placeholder: "\u0413\u0435\u0440\u0430\u043B\u044C\u0442, \u0419\u0435\u043D\u043D\u0435\u0444\u0435\u0440, \u0426\u0438\u0440\u0456...", style: {
                                width: "100%", boxSizing: "border-box",
                                background: "#2a3140", border: "1px solid #555",
                                borderRadius: "4px", color: "#fff",
                                padding: "6px 8px", fontSize: "12px",
                            } }))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(ToggleField, { label: "\u0420\u0435\u0436\u0438\u043C \u0434\u0440\u0443\u043A\u0430\u0440\u0441\u044C\u043A\u043E\u0457 \u043C\u0430\u0448\u0438\u043D\u043A\u0438", checked: typewriterMode, onChange: (v) => setTypewriterMode(v) })),
                typewriterMode && (SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Поріг схожості: ${typewriterThreshold}%`, value: typewriterThreshold, min: 60, max: 100, step: 10, onChange: (v) => setTypewriterThreshold(v) }),
                    SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "10px", marginTop: "2px" } }, typewriterThreshold <= 60 ? "Агресивний (брудна картинка)" :
                        typewriterThreshold <= 80 ? "Збалансований (дефолт)" :
                            "Точний (чиста картинка)"))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement("div", { style: { width: "100%" } },
                        SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "11px", marginBottom: "4px" } }, "PSM \u0440\u0435\u0436\u0438\u043C:"),
                        SP_REACT.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" } }, [
                            { v: 6, l: "PSM 6" },
                            { v: 7, l: "PSM 7" },
                            { v: 8, l: "PSM 8" },
                            { v: 11, l: "PSM 11" },
                        ].map(({ v, l }) => (SP_REACT.createElement("button", { key: v, onClick: () => setOcrPsm(v), style: {
                                padding: "4px", borderRadius: "4px", border: "none",
                                backgroundColor: ocrPsm === v ? "#1a9fff" : "#2a3140",
                                color: "#fff", fontSize: "11px", cursor: "pointer",
                            } }, l)))),
                        SP_REACT.createElement("div", { style: { color: "#555", fontSize: "10px", marginTop: "3px" } }, ocrPsm === 6 ? "Блок тексту (дефолт)" :
                            ocrPsm === 7 ? "Один рядок" :
                                ocrPsm === 8 ? "Одне слово" : "Розріджений текст"))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: async () => {
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
                        }, style: { width: "100%", backgroundColor: "#27ae60" } }, "\uD83D\uDCBE \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438")),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: async () => {
                            setOcrTestResult("Розпізнаю...");
                            const res = await serverApi.callPluginMethod("test_ocr", {});
                            if (res.success && res.result.success) {
                                setOcrTestResult(res.result.text);
                                setImgData(res.result.image);
                            }
                            else {
                                setOcrTestResult(res.result?.error || "Помилка");
                            }
                        }, style: { width: "100%", backgroundColor: "#1a9fff" } }, "\uD83D\uDD0D \u0422\u0435\u0441\u0442 OCR")),
                ocrTestResult && (SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement("div", { style: {
                            width: "100%", background: "#1a2030",
                            border: "1px solid #444", borderRadius: "4px",
                            padding: "8px", fontSize: "12px", color: "#fff",
                            wordBreak: "break-word",
                        } },
                        SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "10px", marginBottom: "4px" } }, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442:"),
                        ocrTestResult))),
                SP_REACT.createElement(PreviewBox, { imgData: imgData, errorMsg: errorMsg })));
        }
        if (activeMenu === "tts") {
            return (SP_REACT.createElement(PanelSection, { title: "\u0421\u0438\u043D\u0442\u0435\u0437 \u043C\u043E\u0432\u0438 (TTS)" },
                SP_REACT.createElement(BackButton, null),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement("div", { style: { width: "100%" } },
                        SP_REACT.createElement("div", { style: { color: "#8b929a", fontSize: "11px", marginBottom: "4px" } }, "\u0413\u043E\u043B\u043E\u0441:"),
                        SP_REACT.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" } }, [
                            { v: 0, l: "Lada", icon: "👩" },
                            { v: 1, l: "Mykyta", icon: "👨" },
                            { v: 2, l: "Tetiana", icon: "👩" },
                        ].map(({ v, l, icon }) => (SP_REACT.createElement("button", { key: v, onClick: () => setTtsSpeaker(v), style: {
                                padding: "8px 4px", borderRadius: "4px", border: "none",
                                backgroundColor: ttsSpeaker === v ? "#1a9fff" : "#2a3140",
                                color: "#fff", fontSize: "12px", cursor: "pointer",
                            } },
                            icon,
                            " ",
                            l)))))),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Швидкість: ${ttsSpeed.toFixed(1)}x`, value: Math.round(ttsSpeed * 10), min: 5, max: 15, step: 1, onChange: (v) => setTtsSpeed(v / 10) })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(SliderField, { label: `Гучність: ${ttsVolume}%`, value: ttsVolume, min: 10, max: 100, step: 5, onChange: (v) => setTtsVolume(v) })),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: async () => {
                            await serverApi.callPluginMethod("save_tts_settings", {
                                speaker: ttsSpeaker,
                                speed: ttsSpeed,
                                volume: ttsVolume,
                            });
                        }, style: { width: "100%", backgroundColor: "#27ae60" } }, "\uD83D\uDCBE \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438")),
                SP_REACT.createElement(PanelSectionRow, null,
                    SP_REACT.createElement(Button, { onClick: async () => {
                            await serverApi.callPluginMethod("save_tts_settings", {
                                speaker: ttsSpeaker, speed: ttsSpeed, volume: ttsVolume,
                            });
                            await serverApi.callPluginMethod("test_tts", {
                                text: "Привіт! Це тест синтезу мови українською."
                            });
                        }, style: { width: "100%", backgroundColor: "#1a9fff" } }, "\uD83D\uDD0A \u0422\u0435\u0441\u0442 \u0433\u043E\u043B\u043E\u0441\u0443"))));
        }
        // ===== ГОЛОВНЕ МЕНЮ =====
        return (SP_REACT.createElement(PanelSection, { title: "UA Voice Bridge" },
            SP_REACT.createElement(PanelSectionRow, null,
                SP_REACT.createElement(ToggleField, { label: "\u0410\u043A\u0442\u0438\u0432\u0430\u0446\u0456\u044F \u0432\u043E\u0440\u043A\u0435\u0440\u0430", checked: isActive, onChange: (v) => {
                        setIsActive(v);
                        localStorage.setItem("ua_voice_worker", v ? "true" : "false");
                        serverApi.callPluginMethod("toggle_worker", { active: v });
                    } })),
            SP_REACT.createElement(PanelSectionRow, null,
                SP_REACT.createElement(Button, { onClick: () => setActiveMenu("image"), style: { width: "100%", textAlign: "left" } },
                    SP_REACT.createElement(FaCamera, { style: { marginRight: "8px" } }),
                    " \u0417\u043E\u043D\u0430 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432")),
            SP_REACT.createElement(PanelSectionRow, null,
                SP_REACT.createElement(Button, { onClick: () => setActiveMenu("filters"), style: { width: "100%", textAlign: "left" } },
                    SP_REACT.createElement(FaSlidersH, { style: { marginRight: "8px" } }),
                    " \u0424\u0456\u043B\u044C\u0442\u0440\u0438 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F")),
            SP_REACT.createElement(PanelSectionRow, null,
                SP_REACT.createElement(Button, { onClick: () => setActiveMenu("ocr"), style: { width: "100%", textAlign: "left" } },
                    SP_REACT.createElement(FaLanguage, { style: { marginRight: "8px" } }),
                    " \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F OCR")),
            SP_REACT.createElement(PanelSectionRow, null,
                SP_REACT.createElement(Button, { onClick: () => setActiveMenu("tts"), style: { width: "100%", textAlign: "left" } },
                    SP_REACT.createElement(FaVolumeUp, { style: { marginRight: "8px" } }),
                    " \u0421\u0438\u043D\u0442\u0435\u0437 \u043C\u043E\u0432\u0438"))));
    };
    // @ts-ignore
    var index = definePlugin((serverApi) => {
        return {
            name: "UA_VoiceCCBridge",
            content: SP_REACT.createElement(Content, { serverApi: serverApi }),
            icon: SP_REACT.createElement(FaPowerOff, null),
        };
    });

    return index;

})();

window.plugin_export = plugin_export;
//# sourceMappingURL=index.js.map
