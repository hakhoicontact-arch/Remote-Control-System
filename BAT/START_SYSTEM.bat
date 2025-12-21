@echo off
title RCS SYSTEM LAUNCHER
color 0A

:: --- BƯỚC 1: Lùi từ BAT ra RCS ---
cd ..

:: Kiểm tra xem đã Build chưa
if not exist "RCS_Output\Server\RCS.Server.exe" (
    echo [LOI] Khong tim thay file chay!
    echo Vui long chay BUILD_PROJECT.bat truoc.
    pause
    exit
)

echo [1/2] Dang khoi dong Server...
:: Đi vào folder Server để chạy (để nó nhận diện được folder wwwroot bên cạnh)
cd "RCS_Output\Server"
start "RCS Server Console" RCS.Server.exe

echo Cho 3 giay de Server khoi dong...
timeout /t 3 /nobreak >nul

echo [2/2] Dang khoi dong Agent...
:: Lùi ra khỏi Server, vào folder Agent
cd "..\Agent"
:: Chạy Agent với tham số localhost
start "RCS Agent Console" RCS.Agent.exe 127.0.0.1 

echo ===========================================
echo   HE THONG DA CHAY!
echo   Web Dashboard: http://localhost:5000
echo ===========================================
:: Tự thoát cửa sổ launcher này
exit