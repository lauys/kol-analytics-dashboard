# Git Proxy Setup Script
# 请根据你的代理软件选择对应的端口

Write-Host "Git Proxy Configuration" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Current proxy settings:" -ForegroundColor Yellow
git config --global --get http.proxy
git config --global --get https.proxy
Write-Host ""

$choice = Read-Host "Select proxy port (1=7890 Clash, 2=1080 Shadowsocks, 3=10808 V2Ray, 4=8080, 5=Remove proxy)"

switch ($choice) {
    "1" {
        git config --global http.proxy http://127.0.0.1:7890
        git config --global https.proxy http://127.0.0.1:7890
        Write-Host "Proxy set to 7890 (Clash)" -ForegroundColor Green
    }
    "2" {
        git config --global http.proxy http://127.0.0.1:1080
        git config --global https.proxy http://127.0.0.1:1080
        Write-Host "Proxy set to 1080 (Shadowsocks)" -ForegroundColor Green
    }
    "3" {
        git config --global http.proxy http://127.0.0.1:10808
        git config --global https.proxy http://127.0.0.1:10808
        Write-Host "Proxy set to 10808 (V2Ray)" -ForegroundColor Green
    }
    "4" {
        git config --global http.proxy http://127.0.0.1:8080
        git config --global https.proxy http://127.0.0.1:8080
        Write-Host "Proxy set to 8080" -ForegroundColor Green
    }
    "5" {
        git config --global --unset http.proxy
        git config --global --unset https.proxy
        Write-Host "Proxy removed" -ForegroundColor Green
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
git pull origin main






