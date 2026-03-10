# ComfyUI MCP Server - max 6 hours then auto exit
# Usage: .\run-comfyui-mcp.ps1

$ServerDir = "C:\Users\loolo\OneDrive\Documents\Project\comfyui-mcp-server"
$MaxHours = 6
$TimeoutMs = $MaxHours * 60 * 60 * 1000

$pythonCmd = $null
foreach ($name in @("py", "python", "python3")) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c) { $pythonCmd = $name; break }
}
if (-not $pythonCmd) {
    Write-Host "Error: Python not found. Install Python or add to PATH." -ForegroundColor Red
    exit 1
}
$pythonArgs = @("server.py")
if ($pythonCmd -eq "py") { $pythonArgs = @("-3", "server.py") }

Set-Location $ServerDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ComfyUI MCP Server (max $MaxHours hours)" -ForegroundColor Cyan
Write-Host "  URL: http://127.0.0.1:9000/mcp" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop anytime" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$proc = Start-Process -FilePath $pythonCmd -ArgumentList $pythonArgs -WorkingDirectory $ServerDir -PassThru -NoNewWindow

$exited = $proc.WaitForExit($TimeoutMs)
if (-not $exited) {
    Write-Host ""
    Write-Host "Max runtime reached ($MaxHours h). Stopping MCP Server..." -ForegroundColor Yellow
    if (-not $proc.HasExited) { $proc.Kill(); $proc.WaitForExit(5000) }
    Write-Host "Stopped." -ForegroundColor Green
}
if (-not $proc.HasExited) { $proc.Kill() }
