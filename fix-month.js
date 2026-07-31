require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'tracuu_bangcong',
  waitForConnections: true,
  connectionLimit: 5
});

console.log('Đang kết nối database...');

// Lấy danh sách tất cả bảng công để kiểm tra
db.query('SELECT id, month, year, file_name FROM timesheets', (err, results) => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    process.exit(1);
  }

  console.log('\n📋 Danh sách bảng công hiện tại:');
  results.forEach(t => {
    console.log(`  ID=${t.id} | Tháng=${t.month}/${t.year} | File: ${t.file_name}`);
  });

  // Trích xuất tháng đúng từ tên file và cập nhật
  let pending = 0;
  let updated = 0;

  results.forEach(t => {
    if (!t.file_name) return;

    const filename = t.file_name;
    // Tìm số tháng trong tên file (ví dụ: 06.2026, THÁNG 06, tháng 6)
    const monthMatch = filename.match(/th[áa]ng\s*[-._\s]*0?([1-9]|1[0-2])(?:\D+(20\d{2}))?/i)
                    || filename.match(/[-_.\s]0?([1-9]|1[0-2])[._\-](20\d{2})/i)
                    || filename.match(/BANG CONG THANG\s*0?([1-9]|1[0-2])/i);
    const yearMatch = filename.match(/(20\d{2})/);

    let correctMonth = null;
    let correctYear = t.year;

    if (monthMatch) {
      correctMonth = parseInt(monthMatch[1], 10);
    }
    if (yearMatch) {
      correctYear = parseInt(yearMatch[1], 10);
    }

    if (correctMonth && correctMonth !== t.month) {
      console.log(`\n🔧 Sẽ sửa ID=${t.id}: Tháng ${t.month} → Tháng ${correctMonth}/${correctYear}`);
      pending++;

      db.query(
        'UPDATE timesheets SET month = ?, year = ? WHERE id = ?',
        [correctMonth, correctYear, t.id],
        (updateErr, result) => {
          if (updateErr) {
            console.error(`  ❌ Lỗi cập nhật ID=${t.id}:`, updateErr.message);
          } else {
            console.log(`  ✅ Đã sửa ID=${t.id} thành Tháng ${correctMonth}/${correctYear}`);
            updated++;
          }
          pending--;
          if (pending === 0) finish(updated);
        }
      );
    }
  });

  if (pending === 0) finish(0);
});

function finish(count) {
  if (count === 0) {
    console.log('\n✅ Không có bảng công nào cần sửa, hoặc không tìm thấy thông tin tháng trong tên file.');
    console.log('   Bạn cần xóa bảng công cũ trong trang Admin và TẢI LẠI file Excel lên.');
  } else {
    console.log(`\n✅ Đã cập nhật ${count} bảng công.`);
    console.log('   Hãy reload lại trang web để xem kết quả!');
  }
  process.exit(0);
}
