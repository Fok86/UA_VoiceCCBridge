#!/usr/bin/env python3
# Викликається з capture_loop.sh:
# typewriter_worker.py <last_text_file> <new_text_file> <config_path>

import sys
import os
import json
from difflib import SequenceMatcher

def load_config(path):
    defaults = {"typewriter_mode": False, "typewriter_threshold": 80}
    try:
        with open(path) as f:
            return {**defaults, **json.load(f)}
    except:
        return defaults

def read_file(path):
    try:
        with open(path) as f:
            return f.read().strip()
    except:
        return ""

def similarity(a, b):
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()

def get_new_part(old, new):
    if not old:
        return new
    old_words = old.split()
    new_words = new.split()
    common = 0
    for i, word in enumerate(old_words):
        if i < len(new_words) and similarity(word, new_words[i]) > 0.7:
            common += 1
        else:
            break
    return ' '.join(new_words[common:]).strip()

def decide(last_text, new_text, cfg):
    typewriter_mode = cfg.get("typewriter_mode", False)
    threshold = cfg.get("typewriter_threshold", 80) / 100.0

    if not new_text:
        return ""
    if not last_text:
        return new_text

    ratio = similarity(last_text, new_text)

    # Майже однакові — пропускаємо
    if ratio > 0.95:
        return ""

    if not typewriter_mode:
        return new_text

    # Режим друкарської машинки
    if ratio >= threshold and len(new_text) > len(last_text):
        new_part = get_new_part(last_text, new_text)
        return new_part if new_part else ""

    if ratio < threshold:
        return new_text

    return ""

if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(0)

    last_text = read_file(sys.argv[1])
    new_text = read_file(sys.argv[2])
    cfg = load_config(sys.argv[3])

    result = decide(last_text, new_text, cfg)
    if result:
        print(result)