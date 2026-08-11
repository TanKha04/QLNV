# 🚀 Hướng Dẫn Deploy Web Lên Render + Aiven (Chi Tiết Từng Bước)

> **Hướng dẫn siêu chi tiết** để triển khai ứng dụng **Tra Cứu Bảng Công** lên internet hoàn toàn **MIỄN PHÍ** với Render và Aiven.

## 📋 Mục Lục
1. [Chuẩn Bị Ban Đầu](#-phần-1-chuẩn-bị-ban-đầu)
2. [Tạo Tài Khoản GitHub](#-phần-2-tạo-tài-khoản-github)
3. [Push Code Lên GitHub](#-phần-3-push-code-lên-github)
4. [Tạo Database Trên Aiven](#-phần-4-tạo-database-trên-aiven)
5. [Deploy Web Lên Render](#-phần-5-deploy-web-lên-render)
6. [Cấu Hình Biến Môi Trường](#-phần-6-cấu-hình-biến-môi-trường)
7. [Kiểm Tra Và Sử Dụng](#-phần-7-kiểm-tra-và-sử-dụng)
8. [Xử Lý Sự Cố](#-phần-8-xử-lý-sự-cố)

---

## 🎯 Tổng Quan Nhanh

### Những Gì Bạn Sẽ Có Sau Khi Hoàn Thành

✅ **Website online 24/7** trên internet  
✅ **URL riêng**: `https://ten-ban-chon.onrender.com`  
✅ **Database MySQL** trên cloud  
✅ **HTTPS bảo mật** miễn phí  
✅ **Không tốn 1 xu nào** (100% miễn phí)  
✅ **Tự động backup** database  
✅ **Không cần thẻ tín dụng**

### Các Dịch Vụ Sử Dụng

| Dịch Vụ | Vai Trò | Free Tier |
|---------|---------|-----------|
| **GitHub** | Lưu trữ source code | Unlimited repos |
| **Aiven** | MySQL Database | 10 GB storage |
| **Render** | Web Hosting | 750 giờ/tháng |

### Thời Gian Ước Tính

⏱️ **30-45 phút** (cho người mới bắt đầu)  
⏱️ **15-20 phút** (nếu đã quen)

---

## 📦 PHẦN 1: Chuẩn Bị Ban Đầu

### 1.1. Kiểm Tra Source Code

Đảm bảo bạn có đầy đủ các file sau trong thư mục dự án:

```
Tra cu bang cong/
├── server.js              ✅ File chính
├── db-config.js          ✅ Cấu hình database
├── package.json          ✅ Dependencies
├── package-lock.json     ✅ Lock file
├── .env.example          ✅ Mẫu biến môi trường
├── public/               ✅ Thư mục static files
│   ├── index.html
│   ├── script.js
│   └── style.css
├── init-db.js           ✅ Script khởi tạo
└── README.md
```

### 1.2. Tạo File `.gitignore`

**Quan trọng:** Không được commit các file nhạy cảm lên GitHub!

Tạo file `.gitignore` trong thư mục gốc với nội dung:

```gitignore
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Database
database.db
*.sqlite
*.db

# Uploads
uploads/
uploads/avatars/

# OS Files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp
.cache/
```

### 1.3. Kiểm Tra File `package.json`

Mở file `package.json` và đảm bảo có các phần sau:

```json
{
  "name": "tra-cuu-bang-cong",
  "version": "1.0.0",
  "description": "Hệ thống tra cứu bảng công và bảng lương",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "init-db": "node init-db.js"
  },
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "body-parser": "^1.20.2",
    "xlsx": "^0.18.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1"
  }
}
```

✅ **Quan trọng:** Phần `engines` giúp Render biết phiên bản Node.js cần dùng.

### 1.4. Kiểm Tra File `db-config.js`

File này phải có cấu hình SSL cho cloud database:

```javascript
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'tracuu_bangcong',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// ✅ SSL cho Cloud Database (Aiven, TiDB, PlanetScale...)
if (process.env.DB_SSL === 'true') {
  config.ssl = {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  };
}

module.exports = config;
```

---

## 🐙 PHẦN 2: Tạo Tài Khoản GitHub

### 2.1. Đăng Ký GitHub

1. **Truy cập:** https://github.com
2. **Click nút:** `Sign Up` (góc phải trên)
3. **Điền thông tin:**
   - Email: `email@example.com`
   - Password: Mật khẩu mạnh (ít nhất 8 ký tự)
   - Username: `username_cua_ban`
4. **Giải puzzle xác minh:** (nếu có)
5. **Xác nhận email:** Mở email và click link xác nhận
6. **Hoàn tất:** Bỏ qua các bước survey (hoặc điền nếu muốn)

### 2.2. Cài Đặt Git (Nếu Chưa Có)

**Windows:**
```bash
# Tải Git từ: https://git-scm.com/download/win
# Chạy file .exe và cài đặt với tùy chọn mặc định
```

**Kiểm tra Git đã cài:**
```bash
git --version
# Kết quả: git version 2.x.x
```

### 2.3. Cấu Hình Git Lần Đầu

Mở Command Prompt (CMD) hoặc PowerShell:

```bash
# Đặt tên người dùng
git config --global user.name "Ten Cua Ban"

# Đặt email (dùng email đã đăng ký GitHub)
git config --global user.email "email@example.com"

# Kiểm tra
git config --list
```

---

## 📤 PHẦN 3: Push Code Lên GitHub

### 3.1. Tạo Repository Mới Trên GitHub

1. **Đăng nhập GitHub**
2. **Click nút `+`** (góc phải trên) → `New repository`
3. **Điền thông tin:**
   - **Repository name:** `tra-cuu-bang-cong`
   - **Description:** `Hệ thống tra cứu bảng công và lương`
   - **Public** (chọn Public để dùng free)
   - ❌ **KHÔNG** tick `Add a README file`
   - ❌ **KHÔNG** tick `.gitignore`
   - ❌ **KHÔNG** chọn license
4. **Click:** `Create repository`

### 3.2. Khởi Tạo Git Trong Project

Mở Command Prompt trong thư mục dự án:

```bash
# Di chuyển vào thư mục dự án
cd "C:\Users\tramt\Desktop\Tra cu bang cong 6_tan2\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong\Tra cu bang cong"

# Khởi tạo Git
git init

# Kiểm tra trạng thái
git status
```

### 3.3. Thêm File Vào Git

```bash
# Thêm tất cả file (trừ những file trong .gitignore)
git add .

# Kiểm tra file nào được thêm
git status
```

**⚠️ Lưu ý:** Đảm bảo file `.env` KHÔNG xuất hiện trong danh sách (đã bị .gitignore chặn)

### 3.4. Commit Code

```bash
# Tạo commit đầu tiên
git commit -m "Initial commit - Tra cuu bang cong"

# Kết quả: 
# [master (root-commit) abc1234] Initial commit
# XX files changed, XXXX insertions(+)
```

### 3.5. Kết Nối Với GitHub Repository

**Lấy URL từ GitHub:**
- Vào repository vừa tạo
- Copy URL dạng: `https://github.com/username/tra-cuu-bang-cong.git`

```bash
# Thêm remote origin (thay YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/tra-cuu-bang-cong.git

# Đổi tên branch sang main (chuẩn mới)
git branch -M main

# Kiểm tra remote
git remote -v
```

### 3.6. Push Code Lên GitHub

```bash
# Push lần đầu
git push -u origin main

# Nếu yêu cầu đăng nhập:
# - Username: github_username
# - Password: DÙNG PERSONAL ACCESS TOKEN (không phải password thường)
```

**📝 Tạo Personal Access Token:**

1. GitHub → **Settings** (avatar góc phải)
2. **Developer settings** (cuối sidebar)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. **Note:** `Render deployment`
6. **Expiration:** `90 days` hoặc `No expiration`
7. **Scopes:** Tick `repo` (toàn bộ)
8. **Generate token**
9. **Copy token** (chỉ hiện 1 lần!) và dùng làm password khi push

### 3.7. Xác Nhận Code Đã Lên GitHub

1. Refresh trang repository trên GitHub
2. Bạn sẽ thấy tất cả file đã được upload
3. ✅ Hoàn thành bước này!

---

## 🗄️ PHẦN 4: Tạo Database Trên Aiven

### 4.1. Đăng Ký Tài Khoản Aiven

1. **Truy cập:** https://aiven.io
2. **Click:** `Get Started` hoặc `Sign Up`
3. **Chọn cách đăng ký:**
   - ⭐ **Khuyến nghị:** `Sign up with GitHub` (nhanh nhất)
   - Hoặc: `Sign up with Google`
   - Hoặc: Email + Password
4. **Xác nhận email** (nếu dùng email)
5. **Bỏ qua bước survey** (hoặc điền nếu muốn)

### 4.2. Tạo MySQL Service (Từng Bước Chi Tiết)

**Bước 1: Click nút tạo service**
```
Dashboard → Click "Create Service"
```

**Bước 2: Chọn MySQL**
```
Trong danh sách database → Click "MySQL"
```

**Bước 3: Chọn Cloud Provider**
```
☁️ Cloud Provider:
   ○ AWS
   ● Google Cloud (GCP)    ← Chọn cái này
   ○ Microsoft Azure
   ○ Digital Ocean
```

**Bước 4: Chọn Region**
```
📍 Region:
   Chọn region GẦN VIỆT NAM NHẤT:
   
   ✅ asia-southeast1 (Singapore)      ← KHUYẾN NGHỊ
   ✅ asia-east1 (Taiwan)
   ✅ asia-northeast1 (Tokyo)
   ❌ us-east-1 (Virginia) - XA
```

**Bước 5: Chọn Service Plan**
```
💰 Service Plan:

Scroll xuống tìm plan FREE:

┌─────────────────────────────┐
│  ⭐ Startup-4               │
│  FREE                        │
│  1 GB RAM                    │
│  10 GB Disk                  │
│  1 CPU                       │
│  Free forever                │
└─────────────────────────────┘
        👆 Chọn cái này
```

**Bước 6: Đặt tên service**
```
📝 Service name:
   tracuu-bangcong-db
   
   (Hoặc tên bạn thích, chỉ dùng: a-z, 0-9, dấu gạch ngang)
```

**Bước 7: Tạo service**
```
Click nút: "Create Service"
```

### 4.3. Chờ Service Khởi Động

Sau khi click Create:

```
⏳ Status: REBUILDING (màu vàng/cam)
   Thời gian: 5-10 phút
   
   Bạn sẽ thấy:
   "Service is being created..."
   "Installing MySQL..."
   "Starting service..."
   
✅ Status: RUNNING (màu xanh lá)
   → Đã xong! Có thể dùng được rồi
```

**💡 Mẹo:** Làm phần khác trong lúc chờ (vd: đọc tiếp hướng dẫn)

### 4.4. Lấy Thông Tin Kết Nối Database

Khi service đã **RUNNING**:

**Bước 1: Click vào service vừa tạo**
```
Dashboard → Click vào "tracuu-bangcong-db"
```

**Bước 2: Vào tab Overview**
```
Tìm phần: "Connection Information"
```

**Bước 3: Copy thông tin kết nối**

Bạn sẽ thấy một chuỗi như:

```
Service URI:
mysql://avnadmin:YOUR_PASSWORD@your-database-host.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
```

**Tách thông tin ra từng phần:**

```
📋 THÔNG TIN KẾT NỐI - LƯU LẠI KỸ!

┌──────────────────────────────────────────────────────────────┐
│ DB_HOST                                                      │
│ tracuu-bangcong-db-project-a1b2c3.aivencloud.com           │
├──────────────────────────────────────────────────────────────┤
│ DB_PORT                                                      │
│ 23490                          (ví dụ, của bạn sẽ khác)     │
├──────────────────────────────────────────────────────────────┤
│ DB_USER                                                      │
│ avnadmin                       (luôn là avnadmin)            │
├──────────────────────────────────────────────────────────────┤
│ DB_PASSWORD                                                  │
│ YOUR_AIVEN_PASSWORD_HERE       (copy chính xác!)            │
├──────────────────────────────────────────────────────────────┤
│ DB_NAME                                                      │
│ defaultdb                      (hoặc tên DB bạn tạo)        │
└──────────────────────────────────────────────────────────────┘
```

**⚠️ QUAN TRỌNG:**
- Copy các thông tin này vào Notepad
- Chuẩn bị để dán vào Render sau
- Password chỉ xem được ở đây, không thể xem lại!

### 4.5. Kiểm Tra Kết Nối (Tùy Chọn)

Nếu muốn test kết nối trước:

**Cách 1: Dùng MySQL Workbench**
```
1. Mở MySQL Workbench
2. New Connection
3. Điền thông tin từ Aiven
4. Test Connection
```

**Cách 2: Dùng command line**
```bash
mysql -h tracuu-bangcong-db-xxx.aivencloud.com \
      -P 23490 \
      -u avnadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb
```

### 4.6. Tạo Database Riêng (Tùy Chọn)

Nếu không muốn dùng `defaultdb`, tạo database mới:

**Cách 1: Trên Aiven Dashboard**
```
1. Vào service → Tab "Databases"
2. Click "Create Database"
3. Database name: tracuu_bangcong
4. Click "Create"
```

**Cách 2: Bằng SQL**
```sql
CREATE DATABASE tracuu_bangcong 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

---

## 🚀 PHẦN 5: Deploy Web Lên Render

### 5.1. Đăng Ký Tài Khoản Render

1. **Truy cập:** https://render.com
2. **Click:** `Get Started` hoặc `Sign Up`
3. **Chọn cách đăng ký:**
   - ⭐ **Khuyến nghị:** `Sign up with GitHub` (nhanh và an toàn)
   - Hoặc: Email + Password
4. **Authorize Render** (nếu dùng GitHub)
   - Click `Authorize Render`
   - Cho phép Render truy cập GitHub repositories

### 5.2. Tạo Web Service Mới (Chi Tiết Từng Bước)

**Bước 1: Vào Dashboard**
```
Sau khi đăng nhập → Render Dashboard
```

**Bước 2: Tạo service mới**
```
Click nút "New +" (góc trên bên phải)
→ Chọn "Web Service"
```

**Bước 3: Connect Repository**

Lần đầu tiên:
```
1. Click "Connect GitHub"
2. Popup GitHub sẽ mở
3. Click "Install" hoặc "Configure"
4. Chọn repository: "tra-cuu-bang-cong"
5. Click "Install" hoặc "Save"
```

Lần sau:
```
Repository list sẽ hiện sẵn
→ Tìm và click "tra-cuu-bang-cong"
```

**Bước 4: Cấu hình Web Service**

```
┌─────────────────────────────────────────────────────┐
│ GENERAL                                             │
├─────────────────────────────────────────────────────┤
│ Name:                                               │
│ tracuu-bangcong-web                                 │
│ (Tên này sẽ là URL: tracuu-bangcong-web.onrender.com) │
├─────────────────────────────────────────────────────┤
│ Region:                                             │
│ ● Singapore           ← KHUYẾN NGHỊ cho VN         │
│ ○ Oregon (US West)                                  │
│ ○ Frankfurt (Europe)                                │
├─────────────────────────────────────────────────────┤
│ Branch:                                             │
│ main                  ← Hoặc master                │
├─────────────────────────────────────────────────────┤
│ Root Directory:                                     │
│ (để trống nếu server.js ở thư mục gốc)            │
├─────────────────────────────────────────────────────┤
│ Runtime:                                            │
│ ● Node                                              │
├─────────────────────────────────────────────────────┤
│ Build Command:                                      │
│ npm install                                         │
├─────────────────────────────────────────────────────┤
│ Start Command:                                      │
│ node server.js                                      │
├─────────────────────────────────────────────────────┤
│ Instance Type:                                      │
│ ● Free                                              │
│   $0/month                                          │
│   512 MB RAM                                        │
│   0.1 CPU                                           │
└─────────────────────────────────────────────────────┘
```

**Bước 5: Tạm thời bỏ qua Environment Variables**
```
(Sẽ thêm sau khi tạo service)
```

**Bước 6: Tạo service**
```
Scroll xuống cuối
→ Click "Create Web Service"
```

### 5.3. Chờ Build Đầu Tiên (Sẽ Lỗi - Bình Thường!)

Render sẽ bắt đầu build:

```
⏳ Build in progress...

Build logs:
==> Downloading Node.js...
==> Installing dependencies...
npm install
...
==> Build completed

==> Starting service...
⚠️  Application failed to respond

Status: Deploy failed
```

**✅ Đây là BÌNH THƯỜNG!** Vì chưa có thông tin database → App không chạy được.

Bỏ qua lỗi này, chuyển sang bước tiếp theo!

---

## ⚙️ PHẦN 6: Cấu Hình Biến Môi Trường

### 6.1. Vào Trang Environment Variables

```
Trong Render Dashboard:
1. Click vào service "tracuu-bangcong-web" vừa tạo
2. Sidebar bên trái → Click "Environment"
```

### 6.2. Thêm Từng Biến Môi Trường

**Cách thêm:**
```
1. Click "Add Environment Variable"
2. Điền Key và Value
3. Click "Save" (mỗi biến)
```

**📋 DANH SÁCH BIẾN CẦN THÊM:**

#### Biến 1: DB_HOST
```
Key:   DB_HOST
Value: tracuu-bangcong-db-xxx.aivencloud.com
       👆 Copy từ Aiven (KHÔNG có mysql://)
```

#### Biến 2: DB_PORT
```
Key:   DB_PORT
Value: 23490
       👆 Port từ Aiven (thường 12000-28000)
```

#### Biến 3: DB_USER
```
Key:   DB_USER
Value: avnadmin
       👆 Luôn là avnadmin với Aiven
```

#### Biến 4: DB_PASSWORD
```
Key:   DB_PASSWORD
Value: YOUR_AIVEN_PASSWORD_HERE
       👆 Password dài từ Aiven (copy chính xác!)
```

#### Biến 5: DB_NAME
```
Key:   DB_NAME
Value: defaultdb
       👆 Hoặc tên database bạn tạo (vd: tracuu_bangcong)
```

#### Biến 6: DB_SSL
```
Key:   DB_SSL
Value: true
       👆 BẮT BUỘC true cho Aiven
```

#### Biến 7: PORT
```
Key:   PORT
Value: 3000
       👆 Port server Node.js
```

#### Biến 8: SESSION_SECRET
```
Key:   SESSION_SECRET
Value: render-production-secret-2024-change-this-to-random-string
       👆 Tự tạo chuỗi ngẫu nhiên dài để bảo mật
```

#### Biến 9: NODE_ENV
```
Key:   NODE_ENV
Value: production
       👆 Chế độ production
```

### 6.3. Kiểm Tra Lại Tất Cả Biến

Sau khi thêm xong, bạn sẽ thấy danh sách:

```
Environment Variables (9)

✅ DB_HOST         tracuu-bangcong-db-xxx.aivencloud.com
✅ DB_PORT         23490
✅ DB_USER         avnadmin
✅ DB_PASSWORD     •••••••••••••••••• (ẩn)
✅ DB_NAME         defaultdb
✅ DB_SSL          true
✅ PORT            3000
✅ SESSION_SECRET  •••••••••••••••••• (ẩn)
✅ NODE_ENV        production
```

### 6.4. Deploy Lại

Sau khi thêm biến môi trường:

```
Cách 1: Tự động deploy (chờ vài giây)
Cách 2: Manual deploy:
   → Click tab "Manual Deploy"
   → Click "Deploy latest commit"
```

---

## ✅ PHẦN 7: Kiểm Tra Và Sử Dụng

### 7.1. Theo Dõi Build Process

**Vào tab "Logs":**

```
Build logs:
==> Cloning repository...
==> Installing dependencies...
npm install
...
==> Starting service...
node server.js

Application logs:
=== Server đang chạy ===
URL: http://localhost:3000
...
✅ Đã kết nối MySQL thành công.
✅ Database đã sẵn sàng.
✅ Đã tạo tài khoản admin mặc định (admin / admin123)

Server đang chạy...
```

**Chờ đến khi thấy:**
```
✅ Live
   Your service is live at https://tracuu-bangcong-web.onrender.com
```

### 7.2. Truy Cập Website

**Lấy URL:**
```
Trong Dashboard → Click vào service
→ Bạn sẽ thấy URL ở đầu trang:
   🌐 https://tracuu-bangcong-web.onrender.com
```

**Mở trình duyệt:**
```
1. Copy URL
2. Paste vào trình duyệt
3. Enter
```

**⏱️ Lần đầu tiên:**
- Có thể mất 30-60 giây để "wake up" (free tier sleep)
- Sau đó sẽ nhanh hơn

### 7.3. Đăng Nhập Admin

**Trang đăng nhập sẽ hiện:**

```
┌─────────────────────────────────┐
│  TRA CỨU BẢNG CÔNG              │
├─────────────────────────────────┤
│  Username: admin                │
│  Password: admin123             │
│                                 │
│  [ Đăng Nhập ]                  │
└─────────────────────────────────┘
```

**Thông tin đăng nhập mặc định:**
- Username: `admin`
- Password: `admin123`

### 7.4. ⚠️ ĐỔI MẬT KHẨU ADMIN NGAY!

**Sau khi đăng nhập thành công:**

```
1. Góc trên bên phải → Click "Cài Đặt Tài Khoản"
2. Chọn "Đổi Mật Khẩu"
3. Điền:
   - Mật khẩu hiện tại: admin123
   - Mật khẩu mới: [mật khẩu mạnh của bạn]
   - Xác nhận mật khẩu mới: [nhập lại]
4. Click "Đổi Mật Khẩu"
```

### 7.5. Kiểm Tra Chức Năng

**Test các tính năng:**

✅ Upload bảng công:
```
1. Đăng nhập admin
2. Vào "Quản Lý Bảng Công"
3. Upload file Excel
4. Kiểm tra dữ liệu hiển thị
```

✅ Upload bảng lương:
```
1. Vào "Quản Lý Bảng Lương"
2. Upload file Excel
3. Kiểm tra dữ liệu
```

✅ Quản lý nhân viên:
```
1. Vào "Quản Lý Nhân Viên"
2. Upload file thông tin nhân viên
3. Kiểm tra danh sách
```

✅ Đăng nhập nhân viên:
```
1. Đăng xuất admin
2. Đăng nhập bằng MSNV + mật khẩu nhân viên
3. Xem bảng công/lương của mình
```

---

## 🔧 PHẦN 8: Xử Lý Sự Cố

### Lỗi 1: "Application failed to respond"

**Triệu chứng:**
```
Deploy failed
Application failed to respond on port 3000
```

**Nguyên nhân & Giải pháp:**

**A. Thiếu biến môi trường database**
```
Kiểm tra:
Environment → Đảm bảo có đầy đủ 9 biến
→ Đặc biệt: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
```

**B. Sai thông tin database**
```
Kiểm tra:
1. Vào Aiven → Service Overview
2. So sánh lại:
   - Host có đúng không?
   - Port có đúng không?
   - Password copy đúng chưa?
```

**C. Aiven service chưa RUNNING**
```
Kiểm tra:
Aiven Dashboard → Service status phải là RUNNING (màu xanh)
```

**D. Thiếu DB_SSL=true**
```
Aiven BẮT BUỘC SSL
→ Environment Variables → DB_SSL = true
```

### Lỗi 2: "ECONNREFUSED" hoặc "Cannot connect to database"

**Xem logs:**
```
Render Dashboard → Logs tab
Tìm dòng lỗi: ECONNREFUSED, ETIMEDOUT, ER_ACCESS_DENIED
```

**Giải pháp:**

**A. Kiểm tra host/port**
```
Logs có dòng:
"Attempting to connect to: xxx.aivencloud.com:12345"

So sánh với thông tin Aiven
→ Nếu khác → Sửa Environment Variables
```

**B. Kiểm tra password**
```
Password Aiven rất dài và phức tạp
→ Copy lại từ Aiven Connection Info
→ Paste vào DB_PASSWORD (không space đầu/cuối)
```

**C. SSL không được bật**
```
Aiven yêu cầu SSL bắt buộc
→ DB_SSL phải = true (không phải "true" hoặc TRUE)
```

### Lỗi 3: "Build failed" - npm install lỗi

**Triệu chứng:**
```
Build logs:
npm ERR! Cannot find module 'xxx'
npm ERR! peer dependency error
```

**Giải pháp:**

**A. Kiểm tra package.json**
```
File package.json phải có đầy đủ dependencies
Xem ở phần 1.3 của hướng dẫn
```

**B. Xóa package-lock.json và thử lại**
```
Local:
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock"
git push

Render sẽ tự động deploy lại
```

### Lỗi 4: "Cannot find module './server.js'"

**Triệu chứng:**
```
Error: Cannot find module './server.js'
```

**Giải pháp:**

**A. Kiểm tra Start Command**
```
Render Dashboard → Settings
Start Command: node server.js (không có ./)
```

**B. Kiểm tra Root Directory**
```
Nếu server.js ở thư mục con:
Root Directory: Tra cu bang cong/

Nếu ở thư mục gốc:
Root Directory: (để trống)
```

### Lỗi 5: Service "sleep" sau 15 phút không dùng

**Đây KHÔNG phải lỗi**, là tính năng free tier:

```
Free tier Render:
- Sleep sau 15 phút không activity
- Wake up khi có request (30s)
- 750 giờ active/tháng
```

**Giải pháp nâng cao:**

**A. Uptime monitoring (miễn phí)**
```
Dùng UptimeRobot hoặc Cron-job.org
Ping URL mỗi 10-14 phút
→ Service không bao giờ sleep
```

**B. Upgrade lên paid plan**
```
Render Starter: $7/month
→ Không sleep
→ Nhanh hơn
→ 1GB RAM
```

### Lỗi 6: "502 Bad Gateway"

**Nguyên nhân:**
- Server đang restart
- Hoặc crash

**Giải pháp:**
```
1. Chờ 1-2 phút
2. Refresh trình duyệt
3. Kiểm tra Logs
4. Nếu vẫn lỗi → Click "Manual Deploy"
```

### Lỗi 7: Upload file Excel bị lỗi

**Triệu chứng:**
```
"Lỗi xử lý file Excel"
"Không tìm thấy header"
```

**Giải pháp:**

**A. Kiểm tra định dạng file**
```
- Phải là .xlsx (không phải .xls cũ)
- Có header rõ ràng (MSNV, Họ và Tên, ...)
- Không có merged cells trong header
```

**B. Kiểm tra logs**
```
Render Logs sẽ show lỗi cụ thể
→ Parse error ở dòng nào, cột nào
```

---

## 🎓 Hướng Dẫn Bổ Sung

### A. Cấu Hình Custom Domain (Tùy Chọn)

Nếu có tên miền riêng (vd: `tracuu.congty.vn`):

**Bước 1: Thêm domain trên Render**
```
Service Settings → Custom Domain
→ Add Domain
→ Nhập: tracuu.congty.vn
```

**Bước 2: Cấu hình DNS**
```
Vào nhà cung cấp domain (GoDaddy, Namecheap, ...)

Thêm CNAME record:
Type: CNAME
Name: tracuu
Value: tracuu-bangcong-web.onrender.com
TTL: 3600
```

**Bước 3: Chờ SSL tự động**
```
Render tự động cấp SSL certificate
Thời gian: 5-15 phút
```

### B. Sao Lưu Database

**Aiven tự động backup:**
- Backup mỗi ngày
- Lưu 2 ngày (free tier)
- Restore từ Dashboard

**Manual backup:**
```bash
# Dùng mysqldump
mysqldump -h tracuu-bangcong-db-xxx.aivencloud.com \
          -P 23490 \
          -u avnadmin \
          -p \
          --ssl-mode=REQUIRED \
          defaultdb > backup.sql
```

### C. Monitoring và Logs

**Xem logs realtime:**
```
Render Dashboard → Logs
→ Chọn "Live Logs"
→ Theo dõi request/response
```

**Download logs:**
```
Logs → Three dots menu → Download
```

### D. Update Code

**Khi sửa code:**
```bash
# Local:
git add .
git commit -m "Update feature X"
git push origin main

# Render:
Tự động deploy sau vài giây
(hoặc Manual Deploy nếu cần)

---

## 🎯 Tổng Quan

### Các Dịch Vụ Sử Dụng

**1. Aiven (Database)**
- ✅ MySQL database miễn phí
- ✅ 1 GB storage
- ✅ Bảo mật SSL
- ✅ Backup tự động
- 🌐 Website: https://aiven.io

**2. Render (Web Hosting)**
- ✅ Hosting Node.js miễn phí
- ✅ Auto deploy từ GitHub
- ✅ HTTPS miễn phí
- ✅ 750 giờ/tháng
- 🌐 Website: https://render.com

### Yêu Cầu Trước Khi Bắt Đầu

- ✅ Tài khoản GitHub (để lưu code)
- ✅ Tài khoản Aiven (đăng ký miễn phí)
- ✅ Tài khoản Render (đăng ký miễn phí)
- ✅ Source code dự án đã push lên GitHub

---

## 🗄️ Bước 1: Tạo Database Trên Aiven

### 1.1. Đăng Ký Tài Khoản Aiven

1. Truy cập: https://aiven.io
2. Click **"Sign Up"** hoặc **"Get Started"**
3. Chọn phương thức đăng ký:
   - Email + Password
   - Hoặc đăng nhập bằng GitHub/Google
4. Xác nhận email (nếu đăng ký bằng email)

### 1.2. Tạo MySQL Service Mới

1. Sau khi đăng nhập, click **"Create Service"**
2. Chọn **"MySQL"** từ danh sách database

3. **Cấu hình Service:**

   **Cloud Provider:**
   - Chọn: **Google Cloud** (GCP) hoặc **AWS**
   - Region: Chọn region gần Việt Nam:
     - `asia-southeast1` (Singapore) - **Khuyến nghị**
     - `asia-east1` (Taiwan)
     - `asia-northeast1` (Tokyo)

   **Service Plan:**
   - Chọn: **"Startup-4"** (Free tier)
   - RAM: 1 GB
   - Storage: 10 GB
   - ✅ Hoàn toàn miễn phí

   **Service Name:**
   - Đặt tên: `tracuu-bangcong-db` (hoặc tên bạn muốn)

4. Click **"Create Service"**

5. **Chờ Service Khởi Động:**
   - Thời gian: 5-10 phút
   - Trạng thái: `RUNNING` (màu xanh)

### 1.3. Lấy Thông Tin Kết Nối

Sau khi service đã `RUNNING`:

1. Click vào service vừa tạo
2. Vào tab **"Connection Information"** hoặc **"Overview"**
3. Sao chép các thông tin sau:

```
Service URI: mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED
```

**Tách thông tin ra:**
- **Host:** `tracuu-bangcong-db-xxxxx.aivencloud.com`
- **Port:** `12345` (thường là 12345-28000)
- **User:** `avnadmin`
- **Password:** `YOUR_AIVEN_PASSWORD_HERE`
- **Database:** `defaultdb`
- **SSL:** Required

**📌 Lưu Ý:** 
- Aiven luôn yêu cầu SSL connection
- Database mặc định là `defaultdb`, bạn có thể tạo database mới nếu muốn

### 1.4. Tạo Database Mới (Tùy Chọn)

Nếu muốn tạo database riêng thay vì dùng `defaultdb`:

1. Vào tab **"Databases"**
2. Click **"Create Database"**
3. Nhập tên: `tracuu_bangcong`
4. Click **"Create"**

Hoặc dùng MySQL client:
```sql
CREATE DATABASE tracuu_bangcong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 🚀 Bước 2: Deploy Web Lên Render

### 2.1. Chuẩn Bị Repository GitHub

**Kiểm tra các file quan trọng:**

1. **`package.json`** - Đảm bảo có script start:
```json
{
  "name": "tra-cuu-bang-cong",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "init-db": "node init-db.js"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

2. **`.gitignore`** - Đảm bảo không commit các file nhạy cảm:
```
node_modules/
.env
*.log
uploads/
database.db
```

3. **Push code lên GitHub:**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2.2. Tạo Web Service Trên Render

1. Đăng nhập: https://render.com
2. Click **"New +"** → **"Web Service"**

3. **Connect Repository:**
   - Chọn **"Connect GitHub"** (nếu chưa kết nối)
   - Authorize Render truy cập GitHub
   - Chọn repository: `tra-cuu-bang-cong`

4. **Cấu Hình Service:**

   **Name:** `tracuu-bangcong-web`
   
   **Region:** 
   - `Singapore` (gần VN nhất)
   - Hoặc `Oregon` / `Frankfurt`
   
   **Branch:** `main` (hoặc `master`)
   
   **Runtime:** `Node`
   
   **Build Command:**
   ```bash
   npm install
   ```
   
   **Start Command:**
   ```bash
   node server.js
   ```
   
   **Instance Type:** `Free` (Free tier)

5. Click **"Create Web Service"**

---

## ⚙️ Bước 3: Cấu Hình Biến Môi Trường

### 3.1. Thêm Environment Variables Trên Render

Sau khi tạo service, vào tab **"Environment"**:

1. Click **"Add Environment Variable"**
2. Thêm từng biến sau:

**Cấu hình Database Aiven:**

```
DB_HOST=tracuu-bangcong-db-xxxxx.aivencloud.com
```
*(Thay bằng host từ Aiven)*

```
DB_PORT=12345
```
*(Thay bằng port từ Aiven)*

```
DB_USER=avnadmin
```
*(Thay bằng username từ Aiven)*

```
DB_PASSWORD=YOUR_AIVEN_PASSWORD_HERE
```
*(Thay bằng password từ Aiven)*

```
DB_NAME=defaultdb
```
*(Hoặc `tracuu_bangcong` nếu đã tạo database riêng)*

```
DB_SSL=true
```
*(Bắt buộc cho Aiven)*

**Cấu hình Server:**

```
PORT=3000
```

```
SESSION_SECRET=render-tracuu-secret-key-2024-change-this
```
*(Thay bằng secret key mạnh và duy nhất)*

```
NODE_ENV=production
```

### 3.2. Cấu Hình File `db-config.js`

File `db-config.js` đã được cấu hình sẵn để hỗ trợ SSL:

```javascript
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'tracuu_bangcong',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Cấu hình SSL cho Cloud Database
if (process.env.DB_SSL === 'true') {
  config.ssl = {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  };
}

module.exports = config;
```

✅ File này đã sẵn sàng cho Aiven!

---

## 🎉 Bước 4: Kiểm Tra Và Khởi Động

### 4.1. Deploy và Kiểm Tra Logs

1. **Auto Deploy:**
   - Render sẽ tự động deploy sau khi bạn thêm environment variables
   - Hoặc click **"Manual Deploy"** → **"Deploy latest commit"**

2. **Xem Build Logs:**
   - Vào tab **"Logs"**
   - Kiểm tra quá trình:
     ```
     ==> Installing dependencies...
     ==> Building...
     ==> Starting server...
     ✅ Server đang chạy trên port 3000
     ✅ Đã kết nối MySQL thành công
     ```

3. **Kiểm Tra Trạng Thái:**
   - Status phải là: **"Live"** (màu xanh)
   - Nếu lỗi: Đọc phần [Xử Lý Sự Cố](#xử-lý-sự-cố)

### 4.2. Truy Cập Ứng Dụng

1. **URL của bạn:**
   ```
   https://tracuu-bangcong-web.onrender.com
   ```
   *(Tên sẽ khác tùy vào service name bạn đặt)*

2. **Đăng nhập Admin mặc định:**
   - Username: `admin`
   - Password: `admin123`

3. **⚠️ Quan trọng:** Đổi mật khẩu admin ngay sau khi đăng nhập lần đầu!

### 4.3. Khởi Tạo Database (Tự Động)

Ứng dụng sẽ tự động khởi tạo:
- ✅ Tạo tất cả các bảng cần thiết
- ✅ Tạo tài khoản admin mặc định
- ✅ Cấu hình cấu trúc database

Kiểm tra logs để đảm bảo:
```
✅ Đã kết nối MySQL thành công.
✅ Database đã sẵn sàng.
✅ Đã tạo tài khoản admin mặc định (admin / admin123)
```

---

## 🔧 Xử Lý Sự Cố

### Lỗi 1: "Cannot connect to database"

**Nguyên nhân:**
- Sai thông tin kết nối Aiven
- Chưa bật SSL

**Giải pháp:**
1. Kiểm tra lại các biến môi trường trên Render
2. Đảm bảo `DB_SSL=true`
3. Copy lại chính xác host, port, user, password từ Aiven
4. Kiểm tra service Aiven đã `RUNNING` chưa

### Lỗi 2: "Application failed to respond"

**Nguyên nhân:**
- Server không khởi động được
- Port không đúng

**Giải pháp:**
1. Kiểm tra logs trên Render
2. Đảm bảo `PORT=3000` trong environment variables
3. Kiểm tra `server.js` có dòng:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```

### Lỗi 3: "Build failed"

**Nguyên nhân:**
- Thiếu dependencies
- Lỗi syntax code

**Giải pháp:**
1. Kiểm tra logs chi tiết
2. Đảm bảo `package.json` có đầy đủ dependencies
3. Test local trước: `npm install && npm start`

### Lỗi 4: "ECONNREFUSED" hoặc "ETIMEDOUT"

**Nguyên nhân:**
- Aiven service chưa sẵn sàng
- Sai region/network

**Giải pháp:**
1. Chờ Aiven service hoàn toàn `RUNNING` (5-10 phút)
2. Kiểm tra IP whitelist (Aiven free tier cho phép tất cả IPs)
3. Thử restart service Render

### Lỗi 5: "SSL connection error"

**Nguyên nhân:**
- Chưa cấu hình SSL đúng

**Giải pháp:**
1. Đảm bảo `DB_SSL=true` trong environment variables
2. Kiểm tra `db-config.js` có đoạn code SSL
3. Aiven bắt buộc SSL, không thể tắt

---

## 📊 Theo Dõi Và Bảo Trì

### Health Check

Render tự động ping ứng dụng mỗi 5 phút. Nếu không phản hồi, sẽ restart tự động.

### Logs

- Xem logs realtime trên Render dashboard
- Logs lưu trong 7 ngày (free tier)

### Database Backup

Aiven tự động backup database hàng ngày (free tier: 2 ngày lưu trữ).

### Giới Hạn Free Tier

**Render:**
- 750 giờ/tháng
- Sleep sau 15 phút không hoạt động
- Startup time: ~30 giây khi wake up

**Aiven:**
- 1 service MySQL
- 10 GB storage
- Backup 2 ngày

---

## 🎯 Các Bước Sau Deploy

### 1. Đổi Mật Khẩu Admin
```
1. Đăng nhập: admin / admin123
2. Vào "Quản Lý Admin" → "Cài Đặt Tài Khoản"
3. Đổi mật khẩu mạnh
```

### 2. Tạo Quản Trị Viên Phụ
```
- Quản trị viên Bảng Chấm Công
- Quản trị viên Bảng Lương
- Quản trị viên Hệ Thống
```

### 3. Upload Dữ Liệu Nhân Viên
```
1. Vào "Quản Lý Nhân Viên"
2. Upload file Excel thông tin nhân viên
3. Kiểm tra dữ liệu
```

### 4. Upload Bảng Công/Lương
```
1. Đăng nhập với quyền phù hợp
2. Upload file Excel
3. Kiểm tra và điều chỉnh nếu cần
```

### 5. Hướng Dẫn Nhân Viên
```
- Gửi URL web cho nhân viên
- Hướng dẫn đăng nhập (MSNV + Mật khẩu)
- Hướng dẫn tra cứu bảng công/lương
```

---

## 🔗 Custom Domain (Tùy Chọn)

Nếu bạn có tên miền riêng:

1. Vào Render Dashboard → Service Settings
2. Tab **"Custom Domain"**
3. Thêm domain: `tracuu.domain.com`
4. Cập nhật DNS records theo hướng dẫn Render
5. Chờ SSL certificate tự động cấp

---

## 📞 Hỗ Trợ

**Aiven Documentation:** https://docs.aiven.io
**Render Documentation:** https://render.com/docs

**Community:**
- Aiven Community: https://community.aiven.io
- Render Community: https://community.render.com

---

## ✅ Checklist Hoàn Thành

- [ ] Tạo database trên Aiven
- [ ] Lấy thông tin kết nối từ Aiven
- [ ] Push code lên GitHub
- [ ] Tạo web service trên Render
- [ ] Thêm environment variables
- [ ] Deploy thành công
- [ ] Truy cập được web
- [ ] Đăng nhập admin thành công
- [ ] Đổi mật khẩu admin
- [ ] Upload dữ liệu test
- [ ] Kiểm tra chức năng tra cứu
- [ ] Hướng dẫn nhân viên sử dụng

---

**🎉 Chúc mừng! Ứng dụng của bạn đã online trên internet!**

URL: `https://tracuu-bangcong-web.onrender.com`

---

*Lưu ý: Hướng dẫn này được viết cho phiên bản free tier. Nếu cần hiệu năng cao hơn, hãy nâng cấp lên gói trả phí.*

```

### E. Scale Up (Nâng Cấp)

**Khi nào cần nâng cấp:**
- Nhiều người dùng cùng lúc (>50)
- Cần response nhanh hơn
- Upload file lớn
- Không muốn sleep

**Render Upgrade:**
```
Settings → Instance Type
→ Starter: $7/month (512MB RAM, no sleep)
→ Standard: $25/month (2GB RAM)
```

**Aiven Upgrade:**
```
Service Settings → Change Plan
→ Business-4: $60/month (4GB RAM, 80GB disk)
→ Business-8: $120/month (8GB RAM, 160GB disk)
```

---

## 📊 So Sánh Chi Phí

### Free Tier (Khuyến Nghị Cho Bắt Đầu)

| Dịch Vụ | Chi Phí | Giới Hạn | Đủ Dùng Cho |
|---------|---------|----------|-------------|
| Aiven DB | **$0** | 10GB, 1GB RAM | 50-100 nhân viên |
| Render Web | **$0** | 750h/tháng, sleep | Dùng nội bộ OK |
| **TỔNG** | **$0** | - | Công ty nhỏ |

### Paid (Nếu Cần Nâng Cấp)

| Dịch Vụ | Chi Phí | Lợi Ích |
|---------|---------|---------|
| Aiven Business-4 | $60/tháng | 4GB RAM, 80GB disk |
| Render Starter | $7/tháng | No sleep, nhanh hơn |
| **TỔNG** | **$67/tháng** | Dùng chuyên nghiệp |

---

## 🎯 Checklist Hoàn Thành

Đánh dấu ✅ khi hoàn thành mỗi bước:

### Chuẩn Bị
- [ ] Kiểm tra source code đầy đủ
- [ ] Tạo file .gitignore
- [ ] Kiểm tra package.json
- [ ] Kiểm tra db-config.js có SSL

### GitHub
- [ ] Đăng ký/đăng nhập GitHub
- [ ] Cài đặt Git local
- [ ] Cấu hình Git (user.name, user.email)
- [ ] Tạo repository trên GitHub
- [ ] Push code lên GitHub

### Aiven
- [ ] Đăng ký tài khoản Aiven
- [ ] Tạo MySQL service
- [ ] Chờ service RUNNING
- [ ] Copy thông tin kết nối (host, port, user, password)
- [ ] Lưu thông tin vào Notepad

### Render
- [ ] Đăng ký tài khoản Render
- [ ] Connect với GitHub
- [ ] Tạo Web Service
- [ ] Cấu hình service (name, region, branch)
- [ ] Thêm 9 biến môi trường
- [ ] Deploy thành công

### Kiểm Tra
- [ ] Truy cập URL thành công
- [ ] Đăng nhập admin được
- [ ] Đổi mật khẩu admin
- [ ] Upload bảng công test
- [ ] Upload bảng lương test
- [ ] Upload thông tin nhân viên
- [ ] Test đăng nhập nhân viên
- [ ] Test tra cứu bảng công
- [ ] Test tra cứu bảng lương

### Bảo Mật
- [ ] Đã đổi mật khẩu admin
- [ ] Tạo quản trị viên phụ
- [ ] Hướng dẫn nhân viên đổi mật khẩu
- [ ] Kiểm tra không có file .env trên GitHub

---

## 📚 Tài Liệu Tham Khảo

### Chính Thức
- **Render Docs:** https://render.com/docs
- **Aiven Docs:** https://docs.aiven.io
- **MySQL Docs:** https://dev.mysql.com/doc/
- **Node.js Docs:** https://nodejs.org/docs/

### Community
- **Render Community:** https://community.render.com
- **Aiven Community:** https://community.aiven.io
- **Stack Overflow:** https://stackoverflow.com (tag: render, aiven)

### Video Tutorials
- YouTube: "Deploy Node.js to Render"
- YouTube: "Aiven MySQL Setup"
- YouTube: "Connect Render to Aiven"

---

## 💬 FAQ (Câu Hỏi Thường Gặp)

### Q1: Có cần thẻ tín dụng không?
**A:** KHÔNG. Cả Aiven và Render đều có free tier không cần thẻ.

### Q2: Giới hạn free tier có đủ dùng không?
**A:** Đủ cho công ty 50-100 nhân viên. Nếu lớn hơn → nâng cấp.

### Q3: Website có bị sleep không?
**A:** Có (free tier). Sleep sau 15 phút không dùng, wake up trong 30s.

### Q4: Làm sao để không bị sleep?
**A:** 
- Cách 1: Upgrade lên Render Starter ($7/tháng)
- Cách 2: Dùng uptime monitor ping mỗi 10 phút

### Q5: Database có bị mất dữ liệu không?
**A:** KHÔNG. Aiven backup tự động mỗi ngày.

### Q6: Có thể dùng domain riêng không?
**A:** CÓ. Thêm custom domain trong Render settings.

### Q7: Upload được file lớn bao nhiêu?
**A:** Free tier: ~50MB. Nếu cần lớn hơn → upgrade hoặc dùng cloud storage.

### Q8: Có thể có nhiều admin không?
**A:** CÓ. Tạo nhiều tài khoản với role admin.

### Q9: Nhân viên quên mật khẩu thì sao?
**A:** Admin có thể reset trong "Quản Lý Nhân Viên".

### Q10: Code có bị lộ trên GitHub không?
**A:** Không nếu dùng .gitignore đúng. File .env không được push.

### Q11: Có thể migrate sang server khác không?
**A:** CÓ. Export database từ Aiven, import vào server mới.

### Q12: Render có hỗ trợ tiếng Việt không?
**A:** Không, nhưng interface đơn giản, dễ hiểu.

---

## 🎁 Bonus Tips

### Tip 1: Tăng Tốc Deploy
```
Trong package.json thêm:
"engines": {
  "node": "18.x",
  "npm": "9.x"
}
→ Render dùng Node.js mới nhất → nhanh hơn
```

### Tip 2: Auto Restart Khi Crash
```
Render tự động restart khi app crash
→ Không cần cấu hình gì thêm
```

### Tip 3: Xem Logs Dễ Hơn
```
Cài Render CLI:
npm install -g render-cli
render login
render logs tracuu-bangcong-web
```

### Tip 4: Test Local Trước Khi Deploy
```bash
# Set biến môi trường local
set DB_HOST=xxx.aivencloud.com
set DB_PORT=12345
set DB_USER=avnadmin
set DB_PASSWORD=YOUR_PASSWORD_HERE
set DB_NAME=defaultdb
set DB_SSL=true

# Chạy local
npm start

# Test: http://localhost:3000
```

### Tip 5: Cảnh Báo Khi Service Down
```
Dùng UptimeRobot:
1. Đăng ký: https://uptimerobot.com
2. Add Monitor
3. URL: https://tracuu-bangcong-web.onrender.com
4. Interval: 5 minutes
5. Alert: Email/SMS khi down
```

### Tip 6: Optimize Database Performance
```sql
-- Thêm index cho tra cứu nhanh
ALTER TABLE timesheet_records ADD INDEX idx_employee_id (employee_id);
ALTER TABLE salary_records ADD INDEX idx_employee_id (employee_id);
ALTER TABLE users ADD INDEX idx_username (username);
```

### Tip 7: Backup Tự Động
```bash
# Script backup hàng ngày (chạy trên local hoặc VPS)
#!/bin/bash
DATE=$(date +%Y%m%d)
mysqldump -h xxx.aivencloud.com \
  -P 12345 -u avnadmin -p \
  --ssl-mode=REQUIRED \
  defaultdb > backup_$DATE.sql

# Upload lên Google Drive/Dropbox
```

---

## 🚨 Lưu Ý Quan Trọng

### 🔒 Bảo Mật

1. **KHÔNG BAO GIỜ** commit file `.env` lên GitHub
2. **ĐỔI MẬT KHẨU** admin ngay sau deploy
3. **SỬ DỤNG** mật khẩu mạnh cho admin
4. **KIỂM TRA** .gitignore trước khi push
5. **XÓA** logs có chứa password/secret

### ⚠️ Giới Hạn Free Tier

**Render:**
- 750 giờ active/tháng (~31 ngày nếu chạy liên tục)
- Sleep sau 15 phút không activity
- Wake up time: 30 giây
- Bandwidth: 100GB/tháng

**Aiven:**
- 1 service
- 10GB storage
- 1GB RAM
- Backup 2 ngày

### 💡 Best Practices

1. **Commit thường xuyên** với message rõ ràng
2. **Test local** trước khi push
3. **Xem logs** sau mỗi deploy
4. **Backup database** định kỳ
5. **Monitor uptime** nếu quan trọng
6. **Document** mọi thay đổi
7. **Version control** cho file Excel template

---

## 🎉 Kết Luận

**Chúc mừng bạn đã hoàn thành!**

Bây giờ bạn đã có:
✅ Website online 24/7 trên internet
✅ URL riêng để chia sẻ với nhân viên
✅ Database an toàn trên cloud
✅ Tự động backup và restore
✅ Hoàn toàn miễn phí

**URL của bạn:**
```
🌐 https://tracuu-bangcong-web.onrender.com
```

**Đăng nhập admin:**
```
👤 Username: admin
🔑 Password: [mật khẩu bạn đã đổi]
```

---

## 📞 Liên Hệ Hỗ Trợ

**Nếu gặp vấn đề:**

1. **Đọc lại hướng dẫn** - 90% câu hỏi đã được giải đáp
2. **Xem logs** - Render và Aiven đều có logs chi tiết
3. **Google lỗi** - Copy paste error message vào Google
4. **Hỏi Community** - Render/Aiven community rất hữu ích
5. **Stack Overflow** - Tag: render, aiven, node.js, mysql

**Resources:**
- 📚 Docs: https://render.com/docs
- 💬 Forum: https://community.render.com
- 🐛 GitHub Issues: [repo của bạn]/issues

---

## 📝 Lịch Sử Cập Nhật

- **v1.0** (2024): Hướng dẫn ban đầu
- **v1.1** (2024): Thêm phần xử lý sự cố chi tiết
- **v1.2** (2024): Thêm FAQ và bonus tips

---

**🌟 Chúc bạn deploy thành công!**

*Nếu hướng dẫn này hữu ích, hãy star ⭐ repository trên GitHub!*

---

> **Lưu ý:** Hướng dẫn này được viết cho free tier. Hiệu năng và giới hạn có thể thay đổi theo chính sách của Render và Aiven. Luôn kiểm tra documentation chính thức để cập nhật thông tin mới nhất.
