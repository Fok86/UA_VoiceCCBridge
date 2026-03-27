#!/bin/bash
export XDG_RUNTIME_DIR=/run/user/1000
export WAYLAND_DISPLAY=wayland-0
export PULSE_RUNTIME_PATH=/run/user/1000/pulse

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="/home/deck/.config/ua_voice_plugin/config.json"
TEMP_IMG="/dev/shm/ua_temp.png"
FINAL_IMG="/dev/shm/deck_bottom.png"
OCR_SCRIPT="$PLUGIN_DIR/ocr_worker.py"
TYPEWRITER_SCRIPT="$PLUGIN_DIR/typewriter_worker.py"
PIPER_DIR="$PLUGIN_DIR/piper"
PIPER_BIN="$PIPER_DIR/piper"
MODEL="$PIPER_DIR/uk_UA-ukrainian_tts-medium.onnx"
LOG_FILE="/tmp/ua_worker.log"
LAST_TEXT=""

echo "=== ВОРКЕР ЗАПУЩЕНО $(date) ===" > $LOG_FILE

get_config_val() {
    python3 -c "
import json
try:
    d=json.load(open('$CONFIG'))
    print(d.get('$1', $2))
except:
    print($2)
" 2>/dev/null || echo $2
}

speak() {
    TEXT="$1"
    SPEAKER=$(get_config_val tts_speaker 1)
    SPEED=$(get_config_val tts_speed 0.8)
    WAV="/dev/shm/ua_speak.wav"

    echo "$TEXT" | LD_LIBRARY_PATH="$PIPER_DIR" "$PIPER_BIN" \
        --model "$MODEL" \
        --speaker "$SPEAKER" \
        --length_scale "$SPEED" \
        --output_file "$WAV" 2>> $LOG_FILE

    if [ -f "$WAV" ]; then
        paplay "$WAV" 2>> $LOG_FILE &
    fi
}

while true; do
    INTERVAL=$(get_config_val ocr_interval 1000)
    SLEEP_SEC=$(python3 -c "print($INTERVAL/1000)")

    CROP=$(python3 -c "
import json
try:
    d=json.load(open('$CONFIG'))
    W=1280; H=800
    w=d.get('width',900); h=d.get('height',80); ob=d.get('offset_bottom',50)
    l=(W-w)//2; r=(W-w)//2; bot=ob; top=H-ob-h
    print(top, bot, l, r)
except: print(534, 0, 0, 0)
" 2>/dev/null)

    TOP=$(echo $CROP | awk '{print $1}')
    BOT=$(echo $CROP | awk '{print $2}')
    LEFT=$(echo $CROP | awk '{print $3}')
    RIGHT=$(echo $CROP | awk '{print $4}')

    gst-launch-1.0 pipewiresrc num-buffers=1 ! videoconvert ! \
        videocrop top=$TOP bottom=$BOT left=$LEFT right=$RIGHT ! \
        pngenc snapshot=true ! filesink location="$TEMP_IMG" >> $LOG_FILE 2>&1

    if [ ! -f "$TEMP_IMG" ]; then
        sleep $SLEEP_SEC
        continue
    fi

    mv "$TEMP_IMG" "$FINAL_IMG"

    NEW_TEXT=$(python3 "$OCR_SCRIPT" "$FINAL_IMG" "$CONFIG" 2>> $LOG_FILE)

    if [ -z "$NEW_TEXT" ]; then
        sleep $SLEEP_SEC
        continue
    fi

    echo "OCR: $NEW_TEXT" >> $LOG_FILE

    # Передаємо через файли щоб уникнути проблем з пробілами в тексті
    echo "$LAST_TEXT" > /dev/shm/ua_last.txt
    echo "$NEW_TEXT" > /dev/shm/ua_new.txt
    SPEAK_TEXT=$(python3 "$TYPEWRITER_SCRIPT" /dev/shm/ua_last.txt /dev/shm/ua_new.txt "$CONFIG" 2>> $LOG_FILE)

    if [ -n "$SPEAK_TEXT" ]; then
        LAST_TEXT="$NEW_TEXT"
        echo "TTS: $SPEAK_TEXT" >> $LOG_FILE
        speak "$SPEAK_TEXT"
    fi

    sleep $SLEEP_SEC
done