// --- UI HELPERS ---

export function updateStatus(msg, type) {
    const el = document.getElementById('status-display');
    const dot = document.getElementById('status-dot');
    if (!el || !dot) return;

    el.textContent = msg;
    if (type === 'success') {
        el.className = "text-xs font-semibold text-green-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
    } else if (type === 'error') {
        el.className = "text-xs font-semibold text-red-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
    } else {
        el.className = "text-xs font-semibold text-yellow-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping";
    }
}

export function showModal(title, msg, confirmFn, isInfo = false) {
    const c = document.getElementById('modal-container');
    c.querySelector('#modal-title').textContent = title;
    c.querySelector('#modal-message').textContent = msg;
    
    const confirmBtn = c.querySelector('#modal-confirm-btn');
    const cancelBtn = c.querySelector('#modal-cancel-btn');

    // Reset button để xóa event listener cũ
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    if (isInfo) {
        newConfirm.textContent = 'Đóng';
        newConfirm.className = 'px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors';
        newCancel.classList.add('hidden');
    } else {
        newConfirm.textContent = 'Xác Nhận';
        newConfirm.className = 'px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all';
        newCancel.classList.remove('hidden');
    }

    newConfirm.onclick = () => { c.classList.add('hidden'); if (confirmFn) confirmFn(); };
    newCancel.onclick = () => c.classList.add('hidden');
    
    c.classList.remove('hidden');
}

export function getSortIcon(column, currentSortState) {
    const active = currentSortState.column === column;
    const iconName = active 
        ? (currentSortState.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up')
        : 'fa-caret-right';
    
    const styleClass = active 
        ? 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
        : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:text-gray-600';

    return `<span class="sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border ${styleClass} transition-all cursor-pointer" title="Sắp xếp">
        <i class="fas ${iconName} text-xs"></i>
    </span>`;
}

export function getLoadingRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center"><div class="loader mb-2"></div><span class="text-gray-500 text-sm">Đang tải dữ liệu từ Agent...</span></td></tr>`;
}

export function getEmptyRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center text-gray-500 italic">Không có dữ liệu nào được tìm thấy.</td></tr>`;
}