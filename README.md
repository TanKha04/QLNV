# 🔍 Hệ Thống Tra Cứu Bảng Công

Ứng dụng web quản lý và tra cứu bảng công với đăng nhập và phân quyền quản trị viên, sử dụng **MySQL database**.

## ✨ Tính Năng

### Người dùng thường (User):
- ✅ Tra cứu thông tin cá nhân không cần đăng nhập
- ✅ Đăng nhập để xem bảng công của mình
- ✅ Xem chi tiết công theo ngày, tháng, năm

### Quản trị viên (Admin):
- 🔐 Tất cả tính năng của user
- 📊 Xem danh sách tất cả người dùng
- 📤 Upload file Excel bảng công
- 🛠️ Quản lý bảng công (xem, sửa, xóa)
- ✏️ Chỉnh sửa thông tin công của nhân viên

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: Node.js, Express.js
- **Database**: MySQL (thay vì SQLite)
- **Authentication**: bcryptjs, express-session
- **File Upload**: multer
- **Excel Processing**: xlsx
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## 📋 Yêu Cầu Hệ Thống

- Node.js (v14 trở lên)
- **MySQL Server (v5.7 trở lên hoặc v8.0)**
- npm (Node Package Manager)

## 🔧 Cài Đặt MySQL

### Windows:
1. Tải MySQL Community Server từ: https://dev.mysql.com/downloads/mysql/
2. Chạy trình cài đặt và làm theo hướng dẫn
3. Ghi nhớ root password bạn đã đặt khi cài đặt

### macOS:
```bash
brew install mysql
brew services start mysql
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

## ⚙️ Cấu Hình Database

### 1. Đăng nhập MySQL:
```bash
mysql -u root -p
```

### 2. Tạo user mới (tùy chọn, nếu không muốn dùng root):
```sql
CREATE USER 'tracuu_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tracuu_bangcong.* TO 'tracuu_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Cập nhật file `db-config.js`:
Mở file `db-config.js` và cập nhật thông tin kết nối:

```javascript
module.exports = {
  host: 'localhost',
  user: 'root',              // hoặc 'tracuu_user' nếu bạn tạo user mới
  password: 'your_password', // password MySQL của bạn
  database: 'tracuu_bangcong',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

## 🚀 Cài Đặt và Chạy Ứng Dụng

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Khởi tạo database
```bash
npm run init-db
```

Script này sẽ:
- Tạo database `tracuu_bangcong` (nếu chưa có)
- Tạo các bảng: `users`, `timesheets`, `timesheet_records`
- Thêm dữ liệu mẫu (1 admin + 3 users)

### Bước 3: Khởi động server
```bash
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

## 👤 Tài Khoản Mặc Định

### Tài khoản Quản Trị Viên
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `admin123`

### Tài khoản Người Dùng
1. **Tên đăng nhập**: `119307379` | **Mật khẩu**: `user123` | **Họ tên**: LÊ DUY KHƯƠNG
2. **Tên đăng nhập**: `119601013` | **Mật khẩu**: `user123` | **Họ tên**: NGÔ VĂN HIẾU
3. **Tên đăng nhập**: `user1` | **Mật khẩu**: `user123` | **Họ tên**: Nguyễn Văn A

## 🗂️ Cấu Trúc Database

### Bảng `users`
Lưu thông tin người dùng và quản trị viên
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `username` (VARCHAR, UNIQUE)
- `password` (VARCHAR) - Mã hóa bằng bcrypt
- `full_name` (VARCHAR)
- `employee_id` (VARCHAR, UNIQUE)
- `role` (ENUM: 'user', 'admin')
- `department` (VARCHAR)
- `position` (VARCHAR)
- `created_at` (TIMESTAMP)

### Bảng `timesheets`
Lưu thông tin bảng công theo tháng/năm
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `month` (INT)
- `year` (INT)
- `file_name` (VARCHAR)
- `uploaded_by` (INT) - Foreign Key to users.id
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE KEY: (month, year)

### Bảng `timesheet_records`
Lưu chi tiết công của từng nhân viên
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `timesheet_id` (INT) - Foreign Key to timesheets.id
- `employee_id` (VARCHAR)
- `employee_name` (VARCHAR)
- `department` (VARCHAR)
- `position` (VARCHAR)
- `day_data` (TEXT) - JSON format
- `total_work_days` (DECIMAL)
- `overtime_weekday` (DECIMAL)
- `overtime_weekend` (DECIMAL)
- `overtime_holiday` (DECIMAL)
- `night_shift` (DECIMAL)
- `total_salary` (DECIMAL)
- `password` (VARCHAR)
- `cccd` (VARCHAR)
- `notes` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 📖 API Endpoints

### Tra cứu và Đăng nhập
- `POST /api/lookup` - Tra cứu thông tin người dùng
- `POST /api/login` - Đăng nhập (user hoặc admin)
- `POST /api/logout` - Đăng xuất
- `GET /api/check-session` - Kiểm tra session

### Admin - Quản lý Users
- `GET /api/admin/users` - Lấy danh sách người dùng

### Admin - Quản lý Bảng Công
- `POST /api/admin/upload-timesheet` - Upload file Excel
- `GET /api/admin/timesheets` - Lấy danh sách bảng công
- `GET /api/admin/timesheet/:id` - Xem chi tiết bảng công
- `PUT /api/admin/timesheet-record/:id` - Cập nhật record
- `DELETE /api/admin/timesheet/:id` - Xóa bảng công

### User - Xem Bảng Công
- `GET /api/user/my-timesheet` - Xem bảng công của mình

## 🔒 Bảo Mật

- ✅ Mật khẩu được mã hóa bằng bcryptjs (10 rounds)
- ✅ Session-based authentication với express-session
- ✅ Phân quyền rõ ràng giữa User và Admin
- ✅ Foreign Key constraints để bảo toàn dữ liệu
- ✅ SQL Injection protection với parameterized queries
- ✅ File upload validation (chỉ .xlsx, .xls, max 10MB)

## 🔄 So Sánh Với SQLite

### Ưu điểm của MySQL:
- ✅ Hiệu năng tốt hơn với dữ liệu lớn
- ✅ Hỗ trợ nhiều kết nối đồng thời
- ✅ Phù hợp cho production và scale
- ✅ Transaction và ACID compliance mạnh mẽ hơn
- ✅ Có thể deploy riêng database server
- ✅ Backup và recovery dễ dàng hơn

### Lưu ý khi chuyển đổi:
- ❗ Cần cài đặt và cấu hình MySQL Server
- ❗ Cần quản lý user và password
- ❗ Syntax một số query khác SQLite (đã được cập nhật)

## 🐛 Xử Lý Lỗi

### Lỗi kết nối MySQL:
```
Error: connect ECONNREFUSED
```
**Giải pháp**: Kiểm tra MySQL server đang chạy:
```bash
# Windows
net start MySQL

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Lỗi authentication:
```
Error: Access denied for user
```
**Giải pháp**: Kiểm tra lại username và password trong `db-config.js`

### Lỗi database không tồn tại:
```
Error: Unknown database 'tracuu_bangcong'
```
**Giải pháp**: Chạy lại `npm run init-db`

## 📝 Ghi Chú

- Database và tables được tạo tự động khi chạy `npm run init-db`
- Mỗi lần chạy `init-db` sẽ xóa và tạo lại database mới (cẩn thận với dữ liệu!)
- Session có thời gian sống 24 giờ
- File uploads được lưu trong thư mục `uploads/`
- Connection pool được sử dụng để tối ưu hiệu năng

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. ✅ MySQL Server đã được cài đặt và đang chạy
2. ✅ Thông tin trong `db-config.js` chính xác
3. ✅ Node.js version >= 14
4. ✅ Đã chạy `npm install` thành công
5. ✅ Đã chạy `npm run init-db` để tạo database
6. ✅ Port 3000 không bị chiếm bởi ứng dụng khác

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa theo nhu cầu.

---

**Phát triển bởi**: Hệ Thống Tra Cứu Bảng Công  
**Phiên bản**: 2.0.0 (MySQL Version)  
**Cập nhật**: 2024
