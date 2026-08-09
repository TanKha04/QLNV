const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Config multer for chat image uploads
const chatUploadDir = path.join(__dirname, 'public', 'uploads', 'chat');
const attachmentUploadDir = path.join(__dirname, 'public', 'uploads', 'attachments');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}
if (!fs.existsSync(attachmentUploadDir)) {
  fs.mkdirSync(attachmentUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'chat-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
  }
});

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, attachmentUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'broadcast-' + uniqueSuffix + ext);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

function setupSystemAndChatRoutes(app, db) {
  // API Upload ảnh đính kèm chat
  app.post('/api/chat/upload-image', upload.single('chat_image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hình ảnh' });
    }
    const imageUrl = '/uploads/chat/' + req.file.filename;
    res.json({ success: true, image_url: imageUrl });
  });

  // API Gửi tin nhắn chat
  app.post('/api/chat/send', (req, res) => {
    const { conversation_id, sender_id, sender_name, sender_role, receiver_id, message, image_url } = req.body;

    if (!conversation_id || !sender_id || (!message && !image_url)) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không hợp lệ' });
    }

    const sql = `
      INSERT INTO support_messages 
      (conversation_id, sender_id, sender_name, sender_role, receiver_id, message, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        conversation_id,
        sender_id,
        sender_name || 'Người dùng',
        sender_role || 'user',
        receiver_id || 'system_admin',
        message || '',
        image_url || null
      ],
      (err, result) => {
        if (err) {
          console.error('Lỗi lưu tin nhắn chat:', err);
          return res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn' });
        }
        res.json({
          success: true,
          message: 'Đã gửi tin nhắn',
          data: {
            id: result.insertId,
            conversation_id,
            sender_id,
            sender_name,
            sender_role,
            message,
            image_url,
            created_at: new Date()
          }
        });
      }
    );
  });

  // API Lấy tin nhắn của cuộc hội thoại
  app.get('/api/chat/messages', (req, res) => {
    const { conversation_id } = req.query;

    if (!conversation_id) {
      return res.status(400).json({ success: false, message: 'Thiếu conversation_id' });
    }

    const sql = `
      SELECT * FROM support_messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `;

    db.query(sql, [conversation_id], (err, results) => {
      if (err) {
        console.error('Lỗi lấy tin nhắn:', err);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }

      // Đánh dấu đã đọc nếu là receiver
      db.query('UPDATE support_messages SET is_read = 1 WHERE conversation_id = ?', [conversation_id]);

      res.json({ success: true, data: results });
    });
  });

  // API Lấy danh sách tất cả cuộc hội thoại cho Quản Trị Viên Hệ Thống
  app.get('/api/chat/conversations', (req, res) => {
    const sql = `
      SELECT 
        m.conversation_id,
        m.sender_id,
        m.sender_name,
        m.sender_role,
        m.message AS last_message,
        m.image_url,
        m.created_at AS last_time,
        (SELECT COUNT(*) FROM support_messages sub WHERE sub.conversation_id = m.conversation_id AND sub.is_read = 0 AND sub.sender_role != 'system_admin') AS unread_count
      FROM support_messages m
      INNER JOIN (
        SELECT conversation_id, MAX(id) as max_id
        FROM support_messages
        GROUP BY conversation_id
      ) latest ON m.id = latest.max_id
      ORDER BY m.created_at DESC
    `;

    db.query(sql, [], (err, results) => {
      if (err) {
        console.error('Lỗi lấy danh sách hội thoại:', err);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
      res.json({ success: true, data: results });
    });
  });

  // ============= SYSTEM ADMIN API =============

  // Gửi thông báo đến toàn bộ nhân viên từ QTV hệ thống
  app.post('/api/system-admin/broadcast-notification', attachmentUpload.single('attachment'), (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập trước khi gửi thông báo' });
    }

    const allowedCreatorRoles = ['system_admin', 'admin'];
    if (!allowedCreatorRoles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền gửi thông báo cho toàn bộ nhân viên' });
    }

    const { title, message, type = 'info' } = req.body;
    const trimmedTitle = String(title || '').trim();
    const trimmedMessage = String(message || '').trim();
    const attachmentUrl = req.file ? '/uploads/attachments/' + req.file.filename : null;
    // Lưu tên file gốc KHÔNG encode - MySQL sẽ tự xử lý UTF-8
    const attachmentName = req.file ? req.file.originalname : null;

    if (!trimmedTitle || !trimmedMessage) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung thông báo' });
    }

    const sql = `
      SELECT employee_id FROM (
        SELECT employee_id FROM users WHERE employee_id IS NOT NULL AND TRIM(employee_id) != ''
        UNION
        SELECT employee_id FROM timesheet_records WHERE employee_id IS NOT NULL AND TRIM(employee_id) != ''
        UNION
        SELECT employee_id FROM salary_records WHERE employee_id IS NOT NULL AND TRIM(employee_id) != ''
      ) AS all_employees
      WHERE employee_id IS NOT NULL AND TRIM(employee_id) != ''
    `;

    db.query(sql, [], (err, rows) => {
      if (err) {
        console.error('Lỗi lấy danh sách nhân viên nhận thông báo:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi gửi thông báo' });
      }

      const recipients = [...new Set((rows || []).map(r => String(r.employee_id).trim()).filter(Boolean))];

      if (recipients.length === 0) {
        return res.json({ success: true, message: 'Đã gửi thông báo thành công', delivered_count: 0 });
      }

      // Thêm source = 'broadcast' để phân biệt với thông báo tự động
      const values = recipients.map(employee_id => [employee_id, trimmedTitle, trimmedMessage, type, attachmentUrl, attachmentName, 'broadcast']);
      const insertSql = `INSERT INTO notifications (employee_id, title, message, type, attachment_url, attachment_name, source) VALUES ?`;
      db.query(insertSql, [values], (insertErr) => {
        if (insertErr) {
          console.error('Lỗi lưu thông báo broadcast:', insertErr.message);
          return res.status(500).json({ success: false, message: 'Lỗi lưu thông báo' });
        }
        res.json({ success: true, message: 'Đã gửi thông báo đến toàn bộ nhân viên', delivered_count: recipients.length });
      });
    });
  });

  // API: Serve attachment files với Content-Disposition inline (để browser hiển thị thay vì download)
  app.get('/api/attachments/:filename', (req, res) => {
    const filename = req.param('filename');
    const filePath = path.join(attachmentUploadDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File không tồn tại' });
    }
    
    // Get original filename from database if possible (fallback to filename)
    const ext = path.extname(filename);
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const mimeType = mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    
    // Set headers to force inline viewing
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi đọc file' });
      }
    });
  });

  // API: Lấy danh sách toàn bộ thông báo (cho System Admin)
  app.get('/api/system-admin/notifications', (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const allowedRoles = ['system_admin', 'admin'];
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Count total records - CHỈ LẤY BROADCAST NOTIFICATIONS
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT 1
        FROM notifications 
        WHERE source = 'broadcast'
        GROUP BY title, message, type, attachment_url, attachment_name, created_at
      ) as grouped
    `;

    db.query(countSql, [], (countErr, countRows) => {
      if (countErr) {
        console.error('Lỗi đếm thông báo:', countErr.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + countErr.message });
      }

      const total = countRows[0].total || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated data - CHỈ LẤY BROADCAST NOTIFICATIONS
      const sql = `
        SELECT 
          MIN(id) as id,
          title, 
          message, 
          type, 
          attachment_url, 
          attachment_name, 
          created_at,
          COUNT(*) as recipient_count
        FROM notifications 
        WHERE source = 'broadcast'
        GROUP BY title, message, type, attachment_url, attachment_name, created_at
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.query(sql, [limit, offset], (err, rows) => {
        if (err) {
          console.error('Lỗi lấy danh sách thông báo:', err.message);
          return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
        }
        res.json({ 
          success: true, 
          data: rows || [],
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      });
    });
  });

  // API: Xóa thông báo (xóa tất cả bản sao của thông báo đó)
  app.delete('/api/system-admin/notification/:id', (req, res) => {
    console.log('=== DELETE NOTIFICATION REQUEST ===');
    console.log('Session:', req.session);
    console.log('Session userId:', req.session?.userId);
    console.log('Session role:', req.session?.role);
    console.log('Notification ID:', req.params.id);
    
    if (!req.session || !req.session.userId) {
      console.log('❌ Unauthorized: No session or userId');
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const allowedRoles = ['system_admin', 'admin'];
    if (!allowedRoles.includes(req.session.role)) {
      console.log('❌ Forbidden: Role not allowed:', req.session.role);
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa' });
    }

    const notifId = parseInt(req.params.id);
    console.log('✅ Authorized, proceeding to delete notification ID:', notifId);
    
    // Lấy thông tin thông báo để xóa tất cả bản sao - CHỈ BROADCAST
    const selectSql = `SELECT title, created_at FROM notifications WHERE id = ? AND source = 'broadcast' LIMIT 1`;
    
    db.query(selectSql, [notifId], (err, rows) => {
      if (err) {
        console.error('Lỗi lấy thông tin thông báo:', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + err.message });
      }
      
      if (!rows || rows.length === 0) {
        console.log('❌ Notification not found or not a broadcast:', notifId);
        return res.json({ success: false, message: 'Không tìm thấy thông báo hoặc không phải thông báo broadcast' });
      }
      
      const { title, created_at } = rows[0];
      console.log('📋 Found broadcast notification:', { title, created_at });
      
      // Xóa tất cả thông báo có cùng title, created_at VÀ source='broadcast'
      const deleteSql = `DELETE FROM notifications WHERE title = ? AND created_at = ? AND source = 'broadcast'`;
      
      db.query(deleteSql, [title, created_at], (deleteErr, result) => {
        if (deleteErr) {
          console.error('Lỗi xóa thông báo:', deleteErr.message);
          return res.status(500).json({ success: false, message: 'Lỗi xóa thông báo: ' + deleteErr.message });
        }
        
        console.log('✅ Đã xóa:', result.affectedRows, 'thông báo broadcast');
        res.json({ success: true, message: `Đã xóa ${result.affectedRows} thông báo` });
      });
    });
  });

  // Overview thống kê số lượng QTV Bảng Công & Bảng Lương
  app.get('/api/system-admin/overview', (req, res) => {
    const sqlTimesheetAdmins = `SELECT COUNT(*) AS count FROM users WHERE role = 'timesheet_admin'`;
    const sqlSalaryAdmins = `SELECT COUNT(*) AS count FROM users WHERE role = 'salary_admin'`;
    const sqlSystemAdmins = `SELECT COUNT(*) AS count FROM users WHERE role IN ('system_admin', 'admin')`;
    const sqlUnreadChats = `SELECT COUNT(*) AS count FROM support_messages WHERE is_read = 0 AND sender_role != 'system_admin'`;

    const handleChatCountError = (err, callback) => {
      if (err && err.code === 'ER_NO_SUCH_TABLE') {
        return callback(null, [{ count: 0 }]);
      }
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      return callback(null, [{ count: 0 }]);
    };

    db.query(sqlTimesheetAdmins, (err, r1) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      db.query(sqlSalaryAdmins, (err, r2) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        db.query(sqlSystemAdmins, (err, r3) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          db.query(sqlUnreadChats, (err, r4) => {
            if (err) {
              if (err.code === 'ER_NO_SUCH_TABLE') {
                r4 = [{ count: 0 }];
              } else {
                return res.status(500).json({ success: false, message: err.message });
              }
            }
            res.json({
              success: true,
              data: {
                timesheet_admins_count: r1[0].count,
                salary_admins_count: r2[0].count,
                system_admins_count: r3[0].count,
                unread_chats_count: r4[0].count
              }
            });
          });
        });
      });
    });
  });

  // Lấy danh sách tất cả Quản trị viên (Không bao gồm Người dùng)
  app.get('/api/system-admin/admins', (req, res) => {
    const sql = `
      SELECT id, username, full_name, role, employee_id, department, created_at 
      FROM users 
      WHERE role IN ('timesheet_admin', 'salary_admin', 'system_admin', 'admin')
      ORDER BY role DESC, created_at DESC
    `;
    db.query(sql, [], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    });
  });

  // Tạo tài khoản Admin mới
  app.post('/api/system-admin/create-admin', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập trước khi tạo tài khoản' });
    }

    const allowedCreatorRoles = ['system_admin', 'admin'];
    if (!allowedCreatorRoles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo tài khoản quản trị' });
    }

    const { username, password, full_name, role } = req.body;
    const trimmedUsername = String(username || '').trim();
    const trimmedPassword = String(password || '').trim();
    const trimmedFullName = String(full_name || '').trim();
    const normalizedRole = String(role || '').trim();

    if (!trimmedUsername || !trimmedPassword || !normalizedRole) {
      return res.status(400).json({ success: false, message: 'Cần nhập đầy đủ Tên đăng nhập, Mật khẩu và Quyền' });
    }

    if (!['timesheet_admin', 'salary_admin', 'system_admin', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Quyền không hợp lệ' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    try {
      const hash = await bcrypt.hash(trimmedPassword, 10);

      const repairSchema = () => new Promise((resolve, reject) => {
        db.query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'`, (err) => {
          if (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('doesn\'t exist')) {
              return resolve();
            }
            return reject(err);
          }
          resolve();
        });
      });

      await repairSchema();

      const sql = `INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)`;
      db.query(sql, [trimmedUsername, hash, trimmedFullName || trimmedUsername, normalizedRole], (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
          }

          if (err.message && err.message.includes('Data truncated for column')) {
            const fallbackSql = `INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)`;
            return db.query(fallbackSql, [trimmedUsername, hash, trimmedFullName || trimmedUsername], (fallbackErr, fallbackResult) => {
              if (fallbackErr) {
                if (fallbackErr.code === 'ER_DUP_ENTRY') {
                  return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
                }
                return res.status(500).json({ success: false, message: fallbackErr.message });
              }
              return res.json({ success: true, message: 'Tạo tài khoản quản trị thành công', adminId: fallbackResult.insertId });
            });
          }

          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Tạo tài khoản quản trị thành công', adminId: result.insertId });
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Cấp / Thu hồi quyền QTV
  app.post('/api/system-admin/update-role', (req, res) => {
    const { user_id, new_role } = req.body;
    if (!user_id || !new_role) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc new_role' });
    }

    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    db.query(sql, [new_role, user_id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: `Đã cập nhật quyền thành: ${new_role}` });
    });
  });

  // Đổi mật khẩu & tên đăng nhập của tài khoản
  app.post('/api/system-admin/update-account', async (req, res) => {
    const { user_id, username, full_name, new_password } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID tài khoản cần chỉnh sửa' });
    }

    try {
      if (new_password && new_password.trim() !== '') {
        const hash = await bcrypt.hash(new_password, 10);
        const sql = `UPDATE users SET username = ?, full_name = ?, password = ? WHERE id = ?`;
        db.query(sql, [username, full_name, hash, user_id], (err) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.json({ success: true, message: 'Đã cập nhật tên đăng nhập và mật khẩu thành công' });
        });
      } else {
        const sql = `UPDATE users SET username = ?, full_name = ? WHERE id = ?`;
        db.query(sql, [username, full_name, user_id], (err) => {
          if (err) return res.status(500).json({ success: false, message: err.message });
          res.json({ success: true, message: 'Đã cập nhật thông tin tài khoản' });
        });
      }
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Xóa tài khoản Quản trị viên
  app.delete('/api/system-admin/delete-admin/:id', (req, res) => {
    const adminId = req.params.id;
    const sql = `DELETE FROM users WHERE id = ?`;
    db.query(sql, [adminId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Đã xóa tài khoản Quản trị viên thành công' });
    });
  });

  // Admin tự cập nhật Hồ sơ, Tên đăng nhập và Mật khẩu của chính mình
  app.post('/api/admin/self-update-account', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const { username, full_name, new_password } = req.body;
    const userId = req.session.userId;

    if (!username || !full_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Tên đăng nhập và Họ tên' });
    }

    try {
      if (new_password && new_password.trim() !== '') {
        const hash = await bcrypt.hash(new_password, 10);
        const sql = `UPDATE users SET username = ?, full_name = ?, password = ? WHERE id = ?`;
        db.query(sql, [username, full_name, hash, userId], (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Lỗi trùng tên đăng nhập hoặc lỗi CSDL' });
          req.session.username = username;
          res.json({ success: true, message: 'Đã cập nhật Tên đăng nhập và Mật khẩu mới thành công!' });
        });
      } else {
        const sql = `UPDATE users SET username = ?, full_name = ? WHERE id = ?`;
        db.query(sql, [username, full_name, userId], (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Lỗi trùng tên đăng nhập hoặc lỗi CSDL' });
          req.session.username = username;
          res.json({ success: true, message: 'Đã cập nhật Hồ sơ thành công!' });
        });
      }
    } catch(e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
}

module.exports = setupSystemAndChatRoutes;
