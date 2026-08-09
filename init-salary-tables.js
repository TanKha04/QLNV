const mysql = require('mysql2');
const dbConfig = require('./db-config');

// Tạo kết nối database
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
  console.log('Đã kết nối MySQL.');
});

// Tạo bảng salaries (bảng lương)
const createSalariesTable = `
  CREATE TABLE IF NOT EXISTS salaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    month INT NOT NULL,
    year INT NOT NULL,
    file_name VARCHAR(255),
    uploaded_by INT,
    sheet_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_salary_month_year (month, year),
    INDEX idx_salary_month_year (month, year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Tạo bảng salary_records
const createSalaryRecordsTable = `
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
    raw_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (salary_id) REFERENCES salaries(id) ON DELETE CASCADE,
    INDEX idx_salary_id (salary_id),
    INDEX idx_salary_employee_id (employee_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

db.query(createSalariesTable, (err) => {
  if (err) {
    console.error('Lỗi khi tạo bảng salaries:', err.message);
    db.end();
    process.exit(1);
  } else {
    console.log('✅ Đã tạo bảng salaries thành công.');
    
    // Tạo bảng salary_records
    db.query(createSalaryRecordsTable, (err) => {
      if (err) {
        console.error('Lỗi khi tạo bảng salary_records:', err.message);
      } else {
        console.log('✅ Đã tạo bảng salary_records thành công.');
      }
      
      console.log('\n=== Hoàn tất tạo bảng lương ===');
      db.end();
    });
  }
});
