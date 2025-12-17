import { getSortIcon, getEmptyRow, getLoadingRow } from './utils.js';
import { state } from './config.js';

// --- APP VIEW ---
export function renderAppLayout() {
    return `
        <div class="h-full w-full relative flex flex-col">
            
            <div class="flex items-center space-x-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors shrink-0 mb-4 z-20">
                <button id="list-apps-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all">Làm Mới</button>
                
                <div class="uiv-search-box flex-grow">
                    <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"><path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path></svg>
                    <input id="app-search" type="text" placeholder="Tìm ứng dụng..." class="uiv-search-input uiv-full-width dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:border-slate-600">
                </div>
                
                <div class="uiv-search-box ml-4">
                     <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"><path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path></svg>
                    <input id="app-search name" type="text" placeholder="Nhập tên" class="uiv-search-input uiv-anim-width-app-search dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:border-slate-600">
                </div>
                <button id="start-app-btn" class="btn-primary bg-green-600 text-white px-4 py-2 shadow-md shadow-green-200 dark:shadow-none rounded-lg">Mở</button>
            </div>
            
            <div class="absolute inset-0 top-[88px] bg-white dark:bg-slate-800 rounded-lg shadow-inner overflow-hidden flex flex-col border border-gray-100 dark:border-slate-700">
                
                <div class="overflow-y-auto flex-1 custom-scrollbar w-full h-full">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700 w-full">
                        <thead class="bg-gray-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase cursor-pointer select-none" onclick="window.handleSortApp('name')">
                                    <div class="flex items-center gap-1">Tên ${getSortIcon('name', state.currentAppSort)}</div>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Đường Dẫn</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Trạng Thái</th>
                                <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody id="app-list-body" class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            ${getLoadingRow(4)}
                        </tbody>
                    </table>
                    
                    </div>
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
        
        // Cập nhật màu nút bấm cho Dark Mode (giảm độ sáng nền, tăng contrast text)
        const btnColor = isRunning 
            ? 'bg-red-50 text-red-600 shadow-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:shadow-none dark:hover:bg-red-900/40' 
            : 'bg-green-50 text-green-600 shadow-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:shadow-none dark:hover:bg-green-900/40';
            
        const btnIcon = isRunning ? 'fa-stop-circle' : 'fa-play-circle';
        const btnText = isRunning ? 'Đóng' : 'Mở';
        const btnAction = isRunning ? 'stop-app' : 'start-app';
        
        // Cập nhật màu Badge trạng thái cho Dark Mode
        const statusBadgeClass = isRunning 
            ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';

        return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-3 text-slate-500 dark:text-slate-400"><i class="fas fa-cube"></i></div>
                    ${app.name || 'Unknown'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs" title="${app.path}">${app.path || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass}">
                    <i class="fas ${isRunning ? 'fa-check-circle' : 'fa-minus-circle'} mr-1"></i> ${app.status || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
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

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">

                <div class="flip-card-container h-full" onclick="this.classList.toggle('flipped')">
                    <div class="flip-card-inner h-full">
                        <div class="flip-card-front h-full">
                            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div>
                                    <div class="flex justify-between items-start">
                                        <p class="text-xs text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">CPU Usage</p>
                                        <i class="fas fa-microchip text-blue-200 dark:text-blue-500/50 text-lg"></i>
                                    </div>
                                    <p id="total-cpu" class="text-xl font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">0%</p>
                                    <div class="w-full bg-blue-200 dark:bg-blue-900 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div id="bar-cpu" class="bg-blue-500 dark:bg-blue-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                                    </div>
                                </div>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    <i class="fas fa-info-circle mr-1"></i>Nhấn xem chi tiết
                                </p>
                            </div>
                        </div>
                        <div class="flip-card-back h-full">
                            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div>
                                    <div class="flex justify-between items-start">
                                        <p class="text-xs text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">CPU Info</p>
                                        <i class="fas fa-microchip text-blue-200 dark:text-blue-500/50 text-lg"></i>
                                    </div>
                                    <p id="spec-cpu-name" class="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-1 truncate" title="Loading...">Loading...</p>
                                    <p id="spec-cpu-cores" class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">-</p>
                                </div>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    <i class="fas fa-undo mr-1"></i>Quay lại
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flip-card-container h-full" onclick="this.classList.toggle('flipped')">
                    <div class="flip-card-inner h-full">
                        <div class="flip-card-front h-full">
                            <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div>
                                    <div class="flex justify-between items-start">
                                        <p class="text-xs text-purple-500 dark:text-purple-400 font-bold uppercase tracking-wider">Memory</p>
                                        <i class="fas fa-memory text-purple-200 dark:text-purple-500/50 text-lg"></i>
                                    </div>
                                    <div class="flex items-baseline gap-2 mt-1">
                                        <p id="total-mem" class="text-xl font-mono font-bold text-slate-700 dark:text-slate-200">0 MB</p>
                                        <p id="spec-ram-total-1" class="text-sm font-semibold text-slate-400 dark:text-slate-500"></p>
                                    </div>
                                    <div class="w-full bg-purple-200 dark:bg-purple-900 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div id="bar-mem" class="bg-purple-500 dark:bg-purple-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                                    </div>
                                </div>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    <i class="fas fa-server mr-1"></i>Nhấn xem chi tiết
                                </p>
                            </div>
                        </div>
                        <div class="flip-card-back h-full">
                            <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div>
                                    <div class="flex justify-between items-start">
                                        <p class="text-xs text-purple-500 dark:text-purple-400 font-bold uppercase tracking-wider">Memory</p>
                                        <i class="fas fa-memory text-purple-200 dark:text-purple-500/50 text-lg"></i>
                                    </div>
                                    <p id="spec-ram-total-2" class="font-semibold text-slate-800 dark:text-slate-200 mt-1">Loading...</p>
                                    <p id="spec-ram-detail" class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">-</p>
                                </div>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    <i class="fas fa-undo mr-1"></i>Quay lại
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flip-card-container h-full" onclick="this.classList.toggle('flipped')">
                    <div class="flip-card-inner h-full">
                        <div class="flip-card-front h-full">
                            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div>
                                    <div class="flex justify-between items-start">
                                        <p class="text-xs text-orange-500 dark:text-orange-400 font-bold uppercase tracking-wider">Disk I/O</p>
                                        <i class="fas fa-hdd text-orange-200 dark:text-orange-500/50 text-lg"></i>
                                    </div>
                                    <p id="total-disk" class="text-xl font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">0 KB/s</p>
                                    <div class="w-full bg-orange-200 dark:bg-orange-900 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div id="bar-disk" class="bg-orange-400 dark:bg-orange-500 h-full rounded-full w-0 transition-all duration-500 opacity-50"></div>
                                    </div>
                                </div>
                                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    <i class="fas fa-exchange-alt mr-1"></i>Nhấn xem chi tiết
                                </p>
                            </div>
                        </div>
                        <div class="flip-card-back h-full">
                            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                                <div class="flex flex-col h-full overflow-hidden"> 
                                    <div class="flex justify-between items-start mb-2">
                                        <p class="text-xs text-orange-500 dark:text-orange-400 font-bold uppercase tracking-wider">Disk I/O</p>
                                        <i class="fas fa-hdd text-orange-200 dark:text-orange-500/50 text-lg"></i>
                                    </div>
                                    <div id="spec-disk" class="whitespace-pre-line text-xs font-mono text-slate-600 dark:text-slate-300 overflow-y-auto pr-1 custom-scrollbar">Loading drives...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Processes</p>
                        <i class="fas fa-tasks text-slate-300 dark:text-slate-600 text-lg"></i>
                    </div>

                    <div class="flex flex-col justify-center flex-grow">
                        <p id="total-count" class="text-2xl font-mono font-bold text-slate-700 dark:text-slate-200">0</p>
                    </div>

                    <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        <i class="fas fa-list-ul mr-1"></i>Đang hoạt động
                    </p>
                </div>

                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none h-full flex flex-col justify-between gap-4 hidden md:flex">
                    <div class="flex justify-between items-start">
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">System</p>
                        <i class="fas fa-cogs text-slate-300 dark:text-slate-600 text-lg"></i>
                    </div>

                    <div class="flex flex-col justify-center gap-2 flex-grow">
                        <div class="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-700 pb-1">
                            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Threads</span>
                            <span id="total-threads" class="font-mono font-bold text-slate-600 dark:text-slate-300 text-lg">0</span>
                        </div>
                        <div class="flex justify-between items-baseline">
                            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Handles</span>
                            <span id="total-handles" class="font-mono font-bold text-slate-600 dark:text-slate-300 text-lg">0</span>
                        </div>
                    </div>

                </div>

            </div>

            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <button id="list-processes-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all">
                        <i class="fas fa-sync-alt mr-2"></i> Cập Nhật
                    </button>
                    <button id="start-process-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow-md shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all">
                        <i class="fas fa-plus mr-2"></i> Mở Process
                    </button>
                    <div class="uiv-search-box ml-4">
                        <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                            <path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path>
                        </svg>

                        <input 
                            id="process-search" 
                            type="text" 
                            placeholder="Tìm PID hoặc Tên" 
                            class="uiv-search-input uiv-anim-width dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:border-slate-600"
                        >
                    </div>
                    <input id="process-start-path" type="hidden"> </div>
            </div>

            <div class="table-container bg-gray-50 dark:bg-slate-800 rounded-lg shadow-inner dark:shadow-none dark:border dark:border-slate-700">
                <table class="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                    <thead class="bg-gray-200 dark:bg-slate-700 sticky top-0 select-none z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-3 cursor-pointer text-gray-700 dark:text-slate-300" onclick="window.handleSortProcess('pid')"><div class="flex items-center">PID ${getSortIcon('pid', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer text-gray-700 dark:text-slate-300" onclick="window.handleSortProcess('name')"><div class="flex items-center">Tên ${getSortIcon('name', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer text-gray-700 dark:text-slate-300" onclick="window.handleSortProcess('cpu')"><div class="flex items-center">CPU ${getSortIcon('cpu', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer text-gray-700 dark:text-slate-300" onclick="window.handleSortProcess('mem')"><div class="flex items-center">RAM ${getSortIcon('mem', state.currentSort)}</div></th>
                            <th class="px-6 py-3 cursor-pointer text-gray-700 dark:text-slate-300" onclick="window.handleSortProcess('disk')"><div class="flex items-center">DISK ${getSortIcon('disk', state.currentSort)}</div></th>
                            <th class="px-6 py-3 text-center text-gray-700 dark:text-slate-300">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700 text-sm">
                         <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 dark:text-slate-400 italic">Đang tải dữ liệu...</td></tr>
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
    // (Phần logic tính toán giữ nguyên)
    let totalCpu = 0, totalMem = 0, totalThreads = 0, totalHandles = 0;
    let totalDiskKB = 0;

    processes.forEach(p => {
        totalCpu += parseFloat(p.cpu?.replace('%', '') || 0);
        totalMem += parseFloat(p.mem?.replace(/[^\d]/g, '') || 0);
        totalThreads += (p.threads || 0);
        totalHandles += (p.handles || 0);

        let diskVal = 0;
        let diskStr = p.disk || "0";
        if (diskStr.includes("MB/s")) diskVal = parseFloat(diskStr) * 1024;
        else if (diskStr.includes("KB/s")) diskVal = parseFloat(diskStr);
        totalDiskKB += diskVal;
    });

    totalMem *= 0.8;

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
        const diskPercent = (totalDiskKB / 10240) * 100;
        barDisk.style.width = `${Math.min(diskPercent, 100)}%`;
    }

    if (elCount) elCount.textContent = processes.length;
    if (elThreads) elThreads.textContent = totalThreads;
    if (elHandles) elHandles.textContent = totalHandles;

    // --- RENDER BẢNG (Thêm class dark vào template string) ---
    if (!processes || processes.length === 0) {
        return;
    }

    tbody.innerHTML = processes.map(p => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-slate-400">${p.pid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs" title="${p.name}">
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title="${p.name}">${p.name}</span>
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] hidden md:block" title="${p.description}">${p.description || '-'}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 font-semibold ${parseFloat(p.cpu) > 50 ? 'text-red-600 dark:text-red-400' : ''}">${p.cpu || '0%'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">${p.mem || '0 MB'}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">${p.disk || '0 KB/s'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-action="kill-process" data-id="${p.pid}" class="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"><i class="fas fa-times-circle"></i> Kill</button>
            </td>
        </tr>
    `).join('');
}

// --- OTHER VIEWS ---
export function renderScreenshotView() {
    return `
        <div class="space-y-6 text-center h-full p-5">
            <button id="capture-screenshot-btn" class="btn-primary bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all font-semibold">
                <i class="fas fa-camera mr-2"></i> Chụp Màn Hình
            </button>
            <button id="save-screenshot-btn" class="hidden btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                <i class="fas fa-download mr-2"></i> Lưu Ảnh
            </button>
            <div id="screenshot-area" class="bg-gray-100 dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p id="screenshot-placeholder" class="text-gray-500 dark:text-slate-400 mb-4 h-full">Chưa có ảnh</p>
                <img id="screenshot-image" src="" alt="Screenshot" class="hidden max-w-full shadow-lg border border-gray-200 dark:border-slate-700 rounded-lg">
            </div>
        </div>
    `;
}

export function renderKeyloggerDisplay() {
    return `
        <div class="space-y-4 h-full flex flex-col">
            <div class="flex flex-wrap items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 gap-3">
                <div class="flex items-center space-x-2">
                    <button id="start-keylogger-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center">
                        <i class="fas fa-play mr-2"></i> Bắt đầu
                    </button>
                    <button id="stop-keylogger-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center">
                        <i class="fas fa-stop mr-2"></i> Dừng
                    </button>
                    <button id="clear-keylogger-btn" class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center">
                        <i class="fas fa-eraser mr-2"></i> Xóa
                    </button>
                </div>

                <div class="flex items-center space-x-3 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                    <span id="keylogger-status" class="text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse px-2">Trạng thái: Chờ...</span>
                    <div class="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                    
                    <select id="keylog-mode" class="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer dark:bg-slate-800">
                        <option value="english">EN Tiếng Anh</option>
                        <option value="telex">VN Tiếng Việt (Telex)</option>
                    </select>

                    <button id="download-keylog-btn" class="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors" title="Tải về .txt">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow h-full min-h-[400px]">
                
                <div class="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
                    <div class="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider"><i class="fas fa-terminal mr-2"></i>Raw Input Stream</h3>
                        <span class="text-[10px] text-slate-500 font-mono">Real-time</span>
                    </div>
                    <textarea id="keylogger-log-raw" class="flex-grow w-full p-4 bg-transparent text-green-400 font-mono text-l resize-none outline-none leading-relaxed" readonly placeholder="Dữ liệu phím thô sẽ hiện ở đây..."></textarea>
                </div>

                <div class="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="bg-slate-50 dark:bg-slate-700 px-4 py-2 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                        <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><i class="fas fa-file-alt mr-2"></i>Processed Text</h3>
                        <span class="text-[10px] text-blue-500 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded" id="mode-indicator">EN</span>
                    </div>
                    <textarea id="keylogger-log-processed" class="flex-grow w-full p-4 bg-transparent text-slate-800 dark:text-slate-200 font-sans text-l resize-none outline-none leading-relaxed" readonly placeholder="Văn bản đã xử lý sẽ hiện ở đây..."></textarea>
                </div>

            </div>
        </div>
    `;
}

export function renderWebcamControl() {
    return `
        <div class="space-y-4 h-full flex flex-col items-center relative">
            
            <div id="save-video-modal" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm hidden">
                <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl w-[600px] border border-slate-200 dark:border-slate-700 transform scale-100 transition-all">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                            <i class="fas fa-film text-blue-600 mr-2"></i> Xem lại bản ghi
                        </h3>
                        <div class="text-xs font-mono text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded" id="video-size-info">0 MB</div>
                    </div>

                    <div class="bg-black rounded-lg overflow-hidden mb-4 border border-slate-300 dark:border-slate-600 aspect-video relative shadow-inner">
                        <video id="playback-video" controls autoplay class="w-full h-full object-contain"></video>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Đặt tên file</label>
                        <div class="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <input type="text" id="video-filename" class="w-full p-2.5 outline-none font-mono text-sm text-slate-700 dark:text-white dark:bg-slate-700" placeholder="record_video...">
                            <span class="bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-3 py-2.5 text-sm font-medium border-l border-slate-300 dark:border-slate-500">.webm</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <button id="cancel-save-video" class="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 rounded-xl font-bold text-sm transition-colors flex justify-center items-center">
                            <i class="fas fa-times mr-2"></i> Đóng & Xóa
                        </button>
                        
                        <button id="confirm-save-video" class="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all flex justify-center items-center active:scale-95">
                            <i class="fas fa-download mr-2"></i> Tải Xuống
                        </button>
                    </div>
                </div>
            </div>

            <div class="w-full max-w-5xl flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <span class="text-red-500 animate-pulse"><i class="fas fa-circle text-[10px]"></i></span>
                    <span class="font-bold text-gray-700 dark:text-slate-200">WEBCAM STREAM</span>
                </div>
                
                <div class="flex items-center space-x-2">
                    <div id="recording-ui" class="hidden flex items-center mr-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900">
                        <span class="w-2 h-2 bg-red-600 rounded-full animate-ping mr-2"></span>
                        <span id="record-timer" class="font-mono font-bold text-sm">00:00</span>
                    </div>

                    <button id="record-btn" class="text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 flex items-center">
                        <i class="fas fa-record-vinyl mr-2 text-red-500"></i> Ghi hình
                    </button>

                    <div class="h-6 w-px bg-gray-300 dark:bg-slate-600 mx-2"></div>

                    <button id="webcam-on-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-md shadow-green-200 dark:shadow-none">
                        <i class="fas fa-power-off mr-2"></i> Bật
                    </button>
                    <button id="webcam-off-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-md shadow-red-200 dark:shadow-none">
                        <i class="fas fa-stop mr-2"></i> Tắt
                    </button>
                    
                    <button id="toggle-stats-btn" class="text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600" title="Stats">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </div>
            </div>
            
            <div id="webcam-area" class="w-full max-w-5xl aspect-video bg-black rounded-xl border-4 border-gray-800 dark:border-slate-700 relative flex items-center justify-center overflow-hidden shadow-2xl">
                <canvas id="hidden-recorder-canvas" style="display:none;"></canvas>

                <div id="webcam-stats-overlay" class="absolute top-4 right-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg pointer-events-none border border-white/10 shadow-lg z-10" style="display: none;"></div>
                
                <div id="webcam-placeholder" class="text-gray-500 dark:text-slate-500 flex flex-col items-center z-0">
                    <div class="box-of-star1">
                        <div class="star star-position1"></div>
                        <div class="star star-position2"></div>
                        <div class="star star-position3"></div>
                        <div class="star star-position4"></div>
                        <div class="star star-position5"></div>
                        <div class="star star-position6"></div>
                        <div class="star star-position7"></div>
                    </div>
                    <div class="box-of-star2">
                        <div class="star star-position1"></div>
                        <div class="star star-position2"></div>
                        <div class="star star-position3"></div>
                        <div class="star star-position4"></div>
                        <div class="star star-position5"></div>
                        <div class="star star-position6"></div>
                        <div class="star star-position7"></div>
                    </div>
                    <div class="box-of-star3">
                        <div class="star star-position1"></div>
                        <div class="star star-position2"></div>
                        <div class="star star-position3"></div>
                        <div class="star star-position4"></div>
                        <div class="star star-position5"></div>
                        <div class="star star-position6"></div>
                        <div class="star star-position7"></div>
                    </div>
                    <div class="box-of-star4">
                        <div class="star star-position1"></div>
                        <div class="star star-position2"></div>
                        <div class="star star-position3"></div>
                        <div class="star star-position4"></div>
                        <div class="star star-position5"></div>
                        <div class="star star-position6"></div>
                        <div class="star star-position7"></div>
                    </div>
                    <div data-js="astro" class="astronaut">
                        <div class="head"></div>
                        <div class="arm arm-left"></div>
                        <div class="arm arm-right"></div>
                        <div class="body">
                        <div class="panel"></div>
                        </div>
                        <div class="leg leg-left"></div>
                        <div class="leg leg-right"></div>
                        <div class="schoolbag"></div>
                    </div>
                </div>
                
                <img id="webcam-stream" src="" alt="Video Webcam Agent" class="w-full h-full object-contain absolute inset-0 z-1" style="display:none" />
            </div>
        </div>
    `;
}

export function renderSystemControls() {
    return `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                <i class="fas fa-desktop text-blue-600"></i>
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">System Specification</h3>
                <span id="spec-uptime" class="ml-auto text-xs font-mono text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Uptime: ...</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div class="space-y-1">
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Processor (CPU)</p>
                    <div class="flex items-start gap-2">
                        <i class="fab fa-intel text-blue-400 mt-1"></i>
                        <div>
                            <p id="spec-cpu-name" class="font-semibold text-slate-800 dark:text-slate-200">Loading...</p>
                            <p id="spec-cpu-cores" class="text-xs text-slate-500 dark:text-slate-400 font-mono">-</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Memory (RAM)</p>
                    <div class="flex items-start gap-2">
                        <i class="fas fa-memory text-purple-400 mt-1"></i>
                        <div>
                            <p id="spec-ram-total-1" class="font-semibold text-slate-800 dark:text-slate-200">Loading...</p>
                            <p id="spec-ram-detail" class="text-xs text-slate-500 dark:text-slate-400 font-mono">-</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Graphics (GPU)</p>
                    <div class="flex items-start gap-2">
                        <i class="fas fa-tv text-green-400 mt-1"></i>
                        <div>
                            <p id="spec-gpu" class="font-semibold text-slate-800 dark:text-slate-200">Loading...</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">System & Network</p>
                    <div class="flex items-start gap-2">
                        <i class="fab fa-windows text-blue-400 mt-1"></i>
                        <div>
                            <p id="spec-os" class="font-semibold text-slate-800 dark:text-slate-200 text-xs">Loading...</p>
                            <p id="spec-ip" class="text-xs whitespace-pre-line text-slate-500 dark:text-slate-400 font-mono mt-0.5">IP: -</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mb-2">Storage</p>
                <div class="flex items-center gap-2">
                    <i class="fas fa-hdd text-orange-400"></i>
                    <p id="spec-disk" class="text-xs font-mono text-slate-600 dark:text-slate-300 flex-grow">Loading drives...</p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            
            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center transform hover:scale-[1.02] transition-transform duration-300">
                <div class="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 dark:border-red-900">
                    <i class="fas fa-power-off text-2xl"></i>
                </div>
                
                <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Tắt Nguồn</h3>
                <p class="text-slate-500 dark:text-slate-400 mb-5 text-xs">Tắt máy trạm ngay lập tức.</p>
                
                <button id="shutdown-btn" class="flip-btn w-full h-11 bg-red-600 text-white rounded-lg font-bold shadow-md shadow-red-200 dark:shadow-none hover:bg-red-700 transition-all active:scale-95 text-sm">
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

            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center transform hover:scale-[1.02] transition-transform duration-300">
                <div class="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-100 dark:border-yellow-900">
                    <i class="fas fa-redo-alt text-2xl"></i>
                </div>
                
                <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Khởi Động Lại</h3>
                <p class="text-slate-500 dark:text-slate-400 mb-5 text-xs">Khởi động lại máy trạm.</p>
                
                <button id="restart-btn" class="flip-btn w-full h-11 bg-yellow-500 text-white rounded-lg font-bold shadow-md shadow-yellow-200 dark:shadow-none hover:bg-yellow-600 transition-all active:scale-95 text-sm">
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

export function renderTerminalLayout() {
    return `
        <div class="h-full flex flex-col space-y-4">
            <!-- Header của Terminal -->
            <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-900 text-green-500 p-2 rounded-lg font-mono text-xs shadow-inner border border-slate-700">
                        &gt;_
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-700 dark:text-white text-sm">Remote Command Line</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">cmd.exe / powershell</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button id="term-clear-btn" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors">
                        <i class="fas fa-eraser mr-1"></i> Clear
                    </button>
                    <button id="term-start-btn" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow shadow-green-200 dark:shadow-none">
                        <i class="fas fa-power-off mr-1"></i> Restart Session
                    </button>
                </div>
            </div>

            <!-- Console Screen (Màn hình đen) -->
            <div class="flex-1 bg-[#0c0c0c] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative">
                
                <!-- Khu vực hiển thị kết quả (Output) -->
                <div id="terminal-output" class="flex-1 overflow-y-auto p-4 space-y-1 text-slate-300 custom-scrollbar select-text font-medium leading-relaxed">
                    <div class="text-green-500 mb-2">Initialize connection... Ready.</div>
                </div>

                <!-- Khu vực nhập lệnh (Input) -->
                <div class="bg-[#1a1a1a] p-3 flex items-center border-t border-slate-700 shrink-0">
                    <span class="text-green-500 mr-2 font-bold animate-pulse">&gt;</span>
                    <input id="terminal-input" type="text" class="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 font-mono" placeholder="Type command here (e.g., ipconfig, dir)..." autocomplete="off" autofocus>
                </div>
            </div>
        </div>
    `;
}


export function renderAutomationLayout() {
    return `
        <div class="h-full flex gap-6">
            
            <!-- CỘT TRÁI: CÁC LỆNH TỰ ĐỘNG (Giữ lại tính năng cũ) -->
            <div class="w-1/3 flex flex-col gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
                        <i class="fas fa-magic mr-2 text-orange-500"></i> Quick Actions
                    </h3>
                    <div class="space-y-3">
                        <button id="macro-panic" class="w-full flex items-center p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-left text-sm font-medium">
                            <i class="fas fa-biohazard text-xl mr-3"></i> Panic Mode
                        </button>
                        <button id="macro-work" class="w-full flex items-center p-3 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-left text-sm font-medium">
                            <i class="fas fa-briefcase text-xl mr-3"></i> Open Workspace
                        </button>
                    </div>
                </div>
                
                 <!-- Text to Speech -->
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                    <h3 class="font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
                        <i class="fas fa-volume-up mr-2 text-purple-500"></i> Text-to-Speech
                    </h3>
                    <div class="flex gap-2">
                        <input id="tts-input" type="text" class="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-500" placeholder="Nhập nội dung...">
                        <button id="send-tts-btn" class="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- CỘT PHẢI: KHUNG CHAT (MỚI) -->
            <div class="flex-1 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
                <!-- Header Chat -->
                <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">AG</div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-sm">Agent Chat</h3>
                            <p class="text-xs text-green-600 flex items-center"><span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> Online</p>
                        </div>
                    </div>
                    <button id="clear-chat-btn" class="text-slate-400 hover:text-red-500 transition-colors" title="Xóa lịch sử">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>

                <!-- Nội dung tin nhắn -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                    <!-- Tin nhắn mẫu -->
                    <div class="flex justify-center">
                        <span class="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Bắt đầu phiên chat</span>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="p-4 bg-white border-t border-slate-200">
                    <div class="flex gap-2 relative">
                        <input id="chat-input" type="text" class="flex-1 pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Nhập tin nhắn gửi đến Agent...">
                        <button id="send-chat-btn" class="absolute right-2 top-2 bg-blue-600 text-white w-8 h-8 rounded-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center justify-center shadow-md shadow-blue-200">
                            <i class="fas fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// --- PHẦN 1: LAYOUT CHÍNH ---
export function renderAboutLayout() {
    return `
    <div class="max-w-5xl mx-auto pb-12 space-y-10 animate-fade-in-up">
        ${renderAboutHeader()}
        ${renderProjectOverview()}
        ${renderArchitectureSection()}
        ${renderTechSpecs()}
        ${renderDetailedGuideSection()}
        ${renderTeamSection()}
        ${renderAboutFooter()}
    </div>
    `;
}

// --- PHẦN 2: HERO & INTRO ---
function renderTechSpecs() {
    return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="font-bold text-slate-800 dark:text-white mb-4 flex items-center uppercase tracking-wider text-sm">
                <i class="fas fa-layer-group text-blue-500 mr-2"></i> Công nghệ lõi
            </h3>
            <div class="space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Backend Framework</span>
                    <span class="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">.NET 8 (ASP.NET Core)</span>
                </div>
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Agent Runtime</span>
                    <span class="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">.NET 8 Worker Service</span>
                </div>
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Frontend Lib</span>
                    <span class="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">Vanilla JS + TailwindCSS</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Computer Vision</span>
                    <span class="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">OpenCVSharp 4</span>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="font-bold text-slate-800 dark:text-white mb-4 flex items-center uppercase tracking-wider text-sm">
                <i class="fas fa-exchange-alt text-green-500 mr-2"></i> Giao thức truyền tải
            </h3>
            <div class="space-y-4">
                <div class="flex items-start gap-3">
                    <div class="mt-1"><i class="fas fa-bolt text-yellow-500 text-xs"></i></div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">SignalR (WebSocket)</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Dùng cho C&C (Command & Control), Keylogger, Terminal. Đảm bảo tính toàn vẹn dữ liệu.</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="mt-1"><i class="fas fa-video text-rose-500 text-xs"></i></div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">UDP Socket</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Dùng cho Webcam Streaming. Ưu tiên tốc độ thấp (Low latency) chấp nhận mất gói tin.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function renderProjectOverview() {
    return `
    <div class="relative mb-8">
        <div class="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-500/10 dark:bg-blue-900/20 rounded-full blur-[100px] -z-10"></div>

        <div class="text-center pt-10 pb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-6 shadow-xl shadow-blue-500/30 transform hover:scale-110 transition-transform duration-500">
                <i class="fas fa-network-wired text-4xl"></i>
            </div>
            
            <h1 class="text-5xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">
                Remote Control System <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Pro</span>
            </h1>
            
            <p class="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                Hệ thống điều khiển và giám sát máy trạm tập trung. <br class="hidden md:block" />
                Sức mạnh của <b class="text-slate-700 dark:text-slate-200">Real-time Control</b> và <b class="text-slate-700 dark:text-slate-200">Live Streaming</b>.
            </p>
        </div>

        <div class="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in-up" style="animation-delay: 0.1s;">
            <span class="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <i class="fab fa-microsoft text-blue-500"></i> .NET 8 Core
            </span>
            <span class="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <i class="fas fa-video text-rose-500"></i> UDP Stream
            </span>
            <span class="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <i class="fab fa-js text-yellow-400"></i> Vanilla JS
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-in-up" style="animation-delay: 0.2s;">
            <div class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow text-center md:text-left">
                <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-lg mb-3 mx-auto md:mx-0">
                    <i class="fas fa-tachometer-alt"></i>
                </div>
                <h3 class="font-bold text-slate-800 dark:text-white mb-1">Hiệu năng cao</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sử dụng giao thức <strong>UDP Fragment</strong> để truyền tải Video 60FPS mượt mà với độ trễ thấp nhất.
                </p>
            </div>

            <div class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow text-center md:text-left">
                <div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-lg mb-3 mx-auto md:mx-0">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="font-bold text-slate-800 dark:text-white mb-1">Kiến trúc Hybrid</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Kết hợp <strong>TCP (SignalR)</strong> cho lệnh điều khiển tin cậy và <strong>UDP</strong> cho dữ liệu đa phương tiện.
                </p>
            </div>

            <div class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow text-center md:text-left">
                <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-lg mb-3 mx-auto md:mx-0">
                    <i class="fas fa-user-secret"></i>
                </div>
                <h3 class="font-bold text-slate-800 dark:text-white mb-1">Giám sát sâu</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Can thiệp sâu vào hệ thống: Registry, Process Hooking, Input Capture và Reverse Shell.
                </p>
            </div>
        </div>
    </div>`;
}

function renderAboutHeader() {
    return `<div class="flex flex-col md:flex-row justify-between items-end mb-10 gap-10">
            <div class="flex items-center gap-4">
                <div class="w-32 h-16 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center p-2">
                    <img src="./Fit-logo-blue.png" alt="FIT Logo" class="w-full h-full object-contain opacity-90">
                </div>
                <div>
                    <p class="font-bold text-slate-800 dark:text-slate-200 text-lg">Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM</p>
                    <p class="font-bold text-slate-600 dark:text-slate-200 text-lg">Khoa Công nghệ Thông tin</p>
                    <p class="text-xs text-slate-400 dark:text-slate-400">Cơ sở 1: 227 Nguyễn Văn Cừ, Phường Chợ Quán, TP. Hồ Chí Minh</p>
                    <p class="text-xs text-slate-400 dark:text-slate-400">Cơ sở 2: Khu đô thị ĐHQG-HCM, Phường Đông Hòa, TP. Hồ Chí Minh</p>
                </div>
            </div>

            <div class="text-left md:text-right">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold mb-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Lớp 24CTT5
                </div>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Mạng máy tính (Computer Networks)</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">GVHD: <span class="font-medium text-slate-800 dark:text-slate-200">ThS. Đỗ Hoàng Cường</span></p>
            </div>
        </div>`;
}

function renderAboutFooter() {
    return `
    <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div class="text-center md:text-left">
                <h4 class="font-bold text-slate-700 dark:text-slate-300 text-sm">Remote Control System Pro</h4>
                <p class="text-[10px] text-slate-400 mt-1">&copy; 2025 FIT - HCMUS. Project for Educational Purpose.</p>
            </div>

            <div class="flex gap-6 text-sm md:text-left">
                <a href="#" class="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Documentation</a>
                <a href="https://github.com/hakhoicontact-arch/Remote-Control-System" class="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Github Repo</a>
            </div>

            <div class="flex gap-3">
                <span class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer">
                    <a href="https://github.com/hakhoicontact-arch/Remote-Control-System" class="fab fa-github"></a>
                </span>
                <span class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer">
                    <a href="mailto:hakhoi.contact@gmail.com" class="fas fa-envelope"></a>
                </span>
            </div>
        </div>
        <div class="text-center mt-10 text-[10px] text-slate-400">
            <p>&copy; 2025 Remote Control System Project. All rights reserved.</p>
            <p class="mt-1 opacity-60">Sản phẩm phục vụ mục đích học tập và nghiên cứu.</p>
        </div>
    </div>`;
}

// --- PHẦN 3: KIẾN TRÚC HỆ THỐNG  ---
function renderArchitectureSection() {
    // (Đã rút gọn code HTML phần sơ đồ để tập trung vào phần mới, 
    // bạn hãy copy lại đoạn HTML sơ đồ từ câu trả lời trước vào đây nhé)
    return `
    <div class="mb-10">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                <i class="fas fa-sitemap mr-3 text-blue-500"></i>Kiến trúc hệ thống
            </h2>
            
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <div class="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    
                    <div class="flex-1 text-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mx-auto mb-3 text-xl">
                            <i class="fas fa-laptop"></i>
                        </div>
                        <h3 class="font-bold text-slate-800 dark:text-white">Web Client</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Dashboard điều khiển</p>
                        <div class="mt-3 text-[10px] font-mono bg-white dark:bg-slate-800 py-1 px-2 rounded border border-slate-200 dark:border-slate-600 inline-block">
                            React.js + Tailwind CSS
                        </div>
                    </div>

                    <div class="flex flex-col items-center gap-1">
                        <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">WebSocket</span>
                        <div class="w-24 h-0.5 bg-gradient-to-r from-blue-300 to-indigo-300 relative">
                            <div class="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-indigo-300 rotate-45"></div>
                            <div class="absolute left-0 -top-1 w-2 h-2 border-b-2 border-l-2 border-blue-300 rotate-45"></div>
                        </div>
                        <span class="text-[10px] text-slate-400 mt-1">Real-time CMD</span>
                    </div>

                    <div class="flex-1 text-center p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 ring-2 ring-indigo-500/20">
                        <div class="w-12 h-12 bg-indigo-600 text-white rounded-lg flex items-center justify-center mx-auto mb-3 text-xl shadow-lg shadow-indigo-500/30">
                            <i class="fas fa-server"></i>
                        </div>
                        <h3 class="font-bold text-slate-800 dark:text-white">RCS Server</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Trung tâm điều phối</p>
                         <div class="mt-3 text-[10px] font-mono bg-white dark:bg-slate-800 py-1 px-2 rounded border border-slate-200 dark:border-slate-600 inline-block">
                            ASP.NET Core 8
                        </div>
                    </div>

                    <div class="flex flex-col items-center gap-1">
                        <span class="text-[10px] font-bold text-rose-500 uppercase tracking-widest">UDP Stream</span>
                        <div class="w-24 h-0.5 bg-gradient-to-r from-indigo-300 to-rose-300 relative">
                            <div class="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-rose-300 rotate-45"></div>
                             <div class="absolute left-0 -top-1 w-2 h-2 border-b-2 border-l-2 border-indigo-300 rotate-45"></div>
                        </div>
                        <span class="text-[10px] text-slate-400 mt-1">Video 60 FPS</span>
                    </div>

                    <div class="flex-1 text-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                        <div class="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mx-auto mb-3 text-xl">
                            <i class="fas fa-desktop"></i>
                        </div>
                        <h3 class="font-bold text-slate-800 dark:text-white">Target Agent</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Máy bị điều khiển</p>
                        <div class="mt-3 text-[10px] font-mono bg-white dark:bg-slate-800 py-1 px-2 rounded border border-slate-200 dark:border-slate-600 inline-block">
                            .NET 8 Worker
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDetailedGuideSection() {
    const guides = getGuideData(); // Gọi hàm lấy dữ liệu chi tiết ở dưới

    // Tạo HTML cho danh sách Accordion
    const accordionHTML = guides.map(item => `
        <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 transition-all duration-300 hover:shadow-md bg-white dark:bg-slate-800 group">
            
            <button onclick="window.toggleAboutItem('${item.id}')" class="w-full flex items-center justify-between p-4 text-left bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600 group-hover:scale-110 transition-transform duration-300">
                        <i class="fas ${item.icon} ${item.color} text-lg"></i>
                    </div>
                    
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">${item.title}</h3>
                        <p class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">${item.desc}</p>
                    </div>
                </div>
                
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-blue-500 transition-colors">
                    <i id="icon-${item.id}" class="fas fa-chevron-down text-xs transition-transform duration-300"></i>
                </div>
            </button>

            <div id="${item.id}" class="hidden">
                <div class="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                        ${item.content}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    return `
    <div class="space-y-5 animate-fade-in-up">
        <div class="flex items-center justify-between px-1">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                <i class="fas fa-book-reader mr-3 text-slate-400"></i>Hướng dẫn chi tiết
            </h2>
            <span class="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">v1.0.2</span>
        </div>
        <div class="grid grid-cols-1">
            ${accordionHTML}
        </div>
    </div>`;
}

// --- HÀM DATA RIÊNG BIỆT  ---
function getGuideData() {
    return [
        {
            id: 'guide-app',
            icon: 'fa-layer-group',
            color: 'text-blue-500',
            title: 'Quản lý Ứng dụng',
            desc: 'Quét phần mềm, khởi chạy từ xa và quản lý trạng thái hoạt động.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">1</span>
                            Tổng quan giao diện
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Hệ thống tự động quét <strong>Windows Registry</strong> (Uninstall Keys & App Paths) để liệt kê các phần mềm đã cài đặt. Trạng thái (Running/Stopped) được đối chiếu thời gian thực với danh sách Process.
                        </p>
                        
                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mb-2">
                            <img src="./assets/guides/app_overview.png" alt="Giao diện danh sách ứng dụng" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Danh sách ứng dụng hiển thị Tên, Đường dẫn và Trạng thái.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">2</span>
                            02 Cách khởi chạy ứng dụng
                        </h4>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600">
                                <h5 class="font-bold text-xs text-blue-600 mb-1">Cách 1: Từ danh sách</h5>
                                <p class="text-xs mb-2">Tìm ứng dụng trong bảng, nếu trạng thái là <span class="text-slate-500 font-mono">Stopped</span>, nhấn nút <strong>Mở</strong> màu xanh.</p>
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600">
                                <h5 class="font-bold text-xs text-blue-600 mb-1">Cách 2: Lệnh trực tiếp</h5>
                                <p class="text-xs mb-2">Sử dụng thanh công cụ phía trên để nhập tên lệnh (alias) hoặc đường dẫn file exe.</p>
                                <div class="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                                    chrome<br>notepad<br>C:\\MyTools\\tool.exe
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">3</span>
                            Dừng ứng dụng (Stop/Kill)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Khi ứng dụng đang chạy (<span class="text-green-600 font-bold text-xs"><i class="fas fa-check-circle"></i> Running</span>), nút hành động sẽ chuyển sang màu đỏ <strong>"Đóng"</strong>.
                        </p>
                        
                        <ul class="text-xs space-y-2 text-slate-500 dark:text-slate-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                            <li><i class="fas fa-angle-right mr-1"></i> Hệ thống sẽ thử gửi lệnh đóng nhẹ nhàng (CloseMainWindow).</li>
                            <li><i class="fas fa-angle-right mr-1"></i> Nếu ứng dụng bị treo, hệ thống sẽ tự động <strong>Kill Process</strong> sau 1 giây.</li>
                        </ul>
                    </div>

                    <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                        <img src="./assets/guides/app_status_change.png" alt="Trạng thái Running và nút Đóng" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                        <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                            Hình 2: Ứng dụng chuyển sang trạng thái Running sau khi được kích hoạt.
                        </div>
                    </div>
                </div>`
        },
        {
            id: 'guide-process',
            icon: 'fa-microchip',
            color: 'text-emerald-500',
            title: 'Tiến trình & Thông số',
            desc: 'Giám sát tài nguyên phần cứng và can thiệp sâu vào các tiến trình đang chạy.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">1</span>
                            Giám sát phần cứng (Hardware Stats)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Phía trên cùng là 3 thẻ thông tin hệ thống quan trọng. Chúng có hiệu ứng <strong>"Lật" (Flip interaction)</strong> để hiển thị thông số kỹ thuật chi tiết.
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-emerald-100 dark:border-emerald-900/30">
                                <h5 class="font-bold text-xs text-emerald-600 mb-1"><i class="fas fa-eye mr-1"></i> Mặt trước (Real-time)</h5>
                                <p class="text-[11px] text-slate-500">Hiển thị % sử dụng hiện tại (Usage Load) của CPU, RAM và Disk.</p>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-emerald-100 dark:border-emerald-900/30">
                                <h5 class="font-bold text-xs text-emerald-600 mb-1"><i class="fas fa-search mr-1"></i> Mặt sau (Specs)</h5>
                                <p class="text-[11px] text-slate-500">Click vào thẻ để xem tên chip (vd: Core i9), Bus RAM, hay dung lượng ổ cứng tổng.</p>
                            </div>
                        </div>

                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                            <img src="./assets/guides/process_cards.png" alt="Giao diện thẻ phần cứng" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Nhấn vào thẻ CPU/RAM để xem thông số phần cứng chi tiết.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">2</span>
                            Bảng quản lý tiến trình (Task Manager)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Danh sách hiển thị toàn bộ Process đang chạy. Dữ liệu CPU Usage được tính toán dựa trên thời gian thực (Delta Time) giữa các lần lấy mẫu.
                        </p>

                        <div class="flex items-start gap-3 bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600 mb-3">
                            <i class="fas fa-sort-amount-down text-emerald-500 mt-1"></i>
                            <div>
                                <span class="font-bold text-xs text-slate-700 dark:text-slate-200">Tính năng Sắp xếp (Sorting)</span>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Click vào tiêu đề cột <strong>CPU %</strong> hoặc <strong>RAM (MB)</strong> để tìm ra ứng dụng nào đang làm chậm máy tính.
                                </p>
                            </div>
                        </div>

                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mb-2">
                            <img src="./assets/guides/process_table.png" alt="Bảng danh sách process" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 2: Danh sách Process hỗ trợ sắp xếp và tìm kiếm theo PID/Tên.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">3</span>
                            Buộc dừng tác vụ (Kill Process)
                        </h4>
                        
                        <div class="flex gap-4 items-center mb-3">
                            <p class="text-sm text-slate-600 dark:text-slate-300 flex-1">
                                Nút <span class="text-red-500 font-bold text-xs border border-red-200 px-1 rounded">Kill</span> sẽ gửi lệnh kết thúc tiến trình ngay lập tức (Force Kill). Dùng khi ứng dụng bị treo (Not Responding).
                            </p>
                        </div>

                        <div class="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-3 rounded-r-lg">
                            <h5 class="text-xs font-bold text-red-700 dark:text-red-400 flex items-center">
                                <i class="fas fa-exclamation-triangle mr-1"></i> CẢNH BÁO MÀN HÌNH XANH (BSOD)
                            </h5>
                            <p class="text-xs text-red-600 dark:text-red-300/80 mt-1 leading-relaxed">
                                Tuyệt đối không Kill các tiến trình hệ thống quan trọng (System Critical Processes) như:
                                <code class="bg-red-100 dark:bg-red-900/50 px-1 rounded mx-0.5 text-red-700">svchost.exe</code>, 
                                <code class="bg-red-100 dark:bg-red-900/50 px-1 rounded mx-0.5 text-red-700">csrss.exe</code>, 
                                <code class="bg-red-100 dark:bg-red-900/50 px-1 rounded mx-0.5 text-red-700">winlogon.exe</code>,
                                <code class="bg-red-100 dark:bg-red-900/50 px-1 rounded mx-0.5 text-red-700">services.exe</code>.
                                <br>Việc này sẽ khiến hệ điều hành sập ngay lập tức.
                            </p>
                        </div>
                    </div>
                </div>`
        },
        {
            id: 'guide-screen',
            icon: 'fa-desktop',
            color: 'text-purple-500',
            title: 'Chụp Màn hình (Screenshot)',
            desc: 'Thu thập hình ảnh Desktop từ xa và lưu trữ bằng chứng.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs mr-2">1</span>
                            Quy trình xử lý ảnh (GDI+)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Khác với Livestream, tính năng này chụp ảnh tĩnh chất lượng cao (High-Res).
                        </p>
                        
                        <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600 text-xs space-y-2">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-camera text-slate-400"></i>
                                <span><strong>Bước 1:</strong> Agent dùng thư viện <code>System.Drawing.Common</code> để chụp toàn màn hình.</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fas fa-file-code text-slate-400"></i>
                                <span><strong>Bước 2:</strong> Ảnh được mã hóa thành chuỗi <code>Base64</code> khổng lồ để gửi qua Socket.</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fas fa-image text-slate-400"></i>
                                <span><strong>Bước 3:</strong> Trình duyệt nhận chuỗi và tái tạo lại thành file ảnh <code>.png</code>.</span>
                            </div>
                        </div>

                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mt-3">
                            <img src="./assets/guides/screen_capture.png" alt="Giao diện xem ảnh chụp màn hình" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Ảnh chụp được hiển thị vừa vặn trong khung nhìn (Responsive).
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs mr-2">2</span>
                            Lưu trữ & Tải xuống
                        </h4>
                        
                        <div class="flex items-center justify-between bg-green-50 dark:bg-green-900/10 p-3 rounded border border-green-100 dark:border-green-900/30">
                            <div>
                                <h5 class="font-bold text-xs text-green-700 dark:text-green-400">Nút "Lưu Ảnh"</h5>
                                <p class="text-[11px] text-green-600 dark:text-green-500/80">Chỉ xuất hiện sau khi ảnh đã tải xong hoàn toàn.</p>
                            </div>
                            <button class="bg-green-600 text-white text-xs px-3 py-1.5 rounded shadow-sm cursor-default">
                                <i class="fas fa-download mr-1"></i> Download
                            </button>
                        </div>
                        
                        <p class="text-[10px] text-slate-400 mt-2 italic">
                            * Mẹo: Ảnh tải về sẽ có tên file chứa dấu thời gian (Timestamp) giúp bạn dễ dàng quản lý lịch sử.
                        </p>
                    </div>
                </div>`
        },
        {
            id: 'guide-keylog',
            icon: 'fa-keyboard',
            color: 'text-amber-500',
            title: 'Keylogger (Nhật ký phím)',
            desc: 'Ghi lại phím bấm thời gian thực, hỗ trợ giải mã Telex và xuất báo cáo.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs mr-2">1</span>
                            Cơ chế Live Stream (Low-level Hook)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Hệ thống gửi từng phím bấm ngay khi Agent chạm tay vào bàn phím (độ trễ < 50ms).
                        </p>
                        
                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mb-2">
                            <img src="./assets/guides/keylog_main.png" alt="Giao diện Keylogger toàn cảnh" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Giao diện song song: Cột trái (Log thô) và Cột phải (Văn bản đọc được).
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs mr-2">2</span>
                            Xử lý dữ liệu đa luồng
                        </h4>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-slate-900 p-3 rounded border border-slate-700">
                                <h5 class="font-bold text-xs text-green-400 mb-2 font-mono"><i class="fas fa-terminal mr-1"></i> RAW DATA (Thô)</h5>
                                <p class="text-[11px] text-slate-400 mb-2 h-10">Hiển thị chính xác phím vật lý, bao gồm cả phím chức năng (Shift, Ctrl, Backspace).</p>
                                <div class="bg-black/50 p-2 rounded text-[10px] font-mono text-green-500 border border-slate-700">
                                    [SHIFT]H[SHIFT]ejj[SPACE]low
                                </div>
                            </div>

                            <div class="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600">
                                <h5 class="font-bold text-xs text-amber-600 dark:text-amber-400 mb-2 font-sans"><i class="fas fa-file-alt mr-1"></i> PROCESSED (Văn bản)</h5>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2 h-10">Logic JavaScript tại trình duyệt sẽ loại bỏ phím rác và ghép dấu.</p>
                                <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded text-[10px] font-sans text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                    Hello
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-xs mr-2">3</span>
                            Bộ gõ Tiếng Việt & Xuất file
                        </h4>

                        <div class="flex flex-col gap-3">
                            <div class="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded border border-amber-100 dark:border-amber-900/30">
                                <i class="fas fa-language text-amber-600 text-lg mt-1"></i>
                                <div>
                                    <span class="font-bold text-xs text-slate-700 dark:text-slate-200">Chế độ Telex thông minh</span>
                                    <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        Hãy bật switch <span class="font-bold bg-slate-200 dark:bg-slate-600 px-1 rounded text-[10px]">VN Tiếng Việt</span> trên thanh công cụ. Hệ thống sẽ tự động gộp: 
                                        <code>a</code> + <code>a</code> = <code>â</code>, <code>d</code> + <code>d</code> = <code>đ</code>, <code>s</code> = <code>dấu sắc</code>.
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center justify-between bg-white dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600">
                                <span class="text-xs font-bold text-slate-500 ml-2">Lưu trữ bằng chứng:</span>
                                <button class="text-xs bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 text-slate-600 dark:text-slate-200 px-3 py-1 rounded transition-colors cursor-default">
                                    <i class="fas fa-download mr-1"></i> Tải .txt
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                        <img src="./assets/guides/keylog_telex.png" alt="Minh họa gõ tiếng Việt" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                        <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                            Hình 2: Kết quả khi bật chế độ xử lý Tiếng Việt (Telex).
                        </div>
                    </div>

                </div>`
        },
        {
            id: 'guide-webcam',
            icon: 'fa-video',
            color: 'text-rose-500',
            title: 'Webcam Streaming',
            desc: 'Truyền tải Video thời gian thực qua giao thức lai UDP/SignalR.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-xs mr-2">1</span>
                            Kiến trúc Hybrid (UDP + TCP)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Để đạt được <strong>60 FPS</strong>, hệ thống không gửi ảnh nguyên vẹn mà chia nhỏ (Fragmentation) và gửi qua UDP.
                        </p>
                        
                        <div class="flex items-center gap-2 text-[10px] font-mono mb-2 overflow-x-auto">
                            <div class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 whitespace-nowrap">
                                <i class="fas fa-desktop text-rose-500"></i> Agent
                            </div>
                            <div class="flex-1 h-0.5 bg-rose-300 relative min-w-[30px]">
                                <span class="absolute -top-3 left-1/2 -translate-x-1/2 text-rose-500 font-bold">UDP</span>
                            </div>
                            <div class="bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded border border-indigo-300 dark:border-indigo-700 whitespace-nowrap">
                                <i class="fas fa-server text-indigo-500"></i> Server (Reassembly)
                            </div>
                            <div class="flex-1 h-0.5 bg-blue-300 relative min-w-[30px]">
                                <span class="absolute -top-3 left-1/2 -translate-x-1/2 text-blue-500 font-bold">TCP</span>
                            </div>
                            <div class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 whitespace-nowrap">
                                <i class="fas fa-laptop text-blue-500"></i> Client
                            </div>
                        </div>

                        <div class="bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 p-3 rounded-r-lg">
                            <h5 class="text-xs font-bold text-rose-700 dark:text-rose-400">
                                <i class="fas fa-network-wired mr-1"></i> YÊU CẦU MẠNG QUAN TRỌNG
                            </h5>
                            <p class="text-xs text-rose-600 dark:text-rose-300/80 mt-1">
                                Server bắt buộc phải mở <strong>Port 6000 (UDP)</strong>. Nếu Agent và Server khác mạng (qua Internet), bạn cần cấu hình <strong>Port Forwarding</strong> trên Router. Nếu không, màn hình sẽ chỉ có màu đen.
                            </p>
                        </div>
                    </div>

                    <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mb-2">
                        <img src="./assets/guides/webcam_view.png" alt="Giao diện Webcam Stream" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                        <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                            Hình 1: Streaming thời gian thực với độ trễ thấp (< 200ms).
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-xs mr-2">2</span>
                            Công cụ giám sát
                        </h4>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600">
                                <h5 class="font-bold text-xs text-rose-500 mb-1"><i class="fas fa-circle text-[10px] mr-1 animate-pulse"></i> Client-side Recording</h5>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                    Dữ liệu được ghi trực tiếp vào RAM trình duyệt. Khi nhấn "Dừng", trình duyệt sẽ đóng gói thành file <code>.webm</code> để tải về. Không tốn dung lượng Server.
                                </p>
                            </div>

                            <div class="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600">
                                <h5 class="font-bold text-xs text-blue-500 mb-1"><i class="fas fa-chart-line text-[10px] mr-1"></i> Performance Stats</h5>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                    Nhấn nút biểu đồ để bật Overlay. Giúp chẩn đoán mạng: Nếu FPS cao nhưng hình vỡ -> Mất gói UDP (Packet Loss).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg">
                        <h5 class="font-bold text-xs text-slate-600 dark:text-slate-300 mb-1">
                            <i class="fas fa-question-circle mr-1"></i> Tại sao hình ảnh thỉnh thoảng bị sọc/xám?
                        </h5>
                        <p class="text-xs text-slate-500 dark:text-slate-400 text-justify leading-relaxed">
                            Đây là đặc tính của giao thức <strong>UDP</strong> (User Datagram Protocol). UDP ưu tiên tốc độ hơn sự chính xác. Nếu mạng kém, một vài gói tin bị rơi (Dropped packets), Server sẽ không thể ghép đủ mảnh của 1 khung hình, dẫn đến hiện tượng Glitch. Chúng tôi chấp nhận điều này để đổi lấy tốc độ thời gian thực.
                        </p>
                    </div>

                    <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                        <img src="./assets/guides/webcam_stats.png" alt="Thông số kỹ thuật FPS/Bitrate" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                        <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                            Hình 2: Overlay hiển thị FPS (Khung hình/giây) và kích thước gói tin.
                        </div>
                    </div>

                </div>`
        },
        {
            id: 'guide-system',
            icon: 'fa-cogs',
            color: 'text-slate-600',
            title: 'Cấu hình Hệ thống',
            desc: 'Xem thông tin phần cứng chi tiết và các lệnh nguồn (Power).',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs mr-2">1</span>
                            Dashboard Phần cứng
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Khi truy cập tab này, Client sẽ tự động gửi lệnh <code>sys_specs</code> để lấy về "Hồ sơ sức khỏe" của máy trạm.
                        </p>

                        <div class="grid grid-cols-2 gap-2 text-[11px] font-mono mb-2">
                            <div class="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                                <span class="text-blue-500 font-bold">UPTIME:</span> Thời gian máy đã chạy liên tục.
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                                <span class="text-blue-500 font-bold">GPU:</span> Tên Card màn hình (hữu ích để biết máy có đang chơi game/đào coin không).
                            </div>
                        </div>

                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                            <img src="./assets/guides/system_specs.png" alt="Bảng thông số hệ thống" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Bảng Specification chi tiết bao gồm cả địa chỉ IP Public/Local.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs mr-2">2</span>
                            Điều khiển nguồn (Power Control)
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Các lệnh Shutdown/Restart có tác động lớn, nên giao diện được thiết kế dạng <strong>"Flip Button"</strong> và <strong>"Confirm Modal"</strong> để tránh bấm nhầm.
                        </p>

                        <div class="flex gap-4">
                            <div class="flex-1 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-800 text-center">
                                <i class="fas fa-power-off text-red-500 text-xl mb-1"></i>
                                <h5 class="font-bold text-xs text-red-700 dark:text-red-400">Shutdown</h5>
                                <p class="text-[10px] text-red-600/70">Lệnh: <code>shutdown /s /t 0</code></p>
                            </div>
                            <div class="flex-1 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100 dark:border-yellow-800 text-center">
                                <i class="fas fa-redo-alt text-yellow-500 text-xl mb-1"></i>
                                <h5 class="font-bold text-xs text-yellow-700 dark:text-yellow-400">Restart</h5>
                                <p class="text-[10px] text-yellow-600/70">Lệnh: <code>shutdown /r /t 0</code></p>
                            </div>
                        </div>

                        <div class="mt-3 bg-slate-100 dark:bg-slate-700 p-2 rounded text-[10px] text-slate-500 italic text-center">
                            <i class="fas fa-shield-alt mr-1"></i> Một hộp thoại xác nhận (Modal) sẽ luôn hiện ra trước khi lệnh được gửi đi.
                        </div>
                    </div>

                </div>`
        },
        {
            id: 'guide-terminal',
            icon: 'fa-terminal',
            color: 'text-slate-500',
            title: 'Terminal (CMD)',
            desc: 'Điều khiển dòng lệnh từ xa thông qua cơ chế Reverse Shell.',
            content: `
                <div class="space-y-6">
                    
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs mr-2">1</span>
                            Cơ chế Reverse Shell
                        </h4>
                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Agent khởi chạy một tiến trình <code>cmd.exe</code> ẩn (Hidden Process) và chuyển hướng luồng nhập/xuất (I/O Redirection) về trình duyệt của bạn qua Socket.
                        </p>
                        
                        <div class="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-2 rounded-r mb-2">
                            <p class="text-xs text-blue-700 dark:text-blue-300">
                                <i class="fas fa-check-circle mr-1"></i> <strong>Hỗ trợ Unicode (UTF-8):</strong> Không giống các RAT thông thường bị lỗi font, hệ thống này hiển thị tốt tiếng Việt có dấu trong CMD.
                            </p>
                        </div>

                        <div class="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden mb-2">
                            <img src="./assets/guides/terminal_demo.png" alt="Giao diện dòng lệnh CMD" class="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" onerror="this.style.display='none'">
                            <div class="bg-slate-50 dark:bg-slate-900 p-2 text-[10px] text-center text-slate-500 italic">
                                Hình 1: Giao diện dòng lệnh hỗ trợ màu sắc và phản hồi thời gian thực.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs mr-2">2</span>
                            Các lệnh quản trị phổ biến
                        </h4>
                        
                        <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-700 shadow-inner">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div class="text-green-400 font-bold mb-2 border-b border-slate-700 pb-1"># SYSTEM INFO</div>
                                    <ul class="space-y-2">
                                        <li><span class="text-yellow-400">systeminfo</span> : Xem chi tiết HDH/RAM</li>
                                        <li><span class="text-yellow-400">ipconfig /all</span> : Xem địa chỉ MAC/IP</li>
                                        <li><span class="text-yellow-400">whoami</span> : Xem User hiện tại</li>
                                        <li><span class="text-yellow-400">tasklist</span> : Liệt kê tiến trình</li>
                                    </ul>
                                </div>

                                <div>
                                    <div class="text-red-400 font-bold mb-2 border-b border-slate-700 pb-1"># ACTION</div>
                                    <ul class="space-y-2">
                                        <li><span class="text-yellow-400">shutdown /s /t 0</span> : Tắt máy ngay</li>
                                        <li><span class="text-yellow-400">shutdown /r /t 0</span> : Khởi động lại</li>
                                        <li><span class="text-yellow-400">net user</span> : Quản lý tài khoản</li>
                                        <li><span class="text-yellow-400">cd [path]</span> : Chuyển thư mục</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="mt-4 pt-3 border-t border-slate-700 text-[10px] text-slate-500 italic">
                                > Lưu ý: Một số lệnh yêu cầu quyền Administrator để thực thi.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs mr-2">3</span>
                            Xử lý sự cố (Troubleshooting)
                        </h4>
                        
                        <div class="flex items-start gap-3 bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600">
                            <div class="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-lg">
                                <i class="fas fa-sync-alt"></i>
                            </div>
                            <div>
                                <span class="font-bold text-xs text-slate-700 dark:text-slate-200">Nút Restart Session</span>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    CMD đôi khi bị treo nếu chạy một lệnh vòng lặp vô tận hoặc chờ input. Nhấn nút này để:
                                </p>
                                <ul class="list-disc pl-4 mt-1 text-[10px] text-slate-500 dark:text-slate-400 italic">
                                    <li>Kill tiến trình cmd.exe cũ.</li>
                                    <li>Xóa sạch lịch sử màn hình.</li>
                                    <li>Khởi tạo một phiên làm việc mới sạch sẽ.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>`
        },
        {
            id: 'guide-auto',
            icon: 'fa-robot',
            color: 'text-indigo-500',
            title: 'Tự động hóa & Chat',
            desc: 'Các kịch bản được lập trình sẵn và giao tiếp 2 chiều.',
            content: `
                <div class="space-y-4">
                    <div class="border-l-4 border-indigo-500 pl-4 py-1">
                        <h4 class="font-bold text-sm text-indigo-600 dark:text-indigo-400">Chat 2 Chiều</h4>
                        <p class="text-sm mt-1 text-slate-600 dark:text-slate-300">
                            Gửi tin nhắn popup lên màn hình nạn nhân. Nạn nhân có thể nhập câu trả lời và nó sẽ hiện lại trong khung chat của bạn.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
                            <h5 class="font-bold text-xs text-red-600 uppercase mb-1"><i class="fas fa-biohazard mr-1"></i> Panic Mode</h5>
                            <p class="text-xs text-slate-600 dark:text-slate-400">Kịch bản "Tự hủy": Phát âm thanh cảnh báo, tắt trình duyệt và hiện thông báo lỗi giả.</p>
                        </div>
                        <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-100 dark:border-purple-800">
                            <h5 class="font-bold text-xs text-purple-600 uppercase mb-1"><i class="fas fa-volume-up mr-1"></i> Text-to-Speech</h5>
                            <p class="text-xs text-slate-600 dark:text-slate-400">Nhập văn bản và máy nạn nhân sẽ tự động đọc to nội dung đó (sử dụng Microsoft Speech API).</p>
                        </div>
                    </div>
                </div>`
        }
    ];
}

// [File: public/Js/views.js]

function renderTeamSection() {
    return `
    <div class="border-t border-slate-200 dark:border-slate-800 pt-10 mt-16">

        <div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                <span class="w-1 h-4 bg-indigo-500 rounded-full mr-3"></span>
                Thành viên thực hiện
            </h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                <div class="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                            K
                        </div>
                        <div>
                            <h5 class="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Hà Đăng Khôi</h5>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono border border-slate-200 dark:border-slate-600">
                                    24120348
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                            K
                        </div>
                        <div>
                            <h5 class="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Vương Đắc Gia Khiêm</h5>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono border border-slate-200 dark:border-slate-600">
                                    24120342
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                            H
                        </div>
                        <div>
                            <h5 class="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Lê Đình Huy</h5>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono border border-slate-200 dark:border-slate-600">
                                    24120324
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;
}