#!/usr/bin/bash
exec 2> /tmp/calibration_err.log

export XDG_RUNTIME_DIR=/run/user/1000
export WAYLAND_DISPLAY=wayland-0
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

# Параметри обрізки передаються як аргументи: $1 $2 $3 $4
TOP=${1:-534}
BOTTOM=${2:-0}
LEFT=${3:-0}
RIGHT=${4:-0}

# Звук
/usr/bin/paplay /usr/share/sounds/freedesktop/stereo/camera-shutter.oga &

# Знімок з динамічною зоною
/usr/bin/gst-launch-1.0 pipewiresrc num-buffers=1 ! videoconvert ! \
  videocrop top=$TOP bottom=$BOTTOM left=$LEFT right=$RIGHT ! \
  pngenc snapshot=true ! filesink location=/dev/shm/calibration_raw.png