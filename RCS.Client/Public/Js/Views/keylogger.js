export function renderKeyloggerDisplay() {
    return `
        <div class="h-full flex flex-col gap-6 animate-fade-in-up">
            ${renderKeylogHeader()}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                ${renderRawStreamView()}
                ${renderProcessedTextView()}
            </div>
        </div>
    `;
}

export function renderKeylogHeader() {
    return `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 transition-colors">
            <div class="flex items-center gap-4 w-full xl:w-auto">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm border border-amber-100 dark:border-amber-800">
                    <i class="fas fa-keyboard"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-white text-base">Keylogger Monitor</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span id="keylog-status-dot" class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <p id="keylogger-status" class="text-xs text-slate-500 dark:text-slate-400 font-medium">Monitoring inactive</p>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas fa-language text-slate-400 text-xs"></i>
                    </div>
                    <select id="keylog-mode" class="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer transition-all hover:border-amber-400">
                        <option value="english">EN - English (Standard)</option>
                        <option value="telex">VN - Tiếng Việt (Telex)</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i class="fas fa-chevron-down text-slate-400 text-[10px]"></i>
                    </div>
                </div>

                <div class="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                <div class="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
                    <button id="start-keylogger-btn" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-green-600 dark:hover:text-green-400 hover:shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-play"></i> <span class="hidden sm:inline">Start</span>
                    </button>
                    <div class="w-px bg-slate-200 dark:bg-slate-600 my-1"></div>
                    <button id="stop-keylogger-btn" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-stop"></i> <span class="hidden sm:inline">Stop</span>
                    </button>
                </div>

                <button id="clear-keylogger-btn" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 transition-all shadow-sm" title="Xóa dữ liệu">
                    <i class="fas fa-eraser"></i>
                </button>
                
                <button id="download-keylog-btn" class="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 dark:shadow-none transition-all active:scale-95">
                    <i class="fas fa-download"></i> <span>Xuất File</span>
                </button>
            </div>
        </div>
    `;
}

export function renderRawStreamView() {
    return `
        <div class="flex flex-col bg-[#0f172a] dark:bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative group">
            <div class="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
                <div class="flex items-center gap-2">
                    <i class="fas fa-terminal text-green-500 text-xs"></i>
                    <span class="text-xs font-bold text-slate-300 tracking-wider uppercase">Raw Input Stream</span>
                </div>
                <div class="flex gap-1.5">
                    <div class="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500"></div>
                    <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                    <div class="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500"></div>
                </div>
            </div>
            <textarea id="keylogger-log-raw" class="flex-1 w-full p-5 bg-transparent text-green-400 font-mono text-sm leading-relaxed resize-none outline-none custom-scrollbar selection:bg-green-500/30 selection:text-green-200" readonly placeholder="Dữ liệu nhập từ bàn phím"></textarea>
            <div class="absolute bottom-2 right-4 text-[10px] font-mono text-slate-600 select-none">Low-level Hook ID: 13</div>
        </div>
    `;
}

export function renderProcessedTextView() {
    return `
        <div class="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="bg-slate-50 dark:bg-slate-700 px-4 py-2 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><i class="fas fa-file-alt mr-2"></i>Processed Text</h3>
                <span class="text-[10px] text-blue-500 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded" id="mode-indicator">EN</span>
            </div>
            <textarea id="keylogger-log-processed" class="flex-grow w-full p-4 bg-transparent text-slate-800 dark:text-slate-200 font-sans text-l resize-none outline-none leading-relaxed" readonly placeholder="Văn bản đã xử lý sẽ hiện ở đây..."></textarea>
        </div>
    `;
}