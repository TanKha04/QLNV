const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'script.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Find line 2935 (0-indexed: 2934) where the broken renderSheetDataTable starts
// Find line 2994 (0-indexed: 2993) where loadSalariesListInto starts (clean code)

// Search for the broken function start
const corruptStart = lines.findIndex(l => l.includes('// Helper: render sheet_data (raw Excel) as full scrollable table'));
const cleanStart = lines.findIndex(l => l.includes('async function loadSalariesListInto'));

console.log('Corrupt start (0-indexed):', corruptStart);
console.log('Clean start (0-indexed):', cleanStart);

if (corruptStart === -1 || cleanStart === -1) {
  console.error('Boundaries not found!');
  process.exit(1);
}

// The clean insertable code for these functions
const insertCode = `// Helper: render sheet_data (raw Excel) as full scrollable table
function renderSheetDataTable(sheet_data, accentColor) {
    if (!sheet_data || !Array.isArray(sheet_data) || sheet_data.length === 0) {
        return '<p style="text-align: center; color: #64748b; padding: 24px;">Không có dữ liệu file gốc được lưu trữ.</p>';
    }
    const rows = sheet_data.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && c !== ''));
    if (rows.length === 0) return '<p style="text-align: center; color: #64748b; padding: 24px;">File không có dữ liệu.</p>';
    let html = \`<div style="overflow-x: auto; overflow-y: visible; border-radius: 8px; border: 1px solid #e2e8f0; display: block; max-width: 100%;"><table style="border-collapse: collapse; font-size: 12px; white-space: nowrap;"><tbody>\`;
    rows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        const bg = isHeader ? accentColor : (rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
        const color = isHeader ? '#ffffff' : '#0f172a';
        const fw = isHeader ? '700' : 'normal';
        const tag = isHeader ? 'th' : 'td';
        html += \`<tr style="background:\${bg}; color:\${color}; font-weight:\${fw};">\`;
        row.forEach(cell => {
            const val = (cell !== null && cell !== undefined) ? String(cell) : '';
            const align = (typeof cell === 'number') ? 'right' : 'left';
            html += \`<\${tag} style="padding: 7px 10px; border: 1px solid \${isHeader ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; text-align:\${align};">\${escapeHtml(val)}</\${tag}>\`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

// Xem chi tiết Bảng Chấm Công ở chế độ Read-Only
async function viewTimesheetDetails(timesheetId) {
    const modal = document.getElementById('viewTimesheetDetailModal');
    const container = document.getElementById('viewTimesheetDetailContainer');
    const titleEl = document.getElementById('viewTimesheetModalTitle');
    const countEl = document.getElementById('viewTimesheetRecordCount');
    if (!modal || !container) return;
    container.innerHTML = '<p style="text-align: center; padding: 30px;">⏳ Đang tải dữ liệu Bảng Chấm Công...</p>';
    modal.style.display = 'flex';
    try {
        const response = await fetch(\`/api/admin/timesheet/\${timesheetId}\`);
        const data = await response.json();
        if (!data.success) {
            container.innerHTML = \`<p style="text-align: center; color: red; padding: 20px;">❌ \${data.message || 'Lỗi tải chi tiết'}</p>\`;
            return;
        }
        const { timesheet, sheet_data, records } = data.data;
        if (titleEl) titleEl.textContent = \`📊 \${timesheet.file_name} — Tháng \${timesheet.month}/\${timesheet.year}\`;
        if (countEl) countEl.textContent = \`\${records ? records.length : 0} nhân viên\`;
        let rawSheetData = sheet_data;
        if (!rawSheetData && timesheet.sheet_data) {
            try { rawSheetData = JSON.parse(timesheet.sheet_data); } catch(e) {}
        }
        container.innerHTML = renderSheetDataTable(rawSheetData, '#065f46');
    } catch (err) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Lỗi kết nối máy chủ</p>';
    }
}

function closeViewTimesheetDetailModal() {
    const modal = document.getElementById('viewTimesheetDetailModal');
    if (modal) modal.style.display = 'none';
}

`;

const before = lines.slice(0, corruptStart).join('\n');
const after = lines.slice(cleanStart).join('\n');
const newContent = before + '\n' + insertCode + after;

fs.writeFileSync(filePath, newContent, 'utf8');
const newLines = newContent.split('\n');
console.log('Fixed! New line count:', newLines.length);
