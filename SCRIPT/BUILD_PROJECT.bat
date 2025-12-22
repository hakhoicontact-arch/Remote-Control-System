@echo off
title RCS BUILD TOOL
color 0B

echo ==============================================
echo   DANG BUILD PROJECT RCS VAO FOLDER: RCS_Output
echo ==============================================

:: --- BƯỚC 1: Dọn dẹp bản build cũ ---
if exist "RCS_Output" (
    echo [INFO] Dang xoa ban build cu...
    rmdir /s /q "RCS_Output"
)
mkdir "RCS_Output"

:: --- BƯỚC 2: Build Server ---
echo.
echo [1/3] Dang Build RCS Server...
:: Xuất ra RCS_Output/Server
dotnet publish "RCS.Server/RCS.Server.csproj" -c Release -r win-x64 --self-contained true -o "RCS_Output/Server"

:: --- BƯỚC 3: Copy Web Client vào trong Server ---
echo.
echo [2/3] Dang tich hop Web Client...
:: Tạo thư mục wwwroot
if not exist "RCS_Output\Server\wwwroot" mkdir "RCS_Output\Server\wwwroot"
:: Copy từ RCS.Client/Public vào
xcopy /E /I /Y "RCS.Client\Public\*" "RCS_Output\Server\wwwroot\"

:: --- BƯỚC 4: Build Agent ---
echo.
echo [3/3] Dang Build RCS Agent...
:: Xuất ra RCS_Output/Agent
dotnet publish "RCS.Agent/RCS.Agent.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "RCS_Output/Agent"

echo.
echo ==============================================
echo   BUILD THANH CONG!
echo   Output tai: RCS/RCS_Output
echo ==============================================
pause