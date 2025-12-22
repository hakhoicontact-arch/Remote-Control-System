@echo off
title RCS CLIENT LAUNCHER
color 0B

echo ==============================================
echo   KET NOI DASHBOARD DIEU KHIEN
echo ==============================================

:INPUT_IP
set SERVER_IP=
set /p SERVER_IP=Nhap IP Server (Mac dinh = localhost): 

if "%SERVER_IP%"=="" set SERVER_IP=127.0.0.1

set PORT=5000

echo.
echo [INFO] Dang ket noi toi: http://%SERVER_IP%:%PORT%

start http://%SERVER_IP%:%PORT%

exit