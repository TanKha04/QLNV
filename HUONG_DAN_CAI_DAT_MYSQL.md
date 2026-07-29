# 📘 HƯỚNG DẪN CÀI ĐẶT MYSQL CHI TIẾT

## 🪟 Cài Đặt MySQL Trên Windows

### Bước 1: Tải MySQL
1. Truy cập: https://dev.mysql.com/downloads/installer/
2. Chọn **MySQL Installer for Windows**
3. Tải bản **mysql-installer-community** (khoảng 300-400MB)

### Bước 2: Cài Đặt
1. Chạy file `.msi` vừa tải về
2. Chọn **Developer Default** hoặc **Server only**
3. Nhấn **Next** và **Execute** để tải các components
4. Chờ quá trình tải và cài đặt hoàn tất

### Bước 3: Cấu Hình MySQL Server
1. **Type and Networking**:
   - Config Type: Development Computer
   - Port: 3306 (mặc định)
   - Nhấn **Next**

2. **Authentication Method**:
   - Chọn: **Use Strong Password Encryption**
   - Nhấn **Next**

3. **Accounts and Roles**:
   - Đặt **Root Password** (ghi nhớ mật khẩu này!)
   - Ví dụ: `123456` hoặc `root123`
   - Nhấn **Next**

4. **Windows Service**:
   - Để mặc định: "Configure MySQL Server as a Windows Service"
   - Nhấn **Next**

5. **Apply Configuration**:
   - Nhấn **Execute**
   - Chờ đến khi tất cả đều có dấu tick xanh
   - Nhấn **Finish**

### Bước 4: Kiểm Tra Cài Đặt
Mở **Command Prompt** hoặc **PowerShell** và chạy:

```bash
mysql -u root -p
```

Nhập password bạn đã đặt. Nếu thành công, bạn sẽ thấy:
```
mysql>
```

Gõ `exit;` để thoát.

### Bước 5: Cấu Hình Ứng Dụng
Mở file `db-config.js` và cập nhật:

```javascript
module.exports = {
  host: 'localhost',
  user: 'root',
  password: '123456',  // ← Password bạn vừa đặt
  database: 'tracuu_bangcong',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

---

## 🍎 Cài Đặt MySQL Trên macOS

### Sử dụng Homebrew (Khuyến nghị)

#### Bước 1: Cài Đặt Homebrew (nếu chưa có)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Bước 2: Cài Đặt MySQL
```bash
brew install mysql
```

#### Bước 3: Khởi Động MySQL
```bash
brew services start mysql
```

#### Bước 4: Bảo Mật MySQL
```bash
mysql_secure_installation
```

Làm theo hướng dẫn:
- Set root password: **YES** (đặt password, ví dụ: `123456`)
- Remove anonymous users: **YES**
- Disallow root login remotely: **YES**
- Remove test database: **YES**
- Reload privilege tables: **YES**

#### Bước 5: Đăng Nhập MySQL
```bash
mysql -u root -p
```

Nhập password bạn vừa đặt.

---

## 🐧 Cài Đặt MySQL Trên Linux (Ubuntu/Debian)

### Bước 1: Update System
```bash
sudo apt update
sudo apt upgrade
```

### Bước 2: Cài Đặt MySQL Server
```bash
sudo apt install mysql-server
```

### Bước 3: Khởi Động MySQL
```bash
sudo systemctl start mysql
sudo systemctl enable mysql  # Tự động chạy khi khởi động
```

### Bước 4: Bảo Mật MySQL
```bash
sudo mysql_secure_installation
```

Làm theo hướng dẫn tương tự như macOS.

### Bước 5: Tạo User và Set Password cho Root
```bash
sudo mysql
```

Trong MySQL shell:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '123456';
FLUSH PRIVILEGES;
EXIT;
```

### Bước 6: Đăng Nhập
```bash
mysql -u root -p
```

---

## 🔧 Khởi Tạo Database Cho Ứng Dụng

Sau khi cài đặt MySQL thành công:

### 1. Cập nhật `db-config.js`
```javascript
module.exports = {
  host: 'localhost',
  user: 'root',
  password: 'your_mysql_password',  // ← Thay bằng password của bạn
  database: 'tracuu_bangcong',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

### 2. Chạy Script Khởi Tạo
```bash
npm run init-db
```

Kết quả mong đợi:
```
Đã kết nối MySQL.
Database 'tracuu_bangcong' đã sẵn sàng.
Đã xóa các bảng cũ (nếu có).
Đã tạo bảng users thành công.
Đã tạo bảng timesheets thành công.
Đã tạo bảng timesheet_records thành công.
Đã thêm user: admin (admin)
Đã thêm user: 119307379 (user)
Đã thêm user: 119601013 (user)
Đã thêm user: user1 (user)

=== Khởi tạo database hoàn tất ===
Tài khoản admin: admin / admin123
Tài khoản user: 119307379, 119601013, user1 / user123
```

### 3. Khởi Động Server
```bash
npm start
```

---

## ❓ Các Vấn Đề Thường Gặp

### ❌ Lỗi: "mysql: command not found"

**Windows**: Thêm MySQL vào PATH
1. Tìm thư mục cài MySQL (thường là `C:\Program Files\MySQL\MySQL Server 8.0\bin`)
2. Thêm vào Environment Variables PATH

**macOS/Linux**: MySQL chưa được cài hoặc chưa trong PATH
```bash
# macOS
echo 'export PATH="/usr/local/mysql/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Linux
sudo ln -s /usr/bin/mysql /usr/local/bin/mysql
```

### ❌ Lỗi: "Access denied for user 'root'@'localhost'"

**Nguyên nhân**: Password sai hoặc user không có quyền.

**Giải pháp**:
```bash
# Reset password (Linux/macOS)
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

### ❌ Lỗi: "Can't connect to MySQL server on 'localhost'"

**Nguyên nhân**: MySQL server không chạy.

**Giải pháp**:
```bash
# Windows
net start MySQL

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
sudo systemctl status mysql  # Kiểm tra trạng thái
```

### ❌ Lỗi: "ERROR 1045 (28000): Access denied"

**Giải pháp**: Kiểm tra lại username, password trong `db-config.js`

---

## 🎯 Kiểm Tra Kết Nối

### Cách 1: MySQL Command Line
```bash
mysql -u root -p
```

Sau khi đăng nhập:
```sql
SHOW DATABASES;
USE tracuu_bangcong;
SHOW TABLES;
SELECT * FROM users;
EXIT;
```

### Cách 2: Node.js Test Script
Tạo file `test-db.js`:

```javascript
const mysql = require('mysql2');
const dbConfig = require('./db-config');

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối:', err.message);
    return;
  }
  console.log('✅ Kết nối MySQL thành công!');
  connection.end();
});
```

Chạy test:
```bash
node test-db.js
```

---

## 📚 Các Lệnh MySQL Hữu Ích

### Xem databases:
```sql
SHOW DATABASES;
```

### Chọn database:
```sql
USE tracuu_bangcong;
```

### Xem tables:
```sql
SHOW TABLES;
```

### Xem cấu trúc bảng:
```sql
DESCRIBE users;
DESCRIBE timesheets;
DESCRIBE timesheet_records;
```

### Xem dữ liệu:
```sql
SELECT * FROM users;
SELECT * FROM timesheets;
SELECT * FROM timesheet_records;
```

### Đếm số records:
```sql
SELECT COUNT(*) FROM users;
```

### Xóa database (cẩn thận!):
```sql
DROP DATABASE tracuu_bangcong;
```

---

## 🛡️ Bảo Mật MySQL

### 1. Tạo User Riêng (Không dùng root)
```sql
CREATE USER 'tracuu_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON tracuu_bangcong.* TO 'tracuu_user'@'localhost';
FLUSH PRIVILEGES;
```

Sau đó cập nhật `db-config.js`:
```javascript
module.exports = {
  host: 'localhost',
  user: 'tracuu_user',        // ← User mới
  password: 'secure_password', // ← Password mới
  database: 'tracuu_bangcong',
  // ...
};
```

### 2. Chỉ Cho Phép Kết Nối Local
Trong file cấu hình MySQL (`my.cnf` hoặc `my.ini`):
```ini
[mysqld]
bind-address = 127.0.0.1
```

### 3. Backup Định Kỳ
```bash
# Backup
mysqldump -u root -p tracuu_bangcong > backup.sql

# Restore
mysql -u root -p tracuu_bangcong < backup.sql
```

---

## 📞 Hỗ Trợ

Nếu vẫn gặp vấn đề, vui lòng kiểm tra:
1. ✅ MySQL version >= 5.7 hoặc >= 8.0
2. ✅ Port 3306 không bị firewall chặn
3. ✅ Đủ quyền administrator/sudo khi cài đặt
4. ✅ Không có MySQL khác đang chạy

**Tài liệu chính thức**:
- https://dev.mysql.com/doc/
- https://dev.mysql.com/downloads/

---

**Chúc bạn cài đặt thành công! 🎉**
