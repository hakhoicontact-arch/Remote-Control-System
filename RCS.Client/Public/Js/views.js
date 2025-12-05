import { getSortIcon, getEmptyRow, getLoadingRow } from './utils.js';
import { state } from './config.js';

// --- APP VIEW ---
export function renderAppLayout() {
    return `
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                <button id="list-apps-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all">
                    <i class="fas fa-sync-alt mr-2"></i> Làm Mới
                </button>
                <input id="app-start-name" type="text" placeholder="Tên ứng dụng (.exe) để mở" class="p-2 border border-gray-300 rounded-lg flex-grow max-w-xs">
                <button id="start-app-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all">
                    <i class="fas fa-play mr-2"></i> Mở App
                </button>
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
        const btnColor = isRunning ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100';
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
                <button data-action="${btnAction}" data-id="${app.path}" data-name="${app.name}" class="${btnColor} px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center mx-auto w-24 justify-center font-semibold">
                    <i class="fas ${btnIcon} mr-2"></i> ${btnText}
                </button>
            </td>
        </tr>`;
    }).join('');
}

// --- PROCESS VIEW ---
export function renderProcessLayout() {
    return `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <button id="list-processes-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all">
                        <i class="fas fa-sync-alt mr-2"></i> Cập Nhật
                    </button>
                    <input id="process-search" type="text" placeholder="Tìm PID hoặc Tên..." class="p-2 border border-gray-300 rounded-lg w-48">
                    <button id="start-process-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all">
                        <i class="fas fa-plus mr-2"></i> Mở Process
                    </button>
                    <input id="process-start-path" type="hidden"> </div>
                <div class="bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 text-sm font-mono text-gray-700">
                    <span id="total-cpu" class="mr-4 font-bold text-blue-600">CPU: 0%</span>
                    <span id="total-mem" class="font-bold text-purple-600">RAM: 0 MB</span>
                </div>
            </div>
            <div class="table-container bg-gray-50 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-200 sticky top-0 select-none">
                        <tr>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('pid')"><div class="flex items-center">PID ${getSortIcon('pid', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('name')"><div class="flex items-center">Tên ${getSortIcon('name', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('cpu')"><div class="flex items-center">CPU ${getSortIcon('cpu', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer" onclick="window.handleSortProcess('mem')"><div class="flex items-center">RAM ${getSortIcon('mem', state.currentSort)}</div></th>
                            <th class="px-6 py-3 text-center">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white divide-y divide-gray-200">
                        ${getLoadingRow(5)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function updateProcessTable(processes) {
    const tbody = document.getElementById('process-list-body');
    const totalCpuEl = document.getElementById('total-cpu');
    const totalMemEl = document.getElementById('total-mem');
    if (!tbody) return;

    if (!processes || processes.length === 0) {
        tbody.innerHTML = getEmptyRow(5);
        if(totalCpuEl) totalCpuEl.textContent = "CPU: 0%";
        if(totalMemEl) totalMemEl.textContent = "RAM: 0 MB";
        return;
    }

    // Tính tổng
    let totalCpu = 0, totalMem = 0;
    processes.forEach(p => {
        totalCpu += parseFloat(p.cpu.replace('%', '')) || 0;
        totalMem += parseFloat(p.mem.replace(' MB', '').replace(',', '')) || 0;
    });
    if(totalCpuEl) totalCpuEl.textContent = `CPU: ${totalCpu.toFixed(1)}%`;
    if(totalMemEl) totalMemEl.textContent = `RAM: ${totalMem.toFixed(0)} MB`;

    tbody.innerHTML = processes.map(p => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">${p.pid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title="${p.name}">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold ${parseFloat(p.cpu) > 50 ? 'text-red-600' : ''}">${p.cpu || '0%'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.mem || '0 MB'}</td>
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
            <button id="capture-screenshot-btn" class="btn-primary bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-all font-semibold">
                <i class="fas fa-camera mr-2"></i> Chụp Màn Hình
            </button>
            <div id="screenshot-area" class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p id="screenshot-placeholder" class="text-gray-500 mb-4">Chưa có ảnh</p>
                <img id="screenshot-image" src="" alt="Screenshot" class="hidden max-w-full shadow-lg border border-gray-200 rounded-lg">
            </div>
            <button id="save-screenshot-btn" class="hidden btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                <i class="fas fa-download mr-2"></i> Lưu Ảnh
            </button>
        </div>
    `;
}

export function renderKeyloggerDisplay() {
    return `
        <div class="space-y-4">
            <div class="flex space-x-3">
                <button id="start-keylogger-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">Bắt Đầu</button>
                <button id="stop-keylogger-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">Dừng</button>
                <button id="clear-keylogger-btn" class="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold">Xóa</button>
            </div>
            <p id="keylogger-status" class="text-sm font-bold text-blue-600">Trạng thái: Đang chờ lệnh...</p>
            <textarea id="keylogger-log" class="w-full h-80 p-4 border rounded-lg font-mono text-sm bg-gray-50" readonly></textarea>
        </div>
    `;
}

export function renderWebcamControl() {
    return `
        <div class="space-y-4">
            <p class="text-lg font-semibold text-red-600 bg-red-100 p-3 rounded-lg shadow"><i class="fas fa-exclamation-triangle mr-2"></i> CẢNH BÁO: Truy cập Webcam Agent.</p>
            <div class="flex justify-between items-center">
                <div class="flex space-x-3">
                    <button id="webcam-on-btn" class="btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow font-semibold"><i class="fas fa-video mr-2"></i> Bật Webcam</button>
                    <button id="webcam-off-btn" class="btn-primary bg-red-600 text-white px-6 py-3 rounded-lg shadow font-semibold"><i class="fas fa-stop mr-2"></i> Tắt Webcam</button>
                </div>
                <button id="toggle-stats-btn" class="text-slate-600 bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"><i class="fas fa-cogs mr-1"></i> Stats for Nerds</button>
            </div>
            <div id="webcam-area" class="bg-gray-900 border-2 border-gray-700 rounded-lg p-2 text-center overflow-hidden min-h-[300px] relative flex items-center justify-center">
                <div id="webcam-stats-overlay" class="absolute top-3 left-3 bg-black/50 p-2 rounded-lg pointer-events-none" style="display: block;"><p class="text-white bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">LIVE</p></div>
                <div id="webcam-placeholder" class="text-gray-500 flex flex-col items-center"><i class="fas fa-video-slash fa-2x mb-2 text-slate-600"></i><span>Camera Off</span></div>
                <img id="webcam-stream" src="" alt="Webcam" class="w-full h-auto block" style="display:none" />
            </div>
        </div>
    `;
}

export function renderSystemControls() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-10">
            <div class="p-6 bg-red-50 rounded-lg shadow-lg border-l-4 border-red-500">
                <h3 class="text-xl font-bold text-red-800 mb-3">Tắt Nguồn</h3>
                <button id="shutdown-btn" class="w-full btn-primary bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-red-700">SHUTDOWN</button>
            </div>
            <div class="p-6 bg-yellow-50 rounded-lg shadow-lg border-l-4 border-yellow-500">
                <h3 class="text-xl font-bold text-yellow-800 mb-3">Khởi Động Lại</h3>
                <button id="restart-btn" class="w-full btn-primary bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-yellow-700">RESTART</button>
            </div>
        </div>
    `;
}