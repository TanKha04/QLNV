# 📤 LỆNH PUSH CODE LÊN GITHUB

## Repository của bạn:
```
https://github.com/tramkkatram+a11y/QLNV
```

## Các bước thực hiện:

### Bước 1: Mở PowerShell trong thư mục dự án

**Cách 1:** Mở File Explorer
```
1. Mở File Explorer
2. Đến thư mục: c:\Users\tramt\Desktop\Tra cu bang cong 6_tan2\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong\Tra cu bang cong
3. Shift + Click chuột phải trong thư mục
4. Chọn "Open PowerShell window here"
```

**Cách 2:** Dùng lệnh cd
```powershell
cd "c:\Users\tramt\Desktop\Tra cu bang cong 6_tan2\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong 6\Tra cu bang cong\Tra cu bang cong"
```

---

### Bước 2: Chạy các lệnh Git

Copy và paste từng lệnh dưới đây vào PowerShell:

```powershell
# Khởi tạo Git repository (nếu chưa có)
git init

# Thêm tất cả file vào Git
git add .

# Tạo commit đầu tiên
git commit -m "Initial commit - Tra cuu bang cong"

# Thêm remote origin
git remote add origin https://github.com/tramkkatram+a11y/QLNV.git

# Đổi branch sang main
git branch -M main

# Push code lên GitHub
git push -u origin main
```

---

### Bước 3: Đăng nhập GitHub (nếu yêu cầu)

Khi chạy lệnh `git push`, GitHub sẽ yêu cầu đăng nhập:

**Username:** tramkkatram+a11y

**Password:** KHÔNG DÙNG PASSWORD THƯỜNG!
- Phải dùng **Personal Access Token**
- Tạo token theo hướng dẫn bên dưới

---

## 🔑 Tạo Personal Access Token (PAT)

Nếu bạn chưa có token, làm theo các bước sau:

### Bước 1: Vào trang tạo token
```
https://github.com/settings/tokens
```

Hoặc:
```
GitHub → Click avatar (góc phải) → Settings → Developer settings → Personal access tokens → Tokens (classic)
```

### Bước 2: Tạo token mới
1. Click **"Generate new token"**
2. Chọn **"Generate new token (classic)"**

### Bước 3: Cấu hình token
```
Note:       GitHub Push Token
Expiration: 90 days (hoặc No expiration)
Scopes:     ✅ Tick toàn bộ "repo"
```

### Bước 4: Generate và copy token
1. Click **"Generate token"**
2. **COPY TOKEN NGAY** (chỉ hiện 1 lần!)
3. Token có dạng: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Bước 5: Dùng token làm password
```
Username: tramkkatram+a11y
Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (paste token)
```

---

## ✅ Kiểm tra đã push thành công

1. Refresh trang GitHub: https://github.com/tramkkatram+a11y/QLNV
2. Bạn sẽ thấy tất cả file đã xuất hiện
3. ✅ Hoàn tất bước push code!

---

## 🔄 Nếu đã có Git repository

Nếu thư mục đã có `.git` (đã init trước đó), bỏ qua lệnh `git init` và chạy:

```powershell
# Xóa remote cũ (nếu có)
git remote remove origin

# Thêm remote mới
git remote add origin https://github.com/tramkkatram+a11y/QLNV.git

# Đổi branch
git branch -M main

# Thêm và commit
git add .
git commit -m "Update for deployment"

# Push
git push -u origin main
```

---

## 🆘 Xử lý lỗi

### Lỗi: "fatal: remote origin already exists"
```powershell
# Xóa remote cũ
git remote remove origin

# Thêm lại
git remote add origin https://github.com/tramkkatram+a11y/QLNV.git
```

### Lỗi: "Updates were rejected"
```powershell
# Force push (CẨNTRỌNG: Sẽ ghi đè lên remote)
git push -u origin main --force
```

### Lỗi: Authentication failed
- Đảm bảo dùng **Personal Access Token**, KHÔNG phải password GitHub
- Token phải có quyền `repo`

---

## ⏭️ Bước tiếp theo

Sau khi push thành công:
1. ✅ Code đã lên GitHub
2. 🗄️ Tiếp tục tạo database trên Aiven
3. 🚀 Deploy lên Render

Xem file: **HUONG_DAN_DEPLOY_NHANH.md** (Bước 2)
