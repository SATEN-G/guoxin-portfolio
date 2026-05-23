# 一键推送到 GitHub，触发 Pages 自动部署
# 用法：
#   1. 复制 deploy.config.example.json 为 deploy.config.json，填入你的仓库地址
#   2. PowerShell 执行： .\scripts\push-to-github.ps1

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$configPath = Join-Path $root "deploy.config.json"
if (-not (Test-Path $configPath)) {
  Write-Host "请先创建 deploy.config.json（参考 deploy.config.example.json）" -ForegroundColor Yellow
  exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$repo = $config.githubRepo
$branch = if ($config.branch) { $config.branch } else { "main" }

$gitCandidates = @(
  "git",
  "C:\Program Files\Git\cmd\git.exe",
  "C:\Program Files (x86)\Git\cmd\git.exe"
)
$git = $gitCandidates | Where-Object { $_ -eq "git" -and (Get-Command git -ErrorAction SilentlyContinue) } | Select-Object -First 1
if (-not $git) {
  $git = $gitCandidates | Where-Object { $_ -ne "git" -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $git) {
  Write-Host "未找到 Git。请先安装：https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

Set-Location $root

if (-not (Test-Path ".git")) {
  & $git init
  & $git branch -M $branch
}

$remote = (& $git remote get-url origin 2>$null)
if (-not $remote) {
  & $git remote add origin $repo
} elseif ($remote -ne $repo) {
  & $git remote set-url origin $repo
}

& $git add .
& $git status
& $git commit -m "deploy: update portfolio $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "无新改动或 commit 失败，继续尝试 push..." -ForegroundColor Yellow
}

& $git push -u origin $branch

Write-Host ""
Write-Host "推送完成。请到 GitHub 仓库确认：" -ForegroundColor Green
Write-Host "  Settings -> Pages -> Source = GitHub Actions" -ForegroundColor Green
Write-Host "  Actions 标签页等待 Deploy GitHub Pages 成功" -ForegroundColor Green
Write-Host "  访问：https://你的用户名.github.io/仓库名/" -ForegroundColor Cyan
