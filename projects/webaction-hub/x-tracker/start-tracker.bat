@echo off
title X Tracker
cd /d "%~dp0"
echo Starting X Tracker...
echo Dashboard will be at http://localhost:8787
echo Keep this window open. Close it (or press Ctrl+C) to stop.
echo.
node src/index.js
echo.
echo X Tracker stopped. Press any key to close.
pause >nul
