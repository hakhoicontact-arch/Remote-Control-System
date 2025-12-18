import { getSortIcon } from '../utils.js';
import { state } from '../config.js';

export function renderProcessStatsHeader() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch h-40">
            <div class="flip-card-container h-full group" onclick="this.classList.toggle('flipped')">
                <div class="flip-card-inner h-full">
                    <div class="flip-card-front h-full">
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm h-full flex flex-col justify-between relative overflow-hidden">
                            <div class="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                            <div>
                                <div class="flex justify-between items-start z-10 relative">
                                    <p class="text-sm font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">CPU Usage</p>
                                    <i class="fas fa-microchip text-blue-300 dark:text-blue-500/50 text-2xl"></i>
                                </div>
                                <p id="total-cpu" class="text-2xl font-black text-slate-700 dark:text-white mt-2 z-10 relative">0%</p>
                                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full mt-4 overflow-hidden shadow-inner">
                                    <div id="bar-cpu" class="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] relative" style="width: 0%">
                                        <div class="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>
                            <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-auto">
                                <i class="fas fa-info-circle mr-1"></i>Chi tiết
                            </p>
                        </div>
                    </div>
                    <div class="flip-card-back h-full">
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm h-full flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-start">
                                    <p class="text-sm font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">CPU Info</p>
                                    <i class="fas fa-microchip text-blue-300 dark:text-blue-500/50 text-2xl"></i>
                                </div>
                                <p id="spec-cpu-name" class="font-bold text-slate-800 dark:text-white text-sm mt-3 leading-snug truncate" title="Loading...">Loading...</p>
                                <p id="spec-cpu-cores" class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">-</p>
                            </div>
                            <p class="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">
                                <i class="fas fa-undo mr-1"></i>Quay lại
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </div>
    `;
}

export function renderProcessLayout() {
    return `
        <div class="space-y-6">
            ${renderProcessStatsHeader()}
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <button id="list-processes-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all font-bold text-xs flex items-center">
                        <i class="fas fa-sync-alt mr-2"></i> Cập Nhật
                    </button>
                    <button id="start-process-btn" class="btn-primary bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all font-bold text-xs flex items-center">
                        <i class="fas fa-plus mr-2"></i> Mở Process
                    </button>
                    <div class="uiv-search-box ml-4">
                        <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"><path d="M790.588 1468.235c-373.722 0-677.647-303.924-677.647-677.647 0-373.722 303.925-677.647 677.647-677.647 373.723 0 677.647 303.925 677.647 677.647 0 373.723-303.924 677.647-677.647 677.647Zm596.781-160.715c120.396-138.692 193.807-319.285 193.807-516.932C1581.176 354.748 1226.428 0 790.588 0S0 354.748 0 790.588s354.748 790.588 790.588 790.588c197.647 0 378.24-73.411 516.932-193.807l516.028 516.142 79.963-79.963-516.142-516.028Z" fill-rule="evenodd"></path></svg>
                        <input id="process-search" type="text" placeholder="Tìm PID hoặc Tên" class="uiv-search-input uiv-anim-width dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:border-slate-600">
                    </div>
                </div>
            </div>
            <div class="table-container bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar">
                <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                    <thead class="bg-slate-50/90 dark:bg-slate-700/90 sticky top-0 select-none z-10 backdrop-blur-md">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" onclick="window.handleSortProcess('pid')">
                                <div class="flex items-center gap-2">PID ${getSortIcon('pid', state.currentSort)}</div>
                            </th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" onclick="window.handleSortProcess('name')">
                                <div class="flex items-center gap-2">Tên Process ${getSortIcon('name', state.currentSort)}</div>
                            </th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-center">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700/50">
                         <tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function updateProcessTable(processes) {
    const tbody = document.getElementById('process-list-body');
    const TOTAL_SYSTEM_RAM_MB = 16384;
    // Logic tính toán summary giữ nguyên...
    // [CODE LOGIC TÍNH TOÁN CỦA BẠN]
    
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