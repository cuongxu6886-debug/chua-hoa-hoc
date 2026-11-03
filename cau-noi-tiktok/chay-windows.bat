@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Lan dau chay: dang cai thu vien...
  call npm install
)
if not exist cau-hinh.json copy cau-hinh.mau.json cau-hinh.json >nul
node cau-noi.mjs
pause
