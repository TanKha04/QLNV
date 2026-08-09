# Script PowerShell để khởi động ứng dụng
# Cách sử dụng: PowerShell -ExecutionPolicy Bypass -File start-app.ps1

$Host.UI.RawUI.WindowTitle = "Tra Cuu Bang Cong - App Launcher"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  KHỞI ĐỘNG ỨNG DỤNG TRA CỨU BẢNG CÔNG" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Kiểm tra MySQL
Write-Host "[1/4] Đang kiểm tra MySQL service..." -ForegroundColor Yellow

$mysqlService = Get-Service -Name MySQL267 -ErrorAction SilentlyContinue
if ($mysqlService) {
    if ($mysqlService.Status -eq "Running") {
        Write-Host "✅ MySQL267 đã đang chạy" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MySQL267 chưa chạy. Đang khởi động..." -ForegroundColor Yellow
        try {
            Start-Service -Name MySQL267 -ErrorAction Stop
            Write-Host "✅ MySQL267 đã khởi động thành công" -ForegroundColor Green
        } catch {
            Write-Host "❌ Không thể khởi động MySQL267 (cần quyền Admin)" -ForegroundColor Red
            Write-Host "💡 Vui lòng chạy PowerShell với quyền Administrator" -ForegroundColor Yellow
            Read-Host "Nhấn Enter để thoát"
            exit 1
        }
    }
} else {
    Write-Host "❌ MySQL267 service không tìm thấy" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Đang chờ MySQL khởi động đầy đủ..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/4] Đang khởi tạo database..." -ForegroundColor Yellow
Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
node init-db.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lỗi khởi tạo database" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "[4/4] Đang khởi động server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ ỨNG DỤNG KHỞI ĐỘNG THÀNH CÔNG!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Mở trình duyệt và truy cập:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "👤 Tài khoản Admin:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "📝 Nhấn Ctrl+C trong cửa sổ server để dừng" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
npm start
Pop-Location
