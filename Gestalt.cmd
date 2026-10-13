@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the project-supported Node.js version, then try again.
  pause
  exit /b 1
)

where corepack.cmd >nul 2>nul
if errorlevel 1 (
  echo Corepack was not found. Use a Node.js installation that includes Corepack, then try again.
  pause
  exit /b 1
)

if not exist "node_modules\next\package.json" (
  echo Gestalt dependencies are not installed yet.
  echo From this folder, run: corepack pnpm install --ignore-scripts
  pause
  exit /b 1
)

node scripts\launch-local.mjs
if errorlevel 1 pause
