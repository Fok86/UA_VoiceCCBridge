#!/usr/bin/env python3
"""
hidraw_monitor.py — читання задніх кнопок (грипів) Steam Deck: L4, L5, R4, R5.

Реалізація протоколу контролера Valve (VID 0x28DE, PID 0x1205) на основі
публічної специфікації HID-звітів, яку використовує драйвер ядра Linux hid-steam.

Steam за замовчуванням перехоплює грипи ("lizard mode" — емуляція миші/клавіатури),
тому перед читанням ми надсилаємо feature-звіти які вимикають цю емуляцію,
після чого контролер починає слати повні input-звіти з бітами всіх кнопок.

Стан кнопок закодовано бітовими масками у 64-байтному input-звіті:
  байти 8..11  — молодша група кнопок (uint32 LE)
  байти 12..15 — старша група кнопок (uint32 LE)
"""

import os
import time
import struct
import select
import fcntl
import threading


# ── Ідентифікація пристрою ────────────────────────────────────────────
_VID = "28DE"          # Valve
_PID = "1205"          # Steam Deck built-in controller
_HID_IFACE = ":1.2/"   # інтерфейс геймпад-звітів
_REPORT_LEN = 64       # довжина input/feature звіту


# ── Feature-звіти для вимкнення lizard mode ───────────────────────────
_REPORT_CLEAR_MAPPINGS = 0x81
_REPORT_WRITE_SETTINGS = 0x87
_CFG_LPAD_MODE = 0x07
_CFG_RPAD_MODE = 0x08
_PAD_MODE_RAW = 0x07
_CFG_WATCHDOG = 0x2D


def _hidiocsfeature(length: int) -> int:
    # _IOC(WRITE|READ, 'H', 0x06, len)
    return (3 << 30) | (length << 16) | (ord('H') << 8) | 0x06


# ── Бітові маски задніх кнопок ────────────────────────────────────────
_MASK_LO = {
    "L5": 1 << 15,   # 0x00008000  (байти 8..11)
    "R5": 1 << 16,   # 0x00010000
}
_MASK_HI = {
    "L4": 1 << 9,    # 0x00000200  (байти 12..15)
    "R4": 1 << 10,   # 0x00000400
}


class HidrawButtons:
    """
    Слухає задні кнопки Steam Deck у фоновому потоці.
    callback(pressed: set[str]) викликається щоразу коли набір
    натиснутих грипів змінюється.
    """

    def __init__(self, callback=None):
        self._fd = None
        self._path = None
        self._callback = callback
        self._thread = None
        self.running = False
        self._pressed = set()
        self._prev_lo = 0
        self._prev_hi = 0

    def _locate(self):
        """Повертає шлях /dev/hidrawN геймпад-інтерфейсу Steam Deck, або None."""
        matches = []
        base = "/sys/class/hidraw"
        try:
            nodes = os.listdir(base)
        except OSError:
            return None
        for node in nodes:
            uevent = os.path.join(base, node, "device", "uevent")
            try:
                with open(uevent) as fh:
                    info = fh.read().upper()
            except OSError:
                continue
            if _VID in info and _PID in info:
                matches.append(node)
        for node in matches:
            try:
                link = os.readlink(os.path.join(base, node))
            except OSError:
                link = ""
            if _HID_IFACE in link:
                return f"/dev/{node}"
        return f"/dev/{matches[-1]}" if matches else None

    def _write_feature(self, payload):
        if self._fd is None:
            return
        buf = bytearray(_REPORT_LEN)
        buf[:len(payload)] = bytes(payload)
        try:
            fcntl.ioctl(self._fd, _hidiocsfeature(_REPORT_LEN), bytes(buf))
        except OSError:
            pass

    def _disable_lizard(self):
        self._write_feature([_REPORT_CLEAR_MAPPINGS])
        self._write_feature([
            _REPORT_WRITE_SETTINGS, 6,
            _CFG_LPAD_MODE, _PAD_MODE_RAW,
            _CFG_RPAD_MODE, _PAD_MODE_RAW,
            _CFG_WATCHDOG, 0x00,
        ])

    def _open(self):
        path = self._locate()
        if not path:
            return False
        try:
            fd = os.open(path, os.O_RDWR | os.O_NONBLOCK)
        except OSError:
            return False
        self._fd = fd
        self._path = path
        self._disable_lizard()
        return True

    def _close(self):
        if self._fd is not None:
            try:
                os.close(self._fd)
            except OSError:
                pass
            self._fd = None

    def _decode(self, report):
        if len(report) < 16:
            return
        lo = struct.unpack_from("<I", report, 8)[0]
        hi = struct.unpack_from("<I", report, 12)[0]
        if lo == self._prev_lo and hi == self._prev_hi:
            return
        self._prev_lo = lo
        self._prev_hi = hi

        now = set()
        for name, mask in _MASK_LO.items():
            if lo & mask:
                now.add(name)
        for name, mask in _MASK_HI.items():
            if hi & mask:
                now.add(name)

        if now != self._pressed:
            self._pressed = now
            if self._callback:
                try:
                    self._callback(set(now))
                except Exception:
                    pass

    def _run(self):
        fails = 0
        while self.running:
            if self._fd is None:
                if not self._open():
                    time.sleep(2.0)
                    continue
            try:
                ready, _, _ = select.select([self._fd], [], [], 0.1)
                if not ready:
                    continue
                data = os.read(self._fd, _REPORT_LEN)
                if data:
                    self._decode(data)
                    fails = 0
            except BlockingIOError:
                continue
            except OSError:
                fails += 1
                if fails > 8:
                    self._close()
                    fails = 0
                    time.sleep(1.5)
            except Exception:
                time.sleep(0.1)

    def start(self):
        if self.running:
            return True
        if not self._open():
            return False
        self.running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return True

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        self._close()
