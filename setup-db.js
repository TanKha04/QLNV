const mysql = require('mysql2');

console.log('🔄 Đang thử kết nối MySQL với các password phổ biến...\n');

const passwordsToTry = [
  '',           // Không có password
  'root',       // Password: root
  '123456',     // Password: 123456
  'password',   // Password: password
  'admin',      // Password: admin
  'mysql',      // Password: mysql
];

let passwordFound = null;
let attemptsCompleted = 0;

function tryPassword(password, callback) {
  const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: password,
    port: 3306,
    timeout: 5000
  });

  connection.connect((err) => {
    if (!err) {
      console.log('✅ Kết nối thành công với password:', password ? `'${password}'` : '(trống)');
      connection.end();
      callback(true, password);
    } else {
      console.log('❌ Thất bại với password:', password ? `'${password}'` : '(trống)');
      connection.end();
      callback(false);
    }
  });
}

function tryNextPassword(index) {
  if (index >= passwordsToTry.length) {
    if (passwordFound !== null) {
      console.log('\n✅ PASSWORD TÌMTHẤY:', passwordFound ? `'${passwordFound}'` : '(trống)');
      console.log('🔄 Bây giờ hãy cập nhật file .env và chạy: npm run init-db');
    } else {
      console.log('\n❌ KHÔNG TÌM ĐƯỢC PASSWORD. Bạn cần reset MySQL password.');
      console.log('📝 Vui lòng xem hướng dẫn chi tiết trong README.md');
    }
    return;
  }

  tryPassword(passwordsToTry[index], (success, foundPassword) => {
    if (success) {
      passwordFound = foundPassword;
    }
    attemptsCompleted++;
    tryNextPassword(index + 1);
  });
}

tryNextPassword(0);
