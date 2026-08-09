@echo off
chcp 65001 >nul
cls
echo ============================================
echo   KHỞI ĐỘNG ỨNG DỤNG TRA CỨU BẢNG CÔNG
echo ============================================
echo.

REM Kiểm tra xem MySQL service đã chạy chưa
echo [1/4] Đang kiểm tra MySQL service...
sc query MySQL267 | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo ✅ MySQL267 đã đang chạy
) else (
    echo ❌ MySQL267 chưa chạy. Đang khởi động...
    net start MySQL267
    if %errorlevel% equ 0 (
        echo ✅ MySQL267 đã khởi động thành công
    ) else (
        echo ⚠️  Không thể khởi động MySQL267 tự động (cần quyền Admin)
        echo 💡 Hãy mở services.msc và start MySQL267 thủ công
        pause
    )
)

echo.
echo [2/4] Đang chờ MySQL khởi động đầy đủ...
timeout /t 3 /nobreak

echo.
echo [3/4] Đang khởi tạo database...
cd /d "%~dp0"
node init-db.js
if %errorlevel% neq 0 (
    echo ❌ Lỗi khởi tạo database
    pause
    exit /b 1
)

echo.
echo [4/4] Đang khởi động server...
echo.
echo ============================================
echo ✅ ỨNG DỤNG KHỞI ĐỘNG THÀNH CÔNG!
echo.
echo 🌐 Mở trình duyệt và truy cập:
echo    http://localhost:3000
echo.
echo 👤 Tài khoản Admin:
echo    Username: admin
echo    Password: admin123
echo.
echo 📝 Nhấn Ctrl+C để dừng server
echo ============================================
echo.

npm start
