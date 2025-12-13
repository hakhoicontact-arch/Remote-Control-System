import { getSortIcon, getEmptyRow, getLoadingRow } from './utils.js';
import { state } from './config.js';

// --- APP VIEW ---
export function renderAppLayout() {
    return `
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                <button id="list-apps-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-200 hover:bg-blue-700 transition-all">Làm Mới</button>
                
                <!-- THÊM Ô TÌM KIẾM (SEARCH APP) -->
                <div class="uiv-search-box flex-grow">
                    <svg fill="#6b7280" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                        <path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path>
                    </svg>
                    
                    <input 
                        id="app-search" 
                        type="text" 
                        placeholder="Tìm ứng dụng..." 
                        class="uiv-search-input uiv-full-width"
                    >
                </div>
                
                <div class="uiv-search-box ml-4">
                    <svg fill="#6b7280" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                        <path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path>
                    </svg>

                    <input 
                        id="app-search name" 
                        type="text" 
                        placeholder="Nhập tên để mở" 
                        class="uiv-search-input uiv-anim-width-app-search"
                    >
                </div>
                <button id="start-app-btn" class="btn-primary bg-green-600 text-white px-4 py-2 shadow-md shadow-green-200 rounded-lg">Mở</button>
            </div>
            <div class="table-container bg-gray-50 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-200 sticky top-0">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer" onclick="window.handleSortApp('name')">
                                <div class="flex items-center">Tên ${getSortIcon('name', state.currentAppSort)}</div>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Đường Dẫn</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Trạng Thái</th>
                            <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="app-list-body" class="bg-white divide-y divide-gray-200">
                        ${getLoadingRow(4)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function updateAppTable(apps) {
    const tbody = document.getElementById('app-list-body');
    if (!tbody) return;
    if (!apps || apps.length === 0) { tbody.innerHTML = getEmptyRow(4); return; }

    tbody.innerHTML = apps.map(app => {
        const isRunning = app.status === 'Running';
        const btnColor = isRunning ? 'bg-red-50 text-red-600 shadow-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 shadow-green-200 hover:bg-green-100';
        const btnIcon = isRunning ? 'fa-stop-circle' : 'fa-play-circle';
        const btnText = isRunning ? 'Đóng' : 'Mở';
        const btnAction = isRunning ? 'stop-app' : 'start-app';
        
        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded bg-slate-200 flex items-center justify-center mr-3 text-slate-500"><i class="fas fa-cube"></i></div>
                    ${app.name || 'Unknown'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-xs" title="${app.path}">${app.path || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${isRunning ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                    <i class="fas ${isRunning ? 'fa-check-circle' : 'fa-minus-circle'} mr-1"></i> ${app.status || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <!-- SỬA TẠI ĐÂY: data-id="${app.name}" thay vì app.path -->
                <button data-action="${btnAction}" data-id="${app.name}" class="${btnColor} px-4 py-1.5 rounded-lg transition-colors shadow-md flex items-center mx-auto w-24 justify-center font-semibold">
                    <i class="fas ${btnIcon} mr-2"></i> ${btnText}
                </button>
            </td>
        </tr>`;
    }).join('');
}

// --- PROCESS VIEW ---
export function renderProcessLayout() {
    return `
        <div class="space-y-6">
             <!-- 1. HEADER THỐNG KÊ (DASHBOARD STYLE) -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">

                <!-- CPU Card -->
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm transition-transform hover:scale-[1.02]">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-blue-500 font-bold uppercase tracking-wider">CPU Usage</p>
                        <i class="fas fa-microchip text-blue-200 text-lg"></i>
                    </div>
                    <p id="total-cpu" class="text-xl font-mono font-bold text-slate-700 mt-1">0%</p>
                    <div class="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div id="bar-cpu" class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                    <!-- Dòng chú thích nhỏ -->
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">
                        <i class="fas fa-info-circle mr-1"></i>Mức độ sử dụng
                    </p>
                </div>

                <!-- RAM Card -->
                <div class="bg-purple-50 p-3 rounded-xl border border-purple-100 shadow-sm transition-transform hover:scale-[1.02]">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-purple-500 font-bold uppercase tracking-wider">Memory</p>
                        <i class="fas fa-memory text-purple-200 text-lg"></i>
                    </div>
                    <p id="total-mem" class="text-xl font-mono font-bold text-slate-700 mt-1">0 MB</p>
                    <div class="w-full bg-purple-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div id="bar-mem" class="bg-purple-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                    <!-- Dòng chú thích nhỏ -->
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">
                        <i class="fas fa-server mr-1"></i>Đang chiếm dụng
                    </p>
                </div>

                <!-- Disk Card -->
                <div class="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm transition-transform hover:scale-[1.02]">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-orange-500 font-bold uppercase tracking-wider">Disk I/O</p>
                        <i class="fas fa-hdd text-orange-200 text-lg"></i>
                    </div>
                    <p id="total-disk" class="text-xl font-mono font-bold text-slate-700 mt-1">0 KB/s</p>
                    <div class="w-full bg-orange-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div id="bar-disk" class="bg-orange-400 h-full rounded-full w-0 transition-all duration-500 opacity-50"></div>
                    </div>
                    <!-- Dòng chú thích nhỏ -->
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">
                        <i class="fas fa-exchange-alt mr-1"></i>Tốc độ Đọc/Ghi
                    </p>
                </div>

                <!-- Processes Count -->
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Processes</p>
                        <i class="fas fa-tasks text-slate-300 text-lg"></i>
                    </div>
                    <p id="total-count" class="text-xl font-mono font-bold text-slate-700 mt-1">0</p>
                    <!-- Dòng chú thích nhỏ -->
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">
                        <i class="fas fa-list-ul mr-1"></i>Tiến trình chạy
                    </p>
                </div>

                <!-- Threads/Handles -->
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm hidden md:block">
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">System Info</p>
                    <div class="flex justify-between items-end mb-1">
                        <span class="text-[10px] text-slate-400 font-medium">Threads</span>
                        <span id="total-threads" class="font-mono font-bold text-slate-600 text-sm">0</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <span class="text-[10px] text-slate-400 font-medium">Handles</span>
                        <span id="total-handles" class="font-mono font-bold text-slate-600 text-sm">0</span>
                    </div>
                </div>
            </div>

            <!-- 2. TOOLBAR -->
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <button id="list-processes-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-200 hover:bg-blue-700 transition-all">
                        <i class="fas fa-sync-alt mr-2"></i> Cập Nhật
                    </button>
                    <button id="start-process-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow-md shadow-green-200 hover:bg-green-700 transition-all">
                        <i class="fas fa-plus mr-2"></i> Mở Process
                    </button>
                    <div class="uiv-search-box ml-4">
                        <svg fill="#6b7280" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                            <path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path>
                        </svg>

                        <input 
                            id="process-search" 
                            type="text" 
                            placeholder="Tìm PID hoặc Tên" 
                            class="uiv-search-input uiv-anim-width"
                        >
                    </div>
                    <input id="process-start-path" type="hidden"> </div>
            </div>

            <!-- 3. TABLE -->
            <div class="table-container bg-gray-50 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50 sticky top-0 select-none z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('pid')"><div class="flex items-center">PID ${getSortIcon('pid', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('name')"><div class="flex items-center">Tên ${getSortIcon('name', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('cpu')"><div class="flex items-center">CPU ${getSortIcon('cpu', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('mem')"><div class="flex items-center">RAM ${getSortIcon('mem', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('disk')"><div class="flex items-center">DISK ${getSortIcon('disk', state.currentSort)}</div></th>
                            <th class="px-6 py-3 text-center">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white divide-y divide-slate-50 text-sm">
                         <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 italic">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function updateProcessTable(processes) {
    const tbody = document.getElementById('process-list-body');
    const TOTAL_SYSTEM_RAM_MB = 16384;
    
    // --- TÍNH TOÁN TỔNG HỢP (SUMMARY STATS) ---
    let totalCpu = 0, totalMem = 0, totalThreads = 0, totalHandles = 0;
    
    // Biến để cộng dồn Disk (KB/s)
    let totalDiskKB = 0;

    processes.forEach(p => {
        totalCpu += parseFloat(p.cpu?.replace('%', '') || 0);
        totalMem += parseFloat(p.mem?.replace(/[^\d]/g, '') || 0);
        totalThreads += (p.threads || 0);
        totalHandles += (p.handles || 0);

        // Parse Disk string (VD: "1.5 MB/s" hoặc "500 KB/s")
        let diskVal = 0;
        let diskStr = p.disk || "0";
        if (diskStr.includes("MB/s")) diskVal = parseFloat(diskStr) * 1024;
        else if (diskStr.includes("KB/s")) diskVal = parseFloat(diskStr);
        totalDiskKB += diskVal;
    });

    totalMem *= 0.8;

    // Cập nhật DOM Header
    const elCpu = document.getElementById('total-cpu');
    const elMem = document.getElementById('total-mem');
    const elDisk = document.getElementById('total-disk');
    const elCount = document.getElementById('total-count');
    const elThreads = document.getElementById('total-threads');
    const elHandles = document.getElementById('total-handles');
    const barCpu = document.getElementById('bar-cpu');
    const barMem = document.getElementById('bar-mem');
    const barDisk = document.getElementById('bar-disk');

    if (elCpu) {
        elCpu.textContent = `${totalCpu.toFixed(1)}%`;
        if (barCpu) barCpu.style.width = `${Math.min(totalCpu, 100)}%`;
    }
    if (elMem) elMem.textContent = `${totalMem.toFixed(0)} MB`;

    // SỬA: Thêm đoạn này để thanh bar chạy
    if (barMem) {
        const memPercent = (totalMem / TOTAL_SYSTEM_RAM_MB) * 100;
        barMem.style.width = `${Math.min(memPercent, 100)}%`;
    }
    if (elDisk) {
        if (totalDiskKB > 1024) elDisk.textContent = `${(totalDiskKB/1024).toFixed(1)} MB/s`;
        else elDisk.textContent = `${totalDiskKB.toFixed(0)} KB/s`;
    }

    if(elDisk && barDisk) {
        const displayDisk = totalDiskKB > 1024 ? `${(totalDiskKB/1024).toFixed(1)} MB/s` : `${totalDiskKB.toFixed(0)} KB/s`;
        elDisk.textContent = displayDisk;
        // Giả sử mốc Disk cao là 10MB/s (10240 KB/s) làm mốc 100%
        const diskPercent = (totalDiskKB / 10240) * 100;
        barDisk.style.width = `${Math.min(diskPercent, 100)}%`;
    }

    if (elCount) elCount.textContent = processes.length;
    if (elThreads) elThreads.textContent = totalThreads;
    if (elHandles) elHandles.textContent = totalHandles;

    // --- RENDER BẢNG ---
    if (!processes || processes.length === 0) {
        // ... (Empty logic)
        return;
    }

    tbody.innerHTML = processes.map(p => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">${p.pid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title="${p.name}">
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900 truncate max-w-[150px]" title="${p.name}">${p.name}</span>
                    <span class="text-[10px] text-slate-400 truncate max-w-[200px] hidden md:block" title="${p.description}">${p.description || '-'}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold ${parseFloat(p.cpu) > 50 ? 'text-red-600' : ''}">${p.cpu || '0%'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.mem || '0 MB'}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${p.disk || '0 KB/s'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-action="kill-process" data-id="${p.pid}" class="text-red-600 hover:text-red-900 transition-colors"><i class="fas fa-times-circle"></i> Kill</button>
            </td>
        </tr>
    `).join('');
}

// --- OTHER VIEWS ---
export function renderScreenshotView() {
    return `
        <div class="space-y-6 text-center">
            <button id="capture-screenshot-btn" class="btn-primary bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md shadow-blue-200 hover:bg-blue-700 transition-all font-semibold">
                <i class="fas fa-camera mr-2"></i> Chụp Màn Hình
            </button>
            <button id="save-screenshot-btn" class="hidden btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                <i class="fas fa-download mr-2"></i> Lưu Ảnh
            </button>
            <div id="screenshot-area" class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p id="screenshot-placeholder" class="text-gray-500 mb-4">Chưa có ảnh</p>
                <img id="screenshot-image" src="" alt="Screenshot" class="hidden max-w-full shadow-lg border border-gray-200 rounded-lg">
            </div>
        </div>
    `;
}

export function renderKeyloggerDisplay() {
    return `
        <div class="space-y-4">
            <div class="flex space-x-3">
                <button id="start-keylogger-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md shadow-green-200 hover:bg-green-700 transition-all">Bắt Đầu</button>
                <button id="stop-keylogger-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md shadow-red-250 hover:bg-red-700 transition-all">Dừng</button>
                <button id="clear-keylogger-btn" class="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md shadow-gray-300 hover:bg-gray-600 transition-all">Xóa</button>
            </div>
            <p id="keylogger-status" class="text-sm font-bold text-blue-600">Trạng thái: Đang chờ lệnh...</p>
            <textarea id="keylogger-log" class="w-full h-80 p-4 border rounded-lg font-mono text-sm bg-gray-50" readonly></textarea>
        </div>
    `;
}

export function renderWebcamControl() {
    return `
        <div class="space-y-4 h-full flex flex-col items-center"> <!-- Thêm items-center để căn giữa toàn bộ -->

            <!-- MODAL LƯU VIDEO (Mặc định ẩn) -->
            <div id="save-video-modal" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm hidden">
                <div class="bg-white p-6 rounded-2xl shadow-2xl w-96 border border-slate-200 transform scale-100 transition-all">
                    <div class="text-center mb-4">
                        <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i class="fas fa-file-video text-xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-slate-800">Lưu Video Đã Ghi</h3>
                        <p class="text-xs text-slate-500">Định dạng: WebM</p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tên file</label>
                        <input type="text" id="video-filename" class="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="record_abc...">
                    </div>
                    
                    <div class="flex space-x-2">
                        <button id="cancel-save-video" class="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm transition-colors">Hủy</button>
                        <button id="confirm-save-video" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-lg shadow-blue-200 transition-colors">Lưu Ngay</button>
                    </div>
                </div>
            </div>
            
            <!-- Thanh điều khiển -->
            <div class="w-full max-w-5xl flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-2">
                    <span class="text-red-500 animate-pulse"><i class="fas fa-circle text-[10px]"></i></span>
                    <span class="font-bold text-gray-700">WEBCAM STREAM</span>
                </div>

                <div class="flex items-center space-x-2">
                    <!-- NÚT GHI HÌNH MỚI -->
                    <div id="recording-ui" class="hidden flex items-center mr-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100">
                        <span class="w-2 h-2 bg-red-600 rounded-full animate-ping mr-2"></span>
                        <span id="record-timer" class="font-mono font-bold text-sm">00:00</span>
                    </div>

                    <button id="record-btn" class="text-slate-600 bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-200 flex items-center">
                        <i class="fas fa-record-vinyl mr-2 text-red-500"></i> Ghi hình
                    </button>
                </div>
                
                <div class="flex space-x-2">
                    <button id="webcam-on-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-md shadow-green-200">
                        <i class="fas fa-power-off mr-2"></i> Bật
                    </button>
                    <button id="webcam-off-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-md shadow-red-200">
                        <i class="fas fa-stop mr-2"></i> Tắt
                    </button>
                    <button id="toggle-stats-btn">
                        <i class="fas fa-chart-bar mr-1"></i> Stats
                    </button>
                </div>
            </div>
            
            <!-- SỬA LỖI HIỂN THỊ TẠI ĐÂY -->
            <!-- 1. max-w-5xl: Giới hạn chiều rộng tối đa (nhỏ lại, không tràn viền) -->
            <!-- 2. aspect-video: Ép khung hình về tỉ lệ 16:9 chuẩn youtube -->
            <!-- 3. w-full: Chiếm hết chiều rộng cho phép -->
            <div id="webcam-area" class="w-full max-w-5xl aspect-video bg-black rounded-xl border-4 border-gray-800 relative flex items-center justify-center overflow-hidden shadow-2xl">
                <!-- CANVAS ẨN ĐỂ GHI HÌNH -->
                <canvas id="hidden-recorder-canvas" style="display:none;"></canvas>
                <!-- OVERLAY THỐNG KÊ -->
                <div id="webcam-stats-overlay" class="absolute top-4 right-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg pointer-events-none border border-white/10 shadow-lg z-10" style="display: none;">
                    <!-- Nội dung JS điền vào -->
                </div>
                
                <div id="webcam-placeholder" class="text-gray-500 flex flex-col items-center z-0">
                    <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-video-slash fa-3x text-gray-600"></i>
                    </div>
                    <span class="text-lg font-medium">Camera Offline</span>
                    <span class="text-sm text-gray-600">Nhấn "Bật" để bắt đầu stream</span>
                </div>
                
                <!-- SỬA: Thêm class 'object-contain' để giữ đúng tỉ lệ hình ảnh, không bị méo -->
                <img id="webcam-stream" src="" alt="Video Webcam Agent" class="w-full h-full object-contain absolute inset-0 z-1" style="display:none" />
            </div>
        </div>
    `;
}

export function renderSystemControls() {
    return `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <i class="fas fa-desktop text-blue-600"></i>
                <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">System Specification</h3>
                <span id="spec-uptime" class="ml-auto text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">Uptime: ...</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div class="space-y-1">
                    <p class="text-xs text-slate-400 font-bold uppercase">Processor (CPU)</p>
                    <div class="flex items-start gap-2">
                        <i class="fab fa-intel text-blue-400 mt-1"></i>
                        <div>
                            <p id="spec-cpu-name" class="font-semibold text-slate-800">Loading...</p>
                            <p id="spec-cpu-cores" class="text-xs text-slate-500 font-mono">-</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 font-bold uppercase">Memory (RAM)</p>
                    <div class="flex items-start gap-2">
                        <i class="fas fa-memory text-purple-400 mt-1"></i>
                        <div>
                            <p id="spec-ram-total" class="font-semibold text-slate-800">Loading...</p>
                            <p id="spec-ram-detail" class="text-xs text-slate-500 font-mono">-</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 font-bold uppercase">Graphics (GPU)</p>
                    <div class="flex items-start gap-2">
                        <i class="fas fa-tv text-green-400 mt-1"></i>
                        <div>
                            <p id="spec-gpu" class="font-semibold text-slate-800">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 font-bold uppercase">System & Network</p>
                    <div class="flex items-start gap-2">
                        <i class="fab fa-windows text-blue-400 mt-1"></i>
                        <div>
                            <p id="spec-os" class="font-semibold text-slate-800 text-xs">Loading...</p>
                            <p id="spec-ip" class="text-xs text-slate-500 font-mono mt-0.5">IP: -</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100">
                <p class="text-xs text-slate-400 font-bold uppercase mb-2">Storage</p>
                <div class="flex items-center gap-2">
                    <i class="fas fa-hdd text-orange-400"></i>
                    <p id="spec-disk" class="text-xs font-mono text-slate-600 flex-grow">Loading drives...</p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            
            <div class="bg-white p-5 rounded-xl shadow-lg border border-slate-200 text-center transform hover:scale-[1.02] transition-transform duration-300">
                <div class="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100">
                    <i class="fas fa-power-off text-2xl"></i>
                </div>
                
                <h3 class="text-lg font-bold text-slate-800 mb-1">Tắt Nguồn</h3>
                <p class="text-slate-500 mb-5 text-xs">Tắt máy trạm ngay lập tức.</p>
                
                <button id="shutdown-btn" class="flip-btn w-full h-11 bg-red-600 text-white rounded-lg font-bold shadow-md shadow-red-200 hover:bg-red-700 transition-all active:scale-95 text-sm">
                    <div class="flip-content-front">
                        <span>SHUTDOWN</span>
                    </div>
                    <div class="flip-content-back bg-red-700 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span class="ml-2">BYE!</span>
                    </div>
                </button>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-lg border border-slate-200 text-center transform hover:scale-[1.02] transition-transform duration-300">
                <div class="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-100">
                    <i class="fas fa-redo-alt text-2xl"></i>
                </div>
                
                <h3 class="text-lg font-bold text-slate-800 mb-1">Khởi Động Lại</h3>
                <p class="text-slate-500 mb-5 text-xs">Khởi động lại máy trạm.</p>
                
                <button id="restart-btn" class="flip-btn w-full h-11 bg-yellow-500 text-white rounded-lg font-bold shadow-md shadow-yellow-200 hover:bg-yellow-600 transition-all active:scale-95 text-sm">
                    <div class="flip-content-front">
                        <span>RESTART</span>
                    </div>
                    <div class="flip-content-back bg-yellow-600 rounded-lg">
                        <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        <span class="ml-2">LOADING...</span>
                    </div>
                </button>
            </div>
        </div>
        
    `;
}

