#!/usr/bin/bash
exec 2> /tmp/fullshot_err.log
export XDG_RUNTIME_DIR=/run/user/1000
export WAYLAND_DISPLAY=wayland-0
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
# Повний знімок екрану БЕЗ обрізки — для фону в меню зони субтитрів
GAMESCOPE_ID=$(pw-cli list-objects 2>/dev/null | grep -A3 'node.name = "gamescope"' | grep 'object.serial' | head -1 | grep -o '[0-9]*' | head -1)
[ -z "$GAMESCOPE_ID" ] && GAMESCOPE_ID=96
/usr/bin/paplay /usr/share/sounds/freedesktop/stereo/camera-shutter.oga &
/usr/bin/gst-launch-1.0 pipewiresrc target-object=$GAMESCOPE_ID num-buffers=1 ! videoconvert ! \
  pngenc snapshot=true ! filesink location=/dev/shm/fullshot_raw.png
