@echo off
cd /d "%~dp0"
start "XINYI site preview" /min python -m http.server 4176 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:4176/index.html
exit
