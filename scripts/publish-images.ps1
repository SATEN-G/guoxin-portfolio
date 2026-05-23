# 将本地导出的配图 ZIP 同步进仓库并推送到 GitHub（公网所有设备可见）
param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$node = "d:\cursor\cursor\resources\app\resources\helpers\node.exe"
if (-not (Test-Path $node)) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $node = $cmd.Source } else { throw "未找到 Node.js" }
}

if (-not (Test-Path $ZipPath)) {
  throw "找不到 ZIP：$ZipPath"
}

Write-Host "1/3 解压并写入 resume-data.js ..." -ForegroundColor Cyan
& $node "$root\scripts\sync-images-from-zip.mjs" $ZipPath

Write-Host "2/3 提交到 Git ..." -ForegroundColor Cyan
git add images/projects resume-data.js
$status = git status --porcelain
if (-not $status) {
  Write-Host "没有新变更，可能 ZIP 与当前一致。" -ForegroundColor Yellow
  exit 0
}

git -c user.name="SATEN-G" -c user.email="SATEN-G@users.noreply.github.com" commit -m "同步项目配图到公网静态资源"

Write-Host "3/3 推送到 GitHub ..." -ForegroundColor Cyan
git push

Write-Host ""
Write-Host "完成。约 1-3 分钟后访问：" -ForegroundColor Green
Write-Host "  https://saten-g.github.io/guoxin-portfolio/"
