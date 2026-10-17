@echo off
REM Local preview of the site (static files only, no Python packages needed)
cd /d "%~dp0"
start "Haptic Quest server" /min python -m http.server 8765 --bind 127.0.0.1
timeout /t 2 >nul
start chrome "http://localhost:8765/play/"
