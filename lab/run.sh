#!/bin/sh
cd "$(dirname "$0")"
[ -d ../.venv ] || { python3 -m venv ../.venv && ../.venv/bin/pip install -r requirements.txt; }
../.venv/bin/python server.py &
sleep 4
open http://localhost:8765/index.html 2>/dev/null || xdg-open http://localhost:8765/index.html
wait
