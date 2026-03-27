import os
import sys
import asyncio
import base64
import json
import decky_plugin

CONFIG_PATH = "/home/deck/.config/ua_voice_plugin/config.json"
SCREEN_W = 1280
SCREEN_H = 800

def load_config():
    defaults = {
        "offset_bottom": 50, "width": 900, "height": 80,
        "bw": False, "contrast": 1.0, "brightness": 1.0,
        "color_filter": "none", "hardness": 30,
        "ocr_interval": 1000, "ocr_min_len": 3, "ocr_ignore_words": "",
        "ocr_psm": 6, "ocr_oem": 3,
        "typewriter_mode": False, "typewriter_threshold": 80,
        "tts_speaker": 1, "tts_speed": 0.8, "tts_volume": 100,
    }
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                return {**defaults, **json.load(f)}
    except:
        pass
    return defaults

def save_config(data: dict):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    current = load_config()
    current.update(data)
    with open(CONFIG_PATH, "w") as f:
        json.dump(current, f)

def calc_crop(cfg: dict):
    w = cfg["width"]; h = cfg["height"]; ob = cfg["offset_bottom"]
    left = (SCREEN_W - w) // 2
    right = (SCREEN_W - w) // 2
    top = SCREEN_H - ob - h
    bottom = ob
    return {"top": top, "bottom": bottom, "left": left, "right": right}

async def run_python3(script: str, *args) -> str:
    """Запускає скрипт через системний Python 3.13"""
    plugin_dir = decky_plugin.DECKY_PLUGIN_DIR
    script_path = os.path.join(plugin_dir, script)
    proc = await asyncio.create_subprocess_exec(
        "python3", script_path, *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if stderr:
        decky_plugin.logger.info(f"UA_LOG [{script}]: {stderr.decode()[:200]}")
    return stdout.decode().strip()

class Plugin:

    async def get_zone(self):
        return {"success": True, "zone": load_config()}

    async def save_zone(self, offset_bottom: int, width: int, height: int):
        save_config({"offset_bottom": offset_bottom, "width": width, "height": height})
        return {"success": True}

    async def save_filters(self, bw: bool, contrast: float, brightness: float, color_filter: str, hardness: int):
        save_config({"bw": bw, "contrast": contrast, "brightness": brightness,
                     "color_filter": color_filter, "hardness": hardness})
        return {"success": True}

    async def save_ocr_settings(self, interval: int, min_len: int, ignore_words: str, psm: int = 6, oem: int = 3):
        save_config({"ocr_interval": interval, "ocr_min_len": min_len,
                     "ocr_ignore_words": ignore_words, "ocr_psm": psm, "ocr_oem": oem})
        return {"success": True}

    async def save_typewriter_settings(self, enabled: bool, threshold: int):
        save_config({"typewriter_mode": enabled, "typewriter_threshold": threshold})
        return {"success": True}

    async def save_tts_settings(self, speaker: int, speed: float, volume: int):
        save_config({"tts_speaker": speaker, "tts_speed": speed, "tts_volume": volume})
        return {"success": True}

    async def get_filtered_preview(self, bw: bool, contrast: float, brightness: float, color_filter: str, hardness: int):
        path = "/dev/shm/calibration_raw.png"
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            return {"success": False, "error": "Знімок відсутній"}
        tmp_cfg = load_config()
        tmp_cfg.update({"bw": bw, "contrast": contrast, "brightness": brightness,
                        "color_filter": color_filter, "hardness": hardness})
        result = await run_python3("preview_worker.py", path, json.dumps(tmp_cfg))
        if result:
            return {"success": True, "image": result}
        return {"success": False, "error": "Помилка фільтрів"}

    async def start_capture_timer(self):
        cfg = load_config()
        crop = calc_crop(cfg)
        cal_script = os.path.join(decky_plugin.DECKY_PLUGIN_DIR, "calibration.sh")
        cal_img = "/dev/shm/calibration_raw.png"
        decky_plugin.logger.info(f"UA_LOG: Старт таймера. Crop: {crop}")
        try:
            if os.path.exists(cal_img):
                os.remove(cal_img)
            await asyncio.sleep(5)
            proc = await asyncio.create_subprocess_exec(
                "sudo", "-u", "deck", "/usr/bin/bash", cal_script,
                str(crop["top"]), str(crop["bottom"]), str(crop["left"]), str(crop["right"]),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            if os.path.exists(cal_img) and os.path.getsize(cal_img) > 0:
                result = await run_python3("preview_worker.py", cal_img, json.dumps(cfg))
                if result:
                    return {"success": True, "image": result}
            return {"success": False, "error": "Не вдалося зробити знімок"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_cal_img(self):
        path = "/dev/shm/calibration_raw.png"
        if os.path.exists(path) and os.path.getsize(path) > 0:
            cfg = load_config()
            result = await run_python3("preview_worker.py", path, json.dumps(cfg))
            if result:
                return {"success": True, "image": result}
        return {"success": False, "error": "Знімок відсутній"}

    async def test_ocr(self):
        path = "/dev/shm/calibration_raw.png"
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            return {"success": False, "error": "Знімок відсутній"}
        cfg = load_config()
        text = await run_python3("ocr_worker.py", path, CONFIG_PATH)
        preview = await run_python3("preview_worker.py", path, json.dumps(cfg))
        return {
            "success": True,
            "text": text if text else "(текст не розпізнано)",
            "image": preview
        }

    async def test_tts(self, text: str = "Привіт! Це тест синтезу мови."):
        cfg = load_config()
        piper_dir = os.path.join(decky_plugin.DECKY_PLUGIN_DIR, "piper")
        piper_bin = os.path.join(piper_dir, "piper")
        model = os.path.join(piper_dir, "uk_UA-ukrainian_tts-medium.onnx")
        wav_file = "/dev/shm/ua_tts_test.wav"
        env = {
            **os.environ,
            "LD_LIBRARY_PATH": piper_dir,
            "XDG_RUNTIME_DIR": "/run/user/1000",
            "PULSE_RUNTIME_PATH": "/run/user/1000/pulse",
        }
        try:
            piper = await asyncio.create_subprocess_exec(
                piper_bin, "--model", model,
                "--speaker", str(cfg["tts_speaker"]),
                "--length_scale", str(cfg["tts_speed"]),
                "--output_file", wav_file,
                stdin=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
                env=env, cwd=piper_dir,
            )
            piper.stdin.write(text.encode())
            piper.stdin.close()
            await piper.wait()
            aplay = await asyncio.create_subprocess_exec(
                "paplay", wav_file,
                stderr=asyncio.subprocess.DEVNULL, env=env,
            )
            await aplay.wait()
            return {"success": True}
        except Exception as e:
            decky_plugin.logger.error(f"UA_LOG: TTS error: {e}")
            return {"success": False, "error": str(e)}

    async def toggle_worker(self, active: bool = False):
        import subprocess
        import signal as sig

        # Вбиваємо старий воркер через /proc
        for proc_dir in os.listdir('/proc'):
            if not proc_dir.isdigit():
                continue
            try:
                with open(f'/proc/{proc_dir}/cmdline', 'rb') as f:
                    cmd = f.read().decode('utf-8', errors='ignore')
                if 'worker.py' in cmd or 'capture_loop' in cmd:
                    os.kill(int(proc_dir), sig.SIGTERM)
            except:
                pass

        await asyncio.sleep(1)

        if active:
            script = os.path.join(decky_plugin.DECKY_PLUGIN_DIR, "worker.py")
            clean_env = {
                "HOME": "/home/deck",
                "USER": "deck",
                "PATH": "/usr/local/sbin:/usr/local/bin:/usr/bin:/usr/sbin",
                "XDG_RUNTIME_DIR": "/run/user/1000",
                "WAYLAND_DISPLAY": "wayland-0",
                "PULSE_RUNTIME_PATH": "/run/user/1000/pulse",
                "DBUS_SESSION_BUS_ADDRESS": "unix:path=/run/user/1000/bus",
            }
            subprocess.Popen(
                ["python3", script],
                env=clean_env,
                stdout=open("/tmp/ua_worker.log", "w"),
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        return {"success": True}

    async def _main(self): pass
    async def _unload(self): await self.toggle_worker(False)