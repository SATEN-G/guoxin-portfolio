# 本地预览作品集（避免 file:// 打不开或脚本被拦截）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$node = "d:\cursor\cursor\resources\app\resources\helpers\node.exe"
if (-not (Test-Path $node)) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $node = $cmd.Source } else { throw "未找到 Node，请安装 Node.js 或使用 Cursor 内置环境" }
}

$port = 5173
$url = "http://localhost:$port"

# 若端口已被占用，说明服务可能已在运行
$inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($inUse) {
  Write-Host "本地服务已在运行：" -ForegroundColor Green
  Write-Host "  作品集:   $url"
  Write-Host "  配图管理: $url/image-admin.html"
  Start-Process "$url/image-admin.html"
  exit 0
}

Write-Host ""
Write-Host "作品集:     $url" -ForegroundColor Cyan
Write-Host "配图管理:   $url/image-admin.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor DarkGray
Write-Host ""

Start-Process "$url/image-admin.html"
& $node "$root\scripts\local-server.mjs"
