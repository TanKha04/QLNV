// ============= QUẢN LÝ BẢNG LƯƠNG =============

let currentSalaryId = null;
let currentSalaryData = null;

// Chuyển tab giữa Bảng Công và Bảng Lương
function switchTab(tabName) {
    // Xóa active khỏi tất cả tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'timesheets') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('timesheetsTab').classList.add('active');
        loadTimesheetsList();
    } else if (tabName === 'salaries') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('salariesTab').classList.add('active');
        loadSalariesList();
    }
}

// Override showUploadDialog để hỗ trợ cả bảng công và bảng lương
const originalShowUploadDialog = window.showUploadDialog;
window.showUploadDialog = function(type) {
    window.currentUploadType = type || 'timesheet';
    
    // Cập nhật tiêu đề modal
    const modalTitle = document.getElementById('uploadModalTitle');
    if (modalTitle) {
        modalTitle.textContent = type === 'salary' ? '📤 Tải Lên Bảng Lương Excel' : '📤 Tải Lên Bảng Công Excel';
    }
    
    // Gọi function gốc nếu tồn tại
    if (originalShowUploadDialog && typeof originalShowUploadDialog === 'function') {
        originalShowUploadDialog();
    } else {
        // Fallback: tự mở modal
        document.getElementById('uploadModal').classList.add('show');
        document.getElementById('uploadMessage').classList.remove('show');
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
    }
};

// Override handleFileSelect để hỗ trợ upload bảng lương
const originalHandleFileSelect = window.handleFileSelect;
window.handleFileSelect = function(e) {
    const files = e.target.files;
    if (files.length > 0) {
        if (window.currentUploadType === 'salary') {
            uploadSalaryFile(files[0]);
        } else if (typeof originalHandleFileSelect === 'function') {
            originalHandleFileSelect(e);
        } else {
            uploadTimesheetFile(files[0]);
        }
    }
};

// Override handleFileDrop để hỗ trợ kéo thả bảng lương
const originalHandleFileDrop = window.handleFileDrop;
window.handleFileDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        if (window.currentUploadType === 'salary') {
            uploadSalaryFile(files[0]);
        } else if (typeof originalHandleFileDrop === 'function') {
            originalHandleFileDrop(e);
        } else {
            uploadTimesheetFile(files[0]);
        }
    }
};

// Upload file bảng lương
async function uploadSalaryFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
        showUploadMessage('Chỉ chấp nhận file Excel (.xlsx, .xls)', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showUploadMessage('File quá lớn. Giới hạn 10MB', 'error');
        return;
    }
    
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadStatus').textContent = 'Đang tải lên...';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/admin/upload-salary', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUploadMessage(`✅ ${data.message}`, 'success');
            setTimeout(() => {
                closeUploadDialog();
                loadSalariesList();
            }, 1500);
        } else {
            showUploadMessage('❌ ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi upload:', error);
        showUploadMessage('❌ Lỗi kết nối đến server', 'error');
    } finally {
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

// Tải danh sách bảng lương
async function loadSalariesList() {
    const salariesList = document.getElementById('salariesList');
    if (!salariesList) return;
    
    salariesList.innerHTML = '<p style="text-align: center; color: #666;">Đang tải...</p>';
    
    try {
        const response = await fetch('/api/admin/salaries');
        const data = await response.json();
        
        if (data.success) {
            displaySalariesList(data.data);
        } else {
            salariesList.innerHTML = `<p style="text-align: center; color: #721c24;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải danh sách bảng lương:', error);
        salariesList.innerHTML = '<p style="text-align: center; color: #721c24;">Lỗi kết nối đến server</p>';
    }
}

// Hiển thị danh sách bảng lương
function displaySalariesList(salaries) {
    const salariesList = document.getElementById('salariesList');
    if (!salariesList) return;
    
    if (salaries.length === 0) {
        salariesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <p>Chưa có bảng lương nào</p>
                <small>Nhấn nút "Tải Lên Bảng Lương" để bắt đầu</small>
            </div>
        `;
        return;
    }
    
    salariesList.innerHTML = salaries.map(sal => `
        <div class="timesheet-card">
            <div class="timesheet-card-header">
                <div class="timesheet-title">
                    <h4>💰 Bảng lương tháng ${sal.month}/${sal.year}</h4>
                    <small>Tải lên bởi: ${sal.uploader_name || 'N/A'}</small>
                </div>
                <div class="timesheet-actions">
                    <button class="btn-icon" onclick="viewSalaryDetails(${sal.id})" title="Xem chi tiết">👁️</button>
                    <button class="btn-icon" onclick="renameSalaryPrompt(${sal.id}, '${(sal.file_name || '').replace(/'/g, "\\'")}', '${sal.month}/${sal.year}')" title="Đổi tên">✏️</button>
                    <button class="btn-icon btn-danger" onclick="deleteSalary(${sal.id}, '${sal.month}/${sal.year}')" title="Xóa">🗑️</button>
                </div>
            </div>
            <div class="timesheet-card-body">
                <div class="timesheet-stat">
                    <span class="stat-label">👥 Số nhân viên:</span>
                    <span class="stat-value">${sal.employee_count || 0}</span>
                </div>
                <div class="timesheet-stat">
                    <span class="stat-label">📁 File:</span>
                    <span class="stat-value" title="${sal.file_name || 'N/A'}">${sal.file_name ? (sal.file_name.length > 40 ? sal.file_name.substring(0, 40) + '...' : sal.file_name) : 'N/A'}</span>
                </div>
                <div class="timesheet-stat">
                    <span class="stat-label">🕒 Ngày tạo:</span>
                    <span class="stat-value">${formatDate(sal.created_at)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Xem chi tiết bảng lương
async function viewSalaryDetails(salaryId) {
    currentSalaryId = salaryId;
    
    const modal = document.getElementById('timesheetModal');
    const details = document.getElementById('timesheetDetails');
    
    modal.classList.add('show');
    details.innerHTML = '<p style="text-align: center; padding: 40px;">Đang tải...</p>';
    
    try {
        const response = await fetch(`/api/admin/salary/${salaryId}`);
        const data = await response.json();
        
        if (data.success) {
            currentSalaryData = data.data;
            displaySalaryDetails(data.data);
        } else {
            details.innerHTML = `<p style="text-align: center; color: #721c24;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải chi tiết:', error);
        details.innerHTML = '<p style="text-align: center; color: #721c24;">Lỗi kết nối đến server</p>';
    }
}

// Hiển thị chi tiết bảng lương
function displaySalaryDetails(data) {
    const { salary, records } = data;
    const details = document.getElementById('timesheetDetails');
    
    document.getElementById('timesheetModalTitle').textContent = 
        `💰 Bảng lương tháng ${salary.month}/${salary.year}`;
    
    let sheetData = [];
    try {
        if (salary.sheet_data) {
            sheetData = JSON.parse(salary.sheet_data);
        }
    } catch(e) {}
    
    if (!sheetData || sheetData.length === 0) {
        details.innerHTML = '<p style="text-align: center;">Không có dữ liệu chi tiết</p>';
        return;
    }
    
    let html = `
        <div style="margin-bottom: 10px; font-size: 13px; color: #555; background: #fff7e6; border: 1px solid #ffd591; padding: 8px 12px; border-radius: 4px;">
            💡 <strong>Hướng dẫn:</strong> Bạn có thể chỉnh sửa trực tiếp trên ô. Dữ liệu sẽ tự động lưu.
        </div>
        <div class="timesheet-table-wrapper" style="overflow: auto; max-height: 65vh;">
            <table id="editableSalaryTable" class="timesheet-table" style="white-space: nowrap; min-width: 100%;">
    `;
    
    sheetData.forEach((row, rowIndex) => {
        html += '<tr>';
        row.forEach(cell => {
            const cellValue = cell !== null && cell !== undefined ? cell : '';
            if (rowIndex < 10) {
                html += `<th contenteditable="true" style="border: 1px solid #ddd; padding: 8px; background: #fff7e6; outline: none;">${cellValue}</th>`;
            } else {
                html += `<td contenteditable="true" style="border: 1px solid #ddd; padding: 8px; outline: none;">${cellValue}</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += `
            </table>
        </div>
        <div class="timesheet-footer">
            <button class="btn-secondary" onclick="closeSalaryModal()" style="background: #faad14; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Đóng</button>
        </div>
    `;
    
    details.innerHTML = html;
}

// Đóng modal bảng lương
function closeSalaryModal() {
    document.getElementById('timesheetModal').classList.remove('show');
    currentSalaryId = null;
}

// Xóa bảng lương
async function deleteSalary(id, monthYear) {
    if (!confirm(`Bạn có chắc muốn xóa bảng lương tháng ${monthYear}?`)) return;
    
    try {
        const response = await fetch(`/api/admin/salary/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã xóa bảng lương thành công');
            loadSalariesList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi xóa:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}

// Đổi tên bảng lương
function renameSalaryPrompt(id, currentName, monthYear) {
    const newName = prompt(`Đổi tên bảng lương tháng ${monthYear}:`, currentName);
    if (newName && newName.trim() !== '' && newName !== currentName) {
        renameSalary(id, newName.trim());
    }
}

async function renameSalary(id, newFileName) {
    try {
        const response = await fetch(`/api/admin/salary/${id}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_name: newFileName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã đổi tên thành công');
            loadSalariesList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi đổi tên:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}
