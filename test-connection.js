// Script kiểm tra kết nối MySQL
const mysql = require('mysql2');
const dbConfig = require('./db-config');

console.log('=== Đang kiểm tra kết nối MySQL ===\n');
console.log('Thông tin kết nối:');
console.log(`- Host: ${dbConfig.host}`);
console.log(`- Port: ${dbConfig.port}`);
console.log(`- User: ${dbConfig.user}`);
console.log(`- Database: ${dbConfig.database}\n`);

// Test kết nối không chỉ định database
const testConnection = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  port: dbConfig.port
});

testConnection.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối MySQL:');
    console.error(`   ${err.message}\n`);
    console.log('💡 Giải pháp:');
    console.log('   1. Kiểm tra MySQL server đang chạy');
    console.log('   2. Kiểm tra username/password trong db-config.js');
    console.log('   3. Đọc file HUONG_DAN_CAI_DAT_MYSQL.md để biết thêm chi tiết\n');
    process.exit(1);
  }
  
  console.log('✅ Kết nối MySQL thành công!\n');
  
  // Kiểm tra database tồn tại
  testConnection.query(`SHOW DATABASES LIKE '${dbConfig.database}'`, (err, results) => {
    if (err) {
      console.error('❌ Lỗi khi kiểm tra database:', err.message);
      testConnection.end();
      process.exit(1);
    }
    
    if (results.length === 0) {
      console.log(`⚠️  Database '${dbConfig.database}' chưa tồn tại`);
      console.log('   Chạy lệnh: npm run init-db để tạo database\n');
    } else {
      console.log(`✅ Database '${dbConfig.database}' đã tồn tại\n`);
      
      // Kết nối vào database và kiểm tra tables
      const dbConnection = mysql.createConnection(dbConfig);
      
      dbConnection.query('SHOW TABLES', (err, tables) => {
        if (err) {
          console.error('❌ Lỗi khi kiểm tra tables:', err.message);
          dbConnection.end();
          testConnection.end();
          process.exit(1);
        }
        
        if (tables.length === 0) {
          console.log('⚠️  Chưa có bảng nào trong database');
          console.log('   Chạy lệnh: npm run init-db để tạo các bảng\n');
        } else {
          console.log('✅ Các bảng trong database:');
          tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
          });
          console.log('');
          
          // Kiểm tra số lượng users
          dbConnection.query('SELECT COUNT(*) as count FROM users', (err, result) => {
            if (!err && result.length > 0) {
              console.log(`📊 Số lượng users: ${result[0].count}`);
            }
            
            dbConnection.end();
            testConnection.end();
            
            console.log('\n🎉 Hệ thống đã sẵn sàng!');
            console.log('   Chạy lệnh: npm start để khởi động server\n');
          });
        }
      });
    }
  });
});
