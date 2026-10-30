#!/usr/bin/bash
exec 2> /tmp/fullshot_err.log
export XDG_RUNTIME_DIR=/run/user/1000
export WAYLAND_DISPLAY=wayland-0
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
DIR="$(dirname "$(readlink -f "$0")")"
# Повний знімок екрану БЕЗ обрізки — для фону в меню зони субтитрів.
# Надійний пошук gamescope: object.serial іде ПЕРЕД node.name, тому
# запам'ятовуємо останній serial і друкуємо його коли бачимо node gamescope.
GAMESCOPE_ID=$(pw-cli list-objects 2>/dev/null | awk '/object.serial/{gsub(/"/,"",$3); s=$3} /node.name = "gamescope"/{print s; exit}')
[ -z "$GAMESCOPE_ID" ] && GAMESCOPE_ID=96
# Звук затвору через aplay (ALSA) — paplay під цими правами не має доступу до pulse
[ -f "$DIR/shutter.wav" ] && /usr/bin/aplay -q "$DIR/shutter.wav" &
/usr/bin/gst-launch-1.0 pipewiresrc target-object=$GAMESCOPE_ID num-buffers=1 ! videoconvert ! \
  pngenc snapshot=true ! filesink location=/dev/shm/fullshot_raw.png
