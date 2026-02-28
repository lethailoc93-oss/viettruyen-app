@echo off
title Khoi dong Viet Truyen Ban Chua (SillyTavern Integration)
color 0b

echo ===================================================
echo   KHOI DONG HE THONG VIET TRUYEN BAN CHUA
echo ===================================================
echo.
echo Dang khoi dong Backend Server (Proxy + Extensions)...
start "Backend Server" cmd /k "cd server && npm start"

echo.
timeout /t 3 /nobreak > NUL

echo Dang khoi dong Giao Dien (React Frontend)...
start "React Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo [!] XONG! Hai cua so da duoc ban len.
echo [!] Vui long KHONG tat hai cua so mau den moi hien.
echo [!] Trinh duyet se tu dong mo len sau vai giay.
echo ===================================================
echo.
pause
