export function renderProcessLayout() {
    return `
        <div class="space-y-6">
            <!-- 1. HEADER THỐNG KÊ (DASHBOARD STYLE) -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <!-- CPU Card -->
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm">
                    <p class="text-xs text-blue-500 font-bold uppercase tracking-wider">CPU Usage</p>
                    <p id="total-cpu" class="text-xl font-mono font-bold text-slate-700 mt-1">0%</p>
                    <div class="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div id="bar-cpu" class="bg-blue-500 h-full rounded-full" style="width: 0%"></div>
                    </div>
                    <!-- Dòng chú thích mới -->
                    <p class="text-[10px] text-slate-400 mt-1">Tổng sử dụng</p>
                </div>

                <!-- RAM Card -->
                <div class="bg-purple-50 p-3 rounded-xl border border-purple-100 shadow-sm">
                    <p class="text-xs text-purple-500 font-bold uppercase tracking-wider">Memory</p>
                    <p id="total-mem" class="text-xl font-mono font-bold text-slate-700 mt-1">0 MB</p>
                    <div class="w-full bg-purple-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div id="bar-mem" class="bg-purple-500 h-full rounded-full" style="width: 40%"></div>
                    </div>
                    <!-- Dòng chú thích mới -->
                    <p class="text-[10px] text-slate-400 mt-1">Tổng sử dụng</p>
                </div>

                <!-- Disk Card (Mới) -->
                <div class="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm relative">
                    <p class="text-xs text-orange-500 font-bold uppercase tracking-wider">Disk I/O</p>
                    <p id="total-disk" class="text-xl font-mono font-bold text-slate-700 mt-1">0 KB/s</p>
                    <!-- Dòng chú thích mới -->
                    <p class="text-[10px] text-slate-400 mt-1">Tổng lưu lượng</p>
                    <i class="fas fa-hdd absolute top-4 right-4 text-orange-200 text-2xl opacity-50"></i>
                </div>

                <!-- Processes Count -->
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Processes</p>
                    <p id="total-count" class="text-xl font-mono font-bold text-slate-700 mt-1">0</p>
                    <!-- Dòng chú thích mới -->
                    <p class="text-[10px] text-slate-400 mt-1">Đang hoạt động</p>
                </div>

                <!-- Threads/Handles (Gộp) -->
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm hidden md:block">
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">System</p>
                    <div class="flex justify-between items-end mt-1">
                        <span class="text-xs text-slate-400">Threads</span>
                        <span id="total-threads" class="font-bold text-slate-700">0</span>
                    </div>
                    <div class="flex justify-between items-end">
                        <span class="text-xs text-slate-400">Handles</span>
                        <span id="total-handles" class="font-bold text-slate-700">0</span>
                    </div>
                </div>
            </div>
            
            <!-- 2. TOOLBAR -->
            <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                <div class="flex items-center space-x-2 w-full max-w-md">
                    <div class="relative flex-grow">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <i class="fas fa-search"></i>
                        </span>
                        <input id="process-search" type="text" placeholder="Filter processes..." class="w-full py-2 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button id="list-processes-btn" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button id="start-process-btn" class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Run New Task">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </div>
            </div>

            <!-- 3. TABLE -->
            <div class="table-container bg-white rounded-xl shadow-sm border border-slate-200">
                <table class="min-w-full divide-y divide-slate-100">
                    <thead class="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onclick="handleSortProcess('name')">Name</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onclick="handleSortProcess('pid')">PID</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onclick="handleSortProcess('cpu')">CPU</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onclick="handleSortProcess('mem')">Memory</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onclick="handleSortProcess('disk')">Disk (I/O)</th>
                            <th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white divide-y divide-slate-50 text-sm">
                        <!-- Data rows -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function updateProcessTable(processes) {
    const tbody = document.getElementById('process-list-body');
    
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

    // Cập nhật DOM Header
    const elCpu = document.getElementById('total-cpu');
    const elMem = document.getElementById('total-mem');
    const elDisk = document.getElementById('total-disk');
    const elCount = document.getElementById('total-count');
    const elThreads = document.getElementById('total-threads');
    const elHandles = document.getElementById('total-handles');
    const barCpu = document.getElementById('bar-cpu');

    if (elCpu) {
        elCpu.textContent = `${totalCpu.toFixed(1)}%`;
        if (barCpu) barCpu.style.width = `${Math.min(totalCpu, 100)}%`;
    }
    if (elMem) elMem.textContent = `${totalMem.toFixed(0)} MB`;
    
    if (elDisk) {
        if (totalDiskKB > 1024) elDisk.textContent = `${(totalDiskKB/1024).toFixed(1)} MB/s`;
        else elDisk.textContent = `${totalDiskKB.toFixed(0)} KB/s`;
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
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="px-4 py-3">
                <div class="flex flex-col">
                    <span class="font-medium text-slate-900 truncate max-w-[150px]" title="${p.name}">${p.name}</span>
                    <span class="text-[10px] text-slate-400 truncate max-w-[200px] hidden md:block" title="${p.description}">${p.description || '-'}</span>
                </div>
            </td>
            <td class="px-4 py-3 font-mono text-slate-500 text-xs">${p.pid}</td>
            
            <td class="px-4 py-3 text-right font-medium ${parseFloat(p.cpu)>50 ? 'text-red-600' : 'text-slate-700'}">${p.cpu}</td>
            <td class="px-4 py-3 text-right font-medium text-purple-600">${p.mem}</td>
            
            <!-- CỘT DISK MỚI -->
            <td class="px-4 py-3 text-right font-medium text-orange-600">${p.disk || '0 KB/s'}</td>
            
            <td class="px-4 py-3 text-center">
                <button data-action="kill-process" data-id="${p.pid}" class="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50" title="Kill Process">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
