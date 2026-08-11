# 🚀 HƯỚNG DẪN DEPLOY NHANH LÊN RENDER

## 📂 ĐƯỜNG DẪN DỰ ÁN

```
c:\Users\tramt\Desktop\Tra cu bang cong 6_tan2\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong\Tra cu bang cong
```

## 🔗 CÁC LINK QUAN TRỌNG

### 1️⃣ GitHub (Lưu code)
- **Đăng ký/Đăng nhập:** https://github.com
- **Tạo repository mới:** https://github.com/new

### 2️⃣ Aiven (Database miễn phí)
- **Đăng ký/Đăng nhập:** https://aiven.io
- **Console:** https://console.aiven.io

### 3️⃣ Render (Web hosting miễn phí)
- **Đăng ký/Đăng nhập:** https://render.com
- **Dashboard:** https://dashboard.render.com

---

## ⚡ CÁC BƯỚC THỰC HIỆN

### BƯỚC 1: Push Code Lên GitHub

Mở **PowerShell** trong thư mục dự án:

```powershell
# Di chuyển vào thư mục dự án
cd "c:\Users\tramt\Desktop\Tra cu bang cong 6_tan2\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong\Tra cu bang cong"

# Khởi tạo Git (nếu chưa có)
git init

# Thêm tất cả file
git add .

# Commit
git commit -m "Deploy to Render"

# Thêm remote (thay YOUR_USERNAME bằng tên GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/tra-cuu-bang-cong.git

# Đổi branch sang main
git branch -M main

# Push lên GitHub
git push -u origin main
```

**💡 Lưu ý:** 
- Nếu chưa có Git: Tải tại https://git-scm.com/download/win
- Password khi push: Dùng **Personal Access Token**, không phải password GitHub
- Tạo token: GitHub → Settings → Developer settings → Personal access tokens

---

### BƯỚC 2: Tạo Database Trên Aiven

1. **Đăng nhập Aiven:** https://aiven.io
2. **Click:** `Create Service`
3. **Chọn:** `MySQL`
4. **Cấu hình:**
   - **Cloud:** Google Cloud
   - **Region:** `asia-southeast1` (Singapore)
   - **Plan:** `Startup-4` (FREE)
   - **Name:** `tracuu-bangcong-db`
5. **Click:** `Create Service`
6. **Chờ 5-10 phút** đến khi Status = `RUNNING` (màu xanh)

7. **Lấy thông tin kết nối:**
   - Click vào service vừa tạo
   - Tab `Overview` → `Connection Information`
   - **LƯU LẠI** các thông tin sau:

```
Host:     your-database-host.aivencloud.com
Port:     12345
User:     avnadmin
Password: YOUR_AIVEN_PASSWORD_HERE
Database: defaultdb
```

---

### BƯỚC 3: Deploy Lên Render

1. **Đăng nhập Render:** https://render.com
2. **Click:** `New +` → `Web Service`
3. **Connect GitHub:**
   - Click `Connect GitHub`
   - Authorize Render
   - Chọn repository: `tra-cuu-bang-cong`
4. **Cấu hình service:**

```
Name:           tracuu-bangcong-web
Region:         Singapore
Branch:         main
Runtime:        Node
Build Command:  npm install
Start Command:  node server.js
Instance Type:  Free
```

5. **Click:** `Create Web Service`

---

### BƯỚC 4: Thêm Environment Variables

Trong Render, vào tab **Environment**, thêm các biến sau:

```
DB_HOST=your-aiven-host.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=YOUR_AIVEN_PASSWORD_HERE
DB_NAME=defaultdb
DB_SSL=true
PORT=3000
SESSION_SECRET=change-this-to-random-secret-key-xyz123
NODE_ENV=production
```

**⚠️ QUAN TRỌNG:** 
- Thay các giá trị `xxxxx` bằng thông tin thực tế từ Aiven (Bước 2)
- Copy chính xác password từ Aiven
- `DB_SSL` phải là `true`

**Click:** `Save Changes`

Render sẽ tự động deploy lại!

---

### BƯỚC 5: Kiểm Tra

1. **Xem Logs:**
   - Tab `Logs` → Chờ đến khi thấy:
   ```
   ✅ Đã kết nối MySQL thành công
   ✅ Database đã sẵn sàng
   ✅ Server đang chạy trên port 3000
   ```

2. **Truy cập website:**
   - URL: `https://tracuu-bangcong-web.onrender.com`
   - (Hoặc URL hiển thị trên Dashboard)

3. **Đăng nhập admin:**
   - Username: `admin`
   - Password: `admin123`

4. **Đổi mật khẩu ngay!**

---

## 🎯 TÓM TẮT NHANH

### ✅ Checklist

- [ ] Đã push code lên GitHub
- [ ] Đã tạo MySQL database trên Aiven (status = RUNNING)
- [ ] Đã lưu thông tin kết nối Aiven (host, port, user, password)
- [ ] Đã tạo Web Service trên Render
- [ ] Đã thêm đủ 9 biến môi trường
- [ ] Website đã chạy (status = Live)
- [ ] Đã đăng nhập được admin
- [ ] Đã đổi mật khẩu admin

### 🔗 URLs Bạn Cần Nhớ

```
GitHub Repository:   https://github.com/YOUR_USERNAME/tra-cuu-bang-cong
Aiven Console:       https://console.aiven.io/services/tracuu-bangcong-db
Render Dashboard:    https://dashboard.render.com/web/tracuu-bangcong-web
Website URL:         https://tracuu-bangcong-web.onrender.com
```

---

## 🆘 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Application failed to respond"

**Nguyên nhân:** Thiếu hoặc sai biến môi trường database

**Giải pháp:**
1. Kiểm tra lại Environment Variables
2. Đảm bảo `DB_SSL=true`
3. Copy lại password từ Aiven (chính xác 100%)
4. Deploy lại: Manual Deploy → Deploy latest commit

### Lỗi: "ECONNREFUSED" hoặc "Cannot connect"

**Nguyên nhân:** Aiven service chưa sẵn sàng hoặc thông tin kết nối sai

**Giải pháp:**
1. Vào Aiven → Kiểm tra service status = `RUNNING`
2. So sánh lại `DB_HOST`, `DB_PORT` có đúng không
3. Đảm bảo `DB_SSL=true`

### Lỗi: Build failed

**Giải pháp:**
1. Kiểm tra `package.json` có script `"start": "node server.js"`
2. Đảm bảo `server.js` ở thư mục gốc
3. Build Command: `npm install`
4. Start Command: `node server.js`

### Website "ngủ" sau 15 phút

**Đây là bình thường với Free tier:**
- Free tier Render sleep sau 15 phút không dùng
- Wake up khi có request (mất ~30 giây)
- 750 giờ active/tháng

**Giải pháp:** Upgrade lên Starter plan ($7/tháng) nếu cần 24/7

---

## 💰 CHI PHÍ

**100% MIỄN PHÍ:**
- ✅ GitHub: Miễn phí (unlimited public repos)
- ✅ Aiven: Miễn phí (10GB MySQL)
- ✅ Render: Miễn phí (750 giờ/tháng)
- ✅ HTTPS: Miễn phí tự động

**Không cần thẻ tín dụng!**

---

## 📞 HỖ TRỢ

**Xem hướng dẫn chi tiết hơn:**
- File: `HUONG_DAN_DEPLOY_RENDER_AIVEN.md`

**Tài liệu chính thức:**
- Aiven: https://docs.aiven.io
- Render: https://render.com/docs

---

✨ **Chúc bạn deploy thành công!** ✨
