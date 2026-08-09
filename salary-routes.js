// API Routes cho Bảng Lương
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.floor(Math.random() * 1000000000) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
});

function setupSalaryRoutes(app, db) {
    
    // Upload bảng lương
    app.post('/api/admin/upload-salary', upload.single('file'), async (req, res) => {
        if (!req.session || !req.session.userId || (req.session.role !== 'salary_admin' && req.session.role !== 'admin' && req.session.role !== 'system_admin')) {
            return res.status(403).json({ success: false, message: 'Chỉ Quản Trị Viên Bảng Lương mới có quyền tải lên file này' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy file' });
        }
        
        try {
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            if (!jsonData || jsonData.length === 0) {
                return res.status(400).json({ success: false, message: 'File Excel trống' });
            }
            
            // Tìm tháng và năm từ file
            let month = null, year = null;
            for (let row of jsonData.slice(0, 15)) {
                const rowStr = row.join(' ');
                const monthMatch = rowStr.match(/tháng\s+(\d{1,2})[\/\.\s-]+(\d{4})|(\d{1,2})[\/\.\s-]+(\d{4})/i);
                if (monthMatch) {
                    month = parseInt(monthMatch[1] || monthMatch[3]);
                    year = parseInt(monthMatch[2] || monthMatch[4]);
                    break;
                }
            }
            
            if (!month || !year) {
                month = new Date().getMonth() + 1;
                year = new Date().getFullYear();
            }
            
            // Lưu vào database
            const checkSql = 'SELECT id FROM salaries WHERE month = ? AND year = ?';
            db.query(checkSql, [month, year], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra database' });
                }
                
                if (results.length > 0) {
                    return res.status(400).json({ success: false, message: `Bảng lương tháng ${month}/${year} đã tồn tại` });
                }
                
                const insertSql = `INSERT INTO salaries (month, year, file_name, uploaded_by, sheet_data) VALUES (?, ?, ?, ?, ?)`;
                db.query(insertSql, [
                    month,
                    year,
                    req.file.originalname,
                    req.session.userId,
                    JSON.stringify(jsonData)
                ], (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Lỗi lưu database' });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Upload thành công',
                        data: { id: result.insertId, month, year, recordCount: jsonData.length - 10 }
                    });
                });
            });
            
        } catch (error) {
            console.error('Lỗi xử lý file:', error);
            res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel' });
        }
    });
    
    // Lấy danh sách bảng lương
    app.get('/api/admin/salaries', (req, res) => {
        if (!req.session || !req.session.userId || req.session.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập hoặc không có quyền' });
        }
        
        const sql = `
            SELECT s.id, s.month, s.year, s.file_name, s.created_at, 
                   u.full_name as uploader_name,
                   COUNT(sr.id) as employee_count
            FROM salaries s
            LEFT JOIN users u ON s.uploaded_by = u.id
            LEFT JOIN salary_records sr ON s.id = sr.salary_id
            GROUP BY s.id
            ORDER BY s.year DESC, s.month DESC
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Lỗi database' });
            }
            res.json({ success: true, data: results });
        });
    });
    
    // Xem chi tiết bảng lương
    app.get('/api/admin/salary/:id', (req, res) => {
        if (!req.session || !req.session.userId || req.session.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập hoặc không có quyền' });
        }
        
        const salaryId = req.params.id;
        const sql = 'SELECT * FROM salaries WHERE id = ?';
        
        db.query(sql, [salaryId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bảng lương' });
            }
            
            const salary = results[0];
            const recordsSql = 'SELECT * FROM salary_records WHERE salary_id = ?';
            
            db.query(recordsSql, [salaryId], (err, records) => {
                res.json({
                    success: true,
                    data: { salary, records: records || [] }
                });
            });
        });
    });
    
    // Xóa bảng lương
    app.delete('/api/admin/salary/:id', (req, res) => {
        if (!req.session || !req.session.userId || req.session.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập hoặc không có quyền' });
        }
        
        const sql = 'DELETE FROM salaries WHERE id = ?';
        db.query(sql, [req.params.id], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Lỗi xóa bảng lương' });
            }
            res.json({ success: true, message: 'Đã xóa bảng lương' });
        });
    });
    
    // Đổi tên bảng lương
    app.put('/api/admin/salary/:id/rename', (req, res) => {
        if (!req.session || !req.session.userId || req.session.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập hoặc không có quyền' });
        }
        
        const { file_name } = req.body;
        const sql = 'UPDATE salaries SET file_name = ? WHERE id = ?';
        
        db.query(sql, [file_name, req.params.id], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Lỗi cập nhật tên' });
            }
            res.json({ success: true, message: 'Đã đổi tên thành công' });
        });
    });
}

module.exports = setupSalaryRoutes;
