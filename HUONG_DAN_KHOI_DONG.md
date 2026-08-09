# 🚀 Hướng Dẫn Khởi Động Ứng Dụng Tra Cứu Bảng Công

## ✅ Yêu Cầu Trước Khi Chạy

- ✅ Node.js đã cài đặt
- ✅ MySQL Server 8.0 đã cài đặt (MySQL267 service)
- ✅ Password MySQL root: `admin`
- ✅ File `.env` đã cập nhật

---

## 🎯 Cách 1: Chạy Batch Script (Đơn Giản Nhất) ⭐

### Cách A: Chạy trực tiếp (nếu MySQL đã chạy)
1. Mở File Explorer
2. Điều hướng đến thư mục `Tra cu bang cong`
3. **Double-click vào file `start-app.bat`**
4. Chờ server khởi động
5. Mở trình duyệt và truy cập: **http://localhost:3000**

### Cách B: Chạy với quyền Admin (nếu MySQL chưa chạy)
1. **Chuột phải vào file `start-app.bat`**
2. Chọn **"Run as administrator"**
3. Nhấn **Yes** khi được hỏi
4. Chờ server khởi động
5. Mở trình duyệt và truy cập: **http://localhost:3000**

---

## 🎯 Cách 2: Chạy PowerShell Script (Khuyến Nghị)

### Nếu bạn là Windows 10+ user:

1. **Chuột phải vào file `start-app.ps1`**
2. Chọn **"Run with PowerShell"**
   - Nếu được hỏi về execution policy, chọn **"Yes to all"** hoặc **"Y"**
3. Script sẽ tự động:
   - ✅ Khởi động MySQL service (nếu cần quyền Admin)
   - ✅ Khởi tạo database
   - ✅ Chạy server Node.js
4. Mở trình duyệt và truy cập: **http://localhost:3000**

---

## 🎯 Cách 3: Chạy Thủ Công (Nếu Script Không Chạy Được)

### Bước 1: Khởi động MySQL Service

**Cách A: Dùng GUI Services**
1. Nhấn **Windows key + R**
2. Gõ: `services.msc`
3. Nhấn **Enter**
4. Tìm **MySQL267** trong danh sách
5. **Chuột phải** → Chọn **"Start"**
6. Đợi status thành "Running"

**Cách B: Dùng Command Prompt (Admin)**
1. Nhấn **Windows key + R**
2. Gõ: `cmd`
3. Nhấn **Ctrl+Shift+Enter** để chạy Admin
4. Gõ: `net start MySQL267`
5. Nhấn **Enter**

### Bước 2: Khởi Tạo Database

Mở Command Prompt hoặc PowerShell trong thư mục project và chạy:

```cmd
node init-db.js
```

Hoặc thông qua npm:

```cmd
npm run init-db
```

### Bước 3: Khởi Động Server

Chạy lệnh:

```cmd
npm start
```

Hoặc:

```cmd
node server.js
```

Server sẽ khởi động tại: **http://localhost:3000**

---

## 🔐 Thông Tin Đăng Nhập

### Tài Khoản Admin (Quản Trị Viên):
- **Username**: `admin`
- **Password**: `admin123`
- **Quyền**: Quản lý người dùng, upload bảng công, chỉnh sửa dữ liệu

### Tài Khoản Nhân Viên (Mẫu):
1. **Username**: `119307379` | **Password**: `user123` | **Tên**: LÊ DUY KHƯƠNG
2. **Username**: `119601013` | **Password**: `user123` | **Tên**: NGÔ VĂN HIẾU
3. **Username**: `user1` | **Password**: `user123` | **Tên**: Nguyễn Văn A

---

## 🛑 Dừng Server

Để dừng server, nhấn **Ctrl+C** trong cửa sổ Command Prompt / PowerShell nơi chạy server.

---

## 🐛 Xử Lý Lỗi

### ❌ Lỗi: `connect ECONNREFUSED`
**Nghĩa**: MySQL Server không chạy
**Giải pháp**: 
- Mở `services.msc` và start MySQL267
- Hoặc chạy batch script với quyền Admin

### ❌ Lỗi: `Access denied for user 'root'`
**Nghĩa**: Password MySQL sai
**Giải pháp**: 
- Kiểm tra password trong file `.env` có phải là `admin` không
- Hoặc reset password MySQL root

### ❌ Lỗi: `Port 3000 already in use`
**Nghĩa**: Port 3000 đã được sử dụng bởi ứng dụng khác
**Giải pháp**:
- Tìm process chiếm port 3000 và kill nó
- Hoặc chỉnh sửa PORT trong file `.env`

### ❌ Lỗi: `npm command not found`
**Nghĩa**: Node.js / npm chưa được thêm vào PATH
**Giải pháp**:
- Cài đặt lại Node.js
- Hoặc thêm Node.js vào PATH

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. ✅ Kiểm tra MySQL Server đang chạy (services.msc)
2. ✅ Kiểm tra password trong `.env` là `admin`
3. ✅ Kiểm tra Node.js đã cài: `node --version`
4. ✅ Kiểm tra npm đã cài: `npm --version`
5. ✅ Chạy lại `npm install` nếu node_modules bị lỗi

---

**Thành công! 🎉 Ứng dụng sẵn sàng sử dụng!**
