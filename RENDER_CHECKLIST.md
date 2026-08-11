# ✅ Checklist Deploy Render - QLNV Tra Cứu Bảng Công

## 🎯 URL Hiện Tại
https://qlnv-tracuu.onrender.com/

## 📝 Danh Sách Kiểm Tra

### ☐ 1. Tạo MySQL Database Cloud
- [ ] Đã đăng ký tài khoản Aiven.io hoặc TiDB Cloud
- [ ] Đã tạo MySQL service (Free tier)
- [ ] Database đã khởi động thành công
- [ ] Đã lấy thông tin kết nối:
  - [ ] Host
  - [ ] Port
  - [ ] Username
  - [ ] Password
  - [ ] Database Name
  
### ☐ 2. Cấu Hình Render.com

#### A. Repository Settings
- [ ] Đã kết nối với GitHub repository: `TanKha04/QLNV`
- [ ] Branch: `main`
- [ ] Root Directory: `Tra cu bang cong 6/Tra cu bang cong 6/Tra cu bang cong 6/Tra cu bang cong/Tra cu bang cong`

#### B. Build Settings
- [ ] Runtime: Node
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`

#### C. Environment Variables (8 biến)
Đảm bảo đã thêm TẤT CẢ các biến sau trên Render Dashboard:

```
DB_HOST=mysql-xxxxx.aivencloud.com (Thay bằng host từ Aiven/TiDB)
DB_USER=avnadmin (Thay bằng username từ Aiven/TiDB)
DB_PASSWORD=xxxxxxxx (Thay bằng password từ Aiven/TiDB)
DB_NAME=defaultdb hoặc tracuu_bangcong
DB_PORT=12345 (Thay bằng port từ Aiven/TiDB)
DB_SSL=true (QUAN TRỌNG - Phải là true)
PORT=3000
SESSION_SECRET=tra-cuu-secret-key-2024
```

### ☐ 3. Kiểm Tra Sau Khi Deploy

#### A. Xem Logs
Trên Render Dashboard > Logs, tìm các dòng sau:
- [ ] ✅ "Đã kết nối MySQL thành công"
- [ ] ✅ "Database đã sẵn sàng"
- [ ] ✅ "Đã tạo tài khoản admin mặc định"
- [ ] ✅ "Server đang chạy"

#### B. Test Đăng Nhập
- [ ] Truy cập: https://qlnv-tracuu.onrender.com
- [ ] Màn hình login hiển thị bình thường
- [ ] Đăng nhập với: admin / admin123
- [ ] Đăng nhập thành công, không có lỗi kết nối database

### ☐ 4. Upload Dữ Liệu
- [ ] Upload file Excel bảng công
- [ ] Upload file Excel bảng lương
- [ ] Test tra cứu với tài khoản nhân viên

---

## 🔴 LỖI ĐANG GẶP PHỔ BIẾN

### Lỗi: "getaddrinfo ENOTFOUND mysql-30ee8431-tramkhatram1-2374.f.aivencloud.com"

**Nguyên nhân:**
- Render không thể kết nối tới database host này
- Có thể host không tồn tại hoặc không accessible

**Giải pháp:**
1. **Kiểm tra lại host name từ Aiven:**
   - Đăng nhập vào Aiven.io
   - Vào service MySQL của bạn
   - Tab "Overview" > "Connection information"
   - Copy chính xác host name (có thể khác với cái hiện tại)

2. **Kiểm tra IP Whitelist (nếu có):**
   - Trên Aiven, vào tab "Overview" hoặc "Settings"
   - Tìm phần "Allowed IP addresses"
   - Thêm: `0.0.0.0/0` (cho phép tất cả IP)

3. **Kiểm tra SSL Mode:**
   - Đảm bảo `DB_SSL=true` trên Render

4. **Thử kết nối từ máy local:**
   ```bash
   mysql -h mysql-xxxxx.aivencloud.com -P 12345 -u avnadmin -p
   ```
   Nếu không kết nối được từ local -> vấn đề ở Aiven
   Nếu kết nối được -> vấn đề ở cấu hình Render

### Lỗi: "ER_ACCESS_DENIED_ERROR"
- Sai username hoặc password
- Kiểm tra lại `DB_USER` và `DB_PASSWORD`

### Lỗi: "Unknown database 'tracuu_bangcong'"
- Database name không đúng
- Đổi `DB_NAME` thành tên database thực tế từ Aiven (có thể là `defaultdb`)

---

## 🎯 THÔNG TIN NHANH

**Repository:** https://github.com/TanKha04/QLNV.git  
**Branch:** main  
**Render URL:** https://qlnv-tracuu.onrender.com  
**Admin Login:** admin / admin123  

**Aiven Dashboard:** https://console.aiven.io  
**Render Dashboard:** https://dashboard.render.com  

---

## 📞 HÀNH ĐỘNG TIẾP THEO

1. ✅ Đã tạo file hướng dẫn chi tiết: `HUONG_DAN_DEPLOY_RENDER.md`
2. ⏳ Bạn cần: Tạo MySQL database trên Aiven.io
3. ⏳ Bạn cần: Cập nhật Environment Variables trên Render với thông tin database thực tế
4. ⏳ Bạn cần: Redeploy service trên Render sau khi cập nhật biến môi trường
