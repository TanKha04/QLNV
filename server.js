const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const dbConfig = require('./db-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Tạo thư mục uploads/avatars nếu chưa tồn tại
const avatarDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Cấu hình multer để upload file Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + decodedName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Cấu hình multer riêng cho avatar (chỉ ảnh, tối đa 5MB)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const userId = req.session.userId || 'unknown';
    cb(null, `avatar_${userId}_${Date.now()}${ext}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});


// Kết nối database MySQL
const db = mysql.createPool(dbConfig);

// Tự động khởi tạo database khi server khởi động lần đầu
async function initializeDatabase() {
  let connection;
  try {
    connection = await db.promise().getConnection();
    console.log('Đã kết nối MySQL thành công.');

    // Tạo bảng users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(200),
        employee_id VARCHAR(50),
        department VARCHAR(200),
        position VARCHAR(200),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'
    `);

    // Thêm cột avatar_url nếu chưa có
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL`);
      console.log('✅ Đã thêm cột avatar_url vào bảng users');
    } catch (alterErr) {
      if (!String(alterErr.message).includes('Duplicate column')) {
        console.warn('⚠️ Không thể thêm cột avatar_url:', alterErr.message);
      }
    }

    // Thêm cột employee_id vào users nếu chưa có (cho phép liên kết với nhân viên)
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)`);
    } catch (e) { /* đã có */ }

    // Tạo bảng timesheets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        month INT NOT NULL,
        year INT NOT NULL,
        file_name VARCHAR(255),
        sheet_data LONGTEXT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo bảng timesheet_records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS timesheet_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timesheet_id INT NOT NULL,
        employee_id VARCHAR(50),
        employee_name VARCHAR(200),
        department VARCHAR(200),
        position VARCHAR(200),
        password VARCHAR(100),
        cccd VARCHAR(50),
        day_data LONGTEXT,
        raw_row LONGTEXT,
        headers LONGTEXT,
        total_work_days DECIMAL(10,2) DEFAULT 0,
        overtime_weekday DECIMAL(10,2) DEFAULT 0,
        overtime_weekend DECIMAL(10,2) DEFAULT 0,
        overtime_holiday DECIMAL(10,2) DEFAULT 0,
        night_shift DECIMAL(10,2) DEFAULT 0,
        total_salary DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE
      )
    `);

    // Tạo bảng salaries (bảng lương)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        month INT NOT NULL,
        year INT NOT NULL,
        file_name VARCHAR(255),
        uploaded_by INT,
        sheet_data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_salary_month_year (month, year)
      )
    `);

    // Tạo bảng salary_records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        salary_id INT NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        position VARCHAR(255),
        basic_salary DECIMAL(15,2) DEFAULT 0,
        allowances DECIMAL(15,2) DEFAULT 0,
        bonuses DECIMAL(15,2) DEFAULT 0,
        deductions DECIMAL(15,2) DEFAULT 0,
        total_salary DECIMAL(15,2) DEFAULT 0,
        password VARCHAR(255),
        cccd VARCHAR(50),
        notes TEXT,
        raw_data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (salary_id) REFERENCES salaries(id) ON DELETE CASCADE
      )
    `);

    // Tạo bảng support_messages để hỗ trợ chat/system admin
    await connection.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(100),
        sender_name VARCHAR(255),
        sender_role VARCHAR(50),
        receiver_id VARCHAR(100),
        message TEXT,
        image_url VARCHAR(500),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_support_messages_conversation (conversation_id),
        INDEX idx_support_messages_read (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tạo bảng notifications nếu chưa có
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        source VARCHAR(50) DEFAULT 'system',
        attachment_url VARCHAR(500) DEFAULT NULL,
        attachment_name VARCHAR(255) DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE notifications ADD COLUMN source VARCHAR(50) DEFAULT 'system'`);
    } catch (alterErr) {
      if (!String(alterErr.message).includes('Duplicate column')) {
        console.warn('⚠️ Không thể thêm cột source:', alterErr.message);
      }
    }

    try {
      await connection.query(`ALTER TABLE notifications ADD COLUMN attachment_url VARCHAR(500) DEFAULT NULL`);
    } catch (alterErr) {
      if (!String(alterErr.message).includes('Duplicate column')) {
        console.warn('⚠️ Không thể thêm cột attachment_url:', alterErr.message);
      }
    }

    try {
      await connection.query(`ALTER TABLE notifications ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL`);
    } catch (alterErr) {
      if (!String(alterErr.message).includes('Duplicate column')) {
        console.warn('⚠️ Không thể thêm cột attachment_name:', alterErr.message);
      }
    }

    // Tạo tài khoản admin mặc định nếu chưa có
    const [adminRows] = await connection.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
    if (adminRows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        `INSERT INTO users (username, password, full_name, role) VALUES ('admin', ?, 'Quản Trị Viên', 'admin')`,
        [hashedPassword]
      );
      console.log('✅ Đã tạo tài khoản admin mặc định (admin / admin123)');
    }

    // Tự động cập nhật tháng 6 cho các bảng công có tên file chứa THÁNG 06 / 06.2026
    await connection.query(`
      UPDATE timesheets 
      SET month = 6 
      WHERE (file_name LIKE '%06%' OR file_name LIKE '%THÁNG 6%') AND month != 6
    `);

    console.log('✅ Database đã sẵn sàng.');
  } catch (err) {
    console.error('Lỗi khởi tạo database:', err.message);
  } finally {
    if (connection) connection.release();
  }
}

initializeDatabase();


// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret: 'tra-cuu-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 60 * 1000, // 30 phút không hoạt động sẽ tự động logout
    httpOnly: true,
    secure: false, // Set to true if using HTTPS
    sameSite: 'lax'
  },
  rolling: true // Reset maxAge mỗi khi có request (activity)
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve avatar images
app.use('/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));

// API: Tra cứu thông tin người dùng (không cần đăng nhập)
app.post('/api/lookup', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng nhập tên đăng nhập' 
    });
  }

  const query = `
    SELECT id, username, full_name, employee_id, department, position, created_at 
    FROM users 
    WHERE username = ? AND role = 'user'
  `;

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Lỗi tra cứu:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin người dùng' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Tra cứu thành công',
      data: results[0] 
    });
  });
});

// API: Kiểm tra session hiện tại khi F5 / Tải lại trang
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId && !req.session.employeeId) {
    return res.json({ success: false, loggedIn: false });
  }

  if (req.session.employeeId) {
    return res.json({
      success: true,
      loggedIn: true,
      data: {
        id: req.session.employeeId,
        employee_id: req.session.employeeId,
        employee_name: req.session.employeeName,
        full_name: req.session.employeeName,
        role: 'user'
      }
    });
  }

  const userId = req.session.userId;
  db.query('SELECT id, username, full_name, role, department, position FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.json({ success: false, loggedIn: false });
    }
    const user = results[0];
    res.json({
      success: true,
      loggedIn: true,
      data: user
    });
  });
});

// API: Đăng xuất
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Đã đăng xuất' });
  });
});

// API: Đăng nhập (cho cả user và admin)
app.post('/api/login', (req, res) => {
  const { username, password, loginAsAdmin } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng nhập đầy đủ thông tin' 
    });
  }

  // Nếu đăng nhập với quyền admin, chỉ cho phép tài khoản admin
  const roleCondition = loginAsAdmin ? "AND role = 'admin'" : "";
  
  const query = `
    SELECT id, username, password, full_name, employee_id, role, department, position 
    FROM users 
    WHERE username = ? ${roleCondition}
  `;

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Lỗi đăng nhập:', err.message);
      const isMissingCloudDb = process.env.RENDER && !process.env.DB_HOST;
      return res.status(500).json({ 
        success: false, 
        message: isMissingCloudDb 
          ? 'Chưa cấu hình biến môi trường CSDL (DB_HOST) trên Render Dashboard' 
          : 'Lỗi kết nối CSDL (Vui lòng kiểm tra cấu hình MySQL)' 
      });
    }

    if (results.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: loginAsAdmin 
          ? 'Tài khoản không có quyền quản trị viên' 
          : 'Tên đăng nhập không tồn tại'
      });
    }

    const user = results[0];

    // Kiểm tra mật khẩu
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Lỗi kiểm tra mật khẩu:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Mật khẩu không chính xác' 
        });
      }

      // Lưu session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({ 
        success: true, 
        message: 'Đăng nhập thành công',
        data: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          employee_id: user.employee_id,
          role: user.role,
          department: user.department,
          position: user.position
        }
      });
    });
  });
});

// API: Lấy danh sách tất cả người dùng (chỉ admin)
app.get('/api/admin/users', (req, res) => {
  // Kiểm tra quyền admin
  const allowedAdminRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedAdminRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const query = `
    SELECT id, username, full_name, role, department, position, created_at 
    FROM users 
    ORDER BY created_at DESC
  `;

  db.query(query, [], (err, results) => {
    if (err) {
      console.error('Lỗi lấy danh sách:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
      });
    }

    res.json({ 
      success: true, 
      data: results 
    });
  });
});

// API: Đổi mật khẩu quản trị viên (chỉ admin)
app.post('/api/admin/change-password', (req, res) => {
  const allowedAdminRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedAdminRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  // Lấy thông tin user hiện tại từ database
  db.query('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn người dùng:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const user = results[0];

    // Kiểm tra mật khẩu hiện tại
    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
      if (err) {
        console.error('Lỗi so sánh mật khẩu:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }

      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
      }

      // Mã hóa mật khẩu mới
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Lỗi mã hóa mật khẩu:', err.message);
          return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }

        // Cập nhật mật khẩu trong DB
        db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId], (err, result) => {
          if (err) {
            console.error('Lỗi cập nhật mật khẩu:', err.message);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
          }

          res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
        });
      });
    });
  });
});

// ============= API HỒ SƠ CÁ NHÂN QUẢN TRỊ VIÊN =============

// API: Lấy thông tin hồ sơ cá nhân của admin đang đăng nhập
app.get('/api/admin/my-profile', (req, res) => {
  const allowedRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  db.query(
    'SELECT id, username, full_name, employee_id, department, position, role, avatar_url, created_at FROM users WHERE id = ?',
    [req.session.userId],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      if (results.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      res.json({ success: true, data: results[0] });
    }
  );
});

// API: Cập nhật thông tin hồ sơ cá nhân
app.post('/api/admin/update-profile', (req, res) => {
  const allowedRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  const { full_name, employee_id, department, position } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ success: false, message: 'Họ và tên không được để trống' });
  }

  db.query(
    'UPDATE users SET full_name = ?, employee_id = ?, department = ?, position = ? WHERE id = ?',
    [full_name.trim(), employee_id || '', department || '', position || '', req.session.userId],
    (err) => {
      if (err) {
        console.error('Lỗi cập nhật hồ sơ:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
      res.json({ success: true, message: 'Đã cập nhật thông tin hồ sơ thành công!' });
    }
  );
});

// API: Đổi mật khẩu có xác minh mật khẩu hiện tại
app.post('/api/admin/change-password-secure', (req, res) => {
  const allowedRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  db.query('SELECT password FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    bcrypt.compare(current_password, results[0].password, (err, isMatch) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      if (!isMatch) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });

      bcrypt.hash(new_password, 10, (err, hashed) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi mã hóa mật khẩu' });

        db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.userId], (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Lỗi lưu mật khẩu' });
          res.json({ success: true, message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
        });
      });
    });
  });
});

// API: Upload avatar
app.post('/api/admin/upload-avatar', uploadAvatar.single('avatar'), (req, res) => {
  const allowedRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
  }

  const avatarUrl = '/avatars/' + req.file.filename;

  // Xóa avatar cũ nếu có
  db.query('SELECT avatar_url FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    if (!err && results.length > 0 && results[0].avatar_url) {
      const oldFile = path.join(__dirname, 'uploads', 'avatars', path.basename(results[0].avatar_url));
      if (fs.existsSync(oldFile)) {
        fs.unlink(oldFile, () => {});
      }
    }

    db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.session.userId], (err) => {
      if (err) {
        console.error('Lỗi lưu avatar:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi lưu ảnh đại diện' });
      }
      res.json({ success: true, message: 'Đã cập nhật ảnh đại diện!', avatar_url: avatarUrl });
    });
  });
});

// API: Lấy danh sách quản trị viên (chỉ system_admin / admin xem được)
app.get('/api/admin/list-managers', (req, res) => {
  const allowedRoles = ['admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  db.query(
    `SELECT id, username, full_name, employee_id, department, position, role, avatar_url, created_at
     FROM users
     WHERE role IN ('timesheet_admin', 'salary_admin', 'admin', 'system_admin')
     ORDER BY FIELD(role, 'system_admin', 'admin', 'timesheet_admin', 'salary_admin'), full_name`,
    [],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      res.json({ success: true, data: results });
    }
  );
});

// API: Tự cập nhật tài khoản (tương thích ngược)
app.post('/api/admin/self-update-account', (req, res) => {
  const allowedRoles = ['admin', 'system_admin', 'timesheet_admin', 'salary_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }

  const { full_name, new_password } = req.body;

  if (!full_name) {
    return res.status(400).json({ success: false, message: 'Họ tên không được để trống' });
  }

  const doUpdate = (hashedPwd) => {
    const fields = hashedPwd
      ? 'full_name = ?, password = ?'
      : 'full_name = ?';
    const params = hashedPwd
      ? [full_name, hashedPwd, req.session.userId]
      : [full_name, req.session.userId];

    db.query(`UPDATE users SET ${fields} WHERE id = ?`, params, (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
      res.json({ success: true, message: 'Cập nhật thành công!' });
    });
  };

  if (new_password) {
    bcrypt.hash(new_password, 10, (err, hashed) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi mã hóa' });
      doUpdate(hashed);
    });
  } else {
    doUpdate(null);
  }
});

// API: Xóa người dùng (chỉ admin)
app.delete('/api/admin/user/:id', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
  }

  const userId = req.params.id;
  
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Lỗi xóa người dùng:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
    res.json({ success: true, message: 'Đã xóa người dùng' });
  });
});

// ============= API ĐĂNG NHẬP NHÂN VIÊN (từ file Excel) =============

// API: Nhân viên hoặc Admin đăng nhập bằng MSNV / Tài khoản + Mật Khẩu
app.post('/api/employee/login', (req, res) => {
  const { employee_id, password } = req.body;

  if (!employee_id || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập MSNV/Tài khoản và Mật khẩu' });
  }

  // 1. Kiểm tra tài khoản trong bảng users trước
  const userQuery = `
    SELECT id, username, password, full_name, role, department, position 
    FROM users 
    WHERE username = ? OR employee_id = ?
  `;

  db.query(userQuery, [employee_id, employee_id], (err, userResults) => {
    if (!err && userResults.length > 0) {
      const dbUser = userResults[0];

      bcrypt.compare(password, dbUser.password, (err, isMatch) => {
        if (!err && isMatch) {
          req.session.userId = dbUser.id;
          req.session.username = dbUser.username;
          req.session.role = dbUser.role;

          return res.json({
            success: true,
            isAdmin: dbUser.role !== 'user',
            message: 'Đăng nhập thành công',
            data: {
              id: dbUser.id,
              username: dbUser.username,
              employee_id: dbUser.username,
              employee_name: dbUser.full_name,
              full_name: dbUser.full_name,
              role: dbUser.role,
              department: dbUser.department,
              position: dbUser.position
            }
          });
        }
        
        checkTimesheetEmployee();
      });
    } else {
      checkTimesheetEmployee();
    }
  });

  function checkTimesheetEmployee() {
    const timesheetQuery = `
      SELECT tr.*, t.month, t.year
      FROM timesheet_records tr
      JOIN timesheets t ON tr.timesheet_id = t.id
      WHERE tr.employee_id = ?
      ORDER BY t.year DESC, t.month DESC
    `;

    const salaryQuery = `
      SELECT sr.*, s.month, s.year
      FROM salary_records sr
      JOIN salaries s ON sr.salary_id = s.id
      WHERE sr.employee_id = ?
      ORDER BY s.year DESC, s.month DESC
    `;

    db.query(timesheetQuery, [employee_id], (err, tsRecords) => {
      if (err) {
        console.error('Lỗi đăng nhập nhân viên:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }

      db.query(salaryQuery, [employee_id], (err2, salRecords) => {
        if (err2) {
          console.error('Lỗi đăng nhập nhân viên:', err2.message);
          return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }

        if (tsRecords.length === 0 && salRecords.length === 0) {
          return res.status(401).json({ success: false, message: 'Tài khoản / MSNV không tồn tại trong hệ thống' });
        }

        const allRecords = [...tsRecords, ...salRecords];
        const matched = allRecords.find(r => r.password && String(r.password).trim() === String(password).trim());

        if (!matched) {
          return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        req.session.employeeId = employee_id;
        req.session.employeeName = matched.employee_name;
        req.session.role = 'employee';

        res.json({
          success: true,
          isAdmin: false,
          message: 'Đăng nhập thành công',
          data: {
            employee_id: matched.employee_id,
            employee_name: matched.employee_name,
            full_name: matched.employee_name,
            department: matched.department,
            position: matched.position,
            role: 'employee'
          }
        });
      });
    });
  }
});

// API: Lấy tất cả bảng công của nhân viên đang đăng nhập
app.get('/api/employee/my-timesheets', (req, res) => {
  if (!req.session.employeeId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  }

  const query = `
    SELECT tr.*, t.month, t.year, t.sheet_data
    FROM timesheet_records tr
    JOIN timesheets t ON tr.timesheet_id = t.id
    WHERE tr.employee_id = ?
    ORDER BY t.year DESC, t.month DESC
  `;

  db.query(query, [req.session.employeeId], (err, records) => {
    if (err) {
      console.error('Lỗi lấy bảng công:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    const parsed = records.map(record => {
      let dayData = {};
      try { dayData = JSON.parse(record.day_data); } catch(e) {}

      let sheetHeaders = [];
      try {
        if (record.sheet_data) {
          const sd = JSON.parse(record.sheet_data);
          // Lấy dòng header chứa số ngày (TC/PT row)
          sheetHeaders = sd.slice(0, 12);
        }
      } catch(e) {}
      delete record.sheet_data;

      return { ...record, day_data: dayData, sheet_headers: sheetHeaders };
    });

    res.json({ success: true, data: parsed });
  });
});

// API: Lấy tất cả bảng lương của nhân viên đang đăng nhập
app.get('/api/employee/my-salaries', (req, res) => {
  if (!req.session.employeeId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  }

  const query = `
    SELECT sr.*, s.month, s.year, s.sheet_data
    FROM salary_records sr
    JOIN salaries s ON sr.salary_id = s.id
    WHERE sr.employee_id = ?
    ORDER BY s.year DESC, s.month DESC
  `;

  db.query(query, [req.session.employeeId], (err, records) => {
    if (err) {
      console.error('Lỗi lấy bảng lương:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    const parsed = records.map(record => {
      let headers = [];
      try {
        if (record.sheet_data) {
          const sd = JSON.parse(record.sheet_data);
          headers = extractSalarySheetHeaders(sd);
        }
      } catch (e) {}

      let rawRow = null;
      try {
        rawRow = record.raw_data ? JSON.parse(record.raw_data) : null;
      } catch (e) {}

      delete record.sheet_data;
      return { ...record, headers, raw_row: rawRow };
    });

    res.json({ success: true, data: parsed });
  });
});

// API: Kiểm tra session nhân viên
app.get('/api/employee/check-session', (req, res) => {
  if (req.session.employeeId) {
    res.json({
      loggedIn: true,
      employee_id: req.session.employeeId,
      employee_name: req.session.employeeName
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Hàm tạo thông báo khi Quản trị viên thay đổi thông tin nhân viên
function createNotification(db, employee_id, title, message, type = 'info', attachmentUrl = null, attachmentName = null) {
  if (!employee_id) return;
  const sql = `INSERT INTO notifications (employee_id, title, message, type, attachment_url, attachment_name) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [employee_id, title, message, type, attachmentUrl, attachmentName], (err) => {
    if (err) console.error('Lỗi tạo thông báo:', err.message);
  });
}

function notifyEmployeesForTimesheet(db, timesheetId, title, message, type = 'timesheet_update') {
  if (!timesheetId) return;
  db.query('SELECT DISTINCT employee_id FROM timesheet_records WHERE timesheet_id = ? AND employee_id IS NOT NULL AND employee_id != ""', [timesheetId], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(r => {
      createNotification(db, r.employee_id, title, message, type);
    });
  });
}

function notifyEmployeesForSalary(db, salaryId, title, message, type = 'salary_update') {
  if (!salaryId) return;
  db.query('SELECT DISTINCT employee_id FROM salary_records WHERE salary_id = ? AND employee_id IS NOT NULL AND employee_id != ""', [salaryId], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(r => {
      createNotification(db, r.employee_id, title, message, type);
    });
  });
}

// API: Lấy thông báo của nhân viên đang đăng nhập (CHỈ LẤY THÔNG BÁO GỬI TỪ FORM GỬI THÔNG BÁO)
app.get('/api/employee/notifications', (req, res) => {
  if (!req.session.employeeId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  }

  const query = `
    SELECT id, employee_id, title, message, type, attachment_url, attachment_name, is_read, created_at
    FROM notifications 
    WHERE employee_id = ? AND source = 'broadcast'
    ORDER BY created_at DESC 
    LIMIT 50
  `;

  db.query(query, [req.session.employeeId], (err, results) => {
    if (err) {
      console.error('Lỗi lấy thông báo:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    const unreadCount = results.filter(n => !n.is_read).length;
    res.json({
      success: true,
      unread_count: unreadCount,
      data: results
    });
  });
});

// API: Đánh dấu tất cả thông báo broadcast đã đọc
app.post('/api/employee/notifications/read', (req, res) => {
  if (!req.session.employeeId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  }

  const query = `UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND source = 'broadcast'`;

  db.query(query, [req.session.employeeId], (err) => {
    if (err) {
      console.error('Lỗi cập nhật thông báo:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
  });
});

// API: Đăng xuất nhân viên
app.post('/api/employee/logout', (req, res) => {
  req.session.employeeId = null;
  req.session.employeeName = null;
  res.json({ success: true });
});

// ============= API BẢNG CÔNG =============

// API: Upload file Excel bảng công (chỉ admin)
app.post('/api/admin/upload-timesheet', upload.single('file'), (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Phiên đăng nhập đã hết hạn do server vừa cập nhật. Vui lòng nhấn nút Đăng Xuất ở góc trái và đăng nhập lại!' 
    });
  }

  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: `Tài khoản '${req.session.username}' không có quyền tải lên file này.` 
    });
  }

  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng chọn file Excel' 
    });
  }

  try {
    // Đọc file Excel - bật cellDates để tự động chuyển serial ngày thành Date object
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    
    // Chuyển đổi Date objects thành chuỗi dd/mm/yyyy (dùng UTC để tránh lỗi timezone)
    const data = rawData.map(row =>
      Array.isArray(row)
        ? row.map(cell => {
            if (cell instanceof Date && !isNaN(cell)) {
              const d = String(cell.getUTCDate()).padStart(2, '0');
              const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
              const y = cell.getUTCFullYear();
              return `${d}/${m}/${y}`;
            }
            return cell;
          })
        : row
    );

    // Lưu tên file gốc
    const decodedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    // Parse dữ liệu từ Excel (truyền cả tên file để hỗ trợ bóc tách tháng/năm)
    const parsedData = parseTimesheetData(data, decodedOriginalName);
    
    if (!parsedData.month || !parsedData.year) {
      fs.unlinkSync(req.file.path); // Xóa file
      return res.status(400).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin tháng/năm trong file Excel' 
      });
    }
    saveTimesheetToDatabase(parsedData, decodedOriginalName, req.session.userId, (err, result) => {
      if (err) {
        console.error('Lỗi lưu bảng công:', err);
        fs.unlinkSync(req.file.path); // Xóa file
        return res.status(500).json({ 
          success: false, 
          message: err.message || 'Lỗi khi lưu bảng công' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Upload bảng công thành công',
        data: result
      });
    });

  } catch (error) {
    console.error('Lỗi xử lý file:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xử lý file Excel: ' + error.message 
    });
  }
});

// API: Replace file Excel bảng công (admin)
app.post('/api/admin/replace-timesheet/:id', upload.single('file'), (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
  }

  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thay thế file này' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    const data = rawData.map(row => Array.isArray(row) ? row.map(cell => {
      if (cell instanceof Date && !isNaN(cell)) {
        const d = String(cell.getUTCDate()).padStart(2, '0');
        const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
        const y = cell.getUTCFullYear();
        return `${d}/${m}/${y}`;
      }
      return cell;
    }) : row);

    const decodedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const parsedData = parseTimesheetData(data, decodedOriginalName);

    db.query('SELECT month, year FROM timesheets WHERE id = ?', [req.params.id], (err, rows) => {
      if (err || !rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bảng công để thay thế' });
      }

      const targetMonth = parsedData.month || rows[0].month;
      const targetYear = parsedData.year || rows[0].year;
      parsedData.month = targetMonth;
      parsedData.year = targetYear;

      db.query('UPDATE timesheets SET month = ?, year = ?, file_name = ?, sheet_data = ?, uploaded_by = ? WHERE id = ?', [targetMonth, targetYear, decodedOriginalName, JSON.stringify(data), req.session.userId, req.params.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, message: 'Lỗi cập nhật bảng công' });
        }
        db.query('DELETE FROM timesheet_records WHERE timesheet_id = ?', [req.params.id], (delErr) => {
          if (delErr) {
            return res.status(500).json({ success: false, message: 'Lỗi xoá dữ liệu cũ' });
          }
          insertRecords(req.params.id, parsedData, decodedOriginalName, req.session.userId, (insertErr, result) => {
            if (insertErr) {
              return res.status(500).json({ success: false, message: insertErr.message || 'Lỗi cập nhật dữ liệu mới' });
            }
            res.json({ success: true, message: 'Thay thế file bảng công thành công', data: result });
          });
        });
      });
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel: ' + error.message });
  }
});

// API: Lấy danh sách các bảng công (chỉ admin)
app.get('/api/admin/timesheets', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const query = `
    SELECT t.*, u.full_name as uploader_name,
           (SELECT COUNT(*) FROM timesheet_records WHERE timesheet_id = t.id) as employee_count
    FROM timesheets t
    LEFT JOIN users u ON t.uploaded_by = u.id
    ORDER BY t.year DESC, t.month DESC
  `;

  db.query(query, [], (err, results) => {
    if (err) {
      console.error('Lỗi lấy danh sách bảng công:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
      });
    }

    res.json({ 
      success: true, 
      data: results 
    });
  });
});

// API: Lấy chi tiết bảng công theo ID (admin)
app.get('/api/admin/timesheet/:id', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const timesheetId = req.params.id;

  // Lấy thông tin bảng công
  db.query('SELECT * FROM timesheets WHERE id = ?', [timesheetId], (err, timesheetResults) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
      });
    }

    if (timesheetResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bảng công' 
      });
    }

    const timesheet = timesheetResults[0];

    // Parse sheet_data (full raw Excel data) để trả về cho frontend
    let parsedSheetData = null;
    if (timesheet.sheet_data) {
      try { parsedSheetData = JSON.parse(timesheet.sheet_data); } catch(e) {}
    }

    // Lấy chi tiết records
    db.query('SELECT * FROM timesheet_records WHERE timesheet_id = ? ORDER BY employee_name', 
      [timesheetId], 
      (err, records) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống' 
          });
        }

        // Parse day_data từ JSON string (an toàn với null)
        records = records.map(record => ({
          ...record,
          day_data: record.day_data ? (() => { try { return JSON.parse(record.day_data); } catch(e) { return {}; } })() : {}
        }));

        res.json({ 
          success: true, 
          data: {
            timesheet,
            sheet_data: parsedSheetData,
            records
          }
        });
      }
    );
  });
});

// API: Cập nhật record trong bảng công (admin)
app.put('/api/admin/timesheet-record/:id', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const recordId = req.params.id;
  const { day_data, total_work_days, overtime_weekday, overtime_weekend, overtime_holiday, night_shift, total_salary, password, cccd, notes } = req.body;

  db.query('SELECT tr.employee_id, tr.employee_name, t.month, t.year FROM timesheet_records tr JOIN timesheets t ON tr.timesheet_id = t.id WHERE tr.id = ?', [recordId], (err, recRows) => {
    const query = `
      UPDATE timesheet_records 
      SET day_data = ?, 
          total_work_days = ?, 
          overtime_weekday = ?,
          overtime_weekend = ?,
          overtime_holiday = ?,
          night_shift = ?,
          total_salary = ?,
          password = ?,
          cccd = ?,
          notes = ?
      WHERE id = ?
    `;

    db.query(query, [
      JSON.stringify(day_data),
      total_work_days,
      overtime_weekday,
      overtime_weekend,
      overtime_holiday,
      night_shift,
      total_salary,
      password,
      cccd,
      notes,
      recordId
    ], (err, result) => {
      if (err) {
        console.error('Lỗi cập nhật record:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      if (recRows && recRows.length > 0) {
        const { employee_id, employee_name, month, year } = recRows[0];
        if (employee_id) {
          createNotification(
            db,
            employee_id,
            `📊 Quản trị viên Bảng Chấm Công điều chỉnh dữ liệu của bạn`,
            `Chi tiết điều chỉnh từ Quản trị viên Bảng Chấm Công cho Tháng ${String(month).padStart(2, '0')}/${year} (Nhân viên: ${employee_name || ''}, MSNV: ${employee_id}): Tổng ngày công: ${total_work_days || 0} công, Tăng ca ngày thường: ${overtime_weekday || 0}h, Tăng ca cuối tuần: ${overtime_weekend || 0}h, Tăng ca lễ: ${overtime_holiday || 0}h, Ca đêm: ${night_shift || 0}h.`,
            'timesheet_update'
          );
        }
      }

      res.json({ 
        success: true, 
        message: 'Cập nhật thành công' 
      });
    });
  });
});

// API: Cập nhật tên file bảng công (admin)
app.put('/api/admin/timesheet/:id/rename', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const timesheetId = req.params.id;
  const { file_name } = req.body;

  if (!file_name || file_name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng nhập tên bảng công' 
    });
  }

  // Trích xuất tháng/năm từ tên file mới
  let extractedMonth = null;
  let extractedYear = null;

  const fileName = file_name.trim();
  
  // Pattern: 07_2026, 07.2026, 07/2026, tháng 07, tháng 7, v.v.
  const monthMatch = fileName.match(/(?:tháng\s+|thang\s+)?0?([1-9]|1[0-2])(?:[_./\s])?0?(20\d{2})?/i);
  if (monthMatch) {
    extractedMonth = parseInt(monthMatch[1], 10);
    if (monthMatch[2]) {
      extractedYear = parseInt(monthMatch[2], 10);
    }
  }
  
  // Nếu chưa tìm được năm, thử tìm năm riêng
  if (!extractedYear) {
    const yearMatch = fileName.match(/(20\d{2})/);
    if (yearMatch) {
      extractedYear = parseInt(yearMatch[1], 10);
    }
  }

  db.query('SELECT month, year FROM timesheets WHERE id = ?', [timesheetId], (err, tsRows) => {
    const month = extractedMonth || (tsRows && tsRows[0] ? tsRows[0].month : '');
    const year = extractedYear || (tsRows && tsRows[0] ? tsRows[0].year : '');

    // Cập nhật database
    let updateQuery = 'UPDATE timesheets SET file_name = ?';
    let updateParams = [fileName];

    if (extractedMonth && extractedYear) {
      updateQuery += ', month = ?, year = ?';
      updateParams.push(extractedMonth, extractedYear);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(timesheetId);

    db.query(updateQuery, updateParams, (err, result) => {
      if (err) {
        console.error('Lỗi cập nhật tên bảng công:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy bảng công' 
        });
      }

      notifyEmployeesForTimesheet(
        db,
        timesheetId,
        `📊 Quản trị viên Bảng Chấm Công đổi tên Bảng Công Tháng ${month}/${year}`,
        `Chi tiết thay đổi từ Quản trị viên Bảng Chấm Công: Bảng Chấm Công Tháng ${month}/${year} vừa được đổi tên thành "${fileName}".`,
        'timesheet_update'
      );

      res.json({ 
        success: true, 
        message: 'Đã cập nhật tên bảng công thành công',
        data: {
          month: extractedMonth,
          year: extractedYear
        }
      });
    });
  });
});

// API: Xóa bảng công (admin)
app.delete('/api/admin/timesheet/:id', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const timesheetId = req.params.id;

  db.query('SELECT month, year FROM timesheets WHERE id = ?', [timesheetId], (err, tsRows) => {
    const month = tsRows && tsRows[0] ? tsRows[0].month : '';
    const year = tsRows && tsRows[0] ? tsRows[0].year : '';

    notifyEmployeesForTimesheet(
      db,
      timesheetId,
      `📊 Quản trị viên Bảng Chấm Công gỡ Bảng Công Tháng ${month}/${year}`,
      `Chi tiết thay đổi từ Quản trị viên Bảng Chấm Công: Dữ liệu Bảng Chấm Công Tháng ${month}/${year} đã được Quản trị viên gỡ khỏi hệ thống.`,
      'timesheet_update'
    );

    db.query('DELETE FROM timesheets WHERE id = ?', [timesheetId], (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Đã xóa bảng công' 
      });
    });
  });
});

// API: Cập nhật trực tiếp sheet_data của bảng công (admin)
app.put('/api/admin/timesheet/:id/sheet-data', (req, res) => {
  const allowedRoles = ['timesheet_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const timesheetId = req.params.id;
  const { sheet_data } = req.body;

  if (!sheet_data || !Array.isArray(sheet_data)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }

  // Cập nhật sheet_data trong bảng timesheets
  db.query('UPDATE timesheets SET sheet_data = ? WHERE id = ?', [JSON.stringify(sheet_data), timesheetId], (err) => {
    if (err) {
      console.error('Lỗi cập nhật sheet_data:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    try {
      // Re-parse dữ liệu nhân viên từ sheet_data mới
      const parsedData = parseTimesheetData(sheet_data);

      // Xóa records cũ và chèn lại records mới
      db.query('DELETE FROM timesheet_records WHERE timesheet_id = ?', [timesheetId], (err) => {
        if (err) {
          console.error('Lỗi xóa records cũ:', err);
          return res.json({ success: true, message: 'Đã lưu sheet_data' });
        }

        insertRecords(timesheetId, parsedData, null, req.session.userId, (err) => {
          if (err) {
            console.error('Lỗi chèn records mới:', err);
            return res.json({ success: true, message: 'Đã lưu sheet_data' });
          }

          res.json({ success: true, message: 'Đã tự động lưu thành công' });
        });
      });
    } catch (parseError) {
      console.error('Lỗi parse sheet_data mới:', parseError);
      res.json({ success: true, message: 'Đã lưu thay đổi' });
    }
  });
});

// API: User xem bảng công của mình
app.get('/api/user/my-timesheet', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Vui lòng đăng nhập' 
    });
  }

  const { month, year } = req.query;

  // Lấy employee_id của user
  db.query('SELECT employee_id, full_name FROM users WHERE id = ?', [req.session.userId], (err, userResults) => {
    if (err || userResults.length === 0 || !userResults[0].employee_id) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin nhân viên' 
      });
    }

    const user = userResults[0];

    let query = `
      SELECT tr.*, t.month, t.year, t.sheet_data
      FROM timesheet_records tr
      JOIN timesheets t ON tr.timesheet_id = t.id
      WHERE tr.employee_id = ?
    `;

    const params = [user.employee_id];

    if (month && year) {
      query += ' AND t.month = ? AND t.year = ?';
      params.push(month, year);
    }

    query += ' ORDER BY t.year DESC, t.month DESC';

    db.query(query, params, (err, records) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      // Parse day_data and raw_row, and extract headers from sheet_data
      records = records.map(record => {
        let headers = [];
        if (record.sheet_data) {
          try {
            const sheetData = JSON.parse(record.sheet_data);
            headers = sheetData.slice(0, 15); // Only take top 15 rows for headers
          } catch(e) {}
        }
        delete record.sheet_data; // Don't send huge data to client
        
        return {
          ...record,
          day_data: JSON.parse(record.day_data),
          raw_row: record.raw_row ? JSON.parse(record.raw_row) : null,
          headers
        };
      });

      res.json({ 
        success: true, 
        data: records 
      });
    });
  });
});

// API: Đăng xuất
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi đăng xuất' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Đã đăng xuất thành công' 
    });
  });
});

// API: Kiểm tra trạng thái đăng nhập
app.get('/api/check-session', (req, res) => {
  if (req.session.userId) {
    db.query('SELECT id, username, full_name, employee_id, role FROM users WHERE id = ?', [req.session.userId], (err, results) => {
      if (err || results.length === 0) {
        return res.json({ loggedIn: false });
      }
      const user = results[0];
      res.json({ 
        loggedIn: true, 
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        employee_id: user.employee_id,
        id: user.id
      });
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ============= API BẢNG LƯƠNG (SALARIES) =============

// API: Upload file Excel bảng lương (admin)
app.post('/api/admin/upload-salary', upload.single('file'), (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Phiên đăng nhập đã hết hạn do server vừa cập nhật. Vui lòng nhấn nút Đăng Xuất ở góc trái và đăng nhập lại!' 
    });
  }

  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: `Tài khoản '${req.session.username}' không có quyền tải lên file này.` 
    });
  }

  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng chọn file Excel' 
    });
  }

  try {
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    
    const data = rawData.map(row =>
      Array.isArray(row)
        ? row.map(cell => {
            if (cell instanceof Date && !isNaN(cell)) {
              const d = String(cell.getUTCDate()).padStart(2, '0');
              const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
              const y = cell.getUTCFullYear();
              return `${d}/${m}/${y}`;
            }
            return cell;
          })
        : row
    );

    const decodedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const parsedData = parseSalaryData(data, decodedOriginalName);
    
    if (!parsedData.month || !parsedData.year) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin tháng/năm trong file Excel' 
      });
    }

    saveSalaryToDatabase(parsedData, decodedOriginalName, req.session.userId, (err, result) => {
      if (err) {
        console.error('Lỗi lưu bảng lương:', err);
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ 
          success: false, 
          message: err.message || 'Lỗi khi lưu bảng lương' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Upload bảng lương thành công',
        data: result
      });
    });

  } catch (error) {
    console.error('Lỗi xử lý file:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xử lý file Excel: ' + error.message 
    });
  }
});

// API: Replace file Excel bảng lương (admin)
app.post('/api/admin/replace-salary/:id', upload.single('file'), (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
  }

  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thay thế file này' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    const data = rawData.map(row => Array.isArray(row) ? row.map(cell => {
      if (cell instanceof Date && !isNaN(cell)) {
        const d = String(cell.getUTCDate()).padStart(2, '0');
        const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
        const y = cell.getUTCFullYear();
        return `${d}/${m}/${y}`;
      }
      return cell;
    }) : row);

    const decodedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const parsedData = parseSalaryData(data, decodedOriginalName);

    db.query('SELECT month, year FROM salaries WHERE id = ?', [req.params.id], (err, rows) => {
      if (err || !rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bảng lương để thay thế' });
      }

      const targetMonth = parsedData.month || rows[0].month;
      const targetYear = parsedData.year || rows[0].year;
      parsedData.month = targetMonth;
      parsedData.year = targetYear;

      db.query('UPDATE salaries SET month = ?, year = ?, file_name = ?, sheet_data = ?, uploaded_by = ? WHERE id = ?', [targetMonth, targetYear, decodedOriginalName, JSON.stringify(data), req.session.userId, req.params.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, message: 'Lỗi cập nhật bảng lương' });
        }
        db.query('DELETE FROM salary_records WHERE salary_id = ?', [req.params.id], (delErr) => {
          if (delErr) {
            return res.status(500).json({ success: false, message: 'Lỗi xoá dữ liệu cũ' });
          }
          insertSalaryRecords(req.params.id, parsedData, decodedOriginalName, req.session.userId, (insertErr, result) => {
            if (insertErr) {
              return res.status(500).json({ success: false, message: insertErr.message || 'Lỗi cập nhật dữ liệu mới' });
            }
            res.json({ success: true, message: 'Thay thế file bảng lương thành công', data: result });
          });
        });
      });
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel: ' + error.message });
  }
});

// API: Lấy danh sách bảng lương (admin)
app.get('/api/admin/salaries', (req, res) => {
  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const query = `
    SELECT s.*, u.full_name as uploader_name,
           (SELECT COUNT(*) FROM salary_records WHERE salary_id = s.id) as employee_count
    FROM salaries s
    LEFT JOIN users u ON s.uploaded_by = u.id
    ORDER BY s.year DESC, s.month DESC
  `;

  db.query(query, [], (err, results) => {
    if (err) {
      console.error('Lỗi lấy danh sách bảng lương:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
      });
    }

    res.json({ 
      success: true, 
      data: results 
    });
  });
});

// API: Lấy chi tiết bảng lương theo ID (Read-only cho QTV Hệ Thống & QTV Bảng Lương)
app.get('/api/admin/salary/:id', (req, res) => {
  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
  }

  const salaryId = req.params.id;

  db.query('SELECT * FROM salaries WHERE id = ?', [salaryId], (err, salaryResults) => {
    if (err || salaryResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng lương' });
    }

    const salary = salaryResults[0];

    db.query('SELECT * FROM salary_records WHERE salary_id = ? ORDER BY employee_name', [salaryId], (err, records) => {
      let parsedSheetData = null;
      if (salary.sheet_data) {
        try {
          parsedSheetData = JSON.parse(salary.sheet_data);
        } catch (e) {}
      }

      res.json({
        success: true,
        data: {
          salary,
          records: records || [],
          sheet_data: parsedSheetData
        }
      });
    });
  });
});

// API: Cập nhật trực tiếp sheet_data của bảng lương (admin)
app.put('/api/admin/salary/:id/sheet-data', (req, res) => {
  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const salaryId = req.params.id;
  const { sheet_data } = req.body;

  if (!sheet_data || !Array.isArray(sheet_data)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }

  db.query('UPDATE salaries SET sheet_data = ? WHERE id = ?', [JSON.stringify(sheet_data), salaryId], (err) => {
    if (err) {
      console.error('Lỗi cập nhật sheet_data bảng lương:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }

    try {
      const parsedData = parseSalaryData(sheet_data);
      db.query('DELETE FROM salary_records WHERE salary_id = ?', [salaryId], (err) => {
        if (err) {
          console.error('Lỗi xóa records cũ bảng lương:', err);
          return res.json({ success: true, message: 'Đã lưu sheet_data' });
        }

        insertSalaryRecords(salaryId, parsedData, null, req.session.userId, (insertErr) => {
          if (insertErr) {
            console.error('Lỗi chèn records mới bảng lương:', insertErr);
            return res.json({ success: true, message: 'Đã lưu sheet_data' });
          }

          res.json({ success: true, message: 'Đã tự động lưu thành công' });
        });
      });
    } catch (parseError) {
      console.error('Lỗi parse sheet_data mới bảng lương:', parseError);
      res.json({ success: true, message: 'Đã lưu thay đổi' });
    }
  });
});

// API: Xóa bảng lương (admin)
app.delete('/api/admin/salary/:id', (req, res) => {
  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const salaryId = req.params.id;

  db.query('SELECT month, year FROM salaries WHERE id = ?', [salaryId], (err, sRows) => {
    const month = sRows && sRows[0] ? sRows[0].month : '';
    const year = sRows && sRows[0] ? sRows[0].year : '';

    notifyEmployeesForSalary(
      db,
      salaryId,
      `💰 Quản trị viên Bảng Lương gỡ Bảng Lương Tháng ${month}/${year}`,
      `Chi tiết thay đổi từ Quản trị viên Bảng Lương: Dữ liệu Bảng Lương Tháng ${month}/${year} đã được Quản trị viên gỡ khỏi hệ thống.`,
      'salary_update'
    );

    db.query('DELETE FROM salaries WHERE id = ?', [salaryId], (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi hệ thống' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Đã xóa bảng lương' 
      });
    });
  });
});

// API: Cập nhật tên file bảng lương (admin)
app.put('/api/admin/salary/:id/rename', (req, res) => {
  const allowedRoles = ['salary_admin', 'admin', 'system_admin'];
  if (!req.session.userId || !allowedRoles.includes(req.session.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const salaryId = req.params.id;
  const { file_name } = req.body;

  if (!file_name || file_name.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Vui lòng nhập tên bảng lương' 
    });
  }

  const fileName = file_name.trim();

  db.query('SELECT month, year FROM salaries WHERE id = ?', [salaryId], (err, sRows) => {
    const month = sRows && sRows[0] ? sRows[0].month : '';
    const year = sRows && sRows[0] ? sRows[0].year : '';

    db.query('UPDATE salaries SET file_name = ? WHERE id = ?', [fileName, salaryId], (err, result) => {
      if (err) {
        console.error('Lỗi cập nhật tên bảng lương:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }

      notifyEmployeesForSalary(
        db,
        salaryId,
        `💰 Quản trị viên Bảng Lương đổi tên Bảng Lương Tháng ${month}/${year}`,
        `Chi tiết thay đổi từ Quản trị viên Bảng Lương: Bảng Lương Tháng ${month}/${year} vừa được cập nhật tên mới thành "${fileName}".`,
        'salary_update'
      );

      res.json({ success: true, message: 'Đã cập nhật tên bảng lương thành công' });
    });
  });
});


// Route mặc định - serve trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= HELPER FUNCTIONS =============

function parseTimesheetData(data, filename = '') {
  const result = {
    month: null,
    year: null,
    raw_data: data,
    records: []
  };

  let headerRowIndex = -1;
  let dayStartCol = -1;
  let nameCol = 1;
  let deptCol = 2;
  let positionCol = 3;
  let passwordCol = -1;
  let cccdCol = -1;

  let extractedMonth = null;
  let extractedYear = null;

  // Trích xuất tháng/năm từ tên file TRƯỚC (độ ưu tiên cao hơn)
  if (filename) {
    // Pattern: 07_2026, 07.2026, 07/2026, tháng 07, tháng 7, v.v.
    const fileMonthMatch = filename.match(/(?:tháng\s+|thang\s+)?0?([1-9]|1[0-2])(?:[_./\s])?0?(20\d{2})?/i);
    if (fileMonthMatch) {
      extractedMonth = parseInt(fileMonthMatch[1], 10);
      if (fileMonthMatch[2]) {
        extractedYear = parseInt(fileMonthMatch[2], 10);
      }
    }
    
    // Nếu chưa tìm được năm, thử tìm năm riêng
    if (!extractedYear) {
      const fileYearMatch = filename.match(/(20\d{2})/);
      if (fileYearMatch) {
        extractedYear = parseInt(fileYearMatch[1], 10);
      }
    }
  }

  // Search summary column indices and month/year in header rows dynamically
  const summaryCols = {
    congCaNgay: -1,
    cnChuNhat: -1,
    congLe: -1,
    caDem: -1,
    congCNDem: -1,
    congLeDem: -1,
    phuTroiNgay: -1,
    phuTroiCNNgay: -1,
    phuTroiLeNgay: -1,
    phuTroiDem: -1,
    phuTroiCNDem: -1,
    phuTroiLeDem: -1,
    tongCong: -1
  };

  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map(cell => cell ? String(cell).trim() : '').join(' ');

    // Trích xuất tháng / năm từ các ô tiêu đề (ví dụ: "BẢNG CÔNG THÁNG 06.2026", "Tháng 06/2026", "Tháng 6")
    if (!extractedMonth) {
      const monthMatch = rowStr.match(/th[áa]ng\s*[:\s]*0?([1-9]|1[0-2])(?:\D+0?(20\d{2}))?/i);
      if (monthMatch) {
        extractedMonth = parseInt(monthMatch[1], 10);
        if (monthMatch[2]) extractedYear = parseInt(monthMatch[2], 10);
      }
    }
    if (!extractedYear) {
      const yearMatch = rowStr.match(/(?:n[ăa]m|\/|\.|\s)\s*(20\d{2})/i);
      if (yearMatch) extractedYear = parseInt(yearMatch[1], 10);
    }

    if (headerRowIndex === -1 && row.some(cell => cell && String(cell).toUpperCase().includes('MSNV'))) {
      headerRowIndex = i;
      
      const foundNameCol = row.findIndex(cell => cell && (
        String(cell).toUpperCase().includes('HỌ & TÊN') ||
        String(cell).toUpperCase().includes('HỌ VÀ TÊN') ||
        String(cell).toUpperCase().includes('HO & TEN') ||
        String(cell).toUpperCase().includes('HO VA TEN') ||
        String(cell).toUpperCase().includes('HỌ TÊN')
      ));
      const foundDeptCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('MÃ PHÒNG BAN'));
      const foundPosCol = row.findIndex(cell => cell && (
        String(cell).toUpperCase().includes('PB/PX') ||
        String(cell).toUpperCase().includes('PHÒNG BAN')
      ));
      const foundPassCol = row.findIndex(cell => cell && (String(cell).toUpperCase().includes('MẬT KHÂU') || String(cell).toUpperCase().includes('MẬT KHẨU')));
      const foundCccdCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('CCCD'));

      if (foundNameCol !== -1) nameCol = foundNameCol;
      if (foundDeptCol !== -1) deptCol = foundDeptCol;
      if (foundPosCol !== -1) positionCol = foundPosCol;
      if (foundPassCol !== -1) passwordCol = foundPassCol;
      if (foundCccdCol !== -1) cccdCol = foundCccdCol;
      
      console.log(`[PARSE] Header found at row ${i}, nameCol=${nameCol}, deptCol=${deptCol}, positionCol=${positionCol}`);
      console.log(`[PARSE] Header row content:`, row.slice(0, 10).map((cell, idx) => `[${idx}]=${cell}`).join(', '));

      for (let r = headerRowIndex; r <= headerRowIndex + 3 && r < data.length; r++) {
        const subRow = data[r];
        if (!subRow) continue;
        for (let j = 0; j < subRow.length; j++) {
          if (subRow[j] === 1 || subRow[j] === '1') {
            dayStartCol = j;
            break;
          }
        }
        if (dayStartCol !== -1) break;
      }
    }

    // Match summary headers across header rows
    row.forEach((cell, cIdx) => {
      if (!cell) return;
      const str = String(cell).trim();
      const upperStr = str.toUpperCase();

      if (upperStr.includes('CÔNG CA NGÀY') && summaryCols.congCaNgay === -1) summaryCols.congCaNgay = cIdx;
      else if (upperStr.includes('CN CHỦ NHẬT') && summaryCols.cnChuNhat === -1) summaryCols.cnChuNhat = cIdx;
      else if (upperStr.includes('CÔNG NGÀY LỄ') && !upperStr.includes('ĐÊM') && summaryCols.congLe === -1) summaryCols.congLe = cIdx;
      else if (upperStr.includes('CA ĐÊM TRONG CA') && summaryCols.caDem === -1) summaryCols.caDem = cIdx;
      else if (upperStr.includes('CÔNG CHỦ NHẬT ĐÊM') && summaryCols.congCNDem === -1) summaryCols.congCNDem = cIdx;
      else if (upperStr.includes('CÔNG NGÀY LỄ ĐÊM') && summaryCols.congLeDem === -1) summaryCols.congLeDem = cIdx;
      else if (upperStr.includes('PHỤ TRỘI NGÀY') && !upperStr.includes('CN') && !upperStr.includes('LỄ') && summaryCols.phuTroiNgay === -1) summaryCols.phuTroiNgay = cIdx;
      else if (upperStr.includes('PHỤ TRỘI CN NGÀY') && summaryCols.phuTroiCNNgay === -1) summaryCols.phuTroiCNNgay = cIdx;
      else if (upperStr.includes('PHỤ TRỘI LỄ NGÀY') && summaryCols.phuTroiLeNgay === -1) summaryCols.phuTroiLeNgay = cIdx;
      else if (upperStr.includes('PHỤ TRỘI ĐÊM') && !upperStr.includes('CN') && !upperStr.includes('LỄ') && summaryCols.phuTroiDem === -1) summaryCols.phuTroiDem = cIdx;
      else if (upperStr.includes('PHỤ TRỘI CN ĐÊM') && summaryCols.phuTroiCNDem === -1) summaryCols.phuTroiCNDem = cIdx;
      else if (upperStr.includes('PHỤ TRỘI LỄ ĐÊM') && summaryCols.phuTroiLeDem === -1) summaryCols.phuTroiLeDem = cIdx;
      else if (upperStr.includes('TỔNG CÔNG TÍNH LƯƠNG') && summaryCols.tongCong === -1) summaryCols.tongCong = cIdx;
    });
  }

  // 2. Nếu trong sheet không có, trích xuất từ tên file (ví dụ: BẢNG CÔNG THÁNG 06.2026.xlsx)
  if (!extractedMonth && filename) {
    const fileMonthMatch = filename.match(/th[áa]ng\s*[-._\s]*0?([1-9]|1[0-2])(?:\D+(20\d{2}))?/i);
    if (fileMonthMatch) {
      extractedMonth = parseInt(fileMonthMatch[1], 10);
      if (!extractedYear && fileMonthMatch[2]) extractedYear = parseInt(fileMonthMatch[2], 10);
    }
  }
  if (!extractedYear && filename) {
    const fileYearMatch = filename.match(/(20\d{2})/);
    if (fileYearMatch) extractedYear = parseInt(fileYearMatch[1], 10);
  }

  if (headerRowIndex === -1) {
    throw new Error('Không tìm thấy header trong file Excel');
  }

  if (dayStartCol === -1) dayStartCol = 5; // fallback

  const currentDate = new Date();
  result.month = extractedMonth || (currentDate.getMonth() + 1);
  result.year = extractedYear || currentDate.getFullYear();

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    
    if (!Array.isArray(row) || row.length < 4) continue;
    
    const employeeId = row[0] ? String(row[0]).trim() : '';
    
    if (!employeeId || employeeId.toUpperCase().includes('MSNV') || employeeId.toUpperCase().includes('CÔNG CA')) continue;
    
    const employeeName = row[nameCol] ? String(row[nameCol]).trim() : '';
    const department = row[deptCol] ? String(row[deptCol]).trim() : '';
    const position = row[positionCol] ? String(row[positionCol]).trim() : '';
    
    console.log(`[DEBUG] Row ${i}: ID=${employeeId}, nameCol=${nameCol}, employeeName=${employeeName}, raw row[nameCol]=${JSON.stringify(row[nameCol])}`);
    
    if (!employeeName) continue;
    
    const dayData = {};
    const daysInMonth = 31;

    for (let day = 1; day <= daysInMonth; day++) {
      const colIndex = dayStartCol + (day - 1) * 2;
      
      if (colIndex < row.length) {
        const tcValue = row[colIndex];
        const ptValue = row[colIndex + 1];
        
        dayData[day] = {
          tc: tcValue !== undefined && tcValue !== null && tcValue !== '' ? (isNaN(tcValue) ? tcValue : parseFloat(tcValue)) : null,
          pt: ptValue !== undefined && ptValue !== null && ptValue !== '' ? (isNaN(ptValue) ? ptValue : parseFloat(ptValue)) : null
        };
      } else {
        dayData[day] = { tc: null, pt: null };
      }
    }

    const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(val)) ? parseFloat(val) : 0;

    const summary = {
      cong_ca_ngay: summaryCols.congCaNgay !== -1 ? parseNum(row[summaryCols.congCaNgay]) : null,
      cn_chu_nhat: summaryCols.cnChuNhat !== -1 ? parseNum(row[summaryCols.cnChuNhat]) : null,
      cong_ngay_le: summaryCols.congLe !== -1 ? parseNum(row[summaryCols.congLe]) : null,
      ca_dem: summaryCols.caDem !== -1 ? parseNum(row[summaryCols.caDem]) : null,
      cong_cn_dem: summaryCols.congCNDem !== -1 ? parseNum(row[summaryCols.congCNDem]) : null,
      cong_le_dem: summaryCols.congLeDem !== -1 ? parseNum(row[summaryCols.congLeDem]) : null,
      phu_troi_ngay: summaryCols.phuTroiNgay !== -1 ? parseNum(row[summaryCols.phuTroiNgay]) : null,
      phu_troi_cn_ngay: summaryCols.phuTroiCNNgay !== -1 ? parseNum(row[summaryCols.phuTroiCNNgay]) : null,
      phu_troi_le_ngay: summaryCols.phuTroiLeNgay !== -1 ? parseNum(row[summaryCols.phuTroiLeNgay]) : null,
      phu_troi_dem: summaryCols.phuTroiDem !== -1 ? parseNum(row[summaryCols.phuTroiDem]) : null,
      phu_troi_cn_dem: summaryCols.phuTroiCNDem !== -1 ? parseNum(row[summaryCols.phuTroiCNDem]) : null,
      phu_troi_le_dem: summaryCols.phuTroiLeDem !== -1 ? parseNum(row[summaryCols.phuTroiLeDem]) : null,
      tong_cong: summaryCols.tongCong !== -1 ? parseNum(row[summaryCols.tongCong]) : null
    };

    dayData._summary = summary;

    let totalWorkDays = 0;
    if (summary.tong_cong !== null) {
      totalWorkDays = summary.tong_cong;
    } else if (summary.cong_ca_ngay !== null) {
      totalWorkDays = (summary.cong_ca_ngay || 0) + (summary.cn_chu_nhat || 0) + (summary.cong_ngay_le || 0) + (summary.ca_dem || 0);
    } else {
      Object.values(dayData).forEach(day => {
        if (day && day.tc && !isNaN(day.tc)) totalWorkDays += parseFloat(day.tc) / 8.0;
      });
    }

    const password = (passwordCol !== -1 && row[passwordCol]) ? String(row[passwordCol]).trim() : '';
    const cccd = (cccdCol !== -1 && row[cccdCol]) ? String(row[cccdCol]).trim() : employeeId;

    result.records.push({
      employee_id: employeeId,
      employee_name: employeeName,
      department: department,
      position: position,
      day_data: dayData,
      raw_row: JSON.stringify(row),
      total_work_days: totalWorkDays,
      overtime_weekday: summary.phu_troi_ngay || 0,
      overtime_weekend: summary.phu_troi_cn_ngay || 0,
      overtime_holiday: summary.phu_troi_le_ngay || 0,
      night_shift: summary.phu_troi_dem || 0,
      total_salary: 0,
      password: password,
      cccd: cccd,
      notes: ''
    });
  }

  return result;
}

// ============= HELPER FUNCTIONS FOR SALARY =============

function extractSalarySheetHeaders(sheetData) {
  if (!Array.isArray(sheetData) || sheetData.length === 0) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(25, sheetData.length); i++) {
    const row = sheetData[i];
    if (Array.isArray(row) && row.some(cell => cell && String(cell).toUpperCase().includes('MSNV'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return sheetData.slice(0, 10);

  let dataStartIndex = -1;
  for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const col0 = row[0] !== null && row[0] !== undefined ? String(row[0]).trim() : '';
    const col1 = row[1] !== null && row[1] !== undefined ? String(row[1]).trim() : '';

    if (!col0 || col0.toUpperCase().includes('MSNV')) continue;
    if (!col1) continue;

    const col1Upper = col1.toUpperCase();
    if (col1Upper.includes('HỌ') && col1Upper.includes('TÊN')) continue;
    if (col1Upper.includes('HO') && col1Upper.includes('TEN')) continue;

    dataStartIndex = i;
    break;
  }

  if (dataStartIndex === -1) dataStartIndex = headerRowIndex + 1;
  return sheetData.slice(0, dataStartIndex);
}

function findSalaryColumnIndex(headerRows, keywords) {
  const normalizedKeywords = keywords.map(kw =>
    String(kw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const maxCols = Math.max(...headerRows.map(row => (Array.isArray(row) ? row.length : 0)), 0);

  for (let col = 0; col < maxCols; col++) {
    const labelParts = [];
    for (const row of headerRows) {
      if (!Array.isArray(row)) continue;
      const cell = row[col];
      if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
        labelParts.push(String(cell).trim());
      }
    }
    const combined = labelParts.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedKeywords.some(kw => combined.includes(kw))) {
      return col;
    }
  }
  return -1;
}

function parseSalaryData(data, filename = '') {
  const result = {
    month: null,
    year: null,
    raw_data: data,
    records: []
  };

  let extractedMonth = null;
  let extractedYear = null;

  // Trích xuất tháng/năm từ tên file
  if (filename) {
    const fileMonthMatch = filename.match(/(?:tháng\s+|thang\s+)?0?([1-9]|1[0-2])(?:[_./\s])?0?(20\d{2})?/i);
    if (fileMonthMatch) {
      extractedMonth = parseInt(fileMonthMatch[1], 10);
      if (fileMonthMatch[2]) {
        extractedYear = parseInt(fileMonthMatch[2], 10);
      }
    }
    
    if (!extractedYear) {
      const fileYearMatch = filename.match(/(20\d{2})/);
      if (fileYearMatch) {
        extractedYear = parseInt(fileYearMatch[1], 10);
      }
    }
  }

  // Tìm header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    if (row.some(cell => cell && String(cell).toUpperCase().includes('MSNV'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Không tìm thấy header trong file Excel');
  }

  // Trích xuất tháng/năm từ nội dung sheet
  for (let i = 0; i < headerRowIndex; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const text = row.map(cell => (cell !== null && cell !== undefined ? String(cell) : '')).join(' ');
    const match = text.match(/TH[ÁA]NG\s*0?(\d{1,2})\s*[\/.\s]\s*(20\d{2})/i);
    if (match) {
      extractedMonth = parseInt(match[1], 10);
      extractedYear = parseInt(match[2], 10);
      break;
    }
  }

  const headerRows = extractSalarySheetHeaders(data);
  const lcbCol = findSalaryColumnIndex(headerRows, ['lcb', 'luong co ban']);
  const totalIncomeCol = findSalaryColumnIndex(headerRows, ['tong thu nhap']);
  const totalDeductCol = findSalaryColumnIndex(headerRows, ['tong tru']);
  const netCol = findSalaryColumnIndex(headerRows, ['thuc nhan', 'thuc linh', 'thuc lanh']);
  const passwordCol = findSalaryColumnIndex(headerRows, ['mat khau', 'password']);
  const cccdCol = findSalaryColumnIndex(headerRows, ['cccd']);
  const deptCol = findSalaryColumnIndex(headerRows, ['phong ban', 'pb/px', 'ma phong']);
  const positionCol = findSalaryColumnIndex(headerRows, ['chuc vu']);

  const currentDate = new Date();
  result.month = extractedMonth || (currentDate.getMonth() + 1);
  result.year = extractedYear || currentDate.getFullYear();

  const getCell = (row, col, fallbackCol) => {
    const idx = col >= 0 ? col : fallbackCol;
    if (idx < 0 || idx >= row.length) return '';
    const val = row[idx];
    return val !== null && val !== undefined ? String(val).trim() : '';
  };

  // Parse data rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    
    if (!Array.isArray(row) || row.length < 2) continue;
    
    const employeeId = row[0] ? String(row[0]).trim() : '';
    if (!employeeId || employeeId.toUpperCase().includes('MSNV')) continue;
    
    const employeeName = row[1] ? String(row[1]).trim() : '';
    if (!employeeName) continue;

    const nameUpper = employeeName.toUpperCase();
    if (nameUpper.includes('HỌ') && nameUpper.includes('TÊN')) continue;

    const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(val)) ? parseFloat(val) : 0;

    const basicSalaryVal = lcbCol >= 0 ? row[lcbCol] : row[3];
    const totalSalaryVal = netCol >= 0 ? row[netCol] : (totalIncomeCol >= 0 ? row[totalIncomeCol] : row[8]);

    result.records.push({
      employee_id: employeeId,
      employee_name: employeeName,
      department: getCell(row, deptCol, 2),
      position: getCell(row, positionCol, 3),
      basic_salary: parseNum(basicSalaryVal),
      allowances: parseNum(totalIncomeCol >= 0 ? row[totalIncomeCol] : row[5]),
      bonuses: 0,
      deductions: parseNum(totalDeductCol >= 0 ? row[totalDeductCol] : row[7]),
      total_salary: parseNum(totalSalaryVal),
      password: getCell(row, passwordCol, 9),
      cccd: getCell(row, cccdCol, 10),
      notes: row[11] ? String(row[11]).trim() : '',
      raw_data: JSON.stringify(row)
    });
  }

  return result;
}

function saveSalaryToDatabase(data, fileName, userId, callback) {
  db.query(
    'SELECT id FROM salaries WHERE month = ? AND year = ?',
    [data.month, data.year],
    (err, results) => {
      if (err) {
        return callback(err);
      }

      if (results.length > 0) {
        const salaryId = results[0].id;
        db.query('UPDATE salaries SET sheet_data = ?, file_name = ? WHERE id = ?', [JSON.stringify(data.raw_data), fileName, salaryId], (err) => {
          if (err) return callback(err);
          db.query('DELETE FROM salary_records WHERE salary_id = ?', [salaryId], (err) => {
            if (err) return callback(err);
            insertSalaryRecords(salaryId, data, fileName, userId, callback);
          });
        });
      } else {
        db.query(
          'INSERT INTO salaries (month, year, file_name, uploaded_by, sheet_data) VALUES (?, ?, ?, ?, ?)',
          [data.month, data.year, fileName, userId, JSON.stringify(data.raw_data)],
          (err, result) => {
            if (err) return callback(err);
            
            const salaryId = result.insertId;
            insertSalaryRecords(salaryId, data, fileName, userId, callback);
          }
        );
      }
    }
  );
}

function insertSalaryRecords(salaryId, data, fileName, userId, callback) {
  if (data.records.length === 0) {
    return callback(new Error('Không có dữ liệu nhân viên trong file Excel'));
  }

  const sql = `
    INSERT INTO salary_records (
      salary_id, employee_id, employee_name, department, position,
      basic_salary, allowances, bonuses, deductions, total_salary,
      password, cccd, notes, raw_data
    ) VALUES ?
  `;

  const values = data.records.map(record => [
    salaryId,
    record.employee_id,
    record.employee_name,
    record.department,
    record.position,
    record.basic_salary,
    record.allowances,
    record.bonuses,
    record.deductions,
    record.total_salary,
    record.password,
    record.cccd,
    record.notes,
    record.raw_data
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Tự động gửi thông báo cho từng nhân viên về sự thay đổi Bảng Lương
    data.records.forEach(record => {
      if (record.employee_id) {
        const totalSalaryFormatted = record.total_salary ? new Intl.NumberFormat('vi-VN').format(record.total_salary) : '0';
        createNotification(
          db,
          record.employee_id,
          `📝 Quản trị viên cập nhật Bảng Lương Tháng ${data.month}/${data.year}`,
          `Quản trị viên đã tải lên/điều chỉnh dữ liệu Bảng Lương Tháng ${String(data.month).padStart(2, '0')}/${data.year} cho nhân viên ${record.employee_name || ''} (MSNV: ${record.employee_id}). Lương thực nhận: ${totalSalaryFormatted} VNĐ.`,
          'salary_update'
        );
      }
    });

    callback(null, {
      salaryId: salaryId,
      recordCount: data.records.length,
      month: data.month,
      year: data.year
    });
  });
}

// Hàm lưu timesheet vào database
function saveTimesheetToDatabase(data, fileName, userId, callback) {
  // Kiểm tra xem bảng công tháng này đã tồn tại chưa
  db.query(
    'SELECT id FROM timesheets WHERE month = ? AND year = ?',
    [data.month, data.year],
    (err, results) => {
      if (err) {
        return callback(err);
      }

      if (results.length > 0) {
        // Nếu đã tồn tại, xóa records cũ và cập nhật
        const timesheetId = results[0].id;
        db.query('UPDATE timesheets SET sheet_data = ?, file_name = ? WHERE id = ?', [JSON.stringify(data.raw_data), fileName, timesheetId], (err) => {
          if (err) return callback(err);
          db.query('DELETE FROM timesheet_records WHERE timesheet_id = ?', [timesheetId], (err) => {
            if (err) return callback(err);
            insertRecords(timesheetId, data, fileName, userId, callback);
          });
        });
      } else {
        // Tạo mới timesheet
        db.query(
          'INSERT INTO timesheets (month, year, file_name, uploaded_by, sheet_data) VALUES (?, ?, ?, ?, ?)',
          [data.month, data.year, fileName, userId, JSON.stringify(data.raw_data)],
          (err, result) => {
            if (err) return callback(err);
            
            const timesheetId = result.insertId;
            insertRecords(timesheetId, data, fileName, userId, callback);
          }
        );
      }
    }
  );
}

// Hàm insert records
function insertRecords(timesheetId, data, fileName, userId, callback) {
  if (data.records.length === 0) {
    return callback(new Error('Không có dữ liệu nhân viên trong file Excel'));
  }

  const sql = `
    INSERT INTO timesheet_records (
      timesheet_id, employee_id, employee_name, department, position,
      day_data, raw_row, total_work_days, overtime_weekday, overtime_weekend,
      overtime_holiday, night_shift, total_salary, password, cccd, notes
    ) VALUES ?
  `;

  // Chuẩn bị dữ liệu để insert nhiều rows cùng lúc
  const values = data.records.map(record => [
    timesheetId,
    record.employee_id,
    record.employee_name,
    record.department,
    record.position,
    JSON.stringify(record.day_data),
    record.raw_row,
    record.total_work_days,
    record.overtime_weekday,
    record.overtime_weekend,
    record.overtime_holiday,
    record.night_shift,
    record.total_salary,
    record.password,
    record.cccd,
    record.notes
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Tự động gửi thông báo cho từng nhân viên về sự thay đổi Bảng Chấm Công
    data.records.forEach(record => {
      if (record.employee_id) {
        createNotification(
          db,
          record.employee_id,
          `📊 Quản trị viên cập nhật Bảng Chấm Công Tháng ${data.month}/${data.year}`,
          `Quản trị viên đã tải lên/điều chỉnh dữ liệu Bảng Chấm Công Tháng ${String(data.month).padStart(2, '0')}/${data.year} cho nhân viên ${record.employee_name || ''} (MSNV: ${record.employee_id}). Tổng ngày công: ${record.total_work_days || 0} công, Phụ trội: ${record.overtime_weekday || 0} giờ.`,
          'timesheet_update'
        );
      }
    });

    callback(null, {
      timesheetId,
      month: data.month,
      year: data.year,
      recordCount: data.records.length
    });
  });
}

// API Upload file Excel Bảng Chấm Công
app.post('/api/admin/upload-timesheet', upload.single('file'), (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
  }

  const role = req.session.role;
  if (role !== 'timesheet_admin' && role !== 'admin' && role !== 'system_admin') {
    return res.status(403).json({ success: false, message: 'Chỉ Quản Trị Viên Bảng Chấm Công mới có quyền tải lên file này' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa chọn file Excel' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ success: false, message: 'File Excel trống' });
    }

    const parsedData = parseTimesheetData(jsonData, req.file.originalname);
    saveTimesheetToDatabase(parsedData, req.file.originalname, req.session.userId, (err, result) => {
      if (err) {
        console.error('Lỗi lưu Timesheet DB:', err);
        return res.status(500).json({ success: false, message: err.message || 'Lỗi lưu CSDL' });
      }
      res.json({
        success: true,
        message: `Đã tải lên Bảng Chấm Công Tháng ${result.month}/${result.year} (${result.recordCount} nhân viên thành công)!`
      });
    });
  } catch(e) {
    console.error('Lỗi đọc file Excel:', e);
    res.status(500).json({ success: false, message: e.message || 'Lỗi đọc file Excel' });
  }
});

// ============= SALARY ROUTES =============
const setupSalaryRoutes = require('./salary-routes');
setupSalaryRoutes(app, db);

// ============= SYSTEM ADMIN & LIVE SUPPORT CHAT ROUTES =============
const setupSystemAndChatRoutes = require('./system-chat-routes');
setupSystemAndChatRoutes(app, db);

// Khởi động server
app.listen(PORT, () => {
  console.log(`\n=== Server đang chạy ===`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Nhấn Ctrl+C để dừng server\n`);
});
