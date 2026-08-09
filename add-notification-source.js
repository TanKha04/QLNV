const mysql = require('mysql2');
const dbConfig = require('./db-config');

const db = mysql.createConnection(dbConfig);

console.log('🔧 Đang thêm cột source vào bảng notifications...');

db.connect((err) => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    process.exit(1);
  }

  console.log('✅ Đã kết nối database');

  // Kiểm tra xem cột source đã tồn tại chưa
  const checkColumnSql = `
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '${dbConfig.database}' 
    AND TABLE_NAME = 'notifications' 
    AND COLUMN_NAME = 'source'
  `;

  db.query(checkColumnSql, (err, results) => {
    if (err) {
      console.error('❌ Lỗi kiểm tra cột:', err.message);
      db.end();
      process.exit(1);
    }

    const columnExists = results[0].count > 0;

    if (columnExists) {
      console.log('✅ Cột source đã tồn tại, bỏ qua việc thêm');
      updateOldRecords();
    } else {
      // Thêm cột source
      const alterTableSql = `
        ALTER TABLE notifications 
        ADD COLUMN source VARCHAR(50) DEFAULT 'system' 
        COMMENT 'broadcast: từ admin gửi hàng loạt, system: tự động từ hệ thống'
      `;

      db.query(alterTableSql, (err) => {
        if (err) {
          console.error('❌ Lỗi thêm cột source:', err.message);
          db.end();
          process.exit(1);
        }

        console.log('✅ Đã thêm cột source');
        updateOldRecords();
      });
    }
  });

  function updateOldRecords() {
    // Cập nhật các thông báo cũ: nếu không có source thì set mặc định là 'system'
    const updateSql = `UPDATE notifications SET source = 'system' WHERE source IS NULL OR source = ''`;
    
    db.query(updateSql, (err, result) => {
      if (err) {
        console.error('❌ Lỗi cập nhật dữ liệu cũ:', err.message);
      } else {
        console.log(`✅ Đã cập nhật ${result.affectedRows} thông báo cũ với source='system'`);
      }

      db.end();
      console.log('✅ Hoàn thành migration!');
      process.exit(0);
    });
  }
});
