#!/usr/bin/env python3
"""
button_watcher.py — автономний фоновий процес.
Запускається через sudo з main.py. Слухає L4+R4 і робить повний знімок.
"""
import sys, os, time, subprocess

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PLUGIN_DIR)
from hidraw_monitor import HidrawButtons

FULLSHOT = os.path.join(PLUGIN_DIR, "fullshot.sh")

def freeze(pressed):
    print(f"BTN:{pressed}", flush=True)
    if "L4" in pressed and "R4" in pressed:
        try:
            # Знімок робимо від deck бо pipewire сесія під deck (Uid 1000)
            r = subprocess.run(["sudo", "-n", "-u", "deck", "/usr/bin/bash", FULLSHOT],
                               capture_output=True, text=True, timeout=5)
            print(f"FROZEN rc={r.returncode} err={r.stderr[:200]}", flush=True)
        except Exception as e:
            print(f"ERROR: {e}", flush=True)

if __name__ == "__main__":
    STOP_FLAG = "/tmp/ua_button_stop"
    # Прибираємо старий прапорець
    if os.path.exists(STOP_FLAG):
        os.remove(STOP_FLAG)

    m = HidrawButtons(callback=freeze)
    if not m.start():
        print("START_FAILED", flush=True)
        sys.exit(1)
    print("WATCHING", flush=True)
    try:
        while True:
            if os.path.exists(STOP_FLAG):
                os.remove(STOP_FLAG)
                print("STOP_FLAG", flush=True)
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    m.stop()
    print("STOPPED", flush=True)