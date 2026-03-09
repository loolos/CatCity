@echo off
setlocal

if "%1"=="" (set PORT=3000) else (set PORT=%1)
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo [run-app] Error: node not found. Make sure Node.js is installed and in PATH.
  pause
  exit /b 1
)

echo [run-app] Clearing port %PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo [run-app] Starting app...
echo.
echo   App URL: http://localhost:%PORT%
echo.
npx --yes serve -l %PORT%
if errorlevel 1 pause
