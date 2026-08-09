// Biến toàn cục
let isAdminMode = false;
let currentUser = null;
let currentUploadType = 'timesheet'; // 'timesheet' hoặc 'salary'

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // Gắn sự kiện cho file input upload (đáng tin cậy hơn inline onchange)
    const excelFileInput = document.getElementById('excelFileInput');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', function(e) {
            onExcelFileSelected(e);
        });
    }
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

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Kiểm tra session hiện tại
    checkSession();
    
    // Setup session timeout checker
    setupSessionTimeoutChecker();
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
        if (passwordInput) {
            passwordInput.required = true;
            passwordInput.placeholder = 'Nhập mật khẩu Admin';
        }
        if (passwordHelp) passwordHelp.textContent = 'Yêu cầu nhập tên đăng nhập và mật khẩu Quản trị viên';
        if (btnText) btnText.textContent = 'Đăng Nhập Admin';
        if (usernameLabel) usernameLabel.textContent = 'Tên Đăng Nhập Admin';
        if (usernameInput) usernameInput.placeholder = 'Nhập tên đăng nhập Admin';
        if (loginSubtitle) loginSubtitle.textContent = 'Đăng nhập hệ thống quản trị viên';
        if (adminToggleBtn) adminToggleBtn.innerHTML = '👤 Quay lại Tra Cứu Nhân Viên';
    } else {
        // Chế độ Nhân viên
        if (passwordGroup) passwordGroup.classList.remove('hidden');
        if (passwordInput) {
            passwordInput.required = true;
            passwordInput.placeholder = 'Nhập mật khẩu ( 4 số cuối CCCD)';
        }
        if (passwordHelp) passwordHelp.textContent = '';
        if (btnText) btnText.textContent = 'Đăng Nhập Tra Cứu';
        if (usernameLabel) usernameLabel.textContent = 'Mã Số Nhân Viên (MSNV)';
        if (usernameInput) usernameInput.placeholder = 'Nhập MSNV';
        if (loginSubtitle) loginSubtitle.textContent = '';
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
                routeToRolePage(data.data);
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
    currentUser = employee;
    showPage('userResultPage');

    currentUserViewTab = 'home';
    updateMobileNavUI();
    startNotificationsPolling();

    await Promise.all([
        loadEmployeeTimesheets(),
        loadEmployeeSalaries(),
        loadEmployeeNotifications()
    ]);

    updateUserViewVisibility();
    updateHomeDashboardData();
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
                routeToRolePage(data.data);
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
async function displayUserResult(user) {
    currentUser = user;
    showPage('userResultPage');

    currentUserViewTab = 'home';
    updateMobileNavUI();

    // Tải bảng công và bảng lương của nhân viên
    if (user.role === 'employee' || user.employee_id) {
        await Promise.all([
            loadEmployeeTimesheets(),
            loadEmployeeSalaries(),
            loadEmployeeNotifications()
        ]);
    } else if (user.id) {
        await loadUserTimesheet(user.id);
    }

    updateUserViewVisibility();
    updateHomeDashboardData();
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

// Đăng xuất (Alias cho logout function ở dưới để compatibility)
async function logout() {
    stopNotificationsPolling();
    localStorage.removeItem('tbs_logged_user');
    currentUser = null;
    isAdminMode = false;
    
    try {
        await fetch('/api/logout', { method: 'POST' });
        await fetch('/api/employee/logout', { method: 'POST' });
    } catch(e) {
        console.error('Lỗi đăng xuất:', e);
    }
    
    // Clear session timeout interval
    if (typeof sessionCheckInterval !== 'undefined' && sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
    
    sessionStorage.removeItem('activeTimesheetId');
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    switchMode(false);
    showPage('loginPage');
    hideMessage();
}

// Kiểm tra session
async function checkSession() {
    try {
        // Kiểm tra employee session trước
        const employeeResponse = await fetch('/api/employee/check-session');
        const employeeData = await employeeResponse.json();
        
        if (employeeData.loggedIn && employeeData.employee_id) {
            // Khôi phục nhân viên session từ data
            currentUser = {
                employee_id: employeeData.employee_id,
                employee_name: employeeData.employee_name,
                full_name: employeeData.employee_name,
                role: 'employee'
            };
            
            displayUserResult(currentUser);
            return;
        }
        
        // Kiểm tra user session (admin/user)
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
function showUploadDialog(type) {
    currentUploadType = type || 'timesheet';
    const modalTitle = document.getElementById('uploadModalTitle');
    if (modalTitle) {
        modalTitle.textContent = type === 'salary' ? '📤 Tải Lên File Bảng Lương' : '📤 Tải Lên File Bảng Chấm Công';
    }
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';
    const fileNameEl = document.getElementById('uploadFileName');
    if (fileNameEl) { fileNameEl.textContent = ''; fileNameEl.style.display = 'none'; }
    const msgEl = document.getElementById('uploadMessage');
    if (msgEl) { msgEl.textContent = ''; msgEl.className = 'message'; }
    const dropZone = document.getElementById('uploadDropZone');
    if (dropZone) dropZone.classList.remove('has-file');
    // Disable nút Tải Lên cho đến khi chọn file
    const submitBtn = document.getElementById('uploadSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.add('active');
}


// Đóng dialog upload
function closeUploadDialog() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.remove('active');
    const progressEl = document.getElementById('uploadProgress');
    if (progressEl) progressEl.style.display = 'none';
}

function closeUploadModal() {
    closeUploadDialog();
}

function onExcelFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileNameEl = document.getElementById('uploadFileName');
    if (fileNameEl) {
        fileNameEl.textContent = '📄 ' + file.name;
        fileNameEl.style.display = 'block';
    }
    const dropZone = document.getElementById('uploadDropZone');
    if (dropZone) dropZone.classList.add('has-file');

    // Enable nút Tải Lên
    const submitBtn = document.getElementById('uploadSubmitBtn');
    if (submitBtn) submitBtn.disabled = false;

    // Xoá thông báo lỗi cũ
    const msgEl = document.getElementById('uploadMessage');
    if (msgEl) { msgEl.textContent = ''; msgEl.className = 'message'; }
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
        if (currentUploadType === 'salary') {
            uploadSalaryFile(files[0]);
        } else {
            uploadTimesheetFile(files[0]);
        }
    }
}

// Xử lý chọn file
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        if (currentUploadType === 'salary') {
            uploadSalaryFile(files[0]);
        } else {
            uploadTimesheetFile(files[0]);
        }
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
            showUploadMessage(`✅ ${data.message}`, 'success');
            setTimeout(() => {
                closeUploadModal();
                loadTimesheetsListInto('timesheetsListSectionAdmin');
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
                    <button class="btn-icon" onclick="showEditTimesheetModal(${ts.id}, '${(ts.file_name || '').replace(/'/g, "\\'")}', '${ts.month}/${ts.year}')" title="Chỉnh sửa tên">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="showReplaceTimesheetFile(${ts.id}, '${(ts.file_name || '').replace(/'/g, "\\'")}', '${ts.month}/${ts.year}')" title="Thay thế file mới">
                        🔁
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
                    <span class="stat-value" title="${ts.file_name || 'N/A'}">${ts.file_name ? (ts.file_name.length > 40 ? ts.file_name.substring(0, 40) + '...' : ts.file_name) : 'N/A'}</span>
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
        <div class="timesheet-table-wrapper" style="overflow-x: auto; overflow-y: auto; max-height: none; height: auto; max-width: 100%;">
            <table id="editableTimesheetTable" class="timesheet-table" style="white-space: nowrap; min-width: 100%; width: max-content;">
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


// ============= BẢNG CÔNG & BẢNG LƯƠNG USER =============

let userTimesheets = [];
let userSalaries = [];
let userNotifications = [];
let currentMonthIndex = 0;
let currentUserViewTab = 'home';
let isSalaryMasked = true;
let currentEditableTimesheetId = null;
let currentEditableSalaryId = null;

function switchUserViewTab(tab) {
    currentUserViewTab = tab;
    updateMobileNavUI();
    updateUserViewVisibility();
    populateMonthSelector();
    displayCurrentUserView();
    if (tab === 'home') {
        updateHomeDashboardData();
    } else if (tab === 'notification') {
        loadEmployeeNotifications();
    }
    // Auto scroll top when switching tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateMobileNavUI() {
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentUserViewTab);
    });
    document.querySelectorAll('.desktop-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentUserViewTab);
    });
}

function toggleSalaryNetVisibility() {
    isSalaryMasked = !isSalaryMasked;
    const btn = document.getElementById('eyeToggleBtn');
    if (btn) btn.textContent = isSalaryMasked ? '👁️' : '🙈';
    updateHomeSalaryAmountDisplay();
}

function toggleAppTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('tbs_app_theme', isDark ? 'dark' : 'light');
}

// Restore saved theme on load
if (localStorage.getItem('tbs_app_theme') === 'dark') {
    document.body.classList.add('dark-theme');
}

function updateUserViewVisibility() {
    const monthWrapper = document.getElementById('monthSelectorWrapper');

    if (monthWrapper) {
        monthWrapper.style.display = (currentUserViewTab === 'timesheet') ? 'flex' : 'none';
    }

    const homeSection = document.getElementById('userHomeSection');
    const timesheetSection = document.getElementById('userTimesheetSection');
    const salarySection = document.getElementById('userSalarySection');
    const notifSection = document.getElementById('userNotificationSection');
    const profileSection = document.getElementById('userProfileSection');

    if (homeSection) homeSection.style.display = (currentUserViewTab === 'home') ? 'block' : 'none';
    if (timesheetSection) timesheetSection.style.display = (currentUserViewTab === 'timesheet') ? 'block' : 'none';
    if (salarySection) salarySection.style.display = (currentUserViewTab === 'salary') ? 'block' : 'none';
    if (notifSection) notifSection.style.display = (currentUserViewTab === 'notification') ? 'block' : 'none';
    if (profileSection) profileSection.style.display = (currentUserViewTab === 'profile') ? 'block' : 'none';
}

function displayCurrentUserView() {
    if (currentUserViewTab === 'home') {
        updateHomeDashboardData();
    } else if (currentUserViewTab === 'salary') {
        if (userSalaries.length > 0) {
            let salIndex = currentMonthIndex;
            if (salIndex >= userSalaries.length) salIndex = 0;
            displayEmployeeSalarySummary(userSalaries[salIndex]);
        }
    } else if (currentUserViewTab === 'timesheet') {
        if (userTimesheets.length > 0) {
            let tsIndex = currentMonthIndex;
            if (tsIndex >= userTimesheets.length) tsIndex = 0;
            displayEmployeeTimesheetSummary(userTimesheets[tsIndex]);
        }
    } else if (currentUserViewTab === 'notification') {
        loadEmployeeNotifications();
    }
}

function updateHomeDashboardData() {
    // 1. Update Greeting & Profile Names
    const empName = currentUser ? (currentUser.full_name || currentUser.employee_name) : 'Nhân Viên';
    const empMsnv = currentUser ? (currentUser.employee_id || currentUser.username) : '--';

    const homeNameEl = document.getElementById('homeUserFullName');
    const homeMsnvEl = document.getElementById('homeUserMSNV');
    const profNameEl = document.getElementById('profileFullName');
    const profMsnvEl = document.getElementById('profileMSNV');

    if (homeNameEl) homeNameEl.textContent = empName;
    if (homeMsnvEl) homeMsnvEl.textContent = empMsnv;
    if (profNameEl) profNameEl.textContent = empName;
    if (profMsnvEl) profMsnvEl.textContent = 'MSNV: ' + empMsnv;

    // 2. Update Salary Quick Card
    updateHomeSalaryAmountDisplay();

    // 3. Update Timesheet Quick Card
    if (userTimesheets.length > 0) {
        const latestTs = userTimesheets[0];
        const badgeEl = document.getElementById('homeTimesheetMonthBadge');
        const daysEl = document.getElementById('homeTotalDays');
        const otEl = document.getElementById('homeOvertimeHours');

        if (badgeEl) badgeEl.textContent = `Tháng ${String(latestTs.month).padStart(2, '0')}/${latestTs.year}`;
        if (daysEl) daysEl.textContent = `${latestTs.total_work_days || 0} công`;
        if (otEl) otEl.textContent = `${latestTs.overtime_weekday || 0}h`;
    }

    // 4. Render Notifications Feed
    renderHomeNotifFeed();
}

function updateHomeSalaryAmountDisplay() {
    const salAmountEl = document.getElementById('homeSalaryAmount');
    if (!salAmountEl) return;

    if (userSalaries.length > 0) {
        const latestSal = userSalaries[0];
        const totalVal = parseFloat(latestSal.total_salary) || 0;
        const formattedVal = new Intl.NumberFormat('vi-VN').format(totalVal) + ' VNĐ';

        if (isSalaryMasked) {
            salAmountEl.textContent = '••••••••';
            salAmountEl.classList.add('masked');
        } else {
            salAmountEl.textContent = formattedVal;
            salAmountEl.classList.remove('masked');
        }
    } else {
        salAmountEl.textContent = isSalaryMasked ? '••••••••' : 'Chưa cập nhật';
    }
}

function renderHomeNotifFeed() {
    const listEl = document.getElementById('homeNotifList');
    if (!listEl) return;

    if (!userNotifications || userNotifications.length === 0) {
        listEl.innerHTML = `
            <div class="home-notif-empty">
                <p style="color: var(--slate-500); font-size: 13px; margin: 0;">Không có thông báo mới</p>
            </div>
        `;
        return;
    }

    const topNotifs = userNotifications.slice(0, 2);
    listEl.innerHTML = topNotifs.map(n => `
        <div class="home-notif-card" onclick="switchUserViewTab('notification')">
            <div class="home-notif-tag">Thông báo</div>
            <div class="home-notif-title">${escapeHtml(n.title)}</div>
            <div class="home-notif-desc">${escapeHtml(n.message)}</div>
        </div>
    `).join('');
}

async function loadEmployeeNotifications() {
    try {
        const res = await fetch('/api/employee/notifications');
        const data = await res.json();
        if (data.success) {
            userNotifications = data.data || [];
            updateNotifBadge(data.unread_count || 0);
            renderNotificationList(userNotifications);
            renderHomeNotifFeed();
        }
    } catch (e) {
        console.error('Lỗi tải thông báo:', e);
    }
}

function updateNotifBadge(unreadCount) {
    const countText = unreadCount > 99 ? '99+' : String(unreadCount);

    // Cập nhật Mobile Bottom Nav Badge
    const mobileBadge = document.getElementById('notifBadge');
    if (mobileBadge) {
        mobileBadge.textContent = countText;
        mobileBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    // Cập nhật Desktop Header Nav Badge
    const desktopBadge = document.getElementById('desktopNotifBadge');
    if (desktopBadge) {
        desktopBadge.textContent = countText;
        desktopBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    // Cập nhật tất cả các element có class .notif-badge-count
    document.querySelectorAll('.notif-badge-count').forEach(el => {
        el.textContent = countText;
        el.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    });
}

function renderNotificationList(notifications) {
    const listEl = document.getElementById('notificationList');
    if (!listEl) return;

    if (!notifications || notifications.length === 0) {
        listEl.innerHTML = `
            <div class="notif-empty">
                <div class="notif-empty-icon">🔕</div>
                <p>Chưa có thông báo nào từ Quản trị viên</p>
                <small>Mọi thay đổi từ Quản trị viên đối với bảng công/lương của bạn sẽ được tự động ghi nhận ở đây.</small>
            </div>
        `;
        return;
    }

    listEl.innerHTML = notifications.map((n, index) => {
        const isUnread = !n.is_read;
        const iconMap = {
            salary_update: '💰',
            timesheet_update: '📊',
            user_update: '⚙️',
            info: '🔔'
        };
        const icon = iconMap[n.type] || '🔔';
        const dateStr = formatDate(n.created_at);
        
        // Xử lý tên file - Fix double encoding issue
        let attachmentName = 'Tệp đính kèm';
        if (n.attachment_name) {
            // Thử decode nếu bị encode sai
            try {
                // Nếu có ký tự lạ như "Ã£", "Ã ", "Ã¡" -> đã bị encode sai
                if (n.attachment_name.includes('Ã') || n.attachment_name.includes('â')) {
                    // Convert từ Latin-1 sang UTF-8
                    const bytes = new Uint8Array([...n.attachment_name].map(c => c.charCodeAt(0)));
                    attachmentName = new TextDecoder('utf-8').decode(bytes);
                } else {
                    attachmentName = n.attachment_name;
                }
            } catch (e) {
                console.warn('Failed to decode filename:', e);
                attachmentName = n.attachment_name;
            }
        } else if (n.attachment_url) {
            try {
                const urlParts = n.attachment_url.split('/');
                attachmentName = decodeURIComponent(urlParts[urlParts.length - 1]);
            } catch (e) {
                attachmentName = 'Tệp đính kèm';
            }
        }
        
        // Sử dụng data attributes thay vì onclick inline để tránh encoding issues
        const attachmentHtml = n.attachment_url
            ? `<a class="notif-attachment-link" href="#" data-url="${escapeHtml(n.attachment_url)}" data-filename="${escapeHtml(attachmentName)}" data-notif-index="${index}">📎 ${escapeHtml(attachmentName)}</a>`
            : '';

        return `
            <div class="notif-card ${isUnread ? 'unread' : ''}">
                <div class="notif-card-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="notif-icon">${icon}</span>
                        <span class="notif-title">${escapeHtml(n.title)}</span>
                    </div>
                    ${isUnread ? '<span class="notif-unread-tag">MỚI</span>' : ''}
                </div>
                <div class="notif-message">${escapeHtml(n.message)}</div>
                ${attachmentHtml ? `<div class="notif-attachment">${attachmentHtml}</div>` : ''}
                <div class="notif-time">⏰ ${dateStr}</div>
            </div>
        `;
    }).join('');

    // Attach event listeners to attachment links
    listEl.querySelectorAll('.notif-attachment-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('data-url');
            const filename = this.getAttribute('data-filename');
            console.log('📎 Opening attachment:', { url, filename });
            viewAttachment(url, filename);
        });
    });
}

async function markAllNotificationsRead() {
    try {
        const res = await fetch('/api/employee/notifications/read', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            userNotifications.forEach(n => n.is_read = 1);
            updateNotifBadge(0);
            renderNotificationList(userNotifications);
        }
    } catch (e) {
        console.error('Lỗi đánh dấu đã đọc:', e);
    }
}

function startNotificationsPolling() {
    if (notificationsPollInterval) return;
    if (currentUser) {
        loadEmployeeNotifications();
    }
    notificationsPollInterval = setInterval(() => {
        if (currentUser) {
            loadEmployeeNotifications();
        }
    }, 10000);
}

function stopNotificationsPolling() {
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
        notificationsPollInterval = null;
    }
}

// View Attachment - Tự động mở cửa sổ xem file trực tiếp trên giao diện không cần tải về
function viewAttachment(url, fileName) {
    console.log('🔍 ViewAttachment called:', { url, fileName });

    closeAttachmentViewer();

    if (!url) return;

    // Convert /uploads/attachments/ URLs to /api/attachments/ for inline viewing
    let fetchUrl = url;
    if (fetchUrl.includes('/uploads/attachments/')) {
        const filename = fetchUrl.split('/').pop();
        fetchUrl = '/api/attachments/' + filename;
    }

    // Đảm bảo URL đầy đủ
    const fullUrl = fetchUrl.startsWith('http') ? fetchUrl : (window.location.origin + fetchUrl);
    const displayFileName = fileName || fetchUrl.split('/').pop() || 'Tệp đính kèm';
    const ext = displayFileName.split('.').pop().toLowerCase();

    // Tạo modal popup xem file trực tiếp
    const modal = document.createElement('div');
    modal.className = 'attachment-viewer-modal';
    modal.style.display = 'flex';

    // Nội dung header chung
    modal.innerHTML = `
        <div class="attachment-viewer-content">
            <div class="attachment-viewer-header">
                <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0;">📎 ${escapeHtml(displayFileName)}</h3>
                <div class="attachment-viewer-actions">
                    <a href="${fullUrl}" download="${escapeHtml(displayFileName)}" class="btn-download-file">📥 Tải về</a>
                    <button onclick="closeAttachmentViewer()" class="btn-close-viewer" title="Đóng (ESC)">✕</button>
                </div>
            </div>
            <div class="attachment-viewer-body" id="attachmentViewerBody">
                <div style="text-align:center; padding: 40px; color: #64748b; font-size: 15px;">⏳ Đang tải file...</div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const bodyEl = modal.querySelector('#attachmentViewerBody');

    // --- Hình ảnh ---
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        bodyEl.innerHTML = `
            <div style="text-align: center; width: 100%; padding: 20px; display: flex; align-items: center; justify-content: center;">
                <img src="${fullUrl}" alt="${escapeHtml(displayFileName)}" 
                     style="max-width: 100%; max-height: 75vh; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); object-fit: contain;">
            </div>`;

    // --- PDF ---
    } else if (ext === 'pdf') {
        bodyEl.innerHTML = `<iframe src="${fullUrl}" style="width: 100%; height: 75vh; border: none;"></iframe>`;

    // --- Văn bản thuần ---
    } else if (['txt', 'log', 'json', 'xml', 'csv'].includes(ext)) {
        bodyEl.innerHTML = `<div id="txtContent" style="width:100%;height:75vh;padding:20px;overflow:auto;background:#fff;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;color:#1e293b;">⏳ Đang tải...</div>`;
        fetch(fullUrl)
            .then(r => r.text())
            .then(text => {
                const el = modal.querySelector('#txtContent');
                if (el) el.textContent = text;
            })
            .catch(() => {
                const el = modal.querySelector('#txtContent');
                if (el) el.innerHTML = `<span style="color:#ef4444;">❌ Không thể tải nội dung văn bản.</span>`;
            });

    // --- DOCX / DOC - dùng Mammoth.js chuyển DOCX → HTML (không cần internet sau lần tải CDN) ---
    } else if (['docx', 'doc'].includes(ext)) {
        bodyEl.innerHTML = `
            <div id="docxContainer" style="width:100%;height:75vh;overflow:auto;background:#f8fafc;display:flex;align-items:center;justify-content:center;">
                <div style="text-align:center;color:#64748b;font-size:14px;">⏳ Đang xử lý file Word...</div>
            </div>`;
        const container = modal.querySelector('#docxContainer');
        fetch(fullUrl)
            .then(r => r.arrayBuffer())
            .then(arrayBuffer => {
                if (typeof mammoth !== 'undefined') {
                    return mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                } else {
                    throw new Error('Thư viện Mammoth chưa tải xong');
                }
            })
            .then(result => {
                container.style.alignItems = 'flex-start';
                container.style.justifyContent = 'flex-start';
                container.innerHTML = `
                    <div style="
                        background:#ffffff;
                        max-width:820px;
                        width:100%;
                        margin:20px auto;
                        padding:40px 48px;
                        border-radius:8px;
                        box-shadow:0 2px 16px rgba(0,0,0,0.10);
                        font-family:'Segoe UI',Arial,sans-serif;
                        font-size:14px;
                        line-height:1.7;
                        color:#1e293b;
                    ">
                        ${result.value}
                    </div>`;
                if (result.messages && result.messages.length > 0) {
                    console.warn('Mammoth warnings:', result.messages);
                }
            })
            .catch(err => {
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;">
                        <div style="font-size:40px;margin-bottom:12px;">📄</div>
                        <p style="color:#ef4444;font-size:14px;margin-bottom:4px;">Không thể hiển thị file DOCX trực tiếp.</p>
                        <p style="color:#94a3b8;font-size:12px;margin-bottom:20px;">${escapeHtml(err.message)}</p>
                        <a href="${fullUrl}" download="${escapeHtml(displayFileName)}" class="btn-download-file">📥 Tải về để xem bằng Word</a>
                    </div>`;
            });

    // --- XLSX / XLS - dùng SheetJS (không cần internet) ---
    } else if (['xlsx', 'xls'].includes(ext)) {
        bodyEl.innerHTML = `<div id="xlsxContainer" style="width:100%;height:75vh;overflow:auto;background:#fff;padding:10px;"></div>`;
        const container = modal.querySelector('#xlsxContainer');
        fetch(fullUrl)
            .then(r => r.arrayBuffer())
            .then(arrayBuffer => {
                if (typeof XLSX !== 'undefined') {
                    try {
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                        // Tạo tab cho từng sheet
                        let tabsHtml = '<div style="display:flex;gap:4px;padding:8px 12px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;">';
                        workbook.SheetNames.forEach((name, i) => {
                            tabsHtml += `<button onclick="showXlsxSheet(${i})" id="xlsxTab_${i}" style="padding:4px 12px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;border:1px solid #cbd5e1;background:${i===0?'#1e40af':'#fff'};color:${i===0?'#fff':'#334155'};">${escapeHtml(name)}</button>`;
                        });
                        tabsHtml += '</div><div id="xlsxSheetContent" style="overflow:auto;padding:12px;"></div>';
                        container.innerHTML = tabsHtml;

                        window._xlsxWorkbook = workbook;
                        window.showXlsxSheet = function(idx) {
                            const sheetName = workbook.SheetNames[idx];
                            const sheet = workbook.Sheets[sheetName];
                            const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
                            const content = container.querySelector('#xlsxSheetContent');
                            content.innerHTML = `<style>.xlsx-table{border-collapse:collapse;font-size:13px;width:100%}.xlsx-table td,.xlsx-table th{border:1px solid #e2e8f0;padding:4px 8px;white-space:nowrap}</style>` + html.replace('<table>', '<table class="xlsx-table">');
                            container.querySelectorAll('[id^="xlsxTab_"]').forEach((btn, i) => {
                                btn.style.background = i === idx ? '#1e40af' : '#fff';
                                btn.style.color = i === idx ? '#fff' : '#334155';
                            });
                        };
                        window.showXlsxSheet(0);
                    } catch (err) {
                        container.innerHTML = `<div style="padding:24px;color:#ef4444;">❌ Lỗi đọc file Excel: ${err.message}</div>`;
                    }
                } else {
                    container.innerHTML = `
                        <div style="text-align:center;padding:60px 20px;">
                            <div style="font-size:48px;margin-bottom:16px;">📊</div>
                            <p style="color:#475569;font-size:14px;margin-bottom:20px;">Trình xem Excel đang tải, vui lòng thử lại hoặc tải file về.</p>
                            <a href="${fullUrl}" download="${escapeHtml(displayFileName)}" class="btn-download-file">📥 Tải về để xem</a>
                        </div>`;
                }
            })
            .catch(() => {
                container.innerHTML = `<div style="text-align:center;padding:60px 20px;"><p style="color:#ef4444;">Không thể tải file Excel.</p></div>`;
            });

    // --- PPTX / PPT ---
    } else if (['pptx', 'ppt'].includes(ext)) {
        bodyEl.innerHTML = `
            <div style="text-align:center;padding:50px 20px;">
                <div style="font-size:56px;margin-bottom:16px;">📊</div>
                <h4 style="margin:0 0 10px 0;color:#0f172a;">${escapeHtml(displayFileName)}</h4>
                <p style="color:#64748b;font-size:14px;margin-bottom:24px;">File PowerPoint hiện chưa hỗ trợ xem trực tiếp trên trình duyệt.<br>Vui lòng tải về và mở bằng PowerPoint.</p>
                <a href="${fullUrl}" download="${escapeHtml(displayFileName)}" class="btn-download-file" style="font-size:15px;padding:10px 24px;">📥 Tải về để xem</a>
            </div>`;

    // --- Định dạng khác ---
    } else {
        bodyEl.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <div style="font-size:64px;margin-bottom:16px;">📁</div>
                <h4 style="margin:0 0 8px 0;color:#0f172a;font-size:18px;">${escapeHtml(displayFileName)}</h4>
                <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Tệp này cần tải về máy để mở đầy đủ.</p>
                <a href="${fullUrl}" download="${escapeHtml(displayFileName)}" class="btn-download-file" style="font-size:15px;padding:10px 24px;">📥 Tải về tệp này</a>
            </div>`;
    }

    // Đóng khi click ra ngoài
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeAttachmentViewer();
    });

    // Đóng bằng phím ESC
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            closeAttachmentViewer();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

function closeAttachmentViewer() {
    const modal = document.querySelector('.attachment-viewer-modal');
    if (modal) modal.remove();
    // Dọn biến tạm
    if (window._xlsxWorkbook) delete window._xlsxWorkbook;
    if (window.showXlsxSheet) delete window.showXlsxSheet;
}

function loadSelectedUserMonth() {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    currentMonthIndex = parseInt(select.value, 10) || 0;
    displayCurrentUserView();
}

// Load bảng công của nhân viên (employee)
async function loadEmployeeTimesheets() {
    const section = document.getElementById('userTimesheetSection');

    try {
        const response = await fetch('/api/employee/my-timesheets');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            userTimesheets = data.data;
            if (currentUserViewTab === 'timesheet') {
                currentMonthIndex = 0;
            }
            populateMonthSelector();
            if (currentUserViewTab === 'timesheet') {
                displayEmployeeTimesheetSummary(userTimesheets[currentMonthIndex] || userTimesheets[0]);
            }
            if (section) section.style.display = currentUserViewTab === 'timesheet' ? 'block' : 'none';
        } else {
            userTimesheets = [];
            if (section) section.style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi tải bảng công:', error);
        userTimesheets = [];
        if (section) section.style.display = 'none';
    }
}

// Load bảng lương của nhân viên (employee)
async function loadEmployeeSalaries() {
    const section = document.getElementById('userSalarySection');

    try {
        const response = await fetch('/api/employee/my-salaries');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            userSalaries = data.data;
            if (currentUserViewTab === 'salary') {
                currentMonthIndex = 0;
            }
            populateMonthSelector();
            if (currentUserViewTab === 'salary') {
                displayEmployeeSalarySummary(userSalaries[currentMonthIndex] || userSalaries[0]);
            }
            if (section) section.style.display = currentUserViewTab === 'salary' ? 'block' : 'none';
        } else {
            userSalaries = [];
            if (section) section.style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi tải bảng lương:', error);
        userSalaries = [];
        if (section) section.style.display = 'none';
    }
}

// Load bảng công của user
async function loadUserTimesheet(userId) {
    const section = document.getElementById('userTimesheetSection');
    
    try {
        const response = await fetch('/api/user/my-timesheet');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            userTimesheets = data.data;
            currentMonthIndex = 0;
            populateMonthSelector();
            displayEmployeeTimesheetSummary(userTimesheets[0]);
            section.style.display = currentUserViewTab === 'timesheet' ? 'block' : 'none';
        } else {
            userTimesheets = [];
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi tải bảng công:', error);
        userTimesheets = [];
        section.style.display = 'none';
    }
}

// Populate month selector
function populateMonthSelector() {
    const select = document.getElementById('monthSelect');
    if (!select) return;

    const dataList = currentUserViewTab === 'salary' ? userSalaries : userTimesheets;
    if (dataList.length === 0) {
        select.innerHTML = '';
        return;
    }

    select.innerHTML = dataList.map((item, index) => `
        <option value="${index}">Tháng ${item.month}/${item.year}</option>
    `).join('');

    if (currentMonthIndex >= dataList.length) currentMonthIndex = 0;
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
    const monthStr = String(record.month).padStart(2, '0');
    const yearStr = record.year;
    const daysInMonth = new Date(record.year, record.month, 0).getDate();
    const lastDayStr = String(daysInMonth).padStart(2, '0');

    const detailHeaderEl = document.getElementById('detailTableHeader');
    if (detailHeaderEl) {
        detailHeaderEl.innerHTML = `
            <div style="font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">BẢNG CHẤM CÔNG CHI TIẾT THÁNG ${monthStr}-${yearStr}</div>
            <div style="font-weight: 600; font-size: 12px; margin-top: 3px; opacity: 0.95; font-style: normal;">(Từ ngày 01/${monthStr}/${yearStr} đến ngày ${lastDayStr}/${monthStr}/${yearStr})</div>
        `;
    }

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
            <td class="stat-value">${(congCNDem !== null && congCNDem !== undefined) ? congCNDem.toFixed(2) : (0).toFixed(2)}</td>
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

    // Sử dụng số ngày thực tế trong tháng (đã khai báo ở trên)

    for (let day = 1; day <= daysInMonth; day++) {
        const d = dayData[day];
        const date = new Date(record.year, record.month - 1, day);
        const dow = date.getDay();
        const isSunday = dow === 0;
        const isSaturday = dow === 6;

        const tcVal = (d && d.tc !== null && d.tc !== undefined) ? d.tc : '';
        const ptVal = (d && d.pt !== null && d.pt !== undefined) ? d.pt : '';

        // Hiển thị tất cả ngày; Chủ nhật luôn tô màu vàng dù có hay không có dữ liệu
        if (tcVal !== '' || ptVal !== '' || isSunday) {
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

// ============= HIỂN THỊ BẢNG LƯƠNG CHO NHÂN VIÊN =============

const SALARY_FIELD_SECTIONS = {
    rates: {
        title: 'Mức lương & phụ cấp cơ bản',
        headerClass: 'header-rates',
        gridClass: 'salary-grid-4',
        collapsible: false,
        keywords: ['lcb', 'pccv', 'atvsv', 'pc nndh', 'pc nnđh', 'lương cơ bản', 'phụ cấp chức vụ']
    },
    attendance: {
        title: 'Chấm công',
        headerClass: 'header-attendance',
        gridClass: 'salary-grid-3',
        collapsible: true,
        keywords: ['công lv', 'cn/lễ', 'cn/l', 'phụ trội', 'tổng cộng', 'chờ việc', 'pn/lễ', 'phép hưởng lương', 'công làm việc']
    },
    income: {
        title: 'A. Các khoản thu nhập',
        headerClass: 'header-income',
        gridClass: 'salary-grid',
        collapsible: true,
        keywords: [
            'lương thời gian', 'phụ cấp chức vụ', 'phụ cấp atvsv', 'phụ cấp nặng', 'phụ cấp nnđh', 'nặng nhọc',
            'tiền thưởng hoàn thành chỉ tiêu', 'tiền ăn giữa ca', 'tiền hỗ trợ xăng', 'tiền hỗ trợ ca đêm',
            'tiền tăng ca', 'tiền hỗ trợ xa nhà', 'tc công nhân', 'tc bằng', 'tc ngoại ngữ',
            'thưởng lưu giữ', 'trợ cấp khác', 'tiền thưởng hqcv', 'tiền thưởng hoàn thành pph',
            'chi 21.5%', 'kk ngày công', 'lương phép', 'hỗ trợ con nhỏ', 'hỗ trợ hành kinh'
        ],
        totalKeywords: ['tổng thu nhập']
    },
    deduction: {
        title: 'B. Các khoản trừ',
        headerClass: 'header-deduction',
        gridClass: 'salary-grid',
        collapsible: true,
        keywords: [
            'tạm ứng', 'bhxh 8%', 'bhxh', 'bhyt 1.5%', 'bhyt', 'bhtn 1%', 'bhtn',
            'phí công đoàn', 'thuế thu nhập', 'trừ khác'
        ],
        totalKeywords: ['tổng trừ']
    },
    net: {
        title: 'C. Thực nhận',
        headerClass: 'header-net',
        gridClass: 'salary-grid',
        collapsible: false,
        keywords: ['thực nhận', 'thuc nhan', 'thực lĩnh', 'thực lãnh']
    }
};

const SALARY_FIELD_ORDER = {
    rates: ['lcb', 'pccv', 'atvsv', 'pc nndh', 'pc nnđh'],
    attendance: ['công lv', 'cn/lễ', 'phụ trội', 'tổng cộng', 'chờ việc', 'pn/lễ', 'phép hưởng lương'],
    income: [
        'lương thời gian', 'phụ cấp chức vụ', 'phụ cấp atvsv', 'phụ cấp nặng', 'phụ cấp nnđh',
        'tiền thưởng hoàn thành chỉ tiêu', 'tiền ăn giữa ca', 'tiền hỗ trợ xăng', 'tiền hỗ trợ ca đêm',
        'tiền tăng ca', 'tiền hỗ trợ xa nhà', 'tc công nhân kỹ thuật', 'tc bằng', 'tc ngoại ngữ',
        'thưởng lưu giữ', 'trợ cấp khác', 'tiền thưởng hqcv', 'tiền thưởng hoàn thành pph',
        'chi 21.5%', 'kk ngày công', 'lương phép', 'hỗ trợ con nhỏ', 'hỗ trợ hành kinh', 'tổng thu nhập'
    ],
    deduction: [
        'tạm ứng', 'bhxh 8%', 'bhyt 1.5%', 'bhtn 1%', 'phí công đoàn',
        'thuế thu nhập cá nhân', 'trừ khác', 'tổng trừ'
    ],
    net: ['thực nhận', 'thực lĩnh', 'thực lãnh']
};

const SALARY_SKIP_KEYWORDS = ['msnv', 'họ và tên', 'ho va ten', 'mật khẩu', 'cccd', 'phòng ban', 'chức vụ', 'pb/px', 'mã phòng'];

function aggregateSalaryHeaders(headers) {
    if (!headers || headers.length === 0) return [];

    const maxCols = Math.max(...headers.map(row => (Array.isArray(row) ? row.length : 0)), 0);
    const aggHeaders = [];

    for (let i = 0; i < maxCols; i++) {
        const labelParts = [];
        for (let r = 0; r < headers.length; r++) {
            const row = headers[r];
            if (!Array.isArray(row)) continue;
            const cell = row[i];
            if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
                const part = String(cell).trim().replace(/\s+/g, ' ');
                if (!labelParts.some(p => p.toLowerCase() === part.toLowerCase())) {
                    labelParts.push(part);
                }
            }
        }
        aggHeaders.push(labelParts.join(' - ') || '');
    }

    return aggHeaders;
}

function getSalaryFieldOrderIndex(label, sectionKey) {
    const normalized = normalizeSalaryLabel(label);
    const orderList = SALARY_FIELD_ORDER[sectionKey] || [];
    for (let i = 0; i < orderList.length; i++) {
        if (normalized.includes(normalizeSalaryLabel(orderList[i]))) {
            return i;
        }
    }
    return 999;
}

function sortSalaryFields(fields, sectionKey) {
    return [...fields].sort((a, b) => {
        const idxA = getSalaryFieldOrderIndex(a.label, sectionKey);
        const idxB = getSalaryFieldOrderIndex(b.label, sectionKey);
        if (idxA !== idxB) return idxA - idxB;
        return a.label.localeCompare(b.label, 'vi');
    });
}

function normalizeSalaryLabel(label) {
    return String(label || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function shouldSkipSalaryField(label) {
    const normalized = normalizeSalaryLabel(label);
    return SALARY_SKIP_KEYWORDS.some(kw => normalized.includes(normalizeSalaryLabel(kw)));
}

function matchSalarySection(label) {
    const normalized = normalizeSalaryLabel(label);
    if (!normalized) return null;

    for (const [sectionKey, section] of Object.entries(SALARY_FIELD_SECTIONS)) {
        const allKeywords = [
            ...(section.keywords || []),
            ...(section.totalKeywords || [])
        ];
        if (allKeywords.some(kw => normalized.includes(normalizeSalaryLabel(kw)))) {
            return sectionKey;
        }
    }
    return 'other';
}

function isSalaryTotalField(label, sectionKey) {
    const normalized = normalizeSalaryLabel(label);
    const section = SALARY_FIELD_SECTIONS[sectionKey];
    if (!section || !section.totalKeywords) return false;
    return section.totalKeywords.some(kw => normalized.includes(normalizeSalaryLabel(kw)));
}

function isSalaryNetField(label) {
    const normalized = normalizeSalaryLabel(label);
    return SALARY_FIELD_SECTIONS.net.keywords.some(kw => normalized.includes(normalizeSalaryLabel(kw)));
}

function formatSalaryValue(label, value) {
    if (value === null || value === undefined || value === '') return '—';

    const strVal = String(value).trim();
    if (strVal === '') return '—';

    const normalized = normalizeSalaryLabel(label);
    const isNumeric = !isNaN(parseFloat(strVal.replace(/[,\s]/g, '')));

    if (isNumeric && !normalized.includes('msnv') && !normalized.includes('cccd')) {
        const num = parseFloat(strVal.replace(/[,\s]/g, ''));
        if (!isNaN(num)) {
            if (Number.isInteger(num) && Math.abs(num) < 1000 && (
                normalized.includes('công') || normalized.includes('cong') ||
                normalized.includes('phụ trội') || normalized.includes('phu troi') ||
                normalized.includes('giờ') || normalized.includes('gio') ||
                normalized.includes('ngày') || normalized.includes('ngay')
            )) {
                return num % 1 === 0 ? String(num) : num.toFixed(2);
            }
            return new Intl.NumberFormat('vi-VN').format(num);
        }
    }

    return strVal;
}

function buildSalaryFieldList(record) {
    const rawRow = Array.isArray(record.raw_row)
        ? record.raw_row
        : (typeof record.raw_row === 'string' ? JSON.parse(record.raw_row || '[]') : []);

    const aggHeaders = aggregateSalaryHeaders(record.headers || []);
    const maxCols = Math.max(aggHeaders.length, rawRow.length);
    const fields = [];

    for (let i = 0; i < maxCols; i++) {
        const label = aggHeaders[i] || `Cột ${i + 1}`;
        const value = rawRow[i];

        if (shouldSkipSalaryField(label)) continue;
        if ((label.startsWith('Cột ') || label === '') && (value === null || value === undefined || value === '')) continue;

        fields.push({
            label,
            value,
            displayValue: formatSalaryValue(label, value),
            section: matchSalarySection(label),
            isTotal: false,
            isNet: isSalaryNetField(label)
        });
    }

    fields.forEach(field => {
        field.isTotal = isSalaryTotalField(field.label, field.section);
    });

    return fields;
}

function renderSalaryItems(fields, options = {}) {
    const { highlightTotal = false, highlightNet = false, valueClass = '' } = options;

    return fields.map(field => {
        let itemClass = 'salary-item';
        let valClass = 'salary-item-value';

        if (field.isTotal || highlightTotal) {
            itemClass += ' highlight-total';
            valClass += ' is-total';
        }
        if (field.isNet || highlightNet) {
            itemClass += ' highlight-net';
            valClass += ' is-net';
        } else if (field.displayValue !== '—' && !isNaN(parseFloat(String(field.value).replace(/[,\s]/g, '')))) {
            valClass += ' is-currency';
        }

        return `
            <div class="${itemClass}">
                <span class="salary-item-label">${escapeHtml(field.label)}</span>
                <span class="${valClass}">${escapeHtml(field.displayValue)}</span>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayEmployeeSalarySummary(record) {
    const container = document.getElementById('salarySlipContainer');
    if (!container) return;

    if (!record) {
        container.innerHTML = `
            <div class="salary-empty">
                <div class="salary-empty-icon">💰</div>
                <p>Chưa có dữ liệu bảng lương cho tháng này</p>
            </div>
        `;
        return;
    }

    const monthStr = String(record.month).padStart(2, '0');
    const yearStr = record.year;

    // Aggregate fields map from headers and raw_row
    const rawRow = Array.isArray(record.raw_row)
        ? record.raw_row
        : (typeof record.raw_row === 'string' ? JSON.parse(record.raw_row || '[]') : []);
    const aggHeaders = aggregateSalaryHeaders(record.headers || []);

    const fieldsMap = {};
    const maxCols = Math.max(aggHeaders.length, rawRow.length);
    for (let i = 0; i < maxCols; i++) {
        const label = aggHeaders[i] || `Cột ${i + 1}`;
        const val = rawRow[i];
        if (label && val !== null && val !== undefined && val !== '') {
            fieldsMap[normalizeSalaryLabel(label)] = val;
        }
    }

    // Helper to get raw numeric value
    function getNumVal(keys) {
        for (const kw of keys) {
            const normKw = normalizeSalaryLabel(kw);
            for (const [k, v] of Object.entries(fieldsMap)) {
                if (k.includes(normKw)) {
                    if (v === null || v === undefined || v === '') continue;
                    const num = parseFloat(String(v).replace(/[,\s]/g, ''));
                    if (!isNaN(num)) return num;
                }
            }
        }
        return 0;
    }

    // Helper to format display value
    function getDisplayVal(keys, defaultVal = '—', isWorkday = false) {
        for (const kw of keys) {
            const normKw = normalizeSalaryLabel(kw);
            for (const [k, v] of Object.entries(fieldsMap)) {
                if (k.includes(normKw)) {
                    if (v === null || v === undefined || v === '') continue;
                    const str = String(v).trim();
                    if (str === '' || str === '0') return '0';
                    const num = parseFloat(str.replace(/[,\s]/g, ''));
                    if (!isNaN(num)) {
                        if (isWorkday) return num % 1 === 0 ? String(num) : num.toFixed(2);
                        return new Intl.NumberFormat('vi-VN').format(num);
                    }
                    return str;
                }
            }
        }
        return defaultVal;
    }

    const employeeId = record.employee_id || currentUser?.employee_id || '—';
    const employeeName = record.employee_name || currentUser?.full_name || '—';

    // Basic Rates
    const lcb = getDisplayVal(['lcb', 'lương cơ bản', 'basic']);
    const pccv = getDisplayVal(['pccv', 'phụ cấp chức vụ']);
    const atvsv = getDisplayVal(['atvsv', 'an toàn vệ sinh']);
    const pcNndh = getDisplayVal(['pc nndh', 'pc nnđh', 'độc hại', 'nặng nhọc']);

    // Attendance
    const congLv = getDisplayVal(['công lv', 'công làm việc'], '0', true);
    const cnLe = getDisplayVal(['cn/lễ', 'cn/l', 'chủ nhật'], '0', true);
    const phuTroi = getDisplayVal(['phụ trội', 'giờ phụ trội'], '0', true);
    const tongCong = getDisplayVal(['tổng công', 'tổng cộng'], '0', true);
    const choViec = getDisplayVal(['chờ việc'], '0', true);
    const pnLe = getDisplayVal(['pn/lễ', 'phép năm'], '0', true);
    const pHLuong = getDisplayVal(['phép hưởng lương'], '0', true);

    // Section A Left (11 items)
    const incL1 = getDisplayVal(['lương thời gian', 'luong thoi gian', 'lương sản phẩm']);
    const incL2 = getDisplayVal(['phụ cấp chức vụ', 'pc chức vụ']);
    const incL3 = getDisplayVal(['phụ cấp atvsv', 'pc atvsv']);
    const incL4 = getDisplayVal(['phụ cấp nặng nhọc', 'độc hại', 'pc nnđh', 'pc nndh']);
    const incL5 = getDisplayVal(['chỉ tiêu kinh tế', 'chỉ tiêu kỹ thuật', 'thưởng chỉ tiêu']);
    const incL6 = getDisplayVal(['ăn giữa ca', 'tiền ăn']);
    const incL7 = getDisplayVal(['xăng xe', 'đi lại', 'hỗ trợ xăng']);
    const incL8 = getDisplayVal(['hỗ trợ ca đêm', 'phụ cấp ca đêm']);
    const incL9 = getDisplayVal(['tăng ca', 'tiền tăng ca']);
    const incL10 = getDisplayVal(['xa nhà', 'hỗ trợ xa nhà']);
    const incL11 = getDisplayVal(['kỹ thuật cao', 'tc kỹ thuật']);

    // Section A Right (9 items)
    const incR1 = getDisplayVal(['tc bằng', 'ngoại ngữ']);
    const incR2 = getDisplayVal(['thưởng lưu giữ', 'trợ cấp khác', 'lưu giữ']);
    const incR3 = getDisplayVal(['hqcv', 'hiệu quả công việc']);
    const incR4 = getDisplayVal(['pph', 'hoàn thành pph']);
    const incR5 = getDisplayVal(['21.5%', 'chi 21.5%']);
    const incR6 = getDisplayVal(['kk ngày công', 'khuyến khích']);
    const incR7 = getDisplayVal(['lương phép', 'lễ+pn']);
    const incR8 = getDisplayVal(['con nhỏ', 'hỗ trợ con nhỏ']);
    const incR9 = getDisplayVal(['hành kinh', 'hỗ trợ hành kinh']);

    // Total Income (A)
    let totalIncomeNum = getNumVal(['tổng thu nhập', 'tong thu nhap', 'tổng cộng thu nhập']);
    if (totalIncomeNum === 0) {
        totalIncomeNum = getNumVal(['lương thời gian']) + getNumVal(['phụ cấp chức vụ']) + getNumVal(['phụ cấp atvsv']) +
            getNumVal(['độc hại']) + getNumVal(['chỉ tiêu']) + getNumVal(['ăn giữa ca']) + getNumVal(['xăng xe']) +
            getNumVal(['ca đêm']) + getNumVal(['tăng ca']) + getNumVal(['xa nhà']) + getNumVal(['kỹ thuật cao']) +
            getNumVal(['tc bằng']) + getNumVal(['lưu giữ']) + getNumVal(['hqcv']) + getNumVal(['pph']) +
            getNumVal(['21.5%']) + getNumVal(['kk ngày công']) + getNumVal(['lương phép']) + getNumVal(['con nhỏ']) + getNumVal(['hành kinh']);
    }
    const totalIncomeStr = totalIncomeNum > 0 ? new Intl.NumberFormat('vi-VN').format(totalIncomeNum) : (getDisplayVal(['tổng thu nhập']) !== '—' ? getDisplayVal(['tổng thu nhập']) : '0');

    // Section B Left (4 items)
    const dedL1 = getDisplayVal(['tạm ứng', 'tam ung']);
    const dedL2 = getDisplayVal(['bhxh 8%', 'bhxh']);
    const dedL3 = getDisplayVal(['bhyt 1.5%', 'bhyt']);
    const dedL4 = getDisplayVal(['bhtn 1%', 'bhtn']);

    // Section B Right (3 items)
    const dedR1 = getDisplayVal(['phí công đoàn', 'công đoàn', 'kpcd']);
    const dedR2 = getDisplayVal(['thuế thu nhập', 'ttncn']);
    const dedR3 = getDisplayVal(['trừ khác', 'khoản trừ khác']);

    // Total Deductions (B)
    let totalDeductNum = getNumVal(['tổng trừ', 'tong tru', 'tổng các khoản trừ']);
    if (totalDeductNum === 0) {
        totalDeductNum = getNumVal(['tạm ứng']) + getNumVal(['bhxh']) + getNumVal(['bhyt']) + getNumVal(['bhtn']) +
            getNumVal(['công đoàn']) + getNumVal(['thuế thu nhập']) + getNumVal(['trừ khác']);
    }
    const totalDeductStr = totalDeductNum > 0 ? new Intl.NumberFormat('vi-VN').format(totalDeductNum) : (getDisplayVal(['tổng trừ']) !== '—' ? getDisplayVal(['tổng trừ']) : '0');

    // Section C Net Salary (THỰC NHẬN = A - B)
    let netSalaryNum = getNumVal(['thực nhận', 'thuc nhan', 'thực lĩnh', 'thực lãnh']);
    if (netSalaryNum === 0 && (totalIncomeNum > 0 || totalDeductNum > 0)) {
        netSalaryNum = totalIncomeNum - totalDeductNum;
    }
    const netSalaryStr = netSalaryNum !== 0 ? new Intl.NumberFormat('vi-VN').format(netSalaryNum) : (getDisplayVal(['thực nhận']) !== '—' ? getDisplayVal(['thực nhận']) : '0');

    let html = `
        <div class="official-payslip-wrapper">
            <div class="official-payslip-title">
                PHIẾU THANH TOÁN TIỀN LƯƠNG THÁNG ${monthStr}/${yearStr}
            </div>

            <!-- Header Info & Rates & Attendance Grid -->
            <div class="payslip-table-container">
                <table class="official-payslip-table header-grid-table">
                    <tbody>
                        <tr>
                            <td class="cell-label border-r">MSNV :</td>
                            <td class="cell-value border-r"><strong>${escapeHtml(employeeId)}</strong></td>
                            <td class="cell-label border-r">Họ và Tên</td>
                            <td class="cell-value" colspan="4"><strong>${escapeHtml(employeeName)}</strong></td>
                        </tr>
                        <tr class="header-sub-row">
                            <td colspan="2" class="cell-center border-r font-bold">LCB</td>
                            <td colspan="2" class="cell-center border-r font-bold">PCCV</td>
                            <td colspan="2" class="cell-center border-r font-bold">ATVSV</td>
                            <td class="cell-center font-bold">PC NNĐH</td>
                        </tr>
                        <tr class="val-sub-row">
                            <td colspan="2" class="cell-center border-r">${escapeHtml(lcb)}</td>
                            <td colspan="2" class="cell-center border-r">${escapeHtml(pccv)}</td>
                            <td colspan="2" class="cell-center border-r">${escapeHtml(atvsv)}</td>
                            <td class="cell-center">${escapeHtml(pcNndh)}</td>
                        </tr>
                        <tr class="header-sub-row">
                            <td class="cell-center border-r font-bold">Công LV</td>
                            <td class="cell-center border-r font-bold">CN/Lễ</td>
                            <td class="cell-center border-r font-bold">Phụ Trội(giờ)</td>
                            <td class="cell-center border-r font-bold">Tổng Công</td>
                            <td class="cell-center border-r font-bold">Chờ Việc</td>
                            <td class="cell-center border-r font-bold">PN/Lễ</td>
                            <td class="cell-center font-bold">Phép hưởng lương</td>
                        </tr>
                        <tr class="val-sub-row">
                            <td class="cell-center border-r">${escapeHtml(congLv)}</td>
                            <td class="cell-center border-r">${escapeHtml(cnLe)}</td>
                            <td class="cell-center border-r">${escapeHtml(phuTroi)}</td>
                            <td class="cell-center border-r highlight-val">${escapeHtml(tongCong)}</td>
                            <td class="cell-center border-r">${escapeHtml(choViec)}</td>
                            <td class="cell-center border-r">${escapeHtml(pnLe)}</td>
                            <td class="cell-center">${escapeHtml(pHLuong)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Main Body: Section A & B -->
            <div class="payslip-table-container margin-top-12" style="padding-bottom: 0;">
                <table class="official-payslip-table main-body-table">
                    <tbody>
                        <!-- Section A Header -->
                        <tr class="section-title-row">
                            <td colspan="2" class="section-title text-maroon border-r">A. Các khoản thu nhập</td>
                            <td colspan="2" class="section-title text-maroon"></td>
                        </tr>

                        <!-- Section A Rows -->
                        <tr>
                            <td class="item-name border-r-dotted">Lương thời gian</td>
                            <td class="item-val border-r-double">${escapeHtml(incL1)}</td>
                            <td class="item-name border-r-dotted">TC bằng, TC ngoại ngữ</td>
                            <td class="item-val">${escapeHtml(incR1)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Phụ cấp chức vụ</td>
                            <td class="item-val border-r-double">${escapeHtml(incL2)}</td>
                            <td class="item-name border-r-dotted">Thưởng lưu giữ LĐ/Trợ cấp khác</td>
                            <td class="item-val">${escapeHtml(incR2)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Phụ cấp ATVSV</td>
                            <td class="item-val border-r-double">${escapeHtml(incL3)}</td>
                            <td class="item-name border-r-dotted">Tiền thưởng HQCV</td>
                            <td class="item-val">${escapeHtml(incR3)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Phụ cấp nặng nhọc/độc hại</td>
                            <td class="item-val border-r-double">${escapeHtml(incL4)}</td>
                            <td class="item-name border-r-dotted">Tiền thưởng hoàn thành PPH</td>
                            <td class="item-val">${escapeHtml(incR4)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền thưởng hoàn thành chỉ tiêu kinh tế kỹ thuật</td>
                            <td class="item-val border-r-double">${escapeHtml(incL5)}</td>
                            <td class="item-name border-r-dotted">Chi 21.5% BH</td>
                            <td class="item-val">${escapeHtml(incR5)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền ăn giữa ca</td>
                            <td class="item-val border-r-double">${escapeHtml(incL6)}</td>
                            <td class="item-name border-r-dotted">KK ngày công</td>
                            <td class="item-val">${escapeHtml(incR6)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền hỗ trợ xăng xe - đi lại</td>
                            <td class="item-val border-r-double">${escapeHtml(incL7)}</td>
                            <td class="item-name border-r-dotted">Lương phép(Lễ+PN)</td>
                            <td class="item-val">${escapeHtml(incR7)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền hỗ trợ ca đêm</td>
                            <td class="item-val border-r-double">${escapeHtml(incL8)}</td>
                            <td class="item-name border-r-dotted">Hỗ trợ con nhỏ</td>
                            <td class="item-val">${escapeHtml(incR8)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền tăng ca</td>
                            <td class="item-val border-r-double">${escapeHtml(incL9)}</td>
                            <td class="item-name border-r-dotted">Hỗ trợ hành kinh</td>
                            <td class="item-val">${escapeHtml(incR9)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">Tiền hỗ trợ xa nhà</td>
                            <td class="item-val border-r-double">${escapeHtml(incL10)}</td>
                            <td class="item-name border-r-dotted text-blue font-bold">Tổng thu nhập</td>
                            <td class="item-val text-blue font-bold">${escapeHtml(totalIncomeStr)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">TC công nhân kỹ thuật cao</td>
                            <td class="item-val border-r-double">${escapeHtml(incL11)}</td>
                            <td class="item-name border-r-dotted"></td>
                            <td class="item-val"></td>
                        </tr>

                        <!-- Section B Header -->
                        <tr class="section-title-row border-t">
                            <td colspan="2" class="section-title text-maroon border-r">B. Các khoản trừ</td>
                            <td colspan="2" class="section-title text-maroon"></td>
                        </tr>

                        <!-- Section B Rows -->
                        <tr>
                            <td class="item-name border-r-dotted">Tạm ứng</td>
                            <td class="item-val border-r-double">${escapeHtml(dedL1)}</td>
                            <td class="item-name border-r-dotted">Phí Công đoàn</td>
                            <td class="item-val">${escapeHtml(dedR1)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">BHXH 8%</td>
                            <td class="item-val border-r-double">${escapeHtml(dedL2)}</td>
                            <td class="item-name border-r-dotted">Thuế thu nhập cá nhân</td>
                            <td class="item-val">${escapeHtml(dedR2)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">BHYT 1.5%</td>
                            <td class="item-val border-r-double">${escapeHtml(dedL3)}</td>
                            <td class="item-name border-r-dotted">Trừ khác</td>
                            <td class="item-val">${escapeHtml(dedR3)}</td>
                        </tr>
                        <tr>
                            <td class="item-name border-r-dotted">BHTN 1%</td>
                            <td class="item-val border-r-double">${escapeHtml(dedL4)}</td>
                            <td class="item-name border-r-dotted text-blue font-bold">Tổng trừ</td>
                            <td class="item-val text-blue font-bold">${escapeHtml(totalDeductStr)}</td>
                        </tr>

                        <!-- Section C Net Salary Row -->
                        <tr class="section-net-row border-t-double">
                            <td colspan="4">
                                <div class="net-salary-banner">
                                    <span class="net-title">C. THỰC NHẬN = (A) − (B)</span>
                                    <span class="net-val">${escapeHtml(netSalaryStr)} VNĐ</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Tải tháng được chọn (nhân viên)
function loadSelectedMonth() {
    loadSelectedUserMonth();
}

// Chuyển tháng (nhân viên)
function changeUserMonth(direction) {
    const dataList = currentUserViewTab === 'salary' ? userSalaries : userTimesheets;
    if (dataList.length === 0) return;

    currentMonthIndex += direction;
    if (currentMonthIndex < 0) currentMonthIndex = dataList.length - 1;
    if (currentMonthIndex >= dataList.length) currentMonthIndex = 0;

    const select = document.getElementById('monthSelect');
    if (select) select.value = currentMonthIndex;
    displayCurrentUserView();
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
    const daysInMonth = new Date(record.year, record.month, 0).getDate();
    let html = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayData = record.day_data[day] || { tc: null, pt: null };
        
        const tcValue = dayData.tc !== null ? (dayData.tc === 'TS' ? 'TS' : dayData.tc) : '';
        const ptValue = dayData.pt !== null ? dayData.pt : '';
        
        // Kiểm tra ngày cuối tuần
        const date = new Date(record.year, record.month - 1, day);
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;

        // Hiển thị tất cả ngày có dữ liệu; Chủ nhật luôn tô vàng
        if (tcValue !== '' || ptValue !== '' || isSunday) {
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

// ============= ĐỔI MẬT KHẨU QUẢN TRỊ VIÊN =============

function showChangePasswordDialog() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        const msgEl = document.getElementById('changePasswordMessage');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'message';
        }
        modal.classList.add('show');
    }
}

function closeChangePasswordDialog() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Chỉnh sửa tên bảng công
let currentEditTimesheetId = null;

function showEditTimesheetModal(timesheetId, currentName, monthYear) {
    currentEditTimesheetId = timesheetId;
    const modal = document.getElementById('editTimesheetModal');
    const input = document.getElementById('editTimesheetName');
    const message = document.getElementById('editTimesheetMessage');
    
    input.value = currentName || '';
    message.innerHTML = '';
    
    modal.classList.add('show');
    input.focus();
}

function closeEditTimesheetModal() {
    const modal = document.getElementById('editTimesheetModal');
    if (modal) {
        modal.classList.remove('show');
    }
    currentEditTimesheetId = null;
}

// Xử lý form chỉnh sửa tên bảng công - gọi trực tiếp thay vì dùng DOMContentLoaded
async function handleEditTimesheetSubmit(e) {
    if (e) e.preventDefault();
    
    if (!currentEditTimesheetId) return;
    
    const newName = document.getElementById('editTimesheetName').value.trim();
    const message = document.getElementById('editTimesheetMessage');
    
    if (!newName) {
        message.innerHTML = '<div class="error">Vui lòng nhập tên bảng công</div>';
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/timesheet/${currentEditTimesheetId}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_name: newName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            message.innerHTML = '<div class="success">✅ Cập nhật thành công! Đang reload...</div>';
            setTimeout(() => {
                closeEditTimesheetModal();
                loadTimesheetsList();
            }, 1000);
        } else {
            message.innerHTML = `<div class="error">❌ ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        message.innerHTML = '<div class="error">❌ Lỗi kết nối. Vui lòng thử lại.</div>';
    }
}

// Gán event listener khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editTimesheetForm');
    if (form) {
        form.removeEventListener('submit', handleEditTimesheetSubmit);
        form.addEventListener('submit', handleEditTimesheetSubmit);
    }
});

async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const msgEl = document.getElementById('changePasswordMessage');

    if (!currentPassword || !newPassword || !confirmPassword) {
        msgEl.textContent = 'Vui lòng nhập đầy đủ thông tin';
        msgEl.className = 'message error show';
        return;
    }

    if (newPassword.length < 6) {
        msgEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự';
        msgEl.className = 'message error show';
        return;
    }

    if (newPassword !== confirmPassword) {
        msgEl.textContent = 'Mật khẩu mới và xác nhận mật khẩu không khớp nhau';
        msgEl.className = 'message error show';
        return;
    }

    try {
        const response = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            msgEl.textContent = '✅ Đổi mật khẩu thành công!';
            msgEl.className = 'message success show';
            setTimeout(() => {
                closeChangePasswordDialog();
            }, 1500);
        } else {
            msgEl.textContent = data.message || 'Lỗi khi đổi mật khẩu';
            msgEl.className = 'message error show';
        }
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        msgEl.textContent = 'Lỗi kết nối máy chủ';
        msgEl.className = 'message error show';
    }
}



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

// Upload file bảng lương
async function uploadSalaryFile(file) {
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
        const response = await fetch('/api/admin/upload-salary', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUploadMessage(`✅ ${data.message} (${data.data.recordCount} nhân viên)`, 'success');
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
                    <button class="btn-icon" onclick="viewSalaryDetails(${sal.id})" title="Xem chi tiết">
                        👁️
                    </button>
                    <button class="btn-icon" onclick="showEditSalaryModal(${sal.id}, '${(sal.file_name || '').replace(/'/g, "\\'")}', '${sal.month}/${sal.year}')" title="Chỉnh sửa tên">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteSalary(${sal.id}, '${sal.month}/${sal.year}')" title="Xóa">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="timesheet-card-body">
                <div class="timesheet-stat">
                    <span class="stat-label">👥 Số nhân viên:</span>
                    <span class="stat-value">${sal.employee_count}</span>
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
    
    currentSalaryId = salary.id;
    
    document.getElementById('timesheetModalTitle').textContent = 
        `💰 Bảng lương tháng ${salary.month}/${salary.year}`;
    
    let sheetData = [];
    try {
        if (salary.sheet_data) {
            sheetData = JSON.parse(salary.sheet_data);
        }
    } catch(e) {}
    
    if (!sheetData || sheetData.length === 0) {
        details.innerHTML = '<p style="text-align: center;">Không có dữ liệu chi tiết từ file Excel</p>';
        return;
    }
    
    let html = `
        <div style="margin-bottom: 10px; font-size: 13px; color: #555; background: #fff7e6; border: 1px solid #ffd591; padding: 8px 12px; border-radius: 4px;">
            💡 <strong>Hướng dẫn:</strong> Bạn có thể nhấp chuột trực tiếp vào bất kỳ ô nào bên dưới để chỉnh sửa nội dung. Dữ liệu sẽ <strong>tự động lưu</strong> vào hệ thống khi bấm nút <strong>Đóng</strong>.
        </div>
        <div class="timesheet-table-wrapper" style="overflow-x: auto; overflow-y: auto; max-height: none; height: auto; max-width: 100%;">
            <table id="editableSalaryTable" class="timesheet-table" style="white-space: nowrap; min-width: 100%; width: max-content;">
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
            <button class="btn-secondary" onclick="closeSalaryModal()" style="background: #faad14; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Đóng & Lưu</button>
        </div>
    `;
    
    details.innerHTML = html;

    // Tự động lưu ngầm mỗi khi rời khỏi một ô vừa chỉnh sửa
    const table = document.getElementById('editableSalaryTable');
    if (table) {
        table.addEventListener('focusout', (e) => {
            if (e.target && (e.target.tagName === 'TD' || e.target.tagName === 'TH')) {
                saveCurrentSalaryDataSilent();
            }
        });
    }
}

// Lưu dữ liệu bảng lương ngầm khi chỉnh sửa ô
async function saveCurrentSalaryDataSilent() {
    const table = document.getElementById('editableSalaryTable');
    if (table && currentSalaryId) {
        const rows = Array.from(table.rows);
        const updatedSheetData = rows.map(tr => 
            Array.from(tr.cells).map(cell => cell.innerText.trim())
        );

        try {
            await fetch(`/api/admin/salary/${currentSalaryId}/sheet-data`, {
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

// Đóng modal bảng lương
function closeSalaryModal() {
    saveCurrentSalaryDataSilent();
    document.getElementById('timesheetModal').classList.remove('show');
    currentSalaryId = null;
    currentSalaryData = null;
}

// Xóa bảng lương
async function deleteSalary(id, monthYear) {
    if (!confirm(`Bạn có chắc muốn xóa bảng lương tháng ${monthYear}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/salary/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã xóa bảng lương thành công');
            loadSalariesList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi xóa bảng lương:', error);
        alert('❌ Lỗi kết nối đến server');
    }
}

async function handleReplaceTimesheetFileSubmit(event) {
    event.preventDefault();
    const fileInput = document.getElementById('replaceTimesheetFileInput');
    const id = document.getElementById('replaceTimesheetId').value;
    if (!fileInput || !fileInput.files[0]) {
        alert('Vui lòng chọn file Excel trước khi thay thế');
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    try {
        const response = await fetch(`/api/admin/replace-timesheet/${id}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            closeReplaceModal();
            loadTimesheetsList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('❌ Lỗi thay thế file bảng công');
    }
}

async function handleReplaceSalaryFileSubmit(event) {
    event.preventDefault();
    const fileInput = document.getElementById('replaceSalaryFileInput');
    const id = document.getElementById('replaceSalaryId').value;
    if (!fileInput || !fileInput.files[0]) {
        alert('Vui lòng chọn file Excel trước khi thay thế');
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    try {
        const response = await fetch(`/api/admin/replace-salary/${id}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            closeReplaceModal();
            loadSalariesList();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('❌ Lỗi thay thế file bảng lương');
    }
}

function showReplaceTimesheetFile(id, currentFileName, monthYear) {
    document.getElementById('replaceModalTitle').textContent = `🔁 Thay thế file bảng công ${monthYear}`;
    document.getElementById('replaceModalSubtitle').textContent = `File hiện tại: ${currentFileName || 'N/A'}`;
    document.getElementById('replaceTimesheetId').value = id;
    document.getElementById('replaceTimesheetFileInput').value = '';
    document.getElementById('replaceTimesheetForm').style.display = 'block';
    document.getElementById('replaceSalaryForm').style.display = 'none';
    document.getElementById('replaceFileModal').style.display = 'flex';
}

function showReplaceSalaryFile(id, currentFileName, monthYear) {
    document.getElementById('replaceModalTitle').textContent = `🔁 Thay thế file bảng lương ${monthYear}`;
    document.getElementById('replaceModalSubtitle').textContent = `File hiện tại: ${currentFileName || 'N/A'}`;
    document.getElementById('replaceSalaryId').value = id;
    document.getElementById('replaceSalaryFileInput').value = '';
    document.getElementById('replaceSalaryForm').style.display = 'block';
    document.getElementById('replaceTimesheetForm').style.display = 'none';
    document.getElementById('replaceFileModal').style.display = 'flex';
}

function closeReplaceModal() {
    document.getElementById('replaceFileModal').style.display = 'none';
    document.getElementById('replaceTimesheetForm').style.display = 'none';
    document.getElementById('replaceSalaryForm').style.display = 'none';
}

// Hiển thị modal chỉnh sửa tên bảng lương
function showEditSalaryModal(id, currentFileName, monthYear) {
    const newFileName = prompt(`Chỉnh sửa tên file bảng lương tháng ${monthYear}:`, currentFileName);
    
    if (newFileName !== null && newFileName.trim() !== '' && newFileName !== currentFileName) {
        renameSalary(id, newFileName.trim());
    }
}

// Đổi tên bảng lương
async function renameSalary(id, newFileName) {
    try {
        const response = await fetch(`/api/admin/salary/${id}/rename`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
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

async function handleUploadSubmit(event) {
    event.preventDefault();
    const fileInput = document.getElementById('excelFileInput');
    const msgEl = document.getElementById('uploadMessage');
    const submitBtn = document.getElementById('uploadSubmitBtn');

    if (!fileInput || !fileInput.files[0]) {
        if (msgEl) { msgEl.className = 'message error'; msgEl.textContent = '❌ Vui lòng chọn file Excel trước khi tải lên'; }
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const apiUrl = currentUploadType === 'timesheet' ? '/api/admin/upload-timesheet' : '/api/admin/upload-salary';

    if (msgEl) { msgEl.className = 'message'; msgEl.textContent = '⏳ Đang tải lên và xử lý file...'; }
    if (submitBtn) submitBtn.disabled = true;

    try {
        const response = await fetch(apiUrl, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            if (msgEl) { msgEl.className = 'message success'; msgEl.textContent = '✅ ' + data.message; }
            setTimeout(() => {
                closeUploadModal();
                if (currentUploadType === 'timesheet') {
                    loadTimesheetsListInto('timesheetsListSectionAdmin');
                } else {
                    loadSalariesListInto('salariesListSectionAdmin');
                }
            }, 1500);
        } else {
            if (msgEl) { msgEl.className = 'message error'; msgEl.textContent = '❌ ' + data.message; }
        }
    } catch (err) {
        if (msgEl) { msgEl.className = 'message error'; msgEl.textContent = '❌ Lỗi kết nối đến server'; }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Hàm upload trực tiếp từ nút "Tải Lên" (không dùng form submit)
async function doUploadFile() {
    const fileInput = document.getElementById('excelFileInput');
    const msgEl = document.getElementById('uploadMessage');
    const submitBtn = document.getElementById('uploadSubmitBtn');

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (msgEl) { msgEl.className = 'message error'; msgEl.style.display = 'block'; msgEl.textContent = '❌ Vui lòng chọn file Excel trước khi tải lên'; }
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const apiUrl = currentUploadType === 'salary' ? '/api/admin/upload-salary' : '/api/admin/upload-timesheet';

    if (msgEl) { msgEl.className = 'message'; msgEl.style.display = 'block'; msgEl.textContent = '⏳ Đang tải lên file "' + file.name + '"...'; }
    if (submitBtn) submitBtn.disabled = true;

    try {
        const response = await fetch(apiUrl, { method: 'POST', body: formData });
        const data = await response.json();

        if (response.status === 401 || (data.message && data.message.includes('hết hạn'))) {
            if (msgEl) { 
                msgEl.className = 'message error'; 
                msgEl.innerHTML = '⚠️ ' + data.message + '<br><button onclick="logout()" class="btn-primary" style="margin-top:8px; padding:6px 16px;">🔑 Đăng Nhập Lại Ngay</button>'; 
            }
            return;
        }

        if (data.success) {
            if (msgEl) { msgEl.className = 'message success'; msgEl.textContent = '✅ ' + data.message; }
            setTimeout(() => {
                closeUploadModal();
                if (currentUploadType === 'timesheet') {
                    loadTimesheetsListInto('timesheetsListSectionAdmin');
                } else {
                    loadSalariesListInto('salariesListSectionAdmin');
                }
            }, 1500);
        } else {
            if (msgEl) { msgEl.className = 'message error'; msgEl.textContent = '❌ ' + data.message; }
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (err) {
        if (msgEl) { msgEl.className = 'message error'; msgEl.textContent = '❌ Lỗi kết nối đến server. Vui lòng thử lại.'; }
        if (submitBtn) submitBtn.disabled = false;
    }
}

let currentSelectedRole = 'user';

let selectedUserChatImageUrl = null;
let sysSelectedChatImageUrl = null;
let activeSysConversationId = null;
let activeSysSenderName = '';
let activeSysSenderRole = '';
let chatPollInterval = null;
let notificationsPollInterval = null;

function selectLoginRole(role) {
    currentSelectedRole = role;
    document.querySelectorAll('.role-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });

    const usernameLabel = document.getElementById('usernameLabel');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (role === 'user') {
        if (usernameLabel) usernameLabel.textContent = 'Mã Số Nhân Viên (MSNV)';
        if (usernameInput) usernameInput.placeholder = 'Nhập MSNV';
        if (passwordInput) passwordInput.placeholder = 'Nhập mật khẩu (4 số cuối CCCD)';
    } else if (role === 'timesheet_admin') {
        if (usernameLabel) usernameLabel.textContent = 'Tên Đăng Nhập QTV Bảng Công';
        if (usernameInput) usernameInput.placeholder = 'VD: admin_cong';
        if (passwordInput) passwordInput.placeholder = 'Nhập mật khẩu QTV Bảng Công';
    } else if (role === 'salary_admin') {
        if (usernameLabel) usernameLabel.textContent = 'Tên Đăng Nhập QTV Bảng Lương';
        if (usernameInput) usernameInput.placeholder = 'VD: admin_luong';
        if (passwordInput) passwordInput.placeholder = 'Nhập mật khẩu QTV Bảng Lương';
    } else if (role === 'system_admin') {
        if (usernameLabel) usernameLabel.textContent = 'Tên Đăng Nhập QTV Hệ Thống';
        if (usernameInput) usernameInput.placeholder = 'VD: sysadmin';
        if (passwordInput) passwordInput.placeholder = 'Nhập mật khẩu QTV Hệ Thống';
    }
}

function routeToRolePage(user) {
    if (!user) {
        localStorage.removeItem('tbs_logged_user');
        currentUser = null;
        showPage('loginPage');
        return;
    }
    currentUser = user;
    localStorage.setItem('tbs_logged_user', JSON.stringify(user));
    const role = user.role || 'user';

    if (role === 'timesheet_admin') {
        showPage('timesheetAdminPage');
        loadTimesheetsListInto('timesheetsListSectionAdmin');
    } else if (role === 'salary_admin') {
        showPage('salaryAdminPage');
        loadSalariesListInto('salariesListSectionAdmin');
    } else if (role === 'system_admin' || role === 'admin') {
        showPage('systemAdminPage');
        initSystemAdminHub();
    } else {
        showEmployeePage(user);
    }
}

async function checkSession() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.success && data.loggedIn && data.data) {
            const user = data.data;
            currentUser = user;
            localStorage.setItem('tbs_logged_user', JSON.stringify(user));
            routeToRolePage(user);
            return;
        }

        const savedUserStr = localStorage.getItem('tbs_logged_user');
        if (savedUserStr) {
            try {
                const savedUser = JSON.parse(savedUserStr);
                currentUser = savedUser;
                routeToRolePage(savedUser);
            } catch (e) {
                showPage('loginPage');
            }
            return;
        }

        showPage('loginPage');
    } catch (error) {
        console.error('Lỗi kiểm tra session:', error);
        const savedUserStr = localStorage.getItem('tbs_logged_user');
        if (savedUserStr) {
            try {
                const savedUser = JSON.parse(savedUserStr);
                currentUser = savedUser;
                routeToRolePage(savedUser);
            } catch (e) {
                showPage('loginPage');
            }
        } else {
            showPage('loginPage');
        }
    }
}

// Logout function đã được định nghĩa ở line ~374

async function loadTimesheetsListInto(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Đang tải danh sách Bảng Công...</p>';
    try {
        const response = await fetch('/api/admin/timesheets');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
            let html = '<div class="timesheet-cards-grid">';
            data.data.forEach(item => {
                html += `
                    <div class="timesheet-card">
                        <div class="card-title">📊 ${item.file_name || 'Bảng công'} (Tháng ${item.month}/${item.year})</div>
                        <div class="card-sub">Ngày tải: ${new Date(item.created_at).toLocaleString('vi-VN')}</div>
                        <div class="card-actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button onclick="viewTimesheetDetails(${item.id})" class="btn-secondary" style="padding: 6px 12px;">Xem chi tiết</button>
                            <button onclick="showEditTimesheetModal(${item.id}, '${(item.file_name || '').replace(/'/g, "\\'")}', '${item.month}/${item.year}')" class="btn-secondary" style="padding: 6px 12px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer;">✏️ Sửa tên</button>
                            <button onclick="showReplaceTimesheetFile(${item.id}, '${(item.file_name || '').replace(/'/g, "\\'")}', '${item.month}/${item.year}')" class="btn-secondary" style="padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">🔁 Thay file</button>
                            <button onclick="deleteTimesheet(${item.id}, '${item.month}/${item.year}')" class="btn-danger" style="padding: 6px 12px; background: #ef4444; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Xóa</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Chưa có file Bảng Chấm Công nào được tải lên.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red;">Lỗi tải dữ liệu</p>';
    }
}

// Helper: render sheet_data (raw Excel) as full scrollable table
function renderSheetDataTable(sheet_data, accentColor) {
    if (!sheet_data || !Array.isArray(sheet_data) || sheet_data.length === 0) {
        return '<p style="text-align: center; color: #64748b; padding: 24px;">Không có dữ liệu file gốc được lưu trữ.</p>';
    }
    const rows = sheet_data.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && c !== ''));
    if (rows.length === 0) return '<p style="text-align: center; color: #64748b; padding: 24px;">File không có dữ liệu.</p>';
    let html = `<div style="overflow-x: auto; overflow-y: visible; border-radius: 8px; border: 1px solid #e2e8f0; display: block; max-width: 100%;"><table style="border-collapse: collapse; font-size: 12px; white-space: nowrap;"><tbody>`;
    rows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        const bg = isHeader ? accentColor : (rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
        const color = isHeader ? '#ffffff' : '#0f172a';
        const fw = isHeader ? '700' : 'normal';
        const tag = isHeader ? 'th' : 'td';
        html += `<tr style="background:${bg}; color:${color}; font-weight:${fw};">`;
        row.forEach(cell => {
            const val = (cell !== null && cell !== undefined) ? String(cell) : '';
            const align = (typeof cell === 'number') ? 'right' : 'left';
            html += `<${tag} style="padding: 7px 10px; border: 1px solid ${isHeader ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; text-align:${align};">${escapeHtml(val)}</${tag}>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

function renderEditableTimesheetSheetTable(sheet_data, accentColor) {
    if (!sheet_data || !Array.isArray(sheet_data) || sheet_data.length === 0) {
        return '<p style="text-align: center; color: #64748b; padding: 24px;">Không có dữ liệu file gốc được lưu trữ.</p>';
    }

    const rows = sheet_data.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && c !== ''));
    if (rows.length === 0) return '<p style="text-align: center; color: #64748b; padding: 24px;">File không có dữ liệu.</p>';

    let html = `<div style="border-radius: 8px; border: 1px solid #e2e8f0; display: block; max-width: 100%; width: 100%;"><table id="editableTimesheetDetailTable" style="border-collapse: collapse; font-size: 12px; white-space: nowrap; min-width: 100%; width: max-content;"><tbody>`;
    rows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        const bg = isHeader ? accentColor : (rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
        const color = isHeader ? '#ffffff' : '#0f172a';
        const fw = isHeader ? '700' : 'normal';
        const tag = isHeader ? 'th' : 'td';
        html += `<tr style="background:${bg}; color:${color}; font-weight:${fw};">`;
        row.forEach((cell, colIndex) => {
            const val = (cell !== null && cell !== undefined) ? String(cell) : '';
            const align = (typeof cell === 'number') ? 'right' : 'left';
            html += `<${tag} contenteditable="true" data-row="${rIdx}" data-col="${colIndex}" style="padding: 7px 10px; border: 1px solid ${isHeader ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; text-align:${align}; min-width: 110px; outline: none;">${escapeHtml(val)}</${tag}>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

function renderEditableSalarySheetTable(sheet_data, accentColor) {
    if (!sheet_data || !Array.isArray(sheet_data) || sheet_data.length === 0) {
        return '<p style="text-align: center; color: #64748b; padding: 24px;">Không có dữ liệu file gốc được lưu trữ.</p>';
    }

    const rows = sheet_data.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && c !== ''));
    if (rows.length === 0) return '<p style="text-align: center; color: #64748b; padding: 24px;">File không có dữ liệu.</p>';

    let html = `<div style="border-radius: 8px; border: 1px solid #e2e8f0; display: block; max-width: 100%; width: 100%;"><table id="editableSalaryDetailTable" style="border-collapse: collapse; font-size: 12px; white-space: nowrap; min-width: 100%; width: max-content;"><tbody>`;
    rows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        const bg = isHeader ? accentColor : (rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
        const color = isHeader ? '#ffffff' : '#0f172a';
        const fw = isHeader ? '700' : 'normal';
        const tag = isHeader ? 'th' : 'td';
        html += `<tr style="background:${bg}; color:${color}; font-weight:${fw};">`;
        row.forEach((cell, colIndex) => {
            const val = (cell !== null && cell !== undefined) ? String(cell) : '';
            const align = (typeof cell === 'number') ? 'right' : 'left';
            html += `<${tag} contenteditable="true" data-row="${rIdx}" data-col="${colIndex}" style="padding: 7px 10px; border: 1px solid ${isHeader ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; text-align:${align}; min-width: 110px; outline: none;">${escapeHtml(val)}</${tag}>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

async function saveEditableTimesheetDetail() {
    const table = document.getElementById('editableTimesheetDetailTable');
    const saveBtn = document.getElementById('saveTimesheetDetailBtn');
    if (!table || !currentEditableTimesheetId) return;

    const rows = Array.from(table.rows);
    const updatedSheetData = rows.map(tr => Array.from(tr.cells).map(cell => cell.innerText.trim()));

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Đang lưu...';
    }

    try {
        const response = await fetch(`/api/admin/timesheet/${currentEditableTimesheetId}/sheet-data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_data: updatedSheetData })
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ Đã lưu thay đổi thành công');
            loadTimesheetsListInto('timesheetsListSectionAdmin');
        } else {
            alert('❌ ' + (data.message || 'Lỗi lưu dữ liệu'));
        }
    } catch (err) {
        console.error('Lỗi lưu chỉnh sửa bảng công:', err);
        alert('❌ Lỗi kết nối máy chủ');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Lưu thay đổi';
        }
    }
}

// Xem chi tiết Bảng Chấm Công ở chế độ chỉnh sửa trực tiếp
async function viewTimesheetDetails(timesheetId) {
    const modal = document.getElementById('viewTimesheetDetailModal');
    const container = document.getElementById('viewTimesheetDetailContainer');
    const titleEl = document.getElementById('viewTimesheetModalTitle');
    const countEl = document.getElementById('viewTimesheetRecordCount');
    if (!modal || !container) return;
    currentEditableTimesheetId = timesheetId;
    container.innerHTML = '<p style="text-align: center; padding: 30px;">⏳ Đang tải dữ liệu Bảng Chấm Công...</p>';
    modal.style.display = 'flex';
    try {
        const response = await fetch(`/api/admin/timesheet/${timesheetId}`);
        const data = await response.json();
        if (!data.success) {
            container.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">❌ ${data.message || 'Lỗi tải chi tiết'}</p>`;
            return;
        }
        const { timesheet, sheet_data, records } = data.data;
        if (titleEl) titleEl.textContent = `📊 ${timesheet.file_name} — Tháng ${timesheet.month}/${timesheet.year}`;
        if (countEl) countEl.textContent = `${records ? records.length : 0} nhân viên`;
        let rawSheetData = sheet_data;
        if (!rawSheetData && timesheet.sheet_data) {
            try { rawSheetData = JSON.parse(timesheet.sheet_data); } catch(e) {}
        }
        const guideHtml = `<div class="detail-guide-banner">
            <span class="guide-icon">💡</span>
            <span>Hướng dẫn: Bạn có thể nhập trực tiếp trực tiếp vào bất kỳ ô nào bên dưới. Dữ liệu sẽ tự động lưu nếu bạn bấm nút <strong>Lưu thay đổi</strong> hoặc khi đóng.</span>
        </div>`;
        const tableHtml = `<div class="table-scroll-wrapper">${renderEditableTimesheetSheetTable(rawSheetData, '#065f46')}</div>`;
        container.innerHTML = guideHtml + tableHtml;
    } catch (err) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Lỗi kết nối máy chủ</p>';
    }
}

async function saveEditableSalaryDetail() {
    const table = document.getElementById('editableSalaryDetailTable');
    const saveBtn = document.getElementById('saveSalaryDetailBtn');
    if (!table || !currentEditableSalaryId) return;

    const rows = Array.from(table.rows);
    const updatedSheetData = rows.map(tr => Array.from(tr.cells).map(cell => cell.innerText.trim()));

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Đang lưu...';
    }

    try {
        const response = await fetch(`/api/admin/salary/${currentEditableSalaryId}/sheet-data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_data: updatedSheetData })
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ Đã lưu thay đổi thành công');
            loadSalariesListInto('salariesListSectionAdmin');
        } else {
            alert('❌ ' + (data.message || 'Lỗi lưu dữ liệu'));
        }
    } catch (err) {
        console.error('Lỗi lưu chỉnh sửa bảng lương:', err);
        alert('❌ Lỗi kết nối máy chủ');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Lưu thay đổi';
        }
    }
}

function closeViewTimesheetDetailModal() {
    const modal = document.getElementById('viewTimesheetDetailModal');
    if (modal) modal.style.display = 'none';
    currentEditableTimesheetId = null;
}

async function loadSalariesListInto(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Đang tải danh sách Bảng Lương...</p>';
    try {
        const response = await fetch('/api/admin/salaries');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
            let html = '<div class="timesheet-cards-grid">';
            data.data.forEach(item => {
                html += `
                    <div class="timesheet-card">
                        <div class="card-title">💰 ${item.file_name || 'Bảng lương'} (Tháng ${item.month}/${item.year})</div>
                        <div class="card-sub">Ngày tải: ${new Date(item.created_at).toLocaleString('vi-VN')}</div>
                        <div class="card-actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button onclick="viewSalaryDetails(${item.id})" class="btn-secondary" style="padding: 6px 14px; background: #0284c7; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">👁️ Xem chi tiết</button>
                            <button onclick="showReplaceSalaryFile(${item.id}, '${(item.file_name || '').replace(/'/g, "\\'")}', '${item.month}/${item.year}')" class="btn-secondary" style="padding: 6px 12px; background: #16a34a; color: #fff; border: none; border-radius: 6px; cursor: pointer;">🔁 Thay file</button>
                            <button onclick="deleteSalary(${item.id})" class="btn-danger" style="padding: 6px 12px; background: #ef4444; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Xóa file này</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Chưa có file Bảng Lương nào được tải lên.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red;">Lỗi tải dữ liệu</p>';
    }
}

// Xem chi tiết Bảng Lương ở chế độ Read-Only (Quản Trị Viên Hệ Thống / Rà Soát)
async function viewSalaryDetails(salaryId) {
    const modal = document.getElementById('viewSalaryDetailModal');
    const container = document.getElementById('viewSalaryDetailContainer');
    const titleEl = document.getElementById('viewSalaryModalTitle');
    const countEl = document.getElementById('viewSalaryRecordCount');

    if (!modal || !container) return;
    currentEditableSalaryId = salaryId;
    container.innerHTML = '<p style="text-align: center; padding: 30px;">⏳ Đang tải dữ liệu chi tiết Bảng Lương...</p>';
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/admin/salary/${salaryId}`);
        const data = await response.json();
        if (!data.success) {
            container.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">❌ ${data.message || 'Lỗi tải chi tiết'}</p>`;
            return;
        }

        const { salary, records, sheet_data } = data.data;
        if (titleEl) titleEl.textContent = `💰 ${salary.file_name} — Tháng ${salary.month}/${salary.year}`;
        if (countEl) countEl.textContent = `${records ? records.length : 0} nhân viên`;

        // Hiển thị toàn bộ file gốc (sheet_data)
        let rawSheetData = sheet_data;
        if (!rawSheetData && salary.sheet_data) {
            try { rawSheetData = JSON.parse(salary.sheet_data); } catch(e) {}
        }
        const guideHtml = `<div class="detail-guide-banner">
            <span class="guide-icon">💡</span>
            <span>Hướng dẫn: Bạn có thể nhập trực tiếp trực tiếp vào bất kỳ ô nào bên dưới. Dữ liệu sẽ tự động lưu nếu bạn bấm nút <strong>Lưu thay đổi</strong> hoặc khi đóng.</span>
        </div>`;
        const tableHtml = `<div class="table-scroll-wrapper">${renderEditableSalarySheetTable(rawSheetData, '#0284c7')}</div>`;
        container.innerHTML = guideHtml + tableHtml;

    } catch (err) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Lỗi kết nối máy chủ</p>';
    }
}

function closeViewSalaryDetailModal() {
    const modal = document.getElementById('viewSalaryDetailModal');
    if (modal) modal.style.display = 'none';
    currentEditableSalaryId = null;
}

// USER & SECTION ADMIN LIVE CHAT WIDGET
function toggleUserChatModal() {
    const modal = document.getElementById('userChatModal');
    if (!modal) return;
    const isHidden = modal.style.display === 'none';
    modal.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
        fetchUserChatMessages();
        if (!chatPollInterval) {
            chatPollInterval = setInterval(fetchUserChatMessages, 3000);
        }
    }
}

function openSupportChat(senderRole) {
    toggleUserChatModal();
}

async function handleBroadcastNotificationSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    const type = document.getElementById('broadcastType').value;
    const attachmentInput = document.getElementById('broadcastAttachmentInput');

    if (!title || !message) {
        alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('message', message);
    formData.append('type', type);
    if (attachmentInput && attachmentInput.files[0]) {
        formData.append('attachment', attachmentInput.files[0]);
    }

    try {
        const response = await fetch('/api/system-admin/broadcast-notification', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            document.getElementById('broadcastNotificationForm').reset();
            const preview = document.getElementById('broadcastAttachmentPreview');
            if (preview) preview.style.display = 'none';
            loadEmployeeNotifications();
            loadBroadcastNotifications(); // Tải lại danh sách thông báo đã gửi
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('❌ Lỗi khi gửi thông báo');
    }
}

function handleBroadcastAttachmentSelect(event) {
    const input = event.target;
    const preview = document.getElementById('broadcastAttachmentPreview');
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (preview) {
        preview.style.display = 'flex';
        preview.querySelector('.file-preview-name').textContent = `📄 ${file.name}`;
    }
}

function clearBroadcastAttachment() {
    const input = document.getElementById('broadcastAttachmentInput');
    const preview = document.getElementById('broadcastAttachmentPreview');
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
}

// Toggle Form Card (Collapse/Expand)
function toggleFormCard(headerElement) {
    const card = headerElement.closest('.modern-form-card');
    if (card) {
        card.classList.toggle('collapsed');
    }
}

// State for pagination
let currentNotificationPage = 1;
const notificationsPerPage = 10;

// Load & Render Broadcast Notifications List (Admin) with Pagination
async function loadBroadcastNotifications(page = 1) {
    const container = document.getElementById('broadcastNotificationsList');
    if (!container) return;

    currentNotificationPage = page;
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #6b7280;">⏳ Đang tải...</p>';

    try {
        const res = await fetch(`/api/system-admin/notifications?page=${page}&limit=${notificationsPerPage}`);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();

        if (!data.success) {
            container.innerHTML = `<p style="text-align: center; padding: 20px; color: #ef4444;">❌ ${data.message || 'Lỗi tải danh sách'}</p>`;
            return;
        }

        if (!data.data || data.data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <p style="font-size: 16px; font-weight: 600; color: #6b7280; margin: 0;">Chưa có thông báo nào được gửi</p>
                    <small style="font-size: 13px; color: #9ca3af;">Gửi thông báo đầu tiên bằng form bên trên</small>
                </div>
            `;
            return;
        }

        let html = '<div class="notifications-admin-list">';
        data.data.forEach((notif, index) => {
            const dateStr = formatDate(notif.created_at);
            const typeIcon = { info: '🔔', timesheet_update: '📊', salary_update: '💰', user_update: '⚙️' }[notif.type] || '🔔';
            
            // Fix tên file encoding (giống như bên user)
            let decodedAttachmentName = notif.attachment_name || '';
            if (decodedAttachmentName) {
                try {
                    // Nếu có ký tự lạ như "Ã£", "Ã ", "Ã¡" -> đã bị encode sai
                    if (decodedAttachmentName.includes('Ã') || decodedAttachmentName.includes('â')) {
                        const bytes = new Uint8Array([...decodedAttachmentName].map(c => c.charCodeAt(0)));
                        decodedAttachmentName = new TextDecoder('utf-8').decode(bytes);
                    }
                } catch (e) {
                    console.warn('Failed to decode filename:', e);
                }
            }
            
            // Hiển thị tên file
            let attachmentDisplay = '';
            if (notif.attachment_url && decodedAttachmentName) {
                // Sử dụng data attribute để tránh encoding issues
                attachmentDisplay = `
                    <div class="notif-admin-attachment">
                        <a href="#" class="attachment-link-admin" data-url="${escapeHtml(notif.attachment_url)}" data-filename="${escapeHtml(decodedAttachmentName)}" data-index="${index}">
                            📎 ${escapeHtml(decodedAttachmentName)}
                        </a>
                    </div>
                `;
            }

            // Escape strings for HTML attributes - tránh lỗi quotes
            const escapedTitle = (notif.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedMessage = (notif.message || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedAttachmentName = decodedAttachmentName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            html += `
                <div class="notif-admin-card">
                    <div class="notif-admin-header">
                        <div class="notif-admin-title">
                            <span class="notif-admin-icon">${typeIcon}</span>
                            <strong>${escapeHtml(notif.title || 'Không có tiêu đề')}</strong>
                        </div>
                        <div class="notif-admin-meta">
                            <span class="notif-admin-recipients">👥 ${notif.recipient_count || 0} người nhận</span>
                            <span class="notif-admin-date">📅 ${dateStr}</span>
                        </div>
                    </div>
                    <div class="notif-admin-message">${escapeHtml(notif.message || 'Không có nội dung')}</div>
                    ${attachmentDisplay}
                    <div class="notif-admin-actions">
                        <button onclick='viewNotificationDetail("${escapedTitle}", "${escapedMessage}", "${notif.attachment_url || ''}", "${escapedAttachmentName}", "${notif.recipient_count || 0}", "${dateStr}")' class="btn-notif-view">👁️ Xem chi tiết</button>
                        <button onclick='deleteNotification(${notif.id})' class="btn-notif-delete">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        // Add pagination controls if needed
        const { pagination } = data;
        if (pagination && pagination.totalPages > 1) {
            html += '<div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; padding: 16px;">';
            
            // Previous button
            if (pagination.page > 1) {
                html += `<button onclick="loadBroadcastNotifications(${pagination.page - 1})" class="btn-pagination">← Trước</button>`;
            } else {
                html += `<button class="btn-pagination" disabled style="opacity: 0.5; cursor: not-allowed;">← Trước</button>`;
            }

            // Page info
            html += `<span style="color: #6b7280; font-size: 14px; font-weight: 600;">Trang ${pagination.page} / ${pagination.totalPages}</span>`;

            // Next button
            if (pagination.page < pagination.totalPages) {
                html += `<button onclick="loadBroadcastNotifications(${pagination.page + 1})" class="btn-pagination">Tiếp →</button>`;
            } else {
                html += `<button class="btn-pagination" disabled style="opacity: 0.5; cursor: not-allowed;">Tiếp →</button>`;
            }

            html += '</div>';
        }

        container.innerHTML = html;
        
        // Attach event listeners to attachment links
        container.querySelectorAll('.attachment-link-admin').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const url = this.getAttribute('data-url');
                const filename = this.getAttribute('data-filename');
                console.log('📎 Opening attachment (admin):', { url, filename });
                viewAttachment(url, filename);
            });
        });
    } catch (err) {
        console.error('Lỗi tải danh sách thông báo:', err);
        container.innerHTML = `<p style="text-align: center; padding: 20px; color: #ef4444;">❌ Lỗi tải danh sách thông báo: ${err.message}</p>`;
    }
}

// View Notification Detail
function viewNotificationDetail(title, message, attachmentUrl, attachmentName, recipientCount, dateStr) {
    // Decode HTML entities
    title = title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    message = message.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    attachmentName = attachmentName.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    
    const modal = document.createElement('div');
    modal.className = 'attachment-viewer-modal';
    modal.style.display = 'flex';
    
    const attachmentSection = attachmentUrl && attachmentName
        ? `<div style="margin-top: 16px; padding: 14px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 10px;">
             <div style="font-weight: 700; margin-bottom: 6px; color: #1e40af;">📎 File đính kèm:</div>
             <a href="javascript:void(0)" onclick="event.stopPropagation(); viewAttachment('${attachmentUrl}', '${attachmentName.replace(/'/g, "\\'")}'); return false;" style="color: #1e40af; text-decoration: underline; cursor: pointer; font-weight: 600;">${escapeHtml(attachmentName)}</a>
           </div>`
        : '';

    modal.innerHTML = `
        <div class="attachment-viewer-content" style="max-width: 600px;">
            <div class="attachment-viewer-header">
                <h3>📢 Chi Tiết Thông Báo</h3>
                <button onclick="this.closest('.attachment-viewer-modal').remove()" class="btn-close-viewer">✕</button>
            </div>
            <div class="attachment-viewer-body" style="padding: 24px; text-align: left; background: white;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Tiêu đề</div>
                    <div style="font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(title)}</div>
                </div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Nội dung</div>
                    <div style="font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
                </div>
                ${attachmentSection}
                <div style="display: flex; gap: 20px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <div>
                        <span style="font-size: 12px; color: #6b7280;">👥 Người nhận:</span>
                        <strong style="color: #111827;"> ${recipientCount} nhân viên</strong>
                    </div>
                    <div>
                        <span style="font-size: 12px; color: #6b7280;">📅 Ngày gửi:</span>
                        <strong style="color: #111827;"> ${dateStr}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete Notification by ID
async function deleteNotification(notifId) {
    if (!notifId) {
        alert('❌ Lỗi: Không tìm thấy ID thông báo');
        return;
    }
    
    if (!confirm(`⚠️ Bạn có chắc muốn xóa thông báo này?\n\n⚡ Thao tác này sẽ xóa thông báo khỏi hộp thư của TẤT CẢ nhân viên và KHÔNG THỂ HOÀN TÁC.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/system-admin/notification/${notifId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Kiểm tra xem response có phải JSON không
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Response không phải JSON, có thể bị redirect về login');
            alert('❌ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '/';
            return;
        }

        const data = await res.json();

        if (data.success) {
            alert('✅ ' + data.message);
            // Reload current page
            loadBroadcastNotifications(currentNotificationPage);
        } else {
            alert('❌ ' + (data.message || 'Lỗi xóa thông báo'));
        }
    } catch (err) {
        console.error('Lỗi xóa thông báo:', err);
        alert('❌ Lỗi kết nối: ' + err.message);
    }
}

async function handleUserChatImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('chat_image', file);

    try {
        const response = await fetch('/api/chat/upload-image', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            selectedUserChatImageUrl = data.image_url;
            document.getElementById('userChatPreviewImg').src = data.image_url;
            document.getElementById('userChatPreviewThumb').style.display = 'block';
        } else {
            alert('Lỗi tải ảnh: ' + data.message);
        }
    } catch (e) {
        alert('Lỗi tải hình ảnh');
    }
}

function clearUserChatImage() {
    selectedUserChatImageUrl = null;
    document.getElementById('userChatPreviewThumb').style.display = 'none';
    document.getElementById('userChatImageInput').value = '';
}

async function sendUserChatMessage() {
    const input = document.getElementById('userChatTextInput');
    const msgText = input.value.trim();
    if (!msgText && !selectedUserChatImageUrl) return;

    const convId = currentUser ? `chat_${currentUser.employee_id || currentUser.username || currentUser.id}` : 'chat_guest';
    const senderId = currentUser ? String(currentUser.employee_id || currentUser.username || currentUser.id) : 'guest';
    const senderName = currentUser ? (currentUser.full_name || currentUser.employee_name || currentUser.username) : 'Người dùng';
    const senderRole = currentUser ? (currentUser.role || 'user') : 'user';

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: convId,
                sender_id: senderId,
                sender_name: senderName,
                sender_role: senderRole,
                message: msgText,
                image_url: selectedUserChatImageUrl
            })
        });
        const data = await response.json();
        if (data.success) {
            input.value = '';
            clearUserChatImage();
            fetchUserChatMessages();
        }
    } catch (e) {
        console.error('Lỗi gửi tin nhắn:', e);
    }
}

async function fetchUserChatMessages() {
    const convId = currentUser ? `chat_${currentUser.employee_id || currentUser.username || currentUser.id}` : 'chat_guest';
    try {
        const response = await fetch(`/api/chat/messages?conversation_id=${encodeURIComponent(convId)}`);
        const data = await response.json();
        if (data.success) {
            const body = document.getElementById('userChatMessages');
            if (!body) return;
            let html = `
                <div class="chat-msg system">
                    <div class="bubble">Xin chào 👋 Bạn đang gặp khó khăn gì? Hãy nhắn tin hoặc gửi ảnh trực tiếp cho Quản Trị Viên Hệ Thống nhé!</div>
                </div>
            `;
            data.data.forEach(m => {
                const isMine = m.sender_role !== 'system_admin';
                const senderRoleLbl = m.sender_role === 'timesheet_admin' ? '[QTV Bảng Công]' : (m.sender_role === 'salary_admin' ? '[QTV Bảng Lương]' : '');
                html += `
                    <div class="chat-msg ${isMine ? 'sent' : 'received'}">
                        <span class="msg-sender">${m.sender_name} ${senderRoleLbl} • ${new Date(m.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                        ${m.message ? `<div class="bubble">${m.message}</div>` : ''}
                        ${m.image_url ? `<a href="${m.image_url}" target="_blank"><img src="${m.image_url}" class="chat-img-attachment" alt="ảnh hỗ trợ"></a>` : ''}
                    </div>
                `;
            });
            body.innerHTML = html;
            body.scrollTop = body.scrollHeight;
        }
    } catch (e) {
        console.error('Lỗi tải tin nhắn:', e);
    }
}

// SYSTEM ADMIN MASTER HUB LOGIC
async function initSystemAdminHub() {
    switchSysTab('chat');
    await Promise.all([
        loadSystemAdminOverview(),
        loadSystemAdminChatHub(),
        loadAdminUsersTable(),
        loadBroadcastNotifications(),
        loadTimesheetsListInto('timesheetsListSystemAdmin'),
        loadSalariesListInto('salariesListSystemAdmin')
    ]);
}

function switchSysTab(tab) {
    const tabs = ['chat', 'roles', 'timesheet', 'salary'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tabBtnSys${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const content = document.getElementById(`sysTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn) btn.classList.toggle('active', t === tab);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
    });
}

async function loadSystemAdminOverview() {
    try {
        const response = await fetch('/api/system-admin/overview');
        const data = await response.json();
        if (data.success) {
            document.getElementById('sysTimesheetAdminsCount').textContent = data.data.timesheet_admins_count;
            document.getElementById('sysSalaryAdminsCount').textContent = data.data.salary_admins_count;
            document.getElementById('sysUnreadChatsCount').textContent = data.data.unread_chats_count;
            document.getElementById('sysSystemAdminsCount').textContent = data.data.system_admins_count;
        }
    } catch (e) {
        console.error('Lỗi load overview:', e);
    }
}

async function loadSystemAdminChatHub() {
    try {
        const response = await fetch('/api/chat/conversations');
        const data = await response.json();
        if (data.success) {
            const listEl = document.getElementById('conversationsList');
            if (!listEl) return;
            if (data.data.length === 0) {
                listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; font-size: 13px;">Chưa có tin nhắn hỗ trợ nào</div>';
                return;
            }
            let html = '';
            data.data.forEach(c => {
                const roleBadge = c.sender_role === 'timesheet_admin' ? '📊 QTV Công' : (c.sender_role === 'salary_admin' ? '💰 QTV Lương' : '👤 Người Dùng');
                const isSelected = activeSysConversationId === c.conversation_id;
                html += `
                    <div class="conv-item ${isSelected ? 'active' : ''}" onclick="selectConversation('${c.conversation_id}', '${c.sender_name}', '${c.sender_role}')">
                        <div class="conv-info">
                            <span class="conv-name">${c.sender_name} <small style="color:#047857;">(${roleBadge})</small></span>
                            <span class="conv-msg">${c.image_url ? '📷 [Hình ảnh]' : (c.last_message || '')}</span>
                        </div>
                        ${c.unread_count > 0 ? `<span class="conv-badge">${c.unread_count}</span>` : ''}
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }
    } catch (e) {
        console.error('Lỗi load conversaciones:', e);
    }
}

function filterConversations() {
    const q = document.getElementById('chatSearchInput').value.toLowerCase();
    document.querySelectorAll('.conv-item').forEach(el => {
        const text = el.textContent.toLowerCase();
        el.style.display = text.includes(q) ? 'flex' : 'none';
    });
}

function selectConversation(convId, senderName, senderRole) {
    activeSysConversationId = convId;
    activeSysSenderName = senderName;
    activeSysSenderRole = senderRole;

    document.getElementById('chatRoomHeader').innerHTML = `
        <span>💬 Đang hỗ trợ: <strong>${senderName}</strong> <span class="role-badge ${senderRole === 'timesheet_admin' ? 'cong' : (senderRole === 'salary_admin' ? 'luong' : 'user')}">${senderRole}</span></span>
    `;

    fetchSysChatMessages();
    loadSystemAdminChatHub();
}

async function fetchSysChatMessages() {
    if (!activeSysConversationId) return;
    try {
        const response = await fetch(`/api/chat/messages?conversation_id=${encodeURIComponent(activeSysConversationId)}`);
        const data = await response.json();
        if (data.success) {
            const body = document.getElementById('chatRoomMessages');
            let html = '';
            data.data.forEach(m => {
                const isSystemAdmin = m.sender_role === 'system_admin';
                html += `
                    <div class="chat-msg ${isSystemAdmin ? 'sent' : 'received'}">
                        <span class="msg-sender">${m.sender_name} • ${new Date(m.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                        ${m.message ? `<div class="bubble">${m.message}</div>` : ''}
                        ${m.image_url ? `<a href="${m.image_url}" target="_blank"><img src="${m.image_url}" class="chat-img-attachment" alt="ảnh đính kèm"></a>` : ''}
                    </div>
                `;
            });
            body.innerHTML = html;
            body.scrollTop = body.scrollHeight;
        }
    } catch (e) {
        console.error('Lỗi fetch sys chat:', e);
    }
}

async function handleSysChatImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('chat_image', file);

    try {
        const response = await fetch('/api/chat/upload-image', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            sysSelectedChatImageUrl = data.image_url;
            document.getElementById('sysChatPreviewImg').src = data.image_url;
            document.getElementById('sysChatPreviewThumb').style.display = 'block';
        } else {
            alert('Lỗi tải ảnh: ' + data.message);
        }
    } catch (e) {
        alert('Lỗi tải ảnh');
    }
}

function clearSysChatImage() {
    sysSelectedChatImageUrl = null;
    document.getElementById('sysChatPreviewThumb').style.display = 'none';
    document.getElementById('sysChatImageInput').value = '';
}

async function sendSysChatMessage() {
    const input = document.getElementById('sysChatTextInput');
    const msgText = input.value.trim();
    if (!activeSysConversationId) {
        alert('Vui lòng chọn cuộc hội thoại từ danh sách bên trái');
        return;
    }
    if (!msgText && !sysSelectedChatImageUrl) return;

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: activeSysConversationId,
                sender_id: 'sysadmin',
                sender_name: 'Quản Trị Viên Hệ Thống',
                sender_role: 'system_admin',
                receiver_id: activeSysConversationId,
                message: msgText,
                image_url: sysSelectedChatImageUrl
            })
        });
        const data = await response.json();
        if (data.success) {
            input.value = '';
            clearSysChatImage();
            fetchSysChatMessages();
            loadSystemAdminChatHub();
        }
    } catch (e) {
        console.error('Lỗi gửi sys msg:', e);
    }
}

async function loadAdminUsersTable() {
    // Load danh sách admin
    try {
        const response = await fetch('/api/admin/list-managers');
        const data = await response.json();
        if (data.success) {
            const tbody = document.getElementById('adminUsersTableBody');
            if (!tbody) return;
            let html = '';
            data.data.forEach(u => {
                const roleBadgeClass = u.role === 'system_admin' || u.role === 'admin' ? 'sys' : (u.role === 'timesheet_admin' ? 'cong' : (u.role === 'salary_admin' ? 'luong' : 'user'));
                const roleLabel = u.role === 'system_admin' || u.role === 'admin' ? '🛡️ QTV Hệ Thống' : (u.role === 'timesheet_admin' ? '📊 QTV Bảng Công' : (u.role === 'salary_admin' ? '💰 QTV Bảng Lương' : '👤 Người Dùng'));
                const avatarSrc = u.avatar_url || 'LOGO.png';
                const posDept = [u.position, u.department].filter(Boolean).join(' - ') || '—';
                html += `
                    <tr>
                        <td style="text-align: center;">
                            <img src="${avatarSrc}" alt="Avatar" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0;">
                        </td>
                        <td><strong>${u.username}</strong></td>
                        <td><span style="font-family: monospace; font-weight: 600; color: #475569;">${u.employee_id || '—'}</span></td>
                        <td><strong>${u.full_name}</strong></td>
                        <td><small style="color: #64748b;">${posDept}</small></td>
                        <td><span class="role-badge ${roleBadgeClass}">${roleLabel}</span></td>
                        <td>${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                        <td>
                            <div style="display:flex; gap: 6px; align-items:center;">
                                <select onchange="changeUserRole(${u.id}, this.value)" style="padding: 4px 8px; border-radius: 6px; font-size: 12px;">
                                    <option value="timesheet_admin" ${u.role === 'timesheet_admin' ? 'selected' : ''}>📊 QTV Bảng Công</option>
                                    <option value="salary_admin" ${u.role === 'salary_admin' ? 'selected' : ''}>💰 QTV Bảng Lương</option>
                                    <option value="system_admin" ${u.role === 'system_admin' ? 'selected' : ''}>🛡️ QTV Hệ Thống</option>
                                </select>
                                <button onclick="openAdminEditAccountModal(${u.id}, '${u.username}', '${u.full_name}')" class="btn-secondary" style="padding: 4px 8px; font-size: 12px;">✏️ Sửa</button>
                                <button onclick="selectConversation('chat_${u.username}', '${u.full_name}', '${u.role}'); switchSysTab('chat');" class="btn-primary" style="padding: 4px 8px; font-size: 12px;">💬 Chat</button>
                                <button onclick="deleteAdminAccount(${u.id}, '${u.username}')" style="padding: 4px 8px; font-size: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">🗑️ Xóa</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error('Lỗi load admin table:', e);
    }
}

async function deleteAdminAccount(id, username) {
    if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa tài khoản Quản trị viên "${username}" không? Action này không thể hoàn tác.`)) {
        return;
    }
    try {
        const response = await fetch(`/api/system-admin/delete-admin/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            loadAdminUsersTable();
            if (typeof initSystemAdminHub === 'function') initSystemAdminHub();
        } else {
            alert('❌ ' + data.message);
        }
    } catch(e) {
        alert('❌ Lỗi khi xóa tài khoản');
    }
}

async function handleCreateAdminSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('newAdminUsername').value.trim();
    const full_name = document.getElementById('newAdminFullName').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const role = document.getElementById('newAdminRole').value;

    try {
        const response = await fetch('/api/system-admin/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, full_name, role })
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            document.getElementById('createAdminForm').reset();
            loadAdminUsersTable();
            loadSystemAdminOverview();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('Lỗi tạo tài khoản');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const response = await fetch('/api/system-admin/update-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, new_role: newRole })
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            loadAdminUsersTable();
            loadSystemAdminOverview();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('Lỗi cập nhật quyền');
    }
}

function openAdminEditAccountModal(userId, username, fullName) {
    document.getElementById('editAccountId').value = userId;
    document.getElementById('editAccountUsername').value = username;
    document.getElementById('editAccountFullName').value = fullName;
    document.getElementById('editAccountNewPassword').value = '';
    document.getElementById('adminEditAccountModal').classList.add('active');
}

function closeAdminEditAccountModal() {
    document.getElementById('adminEditAccountModal').classList.remove('active');
}

async function handleAdminEditAccountSubmit(event) {
    event.preventDefault();
    const user_id = document.getElementById('editAccountId').value;
    const username = document.getElementById('editAccountUsername').value.trim();
    const full_name = document.getElementById('editAccountFullName').value.trim();
    const new_password = document.getElementById('editAccountNewPassword').value.trim();

    try {
        const response = await fetch('/api/system-admin/update-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, username, full_name, new_password })
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            closeAdminEditAccountModal();
            loadAdminUsersTable();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (e) {
        alert('Lỗi cập nhật tài khoản');
    }
}

function openSubAdminProfileModal() {
    if (!currentUser) return;
    const nameInput = document.getElementById('subAdminFullName');
    const userInput = document.getElementById('subAdminUsername');
    const passInput = document.getElementById('subAdminNewPassword');
    const msg = document.getElementById('subAdminProfileMessage');

    if (nameInput) nameInput.value = currentUser.full_name || currentUser.employee_name || '';
    if (userInput) userInput.value = currentUser.username || currentUser.employee_id || '';
    if (passInput) passInput.value = '';
    if (msg) msg.textContent = '';

    const modal = document.getElementById('subAdminProfileModal');
    if (modal) modal.classList.add('active');
}

function closeSubAdminProfileModal() {
    const modal = document.getElementById('subAdminProfileModal');
    if (modal) modal.classList.remove('active');
}

async function handleSubAdminProfileSubmit(event) {
    event.preventDefault();
    const full_name = document.getElementById('subAdminFullName').value.trim();
    const username = document.getElementById('subAdminUsername').value.trim();
    const new_password = document.getElementById('subAdminNewPassword').value.trim();
    const msg = document.getElementById('subAdminProfileMessage');

    try {
        const response = await fetch('/api/admin/self-update-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, full_name, new_password })
        });
        const data = await response.json();
        if (data.success) {
            if (msg) {
                msg.className = 'message success';
                msg.textContent = '✅ ' + data.message;
            }
            if (currentUser) {
                currentUser.full_name = full_name;
                currentUser.username = username;
                localStorage.setItem('tbs_logged_user', JSON.stringify(currentUser));
            }
            setTimeout(() => {
                closeSubAdminProfileModal();
            }, 1200);
        } else {
            if (msg) {
                msg.className = 'message error';
                msg.textContent = '❌ ' + data.message;
            }
        }
    } catch(e) {
        if (msg) {
            msg.className = 'message error';
            msg.textContent = '❌ Lỗi kết nối hệ thống';
        }
    }
}

// ==================== SUB-ADMIN LEFT SIDEBAR & DEDICATED PAGE HANDLERS ====================
let dedicatedChatPollInterval = null;
let dedicatedSelectedChatImageUrl = null;

function switchSubAdminTab(adminType, tabName, btnElement) {
    const parent = btnElement.closest('.sidebar-menu');
    if (parent) {
        parent.querySelectorAll('.sidebar-link').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const filesTab = document.getElementById(prefix + 'TabFiles');
    const chatTab = document.getElementById(prefix + 'TabChat');
    const profileTab = document.getElementById(prefix + 'TabProfile');

    if (filesTab) filesTab.style.display = tabName === 'files' ? 'block' : 'none';
    if (chatTab) chatTab.style.display = tabName === 'chat' ? 'block' : 'none';
    if (profileTab) profileTab.style.display = tabName === 'profile' ? 'block' : 'none';

    if (tabName === 'chat') {
        loadDedicatedChatMessages(adminType);
        if (dedicatedChatPollInterval) clearInterval(dedicatedChatPollInterval);
        dedicatedChatPollInterval = setInterval(() => loadDedicatedChatMessages(adminType), 3000);
    } else {
        if (dedicatedChatPollInterval) {
            clearInterval(dedicatedChatPollInterval);
            dedicatedChatPollInterval = null;
        }
    }

    if (tabName === 'profile') {
        fillDedicatedProfileForm(adminType);
    }
}

function fillDedicatedProfileForm(adminType) {
    if (!currentUser) return;
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const nameInput = document.getElementById(prefix + 'ProfileFullName');
    const userInput = document.getElementById(prefix + 'ProfileUsername');
    const passInput = document.getElementById(prefix + 'ProfileNewPassword');
    const confirmInput = document.getElementById(prefix + 'ProfileConfirmPassword');
    const msg = document.getElementById(prefix + 'ProfileMessage');

    if (nameInput) nameInput.value = currentUser.full_name || currentUser.employee_name || '';
    if (userInput) userInput.value = currentUser.username || currentUser.employee_id || '';
    if (passInput) passInput.value = '';
    if (confirmInput) confirmInput.value = '';
    if (msg) msg.textContent = '';
}

// ============= QUẢN LÝ HỒ SƠ CÁ NHÂN QUẢN TRỊ VIÊN =============

async function loadMyProfile(adminType) {
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    try {
        const response = await fetch('/api/admin/my-profile');
        const data = await response.json();
        if (data.success) {
            const user = data.data;
            const fullNameEl = document.getElementById(prefix + 'ProfileFullName');
            const empIdEl = document.getElementById(prefix + 'ProfileEmployeeId');
            const deptEl = document.getElementById(prefix + 'ProfileDepartment');
            const posEl = document.getElementById(prefix + 'ProfilePosition');
            const userEl = document.getElementById(prefix + 'ProfileUsername');
            const avatarEl = document.getElementById(prefix + 'ProfileAvatar');

            if (fullNameEl) fullNameEl.value = user.full_name || '';
            if (empIdEl) empIdEl.value = user.employee_id || '';
            if (deptEl) deptEl.value = user.department || '';
            if (posEl) posEl.value = user.position || '';
            if (userEl) userEl.value = user.username || '';
            if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;

            updateSidebarAvatar(adminType, user.avatar_url, user.full_name);
        }
    } catch (e) {
        console.error('Lỗi tải hồ sơ:', e);
    }
}

async function saveProfileInfo(adminType, event) {
    event.preventDefault();
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const full_name = document.getElementById(prefix + 'ProfileFullName').value.trim();
    const employee_id = document.getElementById(prefix + 'ProfileEmployeeId').value.trim();
    const department = document.getElementById(prefix + 'ProfileDepartment').value.trim();
    const position = document.getElementById(prefix + 'ProfilePosition').value.trim();
    const msg = document.getElementById(prefix + 'ProfileInfoMsg');

    if (!full_name) {
        if (msg) { msg.className = 'message error'; msg.textContent = '❌ Họ và tên không được để trống!'; }
        return;
    }

    try {
        const response = await fetch('/api/admin/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, employee_id, department, position })
        });
        const data = await response.json();
        if (data.success) {
            if (msg) { msg.className = 'message success'; msg.textContent = '✅ ' + data.message; }
            if (currentUser) {
                currentUser.full_name = full_name;
                currentUser.employee_id = employee_id;
                localStorage.setItem('tbs_logged_user', JSON.stringify(currentUser));
            }
            updateSidebarAvatar(adminType, null, full_name);
        } else {
            if (msg) { msg.className = 'message error'; msg.textContent = '❌ ' + data.message; }
        }
    } catch (e) {
        if (msg) { msg.className = 'message error'; msg.textContent = '❌ Lỗi kết nối máy chủ'; }
    }
}

async function changePasswordSecure(adminType, event) {
    event.preventDefault();
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const current_password = document.getElementById(prefix + 'CurrentPassword').value;
    const new_password = document.getElementById(prefix + 'NewPassword').value;
    const confirm_password = document.getElementById(prefix + 'ConfirmPassword').value;
    const msg = document.getElementById(prefix + 'PasswordMsg');

    if (new_password !== confirm_password) {
        if (msg) { msg.className = 'message error'; msg.textContent = '❌ Mật khẩu xác nhận không khớp!'; }
        return;
    }

    try {
        const response = await fetch('/api/admin/change-password-secure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password, new_password, confirm_password })
        });
        const data = await response.json();
        if (data.success) {
            if (msg) { msg.className = 'message success'; msg.textContent = '✅ ' + data.message; }
            document.getElementById(prefix + 'CurrentPassword').value = '';
            document.getElementById(prefix + 'NewPassword').value = '';
            document.getElementById(prefix + 'ConfirmPassword').value = '';
        } else {
            if (msg) { msg.className = 'message error'; msg.textContent = '❌ ' + data.message; }
        }
    } catch (e) {
        if (msg) { msg.className = 'message error'; msg.textContent = '❌ Lỗi kết nối máy chủ'; }
    }
}

async function handleAvatarUpload(adminType, fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const msg = document.getElementById(prefix + 'ProfileInfoMsg');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        if (msg) { msg.className = 'message'; msg.textContent = '⏳ Đang tải ảnh lên...'; }
        const response = await fetch('/api/admin/upload-avatar', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            if (msg) { msg.className = 'message success'; msg.textContent = '✅ ' + data.message; }
            const avatarImg = document.getElementById(prefix + 'ProfileAvatar');
            if (avatarImg) avatarImg.src = data.avatar_url;
            updateSidebarAvatar(adminType, data.avatar_url, null);
        } else {
            if (msg) { msg.className = 'message error'; msg.textContent = '❌ ' + data.message; }
        }
    } catch (e) {
        if (msg) { msg.className = 'message error'; msg.textContent = '❌ Lỗi upload ảnh'; }
    }
}

function updateSidebarAvatar(adminType, avatarUrl, fullName) {
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const sidebarAvatar = document.getElementById(prefix + 'SidebarAvatar');
    const sidebarName = document.getElementById(prefix + 'SidebarName');

    if (sidebarAvatar && avatarUrl) {
        sidebarAvatar.src = avatarUrl;
    }
    if (sidebarName && fullName) {
        sidebarName.textContent = fullName;
    }
}

async function loadDedicatedChatMessages(adminType) {
    if (!currentUser) return;
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const container = document.getElementById(prefix + 'DedicatedMessagesList');
    if (!container) return;

    const conversation_id = 'chat_' + (currentUser.username || currentUser.employee_id);

    try {
        const response = await fetch(`/api/chat/messages?conversation_id=${encodeURIComponent(conversation_id)}`);
        const data = await response.json();
        if (data.success) {
            if (data.data.length === 0) {
                container.innerHTML = `
                    <div class="chat-msg system">
                        <div class="bubble">Xin chào 👋 Bạn đang gặp khó khăn gì? Hãy nhắn tin hoặc gửi ảnh trực tiếp cho Quản Trị Viên Hệ Thống tại đây!</div>
                    </div>
                `;
            } else {
                let html = '';
                data.data.forEach(m => {
                    const isSelf = m.sender_role === currentUser.role || m.sender_id === (currentUser.username || currentUser.employee_id);
                    const timeStr = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    let mediaHtml = m.image_url ? `<div class="chat-img-wrapper"><img src="${m.image_url}" onclick="window.open('${m.image_url}')" style="max-width: 220px; border-radius: 10px; cursor: pointer; margin-top: 6px;"></div>` : '';

                    html += `
                        <div class="chat-msg ${isSelf ? 'user' : 'admin'}">
                            <div class="msg-meta">${m.sender_name} • ${timeStr}</div>
                            <div class="bubble">${m.message || ''}${mediaHtml}</div>
                        </div>
                    `;
                });
                container.innerHTML = html;
                container.scrollTop = container.scrollHeight;
            }
        }
    } catch(e) {
        console.error('Lỗi load dedicated chat:', e);
    }
}

async function handleDedicatedChatImageSelect(adminType, event) {
    const file = event.target.files[0];
    if (!file) return;

    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload-chat-image', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            dedicatedSelectedChatImageUrl = data.imageUrl;
            document.getElementById(prefix + 'ChatPreviewImg').src = data.imageUrl;
            document.getElementById(prefix + 'ChatPreviewThumb').style.display = 'block';
        } else {
            alert('Lỗi tải ảnh: ' + data.message);
        }
    } catch(e) {
        alert('Lỗi tải ảnh');
    }
}

function clearDedicatedChatImage(adminType) {
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    dedicatedSelectedChatImageUrl = null;
    document.getElementById(prefix + 'ChatPreviewThumb').style.display = 'none';
    document.getElementById(prefix + 'ChatImageInput').value = '';
}

async function sendDedicatedChatMessage(adminType) {
    if (!currentUser) return;
    const prefix = adminType === 'timesheet' ? 'ts' : 'sal';
    const input = document.getElementById(prefix + 'ChatTextInput');
    const msgText = input.value.trim();
    const conversation_id = 'chat_' + (currentUser.username || currentUser.employee_id);

    if (!msgText && !dedicatedSelectedChatImageUrl) return;

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: conversation_id,
                sender_id: currentUser.username || currentUser.employee_id,
                sender_name: currentUser.full_name || currentUser.employee_name,
                sender_role: currentUser.role,
                message: msgText,
                image_url: dedicatedSelectedChatImageUrl
            })
        });

        const data = await response.json();
        if (data.success) {
            input.value = '';
            clearDedicatedChatImage(adminType);
            loadDedicatedChatMessages(adminType);
        }
    } catch(e) {
        console.error('Lỗi gửi tin nhắn:', e);
    }
}

// Quản lý tải & hiển thị ảnh Avatar của người dùng
function handleUserAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh có kích thước dưới 5MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const empId = (currentUser && (currentUser.employee_id || currentUser.username)) || 'default_user';
        localStorage.setItem('user_avatar_' + empId, base64Image);
        applyUserAvatar(base64Image);
    };
    reader.readAsDataURL(file);
}

function loadSavedUserAvatar() {
    const empId = (currentUser && (currentUser.employee_id || currentUser.username)) || 'default_user';
    const savedAvatar = localStorage.getItem('user_avatar_' + empId);
    if (savedAvatar) {
        applyUserAvatar(savedAvatar);
    } else {
        resetUserAvatarUI();
    }
}

function applyUserAvatar(imgUrl) {
    const avatarBtn = document.getElementById('btnUserAvatar');
    const profileAvatarBox = document.getElementById('profileAvatarBox');

    if (avatarBtn) {
        avatarBtn.innerHTML = `
            <img src="${imgUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            <span class="avatar-camera-badge">📷</span>
        `;
    }
    if (profileAvatarBox) {
        profileAvatarBox.innerHTML = `
            <img src="${imgUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            <span class="avatar-camera-badge" style="bottom: -2px; right: -2px; width: 22px; height: 22px; font-size: 11px;">📷</span>
        `;
    }
}

function resetUserAvatarUI() {
    const avatarBtn = document.getElementById('btnUserAvatar');
    const profileAvatarBox = document.getElementById('profileAvatarBox');

    if (avatarBtn) {
        avatarBtn.innerHTML = `<span id="avatarIconContent">👤</span><span class="avatar-camera-badge">📷</span>`;
    }
    if (profileAvatarBox) {
        profileAvatarBox.innerHTML = `<span id="profileAvatarIcon">👤</span>`;
    }
}

// Tự động load avatar đã lưu khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSavedUserAvatar, 300);
});


// ============= SESSION TIMEOUT AUTO LOGOUT =============
let sessionCheckInterval = null;
let lastActivityTime = Date.now();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 phút (khớp với server)
const CHECK_INTERVAL = 60 * 1000; // Check mỗi 1 phút
const WARNING_TIME = 5 * 60 * 1000; // Cảnh báo trước 5 phút

function setupSessionTimeoutChecker() {
    // Reset activity time on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
        document.addEventListener(event, () => {
            lastActivityTime = Date.now();
        }, true);
    });

    // Check session periodically
    sessionCheckInterval = setInterval(checkSessionTimeout, CHECK_INTERVAL);
}

async function checkSessionTimeout() {
    const now = Date.now();
    const inactiveTime = now - lastActivityTime;

    // Nếu không hoạt động quá 30 phút
    if (inactiveTime >= SESSION_TIMEOUT) {
        console.log('⏰ Session timeout - Auto logout');
        clearInterval(sessionCheckInterval);
        await logout();
        alert('⏰ Phiên đăng nhập đã hết hạn do không hoạt động.\n\nVui lòng đăng nhập lại.');
        return;
    }

    // Cảnh báo trước 5 phút
    if (inactiveTime >= (SESSION_TIMEOUT - WARNING_TIME) && inactiveTime < SESSION_TIMEOUT) {
        const remainingMinutes = Math.ceil((SESSION_TIMEOUT - inactiveTime) / 60000);
        console.log(`⚠️ Session sẽ hết hạn trong ${remainingMinutes} phút`);
        
        // Hiển thị notification nhẹ nhàng (không dùng alert để không làm phiền)
        showSessionWarningNotification(remainingMinutes);
    }

    // Verify session với server
    try {
        const res = await fetch('/api/check-session');
        const data = await res.json();
        
        if (!data.loggedIn && currentUser) {
            console.log('❌ Session không hợp lệ trên server');
            clearInterval(sessionCheckInterval);
            await logout();
            alert('⏰ Phiên đăng nhập đã hết hạn.\n\nVui lòng đăng nhập lại.');
        }
    } catch (err) {
        console.error('Lỗi kiểm tra session:', err);
    }
}

function showSessionWarningNotification(minutes) {
    // Tạo notification nhẹ nhàng góc phải màn hình
    const existingNotif = document.getElementById('sessionWarningNotif');
    if (existingNotif) existingNotif.remove();

    const notif = document.createElement('div');
    notif.id = 'sessionWarningNotif';
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
        z-index: 10000;
        font-size: 14px;
        font-weight: 600;
        max-width: 320px;
        animation: slideInRight 0.3s ease-out;
    `;
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">⏰</div>
            <div>
                <div style="font-weight: 700; margin-bottom: 4px;">Phiên sắp hết hạn</div>
                <div style="font-size: 13px; opacity: 0.95;">Còn ${minutes} phút. Di chuyển chuột để gia hạn.</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: auto;">×</button>
        </div>
    `;
    
    document.body.appendChild(notif);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notif && notif.parentElement) {
            notif.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notif.remove(), 300);
        }
    }, 10000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
