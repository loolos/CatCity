@echo off
REM ComfyUI MCP Server - double-click to run; auto-exits after 6 hours (logic in ps1)
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0run-comfyui-mcp.ps1"
pause
