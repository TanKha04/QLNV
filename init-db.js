const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dbConfig = require('./db-config');

// Tạo kết nối để tạo database (không chỉ định database)
const connection = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  port: dbConfig.port
});

connection.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối MySQL:', err.message);
    process.exit(1);
  }
  console.log('Đã kết nối MySQL.');
});

// Tạo database nếu chưa tồn tại
connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`, (err) => {
  if (err) {
    console.error('Lỗi khi tạo database:', err.message);
    connection.end();
    process.exit(1);
  }
  console.log(`Database '${dbConfig.database}' đã sẵn sàng.`);
  
  // Đóng kết nối cũ và tạo kết nối mới với database
  connection.end();
  initTables();
});

function initTables() {
  // Tạo kết nối mới với database
  const db = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    multipleStatements: true
  });

  db.connect((err) => {
    if (err) {
      console.error('Lỗi kết nối database:', err.message);
      process.exit(1);
    }
  });

  // Xóa bảng cũ nếu tồn tại (chỉ để phát triển)
  const dropTables = `
    DROP TABLE IF EXISTS salary_records;
    DROP TABLE IF EXISTS salaries;
    DROP TABLE IF EXISTS timesheet_records;
    DROP TABLE IF EXISTS timesheets;
    DROP TABLE IF EXISTS users;
  `;

  db.query(dropTables, (err) => {
    if (err) {
      console.error('Lỗi khi xóa bảng cũ:', err.message);
    } else {
      console.log('Đã xóa các bảng cũ (nếu có).');
    }
    createTables(db);
  });
}

function createTables(db) {
  // Tạo bảng users
  const createUsersTable = `
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      employee_id VARCHAR(50) UNIQUE,
      role ENUM('user', 'admin') NOT NULL,
      department VARCHAR(255),
      position VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_employee_id (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createUsersTable, (err) => {
    if (err) {
      console.error('Lỗi khi tạo bảng users:', err.message);
    } else {
      console.log('Đã tạo bảng users thành công.');
    }
  });

  // Tạo bảng timesheets
  const createTimesheetsTable = `
    CREATE TABLE timesheets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      month INT NOT NULL,
      year INT NOT NULL,
      file_name VARCHAR(255),
      uploaded_by INT,
      sheet_data LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY unique_month_year (month, year),
      INDEX idx_month_year (month, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createTimesheetsTable, (err) => {
    if (err) {
      console.error('Lỗi khi tạo bảng timesheets:', err.message);
    } else {
      console.log('Đã tạo bảng timesheets thành công.');
    }
  });

  // Tạo bảng timesheet_records
  const createRecordsTable = `
    CREATE TABLE timesheet_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timesheet_id INT NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      employee_name VARCHAR(255) NOT NULL,
      department VARCHAR(255),
      position VARCHAR(255),
      day_data TEXT NOT NULL,
      raw_row TEXT,
      total_work_days DECIMAL(10,2) DEFAULT 0,
      overtime_weekday DECIMAL(10,2) DEFAULT 0,
      overtime_weekend DECIMAL(10,2) DEFAULT 0,
      overtime_holiday DECIMAL(10,2) DEFAULT 0,
      night_shift DECIMAL(10,2) DEFAULT 0,
      total_salary DECIMAL(15,2) DEFAULT 0,
      password VARCHAR(255),
      cccd VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
      INDEX idx_timesheet_id (timesheet_id),
      INDEX idx_employee_id (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createRecordsTable, (err) => {
    if (err) {
      console.error('Lỗi khi tạo bảng timesheet_records:', err.message);
    } else {
      console.log('Đã tạo bảng timesheet_records thành công.');
    }
  });

  // Tạo bảng salaries (bảng lương)
  const createSalariesTable = `
    CREATE TABLE salaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      month INT NOT NULL,
      year INT NOT NULL,
      file_name VARCHAR(255),
      uploaded_by INT,
      sheet_data LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY unique_month_year (month, year),
      INDEX idx_month_year (month, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createSalariesTable, (err) => {
    if (err) {
      console.error('Lỗi khi tạo bảng salaries:', err.message);
    } else {
      console.log('Đã tạo bảng salaries thành công.');
    }
  });

  // Tạo bảng salary_records
  const createSalaryRecordsTable = `
    CREATE TABLE salary_records (
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
      raw_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (salary_id) REFERENCES salaries(id) ON DELETE CASCADE,
      INDEX idx_salary_id (salary_id),
      INDEX idx_employee_id (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createSalaryRecordsTable, (err) => {
    if (err) {
      console.error('Lỗi khi tạo bảng salary_records:', err.message);
    } else {
      console.log('Đã tạo bảng salary_records thành công.');
      // Sau khi tạo xong bảng, thêm dữ liệu mẫu
      insertSampleData(db);
    }
  });
}

function insertSampleData(db) {
  const users = [
    {
      username: 'admin',
      password: 'admin123',
      full_name: 'Quản Trị Viên',
      employee_id: null,
      role: 'admin',
      department: 'IT',
      position: 'Administrator'
    },
    {
      username: '119307379',
      password: 'user123',
      full_name: 'LÊ DUY KHƯƠNG',
      employee_id: '119307379',
      role: 'user',
      department: 'SSDH7001',
      position: 'Nhân Viên'
    },
    {
      username: '119601013',
      password: 'user123',
      full_name: 'NGÔ VĂN HIẾU',
      employee_id: '119601013',
      role: 'user',
      department: 'SSDH7001',
      position: 'Nhân Viên'
    },
    {
      username: 'user1',
      password: 'user123',
      full_name: 'Nguyễn Văn A',
      employee_id: 'NV001',
      role: 'user',
      department: 'Kinh Doanh',
      position: 'Nhân Viên'
    }
  ];

  let completed = 0;
  const total = users.length;

  users.forEach((user) => {
    // Mã hóa mật khẩu
    bcrypt.hash(user.password, 10, (err, hash) => {
      if (err) {
        console.error('Lỗi khi mã hóa mật khẩu:', err.message);
        completed++;
      } else {
        const sql = `
          INSERT INTO users (username, password, full_name, employee_id, role, department, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(sql, [
          user.username,
          hash,
          user.full_name,
          user.employee_id,
          user.role,
          user.department,
          user.position
        ], (err) => {
          if (err) {
            console.error('Lỗi khi thêm user:', err.message);
          } else {
            console.log(`Đã thêm user: ${user.username} (${user.role})`);
          }
          
          completed++;
          if (completed === total) {
            console.log('\n=== Khởi tạo database hoàn tất ===');
            console.log('Tài khoản admin: admin / admin123');
            console.log('Tài khoản user: 119307379, 119601013, user1 / user123');
            db.end();
          }
        });
      }
    });
  });
}
