@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "MIAOFIRE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%MIAOFIRE_NODE%" set "MIAOFIRE_NODE=node"
echo Open http://localhost:4173 in your browser after the server starts.
"%MIAOFIRE_NODE%" server.mjs
pause
