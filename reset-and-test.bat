@echo off
chcp 65001 >nul
cls
echo ============================================
echo   RESET DATABASE VÀ TEST
echo ============================================
echo.

echo [1/2] Đang reset database...
cd /d "%~dp0"
node init-db.js
if %errorlevel% neq 0 (
    echo ❌ Lỗi reset database
    pause
    exit /b 1
)

echo.
echo ✅ Database đã reset thành công!
echo.
echo [2/2] Bây giờ hãy:
echo    1. Mở trình duyệt: http://localhost:3000
echo    2. Đăng nhập admin: admin / admin123
echo    3. Upload file Excel bảng công
echo    4. Đăng nhập nhân viên để kiểm tra
echo.
echo Server đang chạy ở background...
echo.
pause
