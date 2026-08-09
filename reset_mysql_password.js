const mysql = require('mysql2');

// Kết nối MySQL (không cần password vì --skip-grant-tables)
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Đã kết nối MySQL (skip-grant-tables mode)');
  
  // Bước 1: FLUSH PRIVILEGES
  connection.query('FLUSH PRIVILEGES', (err) => {
    if (err) {
      console.error('❌ Lỗi FLUSH PRIVILEGES:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ FLUSH PRIVILEGES thành công');
    
    // Bước 2: Đặt password root mới thành '123456'
    connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY '123456'", (err) => {
      if (err) {
        console.error('❌ Lỗi ALTER USER:', err.message);
        connection.end();
        process.exit(1);
      }
      
      console.log('✅ Đã đặt password root = 123456');
      
      // Bước 3: FLUSH PRIVILEGES lần nữa
      connection.query('FLUSH PRIVILEGES', (err) => {
        if (err) {
          console.error('❌ Lỗi FLUSH PRIVILEGES lần 2:', err.message);
          connection.end();
          process.exit(1);
        }
        
        console.log('✅ FLUSH PRIVILEGES lần 2 thành công');
        console.log('\n✅ ✅ ✅ PASSWORD RESET THÀNH CÔNG! ✅ ✅ ✅');
        console.log('📝 Username: root');
        console.log('🔑 Password: 123456');
        
        connection.end();
        process.exit(0);
      });
    });
  });
});
