export function renderTerminalLayout() {
    return `
        <div class="h-full flex flex-col space-y-4">
            <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-900 text-green-500 p-2 rounded-lg font-mono text-xs shadow-inner border border-slate-700">&gt;_</div>
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

            <div class="flex-1 bg-[#0c0c0c] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative">
                <div id="terminal-output" class="flex-1 overflow-y-auto p-4 space-y-1 text-slate-300 custom-scrollbar select-text font-medium leading-relaxed">
                    <div class="text-green-500 mb-2">Initialize connection... Ready.</div>
                </div>
                <div class="bg-[#1a1a1a] p-3 flex items-center border-t border-slate-700 shrink-0">
                    <span class="text-green-500 mr-2 font-bold animate-pulse">&gt;</span>
                    <input id="terminal-input" type="text" class="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 font-mono" placeholder="Type command here..." autocomplete="off" autofocus>
                </div>
            </div>
        </div>
    `;
}