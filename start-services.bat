@echo off
setlocal

cd /d "%~dp0"

echo === BASE DIR ===
echo %cd%
echo.

if not exist "forum\backend" (
  echo [ERROR] Missing folder: forum\backend
  dir
  pause
  exit /b 1
)

if not exist "forum\frontend" (
  echo [ERROR] Missing folder: forum\frontend
  dir
  pause
  exit /b 1
)

echo Starting backend...
start "backend" cmd /k "cd /d ""%~dp0forum\backend"" && node server.js"

echo Waiting 2 seconds...
ping 127.0.0.1 -n 3 >nul

echo Starting frontend...
start "frontend" cmd /k "cd /d ""%~dp0forum\frontend"" && npm run dev -- --port 3000"

echo Done.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
