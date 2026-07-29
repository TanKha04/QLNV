require('dotenv').config();

// Cấu hình kết nối MySQL (hỗ trợ đọc từ file .env hoặc biến môi trường Cloud)
module.exports = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',           
  password: process.env.DB_PASSWORD || 'rootpassword',           
  database: process.env.DB_NAME || 'tracuu_bangcong',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};
