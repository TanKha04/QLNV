@echo off
chcp 65001 >nul
cls
echo ============================================
echo   KHỞI ĐỘNG MYSQL SERVICE
echo ============================================
echo.

REM Kiểm tra xem đã có quyền Admin không
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Script này cần quyền Administrator!
    echo.
    echo 💡 Hãy làm như sau:
    echo    1. Chuột phải vào file start-mysql.bat
    echo    2. Chọn "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/2] Đang khởi động MySQL service...
net start MySQL267
if %errorlevel% equ 0 (
    echo ✅ MySQL267 đã khởi động thành công!
) else (
    echo ❌ Lỗi khởi động MySQL service
    pause
    exit /b 1
)

echo.
echo [2/2] Đang chờ MySQL khởi động đầy đủ...
timeout /t 3 /nobreak

echo.
echo ✅ MySQL đã sẵn sàng!
echo.
echo 💡 Bây giờ bạn có thể chạy: start-app.bat
echo.
pause
