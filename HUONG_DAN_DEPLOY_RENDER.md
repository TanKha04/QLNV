# 🚀 Hướng Dẫn Triển Khai Lên Render.com

## ✅ Repository GitHub
- URL: https://github.com/TanKha04/QLNV.git
- Branch: main

---

## 📋 BƯỚC 1: Tạo MySQL Database Miễn Phí Trên Cloud

### Tùy chọn A: Sử dụng Aiven.io (Khuyến nghị)

1. Truy cập: https://aiven.io
2. Đăng ký tài khoản miễn phí
3. Tạo MySQL service:
   - Chọn **MySQL**
   - Chọn plan **Free** ($0/month)
   - Chọn region gần Việt Nam (Singapore hoặc Tokyo)
   - Đặt tên service: `tracuu-bangcong-db`
   
4. Đợi 2-3 phút để service khởi động

5. Sau khi khởi động xong, lấy thông tin kết nối:
   - Vào tab **Overview** > **Connection information**
   - Ghi chú các thông tin sau:
     ```
     Host: mysql-xxxxx-xxxxx.aivencloud.com
     Port: 12345
     User: avnadmin
     Password: [mật khẩu tự động sinh]
     Database: defaultdb
     SSL Mode: REQUIRED
     ```

### Tùy chọn B: Sử dụng TiDB Cloud

1. Truy cập: https://tidbcloud.com
2. Đăng ký tài khoản
3. Tạo Free Cluster
4. Lấy thông tin kết nối tương tự

---

## 📋 BƯỚC 2: Triển Khai Lên Render.com

### 2.1. Đăng nhập Render

1. Truy cập: https://render.com
2. Đăng nhập bằng tài khoản GitHub
3. Cho phép Render truy cập repository của bạn

### 2.2. Tạo Web Service

1. Nhấn **New +** > **Web Service**
2. Chọn repository: `TanKha04/QLNV`
3. Điền thông tin:

   **Basic Information:**
   - Name: `qlnv-tracuu` (hoặc tên bạn muốn)
   - Region: Singapore (gần Việt Nam nhất)
   - Branch: `main`
   - Root Directory: `Tra cu bang cong 6/Tra cu bang cong 6/Tra cu bang cong 6/Tra cu bang cong/Tra cu bang cong`

   **Build & Deploy:**
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`

   **Instance Type:**
   - Chọn **Free** ($0/month)

### 2.3. Cấu Hình Biến Môi Trường (Environment Variables)

Kéo xuống phần **Environment Variables** và thêm các biến sau:

| Key | Value | Ghi chú |
|-----|-------|---------|
| `DB_HOST` | `mysql-xxxxx.aivencloud.com` | Từ Aiven/TiDB |
| `DB_USER` | `avnadmin` | Từ Aiven/TiDB |
| `DB_PASSWORD` | `[password từ Aiven]` | Từ Aiven/TiDB |
| `DB_NAME` | `defaultdb` | Từ Aiven/TiDB |
| `DB_PORT` | `12345` | Từ Aiven/TiDB |
| `DB_SSL` | `true` | Bắt buộc cho cloud DB |
| `PORT` | `3000` | Port của ứng dụng |
| `SESSION_SECRET` | `tra-cuu-secret-key-2024` | Bảo mật session |
| `NODE_ENV` | `production` | Môi trường production |

**⚠️ LƯU Ý QUAN TRỌNG:**
- Nếu database name từ Aiven là `defaultdb`, bạn cần đổi thành `tracuu_bangcong` hoặc giữ nguyên và sửa lại code
- Đảm bảo `DB_SSL` được set thành `true`
- Không để lộ thông tin `DB_PASSWORD` ra ngoài

### 2.4. Deploy

1. Nhấn **Create Web Service**
2. Render sẽ bắt đầu build và deploy (khoảng 3-5 phút)
3. Theo dõi logs để đảm bảo không có lỗi

---

## 📋 BƯỚC 3: Kiểm Tra Kết Nối Database

### 3.1. Xem Logs

Sau khi deploy xong, xem logs để kiểm tra:
- ✅ "Đã kết nối MySQL thành công"
- ✅ "Database đã sẵn sàng"
- ✅ "Đã tạo tài khoản admin mặc định"

### 3.2. Truy Cập Ứng Dụng

URL của bạn sẽ là: `https://qlnv-tracuu.onrender.com`

Đăng nhập với:
- **Tài khoản:** admin
- **Mật khẩu:** admin123

---

## 🔧 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "ENOTFOUND" hoặc "Connection timeout"

**Nguyên nhân:** Không kết nối được database

**Giải pháp:**
1. Kiểm tra lại `DB_HOST`, `DB_PORT` từ Aiven/TiDB
2. Đảm bảo `DB_SSL=true`
3. Kiểm tra IP whitelist trên Aiven (nếu có) - cho phép tất cả IP: `0.0.0.0/0`

### Lỗi: "ER_ACCESS_DENIED_ERROR"

**Nguyên nhân:** Sai username hoặc password

**Giải pháp:**
1. Kiểm tra lại `DB_USER` và `DB_PASSWORD`
2. Reset password database nếu cần

### Lỗi: "Database does not exist"

**Nguyên nhân:** Tên database không đúng

**Giải pháp:**
1. Nếu Aiven tạo database tên `defaultdb`, có 2 cách:
   - **Cách 1:** Đổi `DB_NAME=defaultdb` trên Render
   - **Cách 2:** Tạo database mới tên `tracuu_bangcong` trên Aiven

### Render Service Sleep (Free Plan)

**Lưu ý:** Free plan của Render sẽ tự động sleep sau 15 phút không hoạt động.

**Giải pháp:**
- Lần đầu truy cập sau khi sleep sẽ mất 30-60 giây để "đánh thức" service
- Hoặc nâng cấp lên plan trả phí để service chạy 24/7

---

## 🎯 HOÀN THÀNH

Sau khi hoàn thành các bước trên:

✅ Ứng dụng đã hoạt động tại: `https://qlnv-tracuu.onrender.com`  
✅ Database MySQL chạy trên cloud (Aiven/TiDB)  
✅ Nhân viên có thể truy cập từ bất kỳ đâu, bất kỳ lúc nào  
✅ Dữ liệu được lưu trữ an toàn trên cloud  

**Chia sẻ link với nhân viên:**
```
https://qlnv-tracuu.onrender.com
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề trong quá trình deploy, kiểm tra:
1. Logs trên Render Dashboard
2. Logs trên Aiven Database Dashboard
3. Đảm bảo tất cả Environment Variables đã được cấu hình đúng
