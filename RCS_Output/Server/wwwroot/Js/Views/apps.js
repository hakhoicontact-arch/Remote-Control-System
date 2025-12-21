import { getSortIcon, getEmptyRow, getLoadingRow } from '../utils.js';
import { state } from '../config.js';

export function renderAppStatCards() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150"></div>
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng ứng dụng</p>
                    <h3 id="stat-app-total" class="text-2xl font-black text-slate-800 dark:text-white mt-1">0</h3>
                </div>
                <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shadow-sm">
                    <i class="fas fa-layer-group"></i>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150"></div>
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang chạy</p>
                    <h3 id="stat-app-running" class="text-2xl font-black text-slate-800 dark:text-white mt-1">0</h3>
                </div>
                <div class="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-lg shadow-sm">
                    <i class="fas fa-bolt"></i>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150"></div>
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã dừng</p>
                    <h3 id="stat-app-stopped" class="text-2xl font-black text-slate-800 dark:text-white mt-1">0</h3>
                </div>
                <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center text-lg shadow-sm">
                    <i class="fas fa-power-off"></i>
                </div>
            </div>
        </div>
    `;
}

export function renderAppLayout() {
    return `
        <div class="h-full w-full flex flex-col space-y-5">
            ${renderAppStatCards()}
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                <div class="flex-1 flex gap-2">
                    <div class="uiv-search-box flex-1 max-w-md h-10">
                         <svg class="fill-slate-400 dark:fill-slate-500" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"><path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path></svg>
                        <input id="app-search" type="text" placeholder="Tìm kiếm ứng dụng..." class="w-full h-full pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white dark:placeholder-slate-500">
                    </div>
                    <button id="list-apps-btn" class="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl transition-colors border border-slate-200 dark:border-slate-600" title="Làm mới">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                    <div class="relative">
                        <input id="app-search-name" type="text" placeholder="Nhập tên / đường dẫn" class="h-10 pl-3 pr-3 w-48 focus:w-64 transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none dark:text-white text-slate-700">
                    </div>
                    <button id="start-app-btn" class="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 active:scale-95">
                        <i class="fas fa-rocket"></i> <span class="hidden sm:inline">Chạy Lệnh</span>
                    </button>
                </div>
            </div>
            <div class="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative">
                <div class="overflow-y-auto flex-1 custom-scrollbar w-full">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/90 dark:bg-slate-700/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                            <tr>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" onclick="window.handleSortApp('name')">
                                    <div class="flex items-center gap-2">
                                        Tên Ứng Dụng ${getSortIcon('name', state.currentAppSort)}
                                    </div>
                                </th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Đường Dẫn Hệ Thống</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-center">Trạng Thái</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-right">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody id="app-list-body" class="divide-y divide-slate-100 dark:divide-slate-700/50">
                            ${getLoadingRow(4)}
                        </tbody>
                    </table>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900 px-6 py-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 flex justify-between items-center">
                    <span>* Dữ liệu được cập nhật từ Registry & Process List</span>
                    <span id="app-footer-count">0 items</span>
                </div>
            </div>
        </div>
    `;
}

export function updateAppTable(apps) {
    const tbody = document.getElementById('app-list-body');
    const footerCount = document.getElementById('app-footer-count');
    const statTotal = document.getElementById('stat-app-total');
    const statRunning = document.getElementById('stat-app-running');
    const statStopped = document.getElementById('stat-app-stopped');

    if (!tbody) return;
    if (!apps || apps.length === 0) { 
        tbody.innerHTML = getEmptyRow(4); 
        if(statTotal) statTotal.textContent = '0';
        return; 
    }

    const total = apps.length;
    const running = apps.filter(a => a.status === 'Running').length;
    const stopped = total - running;

    if (statTotal) statTotal.textContent = total;
    if (statRunning) statRunning.textContent = running;
    if (statStopped) statStopped.textContent = stopped;
    if (footerCount) footerCount.textContent = `${total} ứng dụng được tìm thấy`;

    tbody.innerHTML = apps.map(app => {
        const isRunning = app.status === 'Running';
        const statusBadge = isRunning 
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                 <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span> Running
               </span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                 <span class="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span> Stopped
               </span>`;

        const btnClass = isRunning 
            ? 'bg-red-50 text-red-600 shadow-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:shadow-none dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30' 
            : 'bg-green-50 text-green-600 shadow-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:shadow-none dark:hover:bg-green-900/40 border border-green-100 dark:border-green-900/30';

        const btnIcon = isRunning ? 'fa-stop-circle' : 'fa-play-circle';
        const btnText = isRunning ? 'Đóng' : 'Mở';
        const btnAction = isRunning ? 'stop-app' : 'start-app';
        const targetId = app.path ? app.path : app.name;
        const firstLetter = (app.name || '?').charAt(0).toUpperCase();
        const iconColor = isRunning ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-200 dark:bg-slate-700';
        const textColor = isRunning ? 'text-white' : 'text-slate-500 dark:text-slate-400';

        return `
        <tr class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-200">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-xl ${iconColor} ${textColor} flex items-center justify-center font-bold text-lg shadow-sm mr-4 shrink-0 transition-transform group-hover:scale-110">
                        ${firstLetter}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            ${app.name || 'Unknown Application'}
                        </div>
                        <div class="text-[10px] text-slate-400 dark:text-slate-500">Application</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center max-w-xs md:max-w-sm xl:max-w-md group/path cursor-help">
                    <i class="fas fa-folder text-slate-300 dark:text-slate-600 mr-2 group-hover/path:text-yellow-500 transition-colors"></i>
                    <span class="text-xs font-mono text-slate-500 dark:text-slate-400 truncate" title="${app.path}">
                        ${app.path || 'N/A'}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <button data-action="${btnAction}" data-id="${targetId}" class="${btnClass} px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 ml-auto w-24 font-semibold text-sm">
                    <i class="fas ${btnIcon}"></i> ${btnText}
                </button>
            </td>
        </tr>`;
    }).join('');
}