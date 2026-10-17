@echo off
cd /d "%~dp0"
start "DualSenseLab server" /min "%~dp0.venv\Scripts\python.exe" server.py
timeout /t 4 >nul
start chrome "http://localhost:8765/index.html"

