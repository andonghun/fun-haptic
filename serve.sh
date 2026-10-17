#!/bin/sh
# Local preview of the site (static files only)
cd "$(dirname "$0")"
python3 -m http.server 8765 --bind 127.0.0.1 &
sleep 2
open http://localhost:8765/play/ 2>/dev/null || xdg-open http://localhost:8765/play/
wait
