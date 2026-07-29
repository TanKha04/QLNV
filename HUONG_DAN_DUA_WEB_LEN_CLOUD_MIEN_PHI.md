# 🌐 Hướng Dẫn Đưa Trang Web Lên Mạng MIỄN PHÍ 100% (Hoạt động 24/7)

Tài liệu này hướng dẫn chi tiết từng bước đưa hệ thống **Tra Cứu Bảng Công** lên máy chủ đám mây trực tuyến **hoàn toàn miễn phí**, giúp bất kỳ ai cũng có thể truy cập từ điện thoại hoặc máy tính 24/24 kể cả khi bạn đã tắt máy tính cá nhân.

---

## 🛠️ Danh Sách Nền Tảng Sử Dụng (Miễn phí 100%)

1. **Render.com** (Máy chủ Web App Node.js): Chạy Web 24/7, cấp đường dẫn HTTPS miễn phí.
2. **Aiven.io** hoặc **TiDB Cloud** (Cơ sở dữ liệu MySQL Cloud): Lưu trữ dữ liệu bảng công miễn phí vĩnh viễn trên đám mây.

---

## 📌 BƯỚC 1: Tạo Database MySQL Miễn Phí Trên Cloud

1. Truy cập trang web: **[https://aiven.io](https://aiven.io)** hoặc **[https://tidbcloud.com](https://tidbcloud.com)** và đăng ký 1 tài khoản miễn phí.
2. Tạo 1 dự án MySQL miễn phí:
   - Chọn dịch vụ **MySQL Free Tier**.
   - Sau khi tạo xong, dịch vụ sẽ cấp cho bạn các thông tin kết nối:
     - `Host` (Ví dụ: `mysql-xxx.aivencloud.com`)
     - `Port` (Ví dụ: `12345` hoặc `3306`)
     - `User` (Ví dụ: `avnadmin` hoặc `root`)
     - `Password` (Mật khẩu kết nối)
     - `Database Name` (Đặt tên là `tracuu_bangcong`)

---

## 📌 BƯỚC 2: Tải Mã Nguồn Lên GitHub

1. Truy cập **[https://github.com](https://github.com)** và đăng nhập/tạo tài khoản.
2. Tạo 1 Repository mới (đặt tên: `tra-cuu-bang-cong`, chọn chế độ **Private** hoặc **Public**).
3. Đẩy toàn bộ mã nguồn của dự án này lên Repository vừa tạo.

---

## 📌 BƯỚC 3: Đưa Web Lên Render.com (Hoạt động 24/7)

1. Truy cập **[https://render.com](https://render.com)** và đăng ký tài khoản (đăng nhập nhanh bằng tài khoản GitHub).
2. Tại bảng điều khiển Render, nhấn **New +** -> Chọn **Web Service**.
3. Chọn Repository `tra-cuu-bang-cong` từ tài khoản GitHub của bạn.
4. Điền các thông số cấu hình:
   - **Name**: `tra-cuu-bang-cong` (hoặc tên tùy thích).
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free` (Miễn phí)

5. Kéo xuống phần **Environment Variables** (Biến môi trường), nhấn **Add Environment Variable** và thêm các biến từ Bước 1:
   - `DB_HOST` = (Host từ Aiven/TiDB)
   - `DB_USER` = (User từ Aiven/TiDB)
   - `DB_PASSWORD` = (Password từ Aiven/TiDB)
   - `DB_NAME` = `tracuu_bangcong`
   - `DB_PORT` = (Port từ Aiven/TiDB)
   - `DB_SSL` = `true`
   - `PORT` = `3000`

6. Nhấn **Create Web Service**.

---

## 📌 BƯỚC 4: Khởi Tạo Dữ Liệu Bảng Công

1. Sau khi Render build xong, Render sẽ cấp cho bạn một đường dẫn dạng:
   `https://tra-cuu-bang-cong.onrender.com`
2. Đăng nhập với tài khoản Admin mặc định (`admin` / `admin123`) hoặc chạy lệnh khởi tạo dữ liệu ban đầu.
3. Tải lên file Excel bảng công của công ty bạn thông qua giao diện Admin.

---

## 🎯 KẾT QUẢ

- Trang web hiện tại đã hoạt động **24/24 trực tuyến**.
- Bạn có thể gửi đường dẫn `https://tra-cuu-bang-cong.onrender.com` cho tất cả nhân viên truy cập từ điện thoại, máy tính bảng hoặc máy tính khác bất kỳ lúc nào.
- **Kể cả khi bạn tắt máy tính cá nhân, trang web vẫn truy cập bình thường!**
