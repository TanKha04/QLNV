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

// Cấu hình multer để upload file
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
    // Chỉ chấp nhận file Excel
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn 10MB
});


// Kết nối database MySQL
const db = mysql.createPool(dbConfig);

// Tự động khởi tạo database khi server khởi động lần đầu
async function initializeDatabase() {
  const connection = await db.promise().getConnection();
  try {
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
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    connection.release();
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
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 giờ
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống' 
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
  if (!req.session.userId || req.session.role !== 'admin') {
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
  if (!req.session.userId || req.session.role !== 'admin') {
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

  // 1. Kiểm tra tài khoản admin trong bảng users trước
  const adminQuery = `
    SELECT id, username, password, full_name, role, department, position 
    FROM users 
    WHERE (username = ? OR employee_id = ?) AND role = 'admin'
  `;

  db.query(adminQuery, [employee_id, employee_id], (err, adminResults) => {
    if (!err && adminResults.length > 0) {
      const adminUser = adminResults[0];

      bcrypt.compare(password, adminUser.password, (err, isMatch) => {
        if (!err && isMatch) {
          req.session.userId = adminUser.id;
          req.session.username = adminUser.username;
          req.session.role = adminUser.role;

          return res.json({
            success: true,
            isAdmin: true,
            message: 'Đăng nhập Quản trị viên thành công',
            data: {
              id: adminUser.id,
              username: adminUser.username,
              full_name: adminUser.full_name,
              role: adminUser.role,
              department: adminUser.department,
              position: adminUser.position
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
    // Tìm record mới nhất của nhân viên trong bảng công
    const query = `
      SELECT tr.*, t.month, t.year, t.sheet_data
      FROM timesheet_records tr
      JOIN timesheets t ON tr.timesheet_id = t.id
      WHERE tr.employee_id = ?
      ORDER BY t.year DESC, t.month DESC
    `;

    db.query(query, [employee_id], (err, records) => {
      if (err) {
        console.error('Lỗi đăng nhập nhân viên:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }

      if (records.length === 0) {
        return res.status(401).json({ success: false, message: 'Tài khoản / MSNV không tồn tại trong hệ thống' });
      }

      const matched = records.find(r => r.password && String(r.password).trim() === String(password).trim());

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
          department: matched.department,
          position: matched.position,
          role: 'employee'
        }
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

// API: Đăng xuất nhân viên
app.post('/api/employee/logout', (req, res) => {
  req.session.employeeId = null;
  req.session.employeeName = null;
  res.json({ success: true });
});

// ============= API BẢNG CÔNG =============

// API: Upload file Excel bảng công (chỉ admin)
app.post('/api/admin/upload-timesheet', upload.single('file'), (req, res) => {
  // Kiểm tra quyền admin
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
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

// API: Lấy danh sách các bảng công (chỉ admin)
app.get('/api/admin/timesheets', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
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
  if (!req.session.userId || req.session.role !== 'admin') {
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

        // Parse day_data từ JSON string
        records = records.map(record => ({
          ...record,
          day_data: JSON.parse(record.day_data)
        }));

        res.json({ 
          success: true, 
          data: {
            timesheet,
            records
          }
        });
      }
    );
  });
});

// API: Cập nhật record trong bảng công (admin)
app.put('/api/admin/timesheet-record/:id', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const recordId = req.params.id;
  const { day_data, total_work_days, overtime_weekday, overtime_weekend, overtime_holiday, night_shift, total_salary, password, cccd, notes } = req.body;

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

    res.json({ 
      success: true, 
      message: 'Cập nhật thành công' 
    });
  });
});

// API: Xóa bảng công (admin)
app.delete('/api/admin/timesheet/:id', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập' 
    });
  }

  const timesheetId = req.params.id;

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

// API: Cập nhật trực tiếp sheet_data của bảng công (admin)
app.put('/api/admin/timesheet/:id/sheet-data', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
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
      
      const foundNameCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('HỌ & TÊN'));
      const foundDeptCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('MÃ PHÒNG BAN'));
      const foundPosCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('PB/PX'));
      const foundPassCol = row.findIndex(cell => cell && (String(cell).toUpperCase().includes('MẬT KHÂU') || String(cell).toUpperCase().includes('MẬT KHẨU')));
      const foundCccdCol = row.findIndex(cell => cell && String(cell).toUpperCase().includes('CCCD'));

      if (foundNameCol !== -1) nameCol = foundNameCol;
      if (foundDeptCol !== -1) deptCol = foundDeptCol;
      if (foundPosCol !== -1) positionCol = foundPosCol;
      if (foundPassCol !== -1) passwordCol = foundPassCol;
      if (foundCccdCol !== -1) cccdCol = foundCccdCol;

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
        db.query('UPDATE timesheets SET sheet_data = ? WHERE id = ?', [JSON.stringify(data.raw_data), timesheetId], (err) => {
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

    callback(null, {
      timesheetId,
      month: data.month,
      year: data.year,
      recordCount: data.records.length
    });
  });
}

// Khởi động server
app.listen(PORT, () => {
  console.log(`\n=== Server đang chạy ===`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Nhấn Ctrl+C để dừng server\n`);
});
