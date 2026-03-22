/**
 * Lottery Drawing App
 * Company Year-End Lucky Draw System
 */

// ==================== STATE ====================
const state = {
  employees: [],
  prizes: [
    {
      id: 'p1',
      name: 'Giải Đặc Biệt',
      value: 10000000,
      count: 1,
      emoji: '🏆',
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.3)',
      winners: []
    },
    {
      id: 'p2',
      name: 'Giải Nhất',
      value: 5000000,
      count: 1,
      emoji: '🥇',
      color: '#ec4899',
      glow: 'rgba(236,72,153,0.3)',
      winners: []
    },
    {
      id: 'p3',
      name: 'Giải Nhì',
      value: 3000000,
      count: 2,
      emoji: '🥈',
      color: '#6c3ce1',
      glow: 'rgba(108,60,225,0.3)',
      winners: []
    },
    {
      id: 'p4',
      name: 'Giải Ba',
      value: 1000000,
      count: 3,
      emoji: '🥉',
      color: '#10b981',
      glow: 'rgba(16,185,129,0.3)',
      winners: []
    },
    {
      id: 'p5',
      name: 'Giải Khuyến Khích',
      value: 200000,
      count: 5,
      emoji: '🎁',
      color: '#64748b',
      glow: 'rgba(100,116,139,0.3)',
      winners: []
    }
  ],
  drawHistory: [],
  currentPrizeId: null,
  isDrawing: false,
  ticketPool: [], // Array of ticket numbers mapped to employee IDs
};

let drumAnimInterval = null;
let nextTicketNum = 1;

// ==================== UTILS ====================
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function genId() {
  return '_' + Math.random().toString(36).slice(2, 11);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function saveState() {
  localStorage.setItem('lottery_state', JSON.stringify({
    employees: state.employees,
    prizes: state.prizes,
    drawHistory: state.drawHistory,
    ticketPool: state.ticketPool,
    nextTicketNum,
  }));
}

function loadState() {
  const saved = localStorage.getItem('lottery_state');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.employees = data.employees || [];
      state.prizes = data.prizes || state.prizes;
      state.drawHistory = data.drawHistory || [];
      state.ticketPool = data.ticketPool || [];
      nextTicketNum = data.nextTicketNum || 1;
    } catch(e) {
      console.error('Failed to load state', e);
    }
  }
}

// ==================== NAVIGATION ====================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  // Re-render page content
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'employees': renderEmployees(); break;
    case 'prizes': renderPrizes(); break;
    case 'draw': renderDraw(); break;
    case 'results': renderResults(); break;
  }

  // Close mobile menu
  document.getElementById('sidebar').classList.remove('mobile-open');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const totalFund = state.employees.reduce((s, e) => s + e.contribution, 0);
  const totalTickets = state.ticketPool.length;
  const totalWinners = state.drawHistory.length;
  const totalPrizeValue = state.prizes.reduce((s, p) => s + p.value * p.count, 0);

  document.getElementById('stat-fund').textContent = formatVND(totalFund);
  document.getElementById('stat-employees').textContent = state.employees.length;
  document.getElementById('stat-tickets').textContent = totalTickets;
  document.getElementById('stat-prizes-value').textContent = formatVND(totalPrizeValue);
  document.getElementById('sidebar-fund').textContent = formatVND(totalFund);

  // Recent activity
  const recentEl = document.getElementById('recent-activity');
  if (state.drawHistory.length === 0) {
    recentEl.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎰</div>
        <h3>Chưa có lượt quay nào</h3>
        <p>Hãy thêm nhân viên và bắt đầu quay số</p>
      </div>`;
  } else {
    const recent = state.drawHistory.slice(-6).reverse();
    recentEl.innerHTML = recent.map(h => `
      <div class="history-item">
        <div class="history-num">${h.ticketNum}</div>
        <div class="history-details">
          <div class="history-name">${h.employeeName}</div>
          <div class="history-prize">${h.prizeName} — ${formatVND(h.prizeValue)}</div>
        </div>
        <div class="history-time">${h.time}</div>
      </div>
    `).join('');
  }
}

// ==================== EMPLOYEES ====================
function renderEmployees() {
  const tbody = document.getElementById('employee-tbody');
  const totalFund = state.employees.reduce((s, e) => s + e.contribution, 0);
  document.getElementById('emp-total-fund').textContent = formatVND(totalFund);
  document.getElementById('emp-total-count').textContent = state.employees.length;

  if (state.employees.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state" style="padding:40px">
          <div class="icon">👥</div>
          <h3>Chưa có nhân viên</h3>
          <p>Thêm nhân viên để bắt đầu</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = state.employees.map(emp => {
    const tickets = state.ticketPool.filter(t => t.employeeId === emp.id);
    const won = state.drawHistory.filter(h => h.employeeId === emp.id);
    return `
      <tr>
        <td><strong>${emp.name}</strong></td>
        <td>${emp.department || '—'}</td>
        <td style="color: var(--secondary); font-weight: 700">${formatVND(emp.contribution)}</td>
        <td>
          ${tickets.map(t => `<span class="ticket-badge">🎫 ${t.num}</span>`).join(' ')}
        </td>
        <td>
          ${won.length > 0
            ? won.map(w => `<span class="badge badge-won">${w.prizeName}</span>`).join(' ')
            : '<span class="badge badge-active">Chưa trúng</span>'}
        </td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editEmployee('${emp.id}')" title="Sửa">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteEmployee('${emp.id}')" title="Xóa">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function addEmployee(e) {
  e.preventDefault();
  const name = document.getElementById('new-emp-name').value.trim();
  const department = document.getElementById('new-emp-dept').value.trim();
  const contribution = parseInt(document.getElementById('new-emp-contribution').value);
  const ticketMode = document.getElementById('new-emp-tickets').value;

  if (!name || !contribution || contribution <= 0) {
    showToast('Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }

  const emp = { id: genId(), name, department, contribution, joinedAt: new Date().toLocaleDateString('vi-VN') };
  state.employees.push(emp);

  // Assign tickets
  let numTickets = 1;
  if (ticketMode === 'by100k') numTickets = Math.max(1, Math.floor(contribution / 100000));
  else if (ticketMode === 'by200k') numTickets = Math.max(1, Math.floor(contribution / 200000));
  else if (ticketMode === 'by500k') numTickets = Math.max(1, Math.floor(contribution / 500000));

  for (let i = 0; i < numTickets; i++) {
    state.ticketPool.push({ num: nextTicketNum++, employeeId: emp.id });
  }

  saveState();
  renderEmployees();
  renderDashboard();
  showToast(`Đã thêm ${name} với ${numTickets} vé`, 'success');
  e.target.reset();
}

function deleteEmployee(id) {
  if (!confirm('Xóa nhân viên này?')) return;
  state.employees = state.employees.filter(e => e.id !== id);
  state.ticketPool = state.ticketPool.filter(t => t.employeeId !== id);
  saveState();
  renderEmployees();
  renderDashboard();
  showToast('Đã xóa nhân viên', 'info');
}

function editEmployee(id) {
  const emp = state.employees.find(e => e.id === id);
  if (!emp) return;
  document.getElementById('edit-emp-id').value = emp.id;
  document.getElementById('edit-emp-name').value = emp.name;
  document.getElementById('edit-emp-dept').value = emp.department || '';
  document.getElementById('edit-emp-contribution').value = emp.contribution;
  document.getElementById('editEmpModal').classList.add('open');
}

function saveEditEmployee() {
  const id = document.getElementById('edit-emp-id').value;
  const emp = state.employees.find(e => e.id === id);
  if (!emp) return;
  emp.name = document.getElementById('edit-emp-name').value.trim();
  emp.department = document.getElementById('edit-emp-dept').value.trim();
  emp.contribution = parseInt(document.getElementById('edit-emp-contribution').value);
  saveState();
  closeModal('editEmpModal');
  renderEmployees();
  renderDashboard();
  showToast('Đã cập nhật thông tin', 'success');
}

// ==================== PRIZES ====================
function renderPrizes() {
  const grid = document.getElementById('prizes-grid');
  grid.innerHTML = state.prizes.map(p => {
    const remaining = p.count - p.winners.length;
    return `
      <div class="prize-card" style="--prize-color: ${p.color}; --prize-glow: ${p.glow}">
        <div class="prize-emoji">${p.emoji}</div>
        <div class="prize-rank">Giải thưởng</div>
        <div class="prize-name">${p.name}</div>
        <div class="prize-value">${formatVND(p.value)}</div>
        <div class="prize-count">
          Số lượng: <strong>${p.count}</strong> &nbsp;|&nbsp;
          Còn lại: <strong style="color: ${remaining > 0 ? 'var(--success)' : 'var(--danger)'}">${remaining}</strong>
        </div>
        <div class="prize-actions">
          <button class="btn btn-secondary btn-sm" onclick="editPrize('${p.id}')">✏️ Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="deletePrize('${p.id}')">🗑️ Xóa</button>
        </div>
      </div>
    `;
  }).join('');
}

function addPrize(e) {
  e.preventDefault();
  const name = document.getElementById('new-prize-name').value.trim();
  const value = parseInt(document.getElementById('new-prize-value').value);
  const count = parseInt(document.getElementById('new-prize-count').value) || 1;
  const emoji = document.getElementById('new-prize-emoji').value || '🎁';

  if (!name || !value) {
    showToast('Vui lòng nhập tên và giá trị giải', 'error');
    return;
  }

  const prize = {
    id: genId(),
    name, value, count, emoji,
    color: '#6c3ce1',
    glow: 'rgba(108,60,225,0.3)',
    winners: []
  };
  state.prizes.push(prize);
  saveState();
  renderPrizes();
  showToast(`Đã thêm giải "${name}"`, 'success');
  e.target.reset();
  document.getElementById('new-prize-emoji').value = '🎁';
}

function deletePrize(id) {
  if (!confirm('Xóa giải thưởng này?')) return;
  state.prizes = state.prizes.filter(p => p.id !== id);
  saveState();
  renderPrizes();
  showToast('Đã xóa giải thưởng', 'info');
}

function editPrize(id) {
  const p = state.prizes.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-prize-id').value = p.id;
  document.getElementById('edit-prize-name').value = p.name;
  document.getElementById('edit-prize-value').value = p.value;
  document.getElementById('edit-prize-count').value = p.count;
  document.getElementById('edit-prize-emoji').value = p.emoji || '🎁';
  document.getElementById('editPrizeModal').classList.add('open');
}

function saveEditPrize() {
  const id = document.getElementById('edit-prize-id').value;
  const p = state.prizes.find(x => x.id === id);
  if (!p) return;
  p.name = document.getElementById('edit-prize-name').value.trim();
  p.value = parseInt(document.getElementById('edit-prize-value').value);
  p.count = parseInt(document.getElementById('edit-prize-count').value) || 1;
  p.emoji = document.getElementById('edit-prize-emoji').value || '🎁';
  saveState();
  closeModal('editPrizeModal');
  renderPrizes();
  showToast('Đã cập nhật giải thưởng', 'success');
}

// ==================== DRAW ====================
function renderDraw() {
  // Prize selector
  const selector = document.getElementById('prize-selector');
  selector.innerHTML = state.prizes.map(p => {
    const remaining = p.count - p.winners.length;
    const disabled = remaining <= 0 ? 'style="opacity:0.5;cursor:not-allowed"' : '';
    const sel = state.currentPrizeId === p.id ? 'selected' : '';
    return `
      <div class="prize-btn ${sel}" onclick="${remaining > 0 ? `selectPrize('${p.id}')` : ''}" ${disabled}>
        <div class="pb-name">${p.emoji} ${p.name}</div>
        <div class="pb-remaining">Còn lại: ${remaining}/${p.count}</div>
      </div>
    `;
  }).join('');

  // Update current prize display
  if (state.currentPrizeId) {
    const p = state.prizes.find(x => x.id === state.currentPrizeId);
    if (p) {
      document.getElementById('current-prize-name').textContent = `${p.emoji} ${p.name}`;
      document.getElementById('current-prize-value').textContent = formatVND(p.value);
    }
  } else {
    document.getElementById('current-prize-name').textContent = '— Chọn giải thưởng —';
    document.getElementById('current-prize-value').textContent = '';
  }

  // Draw button state
  const eligible = getEligibleTickets();
  const drawBtn = document.getElementById('draw-btn');
  if (!state.currentPrizeId) {
    drawBtn.disabled = true;
    drawBtn.textContent = '🎯 Chọn giải trước';
  } else if (eligible.length === 0) {
    drawBtn.disabled = true;
    drawBtn.textContent = '⚠️ Không còn vé hợp lệ';
  } else {
    drawBtn.disabled = false;
    drawBtn.textContent = '🎰 QUAY SỐ!';
  }

  // Draw progress
  const totalDrawn = state.drawHistory.length;
  const totalNeeded = state.prizes.reduce((s, p) => s + p.count, 0);
  document.getElementById('draw-progress-fill').style.width = `${Math.min(100, (totalDrawn / totalNeeded) * 100)}%`;
  document.getElementById('draw-progress-text').textContent = `${totalDrawn} / ${totalNeeded} giải đã trao`;

  renderDrawHistory();
}

function selectPrize(id) {
  state.currentPrizeId = id;
  renderDraw();
}

function getEligibleTickets() {
  // Exclude winners from the current prize's already drawn + optionally all-time
  const wonEmployeeIds = new Set(state.drawHistory.map(h => h.employeeId));
  return state.ticketPool.filter(t => !wonEmployeeIds.has(t.employeeId));
}

async function startDraw() {
  if (state.isDrawing) return;

  const prize = state.prizes.find(p => p.id === state.currentPrizeId);
  if (!prize) { showToast('Vui lòng chọn giải thưởng', 'error'); return; }

  const remaining = prize.count - prize.winners.length;
  if (remaining <= 0) { showToast('Giải này đã trao xong!', 'error'); return; }

  const eligible = getEligibleTickets();
  if (eligible.length === 0) { showToast('Không còn vé hợp lệ!', 'error'); return; }

  state.isDrawing = true;
  document.getElementById('draw-btn').disabled = true;
  document.getElementById('winner-announce').classList.remove('show');

  // Pick winner
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  const winnerEmp = state.employees.find(e => e.id === winner.employeeId);
  if (!winnerEmp) { state.isDrawing = false; return; }

  // Drum animation
  await animateDrum(winner.num.toString().padStart(3, '0'));

  // Record result
  const entry = {
    ticketNum: winner.num,
    employeeId: winnerEmp.id,
    employeeName: winnerEmp.name,
    prizeName: prize.name,
    prizeValue: prize.value,
    prizeId: prize.id,
    time: new Date().toLocaleTimeString('vi-VN')
  };
  state.drawHistory.push(entry);
  prize.winners.push(winner.num);

  saveState();

  // Show winner
  showWinner(entry);
  launchConfetti();

  state.isDrawing = false;
  renderDraw();
  showToast(`🎉 ${winnerEmp.name} trúng ${prize.name}!`, 'success');
}

function animateDrum(finalNum) {
  return new Promise(resolve => {
    const digits = document.querySelectorAll('.drum-digit');
    digits.forEach(d => { d.classList.add('spinning'); d.classList.remove('result'); });

    let elapsed = 0;
    const duration = 3000;
    const interval = 80;

    const timer = setInterval(() => {
      elapsed += interval;
      digits.forEach(d => {
        d.textContent = Math.floor(Math.random() * 10);
      });

      if (elapsed >= duration) {
        clearInterval(timer);
        // Show final number
        digits.forEach((d, i) => {
          d.classList.remove('spinning');
          setTimeout(() => {
            d.textContent = finalNum[i] || '0';
            d.classList.add('result');
          }, i * 150);
        });
        setTimeout(resolve, digits.length * 150 + 300);
      }
    }, interval);
  });
}

function showWinner(entry) {
  const el = document.getElementById('winner-announce');
  document.getElementById('winner-number').textContent = `#${entry.ticketNum}`;
  document.getElementById('winner-name').textContent = entry.employeeName;
  document.getElementById('winner-prize-name').textContent = `${entry.prizeName} — ${formatVND(entry.prizeValue)}`;
  el.classList.add('show');
}

function renderDrawHistory() {
  const el = document.getElementById('draw-history-list');
  if (state.drawHistory.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">Chưa có lượt quay nào</p>';
    return;
  }
  const recent = [...state.drawHistory].reverse().slice(0, 10);
  el.innerHTML = recent.map(h => `
    <div class="history-item">
      <div class="history-num">#${h.ticketNum}</div>
      <div class="history-details">
        <div class="history-name">${h.employeeName}</div>
        <div class="history-prize">${h.prizeName} — ${formatVND(h.prizeValue)}</div>
      </div>
      <div class="history-time">${h.time}</div>
    </div>
  `).join('');
}

// ==================== RESULTS ====================
function renderResults() {
  const grid = document.getElementById('results-grid');
  if (state.drawHistory.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px">
        <div class="icon">🏆</div>
        <h3>Chưa có kết quả</h3>
        <p>Quay số để xem kết quả tại đây</p>
      </div>`;
    return;
  }

  // Group by prize
  const byPrize = {};
  state.drawHistory.forEach(h => {
    if (!byPrize[h.prizeId]) byPrize[h.prizeId] = [];
    byPrize[h.prizeId].push(h);
  });

  let html = '';
  state.prizes.forEach(p => {
    const winners = byPrize[p.id] || [];
    if (winners.length === 0) return;
    html += `
      <div style="grid-column:1/-1; margin-top:8px">
        <h3 style="font-size:20px;color:${p.color};margin-bottom:12px">${p.emoji} ${p.name} <span style="font-size:14px;color:var(--text-secondary);font-weight:400">${formatVND(p.value)}</span></h3>
      </div>
    `;
    winners.forEach(w => {
      html += `
        <div class="result-item">
          <div class="result-number" style="border-color:${p.color};color:${p.color}">${w.ticketNum}</div>
          <div class="result-info">
            <div class="result-name">${w.employeeName}</div>
            <div class="result-prize">Trúng: <strong>${p.name}</strong> • ${formatVND(p.value)}</div>
            <div class="result-prize">Lúc: ${w.time}</div>
          </div>
        </div>
      `;
    });
  });

  grid.innerHTML = html || '<div class="empty-state" style="grid-column:1/-1"><div class="icon">🏆</div><h3>Chưa có kết quả</h3></div>';
}

// ==================== CONFETTI ====================
function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#f59e0b', '#ec4899', '#6c3ce1', '#10b981', '#3b82f6', '#fcd34d'];
  const shapes = ['■', '●', '▲', '★', '♦'];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      color: ${colors[Math.floor(Math.random() * colors.length)]};
      font-size: ${8 + Math.random() * 12}px;
      animation: confettiFall ${2 + Math.random() * 2}s ease ${Math.random() * 0.5}s forwards;
    `;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

// ==================== MODAL ====================
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ==================== RESET ====================
function resetDraw() {
  if (!confirm('Xóa toàn bộ lịch sử quay số? Hành động này không thể hoàn tác!')) return;
  state.drawHistory = [];
  state.prizes.forEach(p => p.winners = []);
  saveState();
  renderDraw();
  showToast('Đã reset lịch sử quay', 'info');
}

function resetAll() {
  if (!confirm('⚠️ Xóa TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác!')) return;
  state.employees = [];
  state.prizes.forEach(p => p.winners = []);
  state.drawHistory = [];
  state.ticketPool = [];
  nextTicketNum = 1;
  saveState();
  navigate('dashboard');
  showToast('Đã xóa toàn bộ dữ liệu', 'info');
}

// ==================== EXPORT ====================
function exportResults() {
  if (state.drawHistory.length === 0) {
    showToast('Chưa có kết quả để xuất', 'error');
    return;
  }

  let csv = 'Vé số,Tên nhân viên,Giải thưởng,Giá trị,Thời gian\n';
  state.drawHistory.forEach(h => {
    csv += `${h.ticketNum},"${h.employeeName}","${h.prizeName}",${h.prizeValue},"${h.time}"\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lottery-results-${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất file kết quả', 'success');
}

// ==================== DEMO DATA ====================
function loadDemoData() {
  if (state.employees.length > 0) {
    showToast('Đã có dữ liệu rồi, xóa trước!', 'error');
    return;
  }

  const depts = ['Kỹ thuật', 'Marketing', 'Kinh doanh', 'HR', 'Tài chính', 'Vận hành'];
  const names = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh Châu', 'Phạm Hoàng Dũng',
    'Hoàng Thị Em', 'Đặng Văn Phúc', 'Bùi Thị Giang', 'Đỗ Minh Hùng',
    'Ngô Thị Lan', 'Lý Văn Mạnh', 'Vũ Thị Ngọc', 'Trương Văn Quân',
    'Phan Thị Hoa', 'Đinh Văn Sơn', 'Lưu Thị Thanh', 'Cao Minh Tuấn',
    'Tô Thị Uyên', 'Mai Văn Vinh', 'Hà Thị Xuân', 'Dương Văn Yên',
  ];

  const contributions = [100000, 200000, 300000, 500000, 100000, 200000, 150000, 400000, 250000, 300000,
    200000, 500000, 100000, 350000, 200000, 300000, 150000, 500000, 200000, 100000];

  names.forEach((name, i) => {
    const emp = {
      id: genId(),
      name,
      department: depts[i % depts.length],
      contribution: contributions[i],
      joinedAt: new Date().toLocaleDateString('vi-VN')
    };
    state.employees.push(emp);
    const numTickets = Math.max(1, Math.floor(contributions[i] / 100000));
    for (let j = 0; j < numTickets; j++) {
      state.ticketPool.push({ num: nextTicketNum++, employeeId: emp.id });
    }
  });

  saveState();
  navigate('dashboard');
  showToast(`Đã tải ${names.length} nhân viên demo!`, 'success');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navigate(link.dataset.page));
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  });

  // Forms
  document.getElementById('addEmployeeForm').addEventListener('submit', addEmployee);
  document.getElementById('addPrizeForm').addEventListener('submit', addPrize);

  // Draw button
  document.getElementById('draw-btn').addEventListener('click', startDraw);

  // Initial render
  navigate('dashboard');

  // Update sidebar fund amount
  document.getElementById('sidebar-fund').textContent =
    formatVND(state.employees.reduce((s, e) => s + e.contribution, 0));
});
