// Biến toàn cục
let isAdminMode = false;
let currentUser = null;

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Khởi tạo ứng dụng
function initializeApp() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleFormSubmit);
    }

    const normalBtn = document.getElementById('normalModeBtn');
    if (normalBtn) normalBtn.addEventListener('click', () => switchMode(false));
    
    const adminBtn = document.getElementById('adminModeBtn');
    if (adminBtn) adminBtn.addEventListener('click', () => switchMode(true));

    // Kiểm tra session hiện tại
    checkSession();
}

function toggleAdminMode() {
    switchMode(!isAdminMode);
}

// Chuyển đổi giữa chế độ tra cứu và admin
function switchMode(adminMode) {
    isAdminMode = adminMode;
    
    const passwordGroup = document.querySelector('.password-group');
    const passwordInput = document.getElementById('password');
    const passwordHelp = document.getElementById('passwordHelp');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const usernameLabel = document.getElementById('usernameLabel') || document.querySelector('label[for="username"]');
    const usernameInput = document.getElementById('username');
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const loginSubtitle = document.querySelector('.login-subtitle');
    
    if (adminMode) {
        // Chế độ Admin
        if (passwordGroup) passwordGroup.classList.remove('hidden');
        if (passwordInput) passwordInput.required = true;
        if (passwordHelp) passwordHelp.textContent = 'Yêu cầu nhập tên đăng nhập và mật khẩu Quản trị viên';
        if (btnText) btnText.textContent = 'Đăng Nhập Admin';
        if (usernameLabel) usernameLabel.textContent = 'Tên Đăng Nhập Admin';
        if (usernameInput) usernameInput.placeholder = 'Nhập tên đăng nhập Admin';
        if (loginSubtitle) loginSubtitle.textContent = 'Đăng nhập hệ thống quản trị viên';
        if (adminToggleBtn) adminToggleBtn.innerHTML = '👤 Quay lại Tra Cứu Nhân Viên';
    } else {
        // Chế độ Nhân viên
        if (passwordGroup) passwordGroup.classList.remove('hidden');
        if (passwordInput) passwordInput.required = true;
        if (passwordHelp) passwordHelp.textContent = 'Nhập MSNV và Mật khẩu từ bảng công';
        if (btnText) btnText.textContent = 'Đăng Nhập Tra Cứu';
        if (usernameLabel) usernameLabel.textContent = 'Mã Số Nhân Viên (MSNV)';
        if (usernameInput) usernameInput.placeholder = 'Nhập MSNV của bạn (ví dụ: 732304078)';
        if (loginSubtitle) loginSubtitle.textContent = 'Nhập MSNV và Mật khẩu từ bảng công để tra cứu';
        if (adminToggleBtn) adminToggleBtn.innerHTML = '⚙️ Đăng nhập dành cho Quản trị viên';
    }
    
    // Xóa thông báo lỗi cũ
    hideMessage();
}

// Xử lý submit form
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    
    // Validate
    if (!username) {
        showMessage('Vui lòng nhập MSNV', 'error');
        return;
    }
    
    if (isAdminMode) {
        // Đăng nhập Admin
        if (!password) {
            showMessage('Vui lòng nhập mật khẩu', 'error');
            return;
        }
        await loginUser(username, password, true);
    } else {
        // Đăng nhập nhân viên bằng MSNV + Mật khẩu
        if (!password) {
            showMessage('Vui lòng nhập mật khẩu', 'error');
            return;
        }
        await loginEmployee(username, password);
    }
}

// Tra cứu thông tin người dùng (không cần đăng nhập)
async function lookupUser(username) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    
    try {
        // Disable button
        submitBtn.disabled = true;
        btnText.innerHTML = '<span class="spinner"></span>Đang tra cứu...';
        
        const response = await fetch('/api/lookup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                displayUserResult(data.data);
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi tra cứu:', error);
        showMessage('Lỗi kết nối đến server', 'error');
    } finally {
        // Enable button
        submitBtn.disabled = false;
        btnText.textContent = 'Tra Cứu';
    }
}

// Đăng nhập Nhân Viên hoặc Admin bằng MSNV / Tài khoản + Mật khẩu
async function loginEmployee(employee_id, password) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    
    try {
        submitBtn.disabled = true;
        btnText.innerHTML = '<span class="spinner"></span>Đang đăng nhập...';
        
        const response = await fetch('/api/employee/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data;
            showMessage(data.message, 'success');
            setTimeout(() => {
                if (data.isAdmin || data.data.role === 'admin') {
                    showAdminPage();
                } else {
                    showEmployeePage(data.data);
                }
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        showMessage('Lỗi kết nối đến server', 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Đăng Nhập Tra Cứu';
    }
}

// Hiển thị trang bảng công nhân viên
async function showEmployeePage(employee) {
    document.getElementById('userMSNV').textContent = employee.employee_id;
    document.getElementById('userFullName').textContent = employee.employee_name;
    showPage('userResultPage');
    
    const section = document.getElementById('userTimesheetSection');
    section.style.display = 'block';
    
    // Tải toàn bộ bảng công của nhân viên
    try {
        const response = await fetch('/api/employee/my-timesheets');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            userTimesheets = data.data;
            currentMonthIndex = 0;
            populateMonthSelector();
            displayEmployeeTimesheetSummary(userTimesheets[0]);
        } else {
            document.getElementById('summaryTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center">Chưa có bảng công nào</td></tr>';
        }
    } catch (error) {
        console.error('Lỗi tải bảng công:', error);
    }
}

// Đăng nhập (user hoặc admin) - legacy
async function loginUser(username, password, loginAsAdmin) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    
    try {
        // Disable button
        submitBtn.disabled = true;
        btnText.innerHTML = '<span class="spinner"></span>Đang đăng nhập...';
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, loginAsAdmin })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data;
            showMessage(data.message, 'success');
            
            setTimeout(() => {
                if (data.data.role === 'admin') {
                    showAdminPage();
                } else {
                    displayUserResult(data.data);
                }
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        showMessage('Lỗi kết nối đến server', 'error');
    } finally {
        // Enable button
        submitBtn.disabled = false;
        btnText.textContent = loginAsAdmin ? 'Đăng Nhập Admin' : 'Tra Cứu';
    }
}

// Hiển thị kết quả tra cứu user
function displayUserResult(user) {
    // Cập nhật thông tin header
    document.getElementById('userMSNV').textContent = user.employee_id || user.username;
    document.getElementById('userFullName').textContent = user.full_name;
    
    showPage('userResultPage');
    
    // Tải bảng công của user (nếu có)
    loadUserTimesheet(user.id);
}

// Hiển thị trang admin
async function showAdminPage() {
    const adminWelcome = document.getElementById('adminWelcome');
    adminWelcome.textContent = `Xin chào, ${currentUser.full_name}`;
    
    showPage('adminPage');
    await loadTimesheetsList();

    // Tự động khôi phục mở lại modal bảng công nếu đang mở trước khi bấm F5
    const activeId = sessionStorage.getItem('activeTimesheetId');
    if (activeId) {
        viewTimesheetDetails(parseInt(activeId));
    }
}

// Tải danh sách người dùng (admin)
async function loadUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<p style="text-align: center; color: #666;">Đang tải...</p>';
    
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            displayUsersList(data.data);
        } else {
            usersList.innerHTML = `<p style="text-align: center; color: #721c24;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải danh sách:', error);
        usersList.innerHTML = '<p style="text-align: center; color: #721c24;">Lỗi kết nối đến server</p>';
    }
}

// Hiển thị danh sách người dùng
function displayUsersList(users) {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = '<p style="text-align: center; color: #666;">Không có người dùng nào</p>';
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-card-header">
                <div class="user-name">${user.full_name}</div>
                <div>
                  <span class="user-role ${user.role}">${user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
                  ${user.role !== 'admin' ? `<button onclick="deleteUser(${user.id}, '${user.full_name}')" style="margin-left: 10px; padding: 4px 8px; font-size: 12px; cursor: pointer; border: none; border-radius: 4px; background: #ff4d4f; color: white;">Xóa</button>` : ''}
                </div>
            </div>
            <div class="user-details">
                <div class="detail-item">
                    <span class="detail-label">Tên đăng nhập:</span>
                    <span class="detail-value">${user.username}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phòng ban:</span>
                    <span class="detail-value">${user.department || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Chức vụ:</span>
                    <span class="detail-value">${user.position || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ngày tạo:</span>
                    <span class="detail-value">${formatDate(user.created_at)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteUser(id, name) {
    if (confirm(`Bạn có chắc muốn xóa người dùng "${name}"?`)) {
        try {
            const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('Đã xóa thành công');
                loadUsersList();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert('Lỗi kết nối');
        }
    }
}

// Đăng xuất
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        await fetch('/api/employee/logout', { method: 'POST' });
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
    }
    
    currentUser = null;
    isAdminMode = false;
    sessionStorage.removeItem('activeTimesheetId');
    
    // Reset form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    
    switchMode(false);
    showPage('loginPage');
    hideMessage();
}

// Kiểm tra session
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = {
                id: data.id,
                username: data.username,
                role: data.role,
                full_name: data.full_name,
                employee_id: data.employee_id
            };

            // Tự động khôi phục đúng trang sau khi F5
            if (data.role === 'admin') {
                showAdminPage();
            } else {
                displayUserResult(currentUser);
            }
        }
    } catch (error) {
        console.error('Lỗi kiểm tra session:', error);
    }
}

// Hiển thị trang
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Hiển thị thông báo
function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type} show`;
}

// Ẩn thông báo
function hideMessage() {
    const message = document.getElementById('message');
    message.classList.remove('show');
}

// Format ngày tháng
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}


// ============= QUẢN LÝ BẢNG CÔNG =============

let currentTimesheetId = null;
let currentTimesheetData = null;

// Chuyển tab trong admin
function switchAdminTab(tabName) {
    // Xóa active khỏi tất cả tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Active tab được chọn
    event.target.classList.add('active');
    
    if (tabName === 'users') {
        document.getElementById('usersTab').classList.add('active');
        loadUsersList();
    } else if (tabName === 'timesheets') {
        document.getElementById('timesheetsTab').classList.add('active');
        loadTimesheetsList();
    }
}

// Hiển thị dialog upload
function showUploadDialog() {
    document.getElementById('uploadModal').classList.add('show');
    document.getElementById('uploadMessage').classList.remove('show');
    
    // Setup file input
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    fileInput.addEventListener('change', handleFileSelect);
    
    // Setup drag and drop
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
}

// Đóng dialog upload
function closeUploadDialog() {
    document.getElementById('uploadModal').classList.remove('show');
    document.getElementById('uploadProgress').style.display = 'none';
}

// Xử lý kéo file
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadTimesheetFile(files[0]);
    }
}

// Xử lý chọn file
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        uploadTimesheetFile(files[0]);
    }
}

// Upload file bảng công
async function uploadTimesheetFile(file) {
    // Kiểm tra file
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
        showUploadMessage('Chỉ chấp nhận file Excel (.xlsx, .xls)', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showUploadMessage('File quá lớn. Giới hạn 10MB', 'error');
        return;
    }
    
    // Hiển thị progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadStatus').textContent = 'Đang tải lên...';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/admin/upload-timesheet', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUploadMessage(`✅ ${data.message} (${data.data.recordCount} nhân viên)`, 'success');
            setTimeout(() => {
                closeUploadDialog();
                loadTimesheetsList();
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

// Hiển thị message trong upload dialog
function showUploadMessage(text, type) {
    const message = document.getElementById('uploadMessage');
    message.textContent = text;
    message.className = `message ${type} show`;
}

// Tải danh sách bảng công
async function loadTimesheetsList() {
    const timesheetsList = document.getElementById('timesheetsList');
    timesheetsList.innerHTML = '<p style="text-align: center; color: #666;">Đang tải...</p>';
    
    try {
        const response = await fetch('/api/admin/timesheets');
        const data = await response.json();
        
        if (data.success) {
            displayTimesheetsList(data.data);
        } else {
            timesheetsList.innerHTML = `<p style="text-align: center; color: #721c24;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải danh sách bảng công:', error);
        timesheetsList.innerHTML = '<p style="text-align: center; color: #721c24;">Lỗi kết nối đến server</p>';
    }
}

// Hiển thị danh sách bảng công
function displayTimesheetsList(timesheets) {
    const timesheetsList = document.getElementById('timesheetsList');
    
    if (timesheets.length === 0) {
        timesheetsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Chưa có bảng công nào</p>
                <small>Nhấn nút "Tải Lên Bảng Công" để bắt đầu</small>
            </div>
        `;
        return;
    }
    
    timesheetsList.innerHTML = timesheets.map(ts => `
        <div class="timesheet-card">
            <div class="timesheet-card-header">
                <div class="timesheet-title">
                    <h4>📅 Bảng công tháng ${ts.month}/${ts.year}</h4>
                    <small>Tải lên bởi: ${ts.uploader_name || 'N/A'}</small>
                </div>
                <div class="timesheet-actions">
                    <button class="btn-icon" onclick="viewTimesheetDetails(${ts.id})" title="Xem chi tiết">
                        👁️
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteTimesheet(${ts.id}, '${ts.month}/${ts.year}')" title="Xóa">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="timesheet-card-body">
                <div class="timesheet-stat">
                    <span class="stat-label">👥 Số nhân viên:</span>
                    <span class="stat-value">${ts.employee_count}</span>
                </div>
                <div class="timesheet-stat">
                    <span class="stat-label">📁 File:</span>
                    <span class="stat-value">${ts.file_name || 'N/A'}</span>
                </div>
                <div class="timesheet-stat">
                    <span class="stat-label">🕒 Ngày tạo:</span>
                    <span class="stat-value">${formatDate(ts.created_at)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Xem chi tiết bảng công
async function viewTimesheetDetails(timesheetId) {
    currentTimesheetId = timesheetId;
    sessionStorage.setItem('activeTimesheetId', timesheetId);
    
    const modal = document.getElementById('timesheetModal');
    const details = document.getElementById('timesheetDetails');
    
    modal.classList.add('show');
    details.innerHTML = '<p style="text-align: center; padding: 40px;">Đang tải...</p>';
    
    try {
        const response = await fetch(`/api/admin/timesheet/${timesheetId}`);
        const data = await response.json();
        
        if (data.success) {
            currentTimesheetData = data.data;
            displayTimesheetDetails(data.data);
        } else {
            details.innerHTML = `<p style="text-align: center; color: #721c24;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải chi tiết:', error);
        details.innerHTML = '<p style="text-align: center; color: #721c24;">Lỗi kết nối đến server</p>';
    }
}

// Hiển thị chi tiết bảng công
function displayTimesheetDetails(data) {
    const { timesheet, records } = data;
    const details = document.getElementById('timesheetDetails');
    
    currentTimesheetId = timesheet.id;
    
    document.getElementById('timesheetModalTitle').textContent = 
        `📊 Bảng công tháng ${timesheet.month}/${timesheet.year}`;
        
    let sheetData = [];
    try {
        if (timesheet.sheet_data) {
            sheetData = JSON.parse(timesheet.sheet_data);
        }
    } catch(e) {}
    
    if (!sheetData || sheetData.length === 0) {
        details.innerHTML = '<p style="text-align: center;">Không có dữ liệu chi tiết từ file Excel</p>';
        return;
    }
    
    let html = `
        <div style="margin-bottom: 10px; font-size: 13px; color: #555; background: #e6f7ff; border: 1px solid #91d5ff; padding: 8px 12px; border-radius: 4px;">
            💡 <strong>Hướng dẫn:</strong> Bạn có thể nhấp chuột trực tiếp vào bất kỳ ô nào bên dưới để chỉnh sửa nội dung. Dữ liệu sẽ <strong>tự động lưu</strong> vào hệ thống khi bấm nút <strong>Đóng</strong>.
        </div>
        <div class="timesheet-table-wrapper" style="overflow: auto; max-height: 65vh;">
            <table id="editableTimesheetTable" class="timesheet-table" style="white-space: nowrap; min-width: 100%;">
    `;
    
    sheetData.forEach((row, rowIndex) => {
        html += '<tr>';
        row.forEach(cell => {
            const cellValue = cell !== null && cell !== undefined ? cell : '';
            if (rowIndex < 10) {
                 html += `<th contenteditable="true" style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa; outline: none;">${cellValue}</th>`;
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
            <button class="btn-secondary" onclick="closeTimesheetModal()" style="background: #1890ff; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Đóng & Lưu</button>
        </div>
    `;
    
    details.innerHTML = html;

    // Tự động lưu ngầm mỗi khi rời khỏi một ô vừa chỉnh sửa
    const table = document.getElementById('editableTimesheetTable');
    if (table) {
        table.addEventListener('focusout', (e) => {
            if (e.target && (e.target.tagName === 'TD' || e.target.tagName === 'TH')) {
                saveCurrentTimesheetDataSilent();
            }
        });
    }
}

// Lưu dữ liệu bảng công ngầm khi chỉnh sửa ô
async function saveCurrentTimesheetDataSilent() {
    const table = document.getElementById('editableTimesheetTable');
    if (table && currentTimesheetId) {
        const rows = Array.from(table.rows);
        const updatedSheetData = rows.map(tr => 
            Array.from(tr.cells).map(cell => cell.innerText.trim())
        );

        try {
            await fetch(`/api/admin/timesheet/${currentTimesheetId}/sheet-data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sheet_data: updatedSheetData })
            });
        } catch (err) {
            console.error('Lỗi khi tự động lưu ngầm:', err);
        }
    }
}

// Xử lý chỉnh sửa cell
function handleCellEdit(cell) {
    const recordId = cell.dataset.recordId;
    const day = cell.dataset.day;
    const type = cell.dataset.type;
    const value = cell.textContent.trim();
    
    // Validate số
    if (value !== '' && isNaN(value)) {
        alert('Vui lòng nhập số');
        cell.textContent = '';
        return;
    }
    
    // Lưu thay đổi vào currentTimesheetData
    const record = currentTimesheetData.records.find(r => r.id === parseInt(recordId));
    if (record) {
        if (!record.day_data[day]) {
            record.day_data[day] = { tc: null, pt: null };
        }
        record.day_data[day][type] = value !== '' ? parseFloat(value) : null;
        
        // Tính lại tổng công
        let total = 0;
        Object.values(record.day_data).forEach(d => {
            if (d.tc) total += d.tc;
        });
        record.total_work_days = total;
        
        // Cập nhật hiển thị tổng
        const row = cell.closest('tr');
        const totalCell = row.querySelector('.total-cell');
        if (totalCell) {
            totalCell.textContent = total;
        }
    }
}

// Xử lý chỉnh sửa trường (password, cccd)
function handleFieldEdit(cell) {
    const recordId = cell.dataset.recordId;
    const field = cell.dataset.field;
    const value = cell.textContent.trim();
    
    // Lưu thay đổi vào currentTimesheetData
    const record = currentTimesheetData.records.find(r => r.id === parseInt(recordId));
    if (record) {
        record[field] = value;
    }
}

// Lưu thay đổi bảng công
async function saveTimesheetChanges() {
    if (!currentTimesheetData) return;
    
    const btnSave = event.target;
    btnSave.disabled = true;
    btnSave.textContent = '⏳ Đang lưu...';
    
    try {
        // Gửi từng record đã thay đổi
        const promises = currentTimesheetData.records.map(record => {
            return fetch(`/api/admin/timesheet-record/${record.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_data: record.day_data,
                    total_work_days: record.total_work_days,
                    overtime_weekday: record.overtime_weekday,
                    overtime_weekend: record.overtime_weekend,
                    overtime_holiday: record.overtime_holiday,
                    night_shift: record.night_shift,
                    total_salary: record.total_salary,
                    password: record.password,
                    cccd: record.cccd,
                    notes: record.notes
                })
            });
        });
        
        await Promise.all(promises);
        
        alert('✅ Đã lưu thay đổi thành công!');
        closeTimesheetModal();
        loadTimesheetsList();
    } catch (error) {
        console.error('Lỗi lưu:', error);
        alert('❌ Lỗi khi lưu thay đổi');
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = '💾 Lưu Thay Đổi';
    }
}

// Đóng modal chi tiết và tự động lưu thay đổi
async function closeTimesheetModal() {
    const table = document.getElementById('editableTimesheetTable');
    if (table && currentTimesheetId) {
        const closeBtn = document.querySelector('.timesheet-footer .btn-secondary');
        if (closeBtn) {
            closeBtn.disabled = true;
            closeBtn.textContent = '⏳ Đang tự động lưu...';
        }

        const rows = Array.from(table.rows);
        const updatedSheetData = rows.map(tr => 
            Array.from(tr.cells).map(cell => cell.innerText.trim())
        );

        try {
            await fetch(`/api/admin/timesheet/${currentTimesheetId}/sheet-data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sheet_data: updatedSheetData })
            });
        } catch (err) {
            console.error('Lỗi khi tự động lưu:', err);
        }
    }

    document.getElementById('timesheetModal').classList.remove('show');
    sessionStorage.removeItem('activeTimesheetId');
    currentTimesheetId = null;
    currentTimesheetData = null;
}

// Xóa bảng công
async function deleteTimesheet(timesheetId, monthYear) {
    if (!confirm(`Bạn có chắc muốn xóa bảng công tháng ${monthYear}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/timesheet/${timesheetId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã xóa bảng công');
            sessionStorage.removeItem('activeTimesheetId');
            loadTimesheetsList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi xóa:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}


// ============= BẢNG CÔNG USER =============

let userTimesheets = [];
let currentMonthIndex = 0;

// Load bảng công của user
async function loadUserTimesheet(userId) {
    const section = document.getElementById('userTimesheetSection');
    
    try {
        const response = await fetch('/api/user/my-timesheet');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            userTimesheets = data.data;
            currentMonthIndex = 0;
            
            // Populate month selector
            populateMonthSelector();
            
            // Hiển thị tháng đầu tiên
            displayUserTimesheetSummary(userTimesheets[0]);
            
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi tải bảng công:', error);
        section.style.display = 'none';
    }
}

// Populate month selector
function populateMonthSelector() {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    select.innerHTML = userTimesheets.map((ts, index) => `
        <option value="${index}">Tháng ${ts.month}/${ts.year}</option>
    `).join('');
    select.value = currentMonthIndex;
}

// Load tháng được chọn
function loadSelectedMonth() {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    currentMonthIndex = parseInt(select.value);
    displayUserTimesheetSummary(userTimesheets[currentMonthIndex]);
}

// Chuyển tháng
function changeUserMonth(direction) {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    currentMonthIndex += direction;
    if (currentMonthIndex < 0) currentMonthIndex = userTimesheets.length - 1;
    if (currentMonthIndex >= userTimesheets.length) currentMonthIndex = 0;
    
    select.value = currentMonthIndex;
    displayUserTimesheetSummary(userTimesheets[currentMonthIndex]);
}

// Hiển thị bảng tổng hợp
function displayUserTimesheetSummary(record) {
    document.getElementById('detailTableHeader').textContent = 
        `Chi tiết bảng công tháng ${String(record.month).padStart(2, '0')}-${record.year}`;
    
    const summaryBody = document.getElementById('summaryTableBody');
    let html = '';

    if (record.headers && record.headers.length > 0 && record.raw_row) {
        // Build an aggregated header array
        let aggHeaders = [];
        const maxCols = Math.max(record.headers[0].length, record.raw_row.length);
        
        // Try to combine headers if there are multiple rows
        for (let i = 0; i < maxCols; i++) {
            let labelParts = [];
            for (let r = 0; r < record.headers.length; r++) {
                if (record.headers[r][i] && String(record.headers[r][i]).trim() !== '') {
                    // Avoid duplicating the same label part
                    const part = String(record.headers[r][i]).trim();
                    if (!labelParts.includes(part)) {
                        labelParts.push(part);
                    }
                }
            }
            aggHeaders.push(labelParts.join(' - '));
        }

        let rowHtml = '';
        let cellCount = 0;
        
        for (let i = 0; i < maxCols; i++) {
            const label = aggHeaders[i] || `Cột ${i+1}`;
            const val = record.raw_row[i] !== null && record.raw_row[i] !== undefined ? record.raw_row[i] : '';
            
            // Skip empty columns
            if (label === `Cột ${i+1}` && val === '') continue;

            if (cellCount % 2 === 0) rowHtml += '<tr>';
            rowHtml += `<td class="stat-label"><strong>${label}</strong></td><td class="stat-value">${val}</td>`;
            if (cellCount % 2 === 1) rowHtml += '</tr>';
            
            cellCount++;
        }
        if (cellCount % 2 !== 0) rowHtml += '<td colspan="2"></td></tr>';
        html = rowHtml;
    } else {
        html = '<tr><td colspan="4" style="text-align: center">Chưa có dữ liệu gốc của Excel. Vui lòng tải lên lại file.</td></tr>';
    }

    summaryBody.innerHTML = html;
    
    // Hide old details table
    const detailHeader = document.querySelector('.timesheet-detail h3:nth-of-type(2)');
    if (detailHeader) detailHeader.style.display = 'none';
    const detailTable = document.getElementById('detailTableBody');
    if (detailTable) detailTable.closest('table').style.display = 'none';
}

// Hiển thị bảng tổng hợp cho nhân viên (đúng format ảnh mẫu)
function displayEmployeeTimesheetSummary(record) {
    document.getElementById('detailTableHeader').textContent =
        `Bảng công chi tiết tháng ${String(record.month).padStart(2, '0')}-${record.year}`;

    let congCaNgay = 0, cnChuNhat = 0, congLe = 0, caDem = 0, congCNDem = 0, congLeDem = 0;
    let phuTroiNgay = 0, phuTroiCN = 0, phuTroiLe = 0, phuTroiDem = 0, phuTroiCNDem = 0, phuTroiLeDem = 0;
    let totalCong = 0;

    const dayData = record.day_data || {};
    const summary = dayData._summary || {};
    const rawRow = Array.isArray(record.raw_row) ? record.raw_row : (typeof record.raw_row === 'string' ? JSON.parse(record.raw_row || '[]') : []);

    const parseVal = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(val)) ? parseFloat(val) : null;

    if (summary.cong_ca_ngay !== undefined && summary.cong_ca_ngay !== null) {
        congCaNgay = summary.cong_ca_ngay || 0;
        cnChuNhat = summary.cn_chu_nhat || 0;
        congLe = summary.cong_ngay_le || 0;
        caDem = summary.ca_dem || 0;
        congCNDem = summary.cong_cn_dem || 0;
        congLeDem = summary.cong_le_dem || 0;
        phuTroiNgay = summary.phu_troi_ngay || 0;
        phuTroiCN = summary.phu_troi_cn_ngay || 0;
        phuTroiLe = summary.phu_troi_le_ngay || 0;
        phuTroiDem = summary.phu_troi_dem || 0;
        phuTroiCNDem = summary.phu_troi_cn_dem || 0;
        phuTroiLeDem = summary.phu_troi_le_dem || 0;
        totalCong = summary.tong_cong !== null ? summary.tong_cong : (congCaNgay + cnChuNhat + congLe + caDem + congCNDem + congLeDem);
    } else if (rawRow.length > 68) {
        // Read directly from standard Excel summary column indices
        congCaNgay = parseVal(rawRow[68]) || 0;
        cnChuNhat = parseVal(rawRow[69]) || 0;
        congLe = parseVal(rawRow[70]) || 0;
        caDem = parseVal(rawRow[71]) || 0;
        congCNDem = parseVal(rawRow[72]) || 0;
        congLeDem = parseVal(rawRow[73]) || 0;
        phuTroiNgay = parseVal(rawRow[74]) || 0;
        phuTroiCN = parseVal(rawRow[75]) || 0;
        phuTroiLe = parseVal(rawRow[76]) || 0;
        phuTroiDem = parseVal(rawRow[77]) || 0;
        phuTroiCNDem = parseVal(rawRow[78]) || 0;
        phuTroiLeDem = parseVal(rawRow[79]) || 0;
        totalCong = parseVal(rawRow[80]) !== null ? parseVal(rawRow[80]) : (congCaNgay + cnChuNhat + congLe + caDem + congCNDem + congLeDem);
    } else {
        // Fallback: calculate công by converting TC hours (8 hours = 1 công)
        for (let day = 1; day <= 31; day++) {
            const d = dayData[day];
            if (!d) continue;

            const date = new Date(record.year, record.month - 1, day);
            const dow = date.getDay(); // 0=CN, 6=T7

            const tcHours = (d.tc !== null && d.tc !== undefined && d.tc !== '' && d.tc !== 'TS') ? parseFloat(d.tc) || 0 : 0;
            const pt = (d.pt !== null && d.pt !== undefined && d.pt !== '') ? parseFloat(d.pt) || 0 : 0;
            const cong = tcHours / 8.0;

            if (dow === 0) {
                cnChuNhat += cong;
                phuTroiCN += pt;
            } else {
                congCaNgay += cong;
                phuTroiNgay += pt;
            }
        }
        totalCong = congCaNgay + cnChuNhat + congLe + caDem + congLeDem;
    }

    // --- Render bảng tổng hợp ---
    const summaryBody = document.getElementById('summaryTableBody');
    summaryBody.innerHTML = `
        <tr>
            <td class="stat-label">Công ca ngày</td>
            <td class="stat-value">${congCaNgay.toFixed(2)}</td>
            <td class="stat-label">Phụ trội ngày</td>
            <td class="stat-value">${phuTroiNgay.toFixed(1)}</td>
        </tr>
        <tr>
            <td class="stat-label">CN chủ nhật</td>
            <td class="stat-value">${cnChuNhat.toFixed(2)}</td>
            <td class="stat-label">Phụ trội chủ nhật ngày</td>
            <td class="stat-value">${phuTroiCN.toFixed(1)}</td>
        </tr>
        <tr>
            <td class="stat-label">Công ngày lễ</td>
            <td class="stat-value">${congLe.toFixed(2)}</td>
            <td class="stat-label">Phụ trội lễ ngày</td>
            <td class="stat-value">${phuTroiLe.toFixed(1)}</td>
        </tr>
        <tr>
            <td class="stat-label">Ca đêm trong ca</td>
            <td class="stat-value">${caDem.toFixed(2)}</td>
            <td class="stat-label">Phụ trội đêm</td>
            <td class="stat-value">${phuTroiDem.toFixed(1)}</td>
        </tr>
        <tr>
            <td class="stat-label">Công Chủ nhật đêm</td>
            <td class="stat-value">${congCNDem ? congCNDem.toFixed(2) : ''}</td>
            <td class="stat-label">Phụ trội CN đêm</td>
            <td class="stat-value">${phuTroiCNDem.toFixed(1)}</td>
        </tr>
        <tr>
            <td class="stat-label">Công ngày lễ đêm</td>
            <td class="stat-value">${congLeDem.toFixed(2)}</td>
            <td class="stat-label">Phụ trội lễ đêm</td>
            <td class="stat-value">${phuTroiLeDem.toFixed(1)}</td>
        </tr>
        <tr class="total-row">
            <td class="stat-label"><strong>Tổng công tính lương</strong></td>
            <td class="stat-value total-value" style="color:#c00;">${totalCong.toFixed(2)}</td>
            <td colspan="2"></td>
        </tr>
    `;

    // --- Render bảng chi tiết từng ngày ---
    const detailTable = document.getElementById('detailTableBody');
    detailTable.closest('table').style.display = '';
    let detailHtml = '';

    for (let day = 1; day <= 31; day++) {
        const d = dayData[day];
        const date = new Date(record.year, record.month - 1, day);
        const dow = date.getDay();
        const isSunday = dow === 0;
        const isSaturday = dow === 6;

        const tcVal = (d && d.tc !== null && d.tc !== undefined) ? d.tc : '';
        const ptVal = (d && d.pt !== null && d.pt !== undefined) ? d.pt : '';

        if (tcVal !== '' || ptVal !== '') {
            detailHtml += `
                <tr class="${isSunday ? 'sunday-row' : (isSaturday ? 'saturday-row' : '')}">
                    <td class="day-label">Ngày ${day}</td>
                    <td class="tc-value">${tcVal}</td>
                    <td class="pt-value">${ptVal}</td>
                </tr>`;
        }
    }

    detailTable.innerHTML = detailHtml;
}

// Tải tháng được chọn (nhân viên)
function loadSelectedMonth() {
    const select = document.getElementById('monthSelect');
    currentMonthIndex = parseInt(select.value);
    displayEmployeeTimesheetSummary(userTimesheets[currentMonthIndex]);
}

// Chuyển tháng (nhân viên)  
function changeUserMonth(direction) {
    currentMonthIndex += direction;
    if (currentMonthIndex < 0) currentMonthIndex = userTimesheets.length - 1;
    if (currentMonthIndex >= userTimesheets.length) currentMonthIndex = 0;
    
    document.getElementById('monthSelect').value = currentMonthIndex;
    displayEmployeeTimesheetSummary(userTimesheets[currentMonthIndex]);
}

// Tính toán thống kê bảng công
function calculateTimesheetStats(record) {
    const stats = {
        regularDays: 0,
        sunday: 0,
        holiday: 0,
        nightShift: 0,
        holidayNight: 0,
        overtimeDay: 0,
        overtimeSunday: 0,
        overtimeHoliday: 0,
        overtimeNight: 0,
        overtimeSundayNight: 0,
        overtimeHolidayNight: 0,
        totalWorkDays: 0
    };
    
    // Parse từ database hoặc tính toán
    stats.regularDays = record.total_work_days || 0;
    stats.overtimeDay = record.overtime_weekday || 0;
    stats.overtimeSunday = record.overtime_weekend || 0;
    stats.overtimeHoliday = record.overtime_holiday || 0;
    stats.nightShift = record.night_shift || 0;
    stats.totalWorkDays = stats.regularDays;
    
    return stats;
}

// Hiển thị chi tiết theo ngày
function displayDailyDetails(record) {
    const detailBody = document.getElementById('detailTableBody');
    const daysInMonth = 31;
    let html = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayData = record.day_data[day] || { tc: null, pt: null };
        
        // Chỉ hiển thị ngày có dữ liệu
        if (dayData.tc !== null || dayData.pt !== null) {
            const tcValue = dayData.tc !== null ? (dayData.tc === 'TS' ? 'TS' : dayData.tc) : '';
            const ptValue = dayData.pt !== null ? dayData.pt : '';
            
            // Kiểm tra ngày cuối tuần
            const date = new Date(record.year, record.month - 1, day);
            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;
            
            html += `
                <tr class="${isSunday ? 'sunday-row' : (isSaturday ? 'saturday-row' : '')}">
                    <td class="day-label">Ngày ${day}</td>
                    <td class="tc-value">${tcValue}</td>
                    <td class="pt-value">${ptValue}</td>
                </tr>
            `;
        }
    }
    
    detailBody.innerHTML = html;
}
