export function renderSystemControls() {
    return `
        <div class="h-full flex flex-col gap-4 animate-fade-in-up">
            ${renderOSInfoCard()}
            ${renderHardwareGrid()}
            ${renderPowerActions()}
        </div>
    `;
}

export function renderOSInfoCard() {
    return `
        <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 shadow-lg text-white shrink-0">
            <div class="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div class="relative z-10 flex flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                        <i class="fab fa-windows text-2xl text-blue-400"></i>
                    </div>
                    <div class="text-left">
                        <h2 id="spec-os" class="text-lg font-bold tracking-tight leading-tight">System Analysis...</h2>
                        <p class="text-slate-400 text-xs font-mono">Target Machine</p>
                    </div>
                </div>
                <div class="text-right hidden sm:block">
                    <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5">Uptime</span>
                    <span id="spec-uptime" class="text-sm font-mono font-bold text-slate-200">--:--:--</span>
                </div>
            </div>
        </div>
    `;
}
