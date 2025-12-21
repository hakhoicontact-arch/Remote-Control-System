export function renderWebcamControl() {
    return `
        <div class="h-full flex flex-col gap-6 animate-fade-in-up relative">
            ${renderWebcamHeader()}
            ${renderWebcamArea()}
            ${renderSaveVideoModal()}
        </div>
    `;
}

export function renderWebcamHeader() {
    return `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 transition-colors">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shadow-sm border border-rose-100 dark:border-rose-800">
                    <i class="fas fa-video"></i>
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-white text-base">Webcam Live</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span id="cam-status-dot" class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <p id="cam-status-text" class="text-xs text-slate-500 dark:text-slate-400 font-medium">Camera Offline</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div class="flex bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
                    <button id="webcam-on-btn" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-green-600 dark:hover:text-green-400 hover:shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-power-off"></i> Bật
                    </button>
                    <div class="w-px bg-slate-200 dark:bg-slate-600 my-1"></div>
                    <button id="webcam-off-btn" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-stop"></i> Tắt
                    </button>
                </div>

                <div class="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>

                <button id="toggle-stats-btn" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm" title="Thông số kỹ thuật">
                    <i class="fas fa-chart-bar"></i>
                </button>

                <button id="record-btn" class="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-sm transition-all shadow-sm group">
                    <div class="w-2.5 h-2.5 rounded-full bg-red-500 group-hover:scale-110 transition-transform"></div>
                    <span id="record-btn-text">Ghi hình</span>
                </button>
                <div id="recording-ui" class="hidden absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-lg border border-red-500/50 animate-pulse">
                    <div class="w-2 h-2 bg-white rounded-full"></div>
                    <span class="text-xs font-bold font-mono tracking-widest">REC</span>
                    <span id="record-timer" class="text-xs font-mono border-l border-white/20 pl-2 ml-1">00:00</span>
                </div>
            </div>
        </div>
    `;
}

export function renderWebcamArea() {
    return `
        <div id="webcam-area" class="flex-1 bg-black rounded-2xl border-4 border-slate-800 dark:border-slate-700 relative overflow-hidden flex items-center justify-center shadow-2xl group">
            <canvas id="hidden-recorder-canvas" style="display:none;"></canvas>
            <div id="webcam-stats-overlay" class="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg text-xs font-mono text-slate-300 hidden select-none pointer-events-none"></div>
            <div id="webcam-placeholder" class="text-gray-500 dark:text-slate-500 flex flex-col items-center z-0 w-full h-full relative">
                <div data-js="astro" class="astronaut">
                    <div class="head"></div><div class="arm arm-left"></div><div class="arm arm-right"></div><div class="body"><div class="panel"></div></div><div class="leg leg-left"></div><div class="leg leg-right"></div><div class="schoolbag"></div>
                </div>
                <div id="webcam-status-msg" class="absolute bottom-10 left-0 right-0 text-center z-30">
                    <p class="text-slate-400 text-sm font-medium bg-slate-900/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm border border-slate-700">
                        Waiting for connection...
                    </p>
                </div>
            </div>
            <img id="webcam-stream" src="" alt="Live Stream" class="w-full h-full object-contain absolute inset-0 z-10 hidden" />
        </div>
    `;
}

export function renderSaveVideoModal() {
    return `
        <div id="save-video-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-all duration-300">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 transform scale-100 transition-all overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <i class="fas fa-film text-rose-500"></i> Xem lại bản ghi
                    </h3>
                    <span id="video-size-info" class="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">0 MB</span>
                </div>
                <div class="aspect-video bg-black relative group">
                    <video id="playback-video" controls class="w-full h-full object-contain"></video>
                </div>
                <div class="p-6 space-y-4">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đặt tên file</label>
                        <div class="relative">
                            <input type="text" id="video-filename" class="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none dark:text-white font-medium transition-all" placeholder="video_recording...">
                            <span class="absolute right-4 top-3 text-slate-400 text-xs font-bold pointer-events-none">.WEBM</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 pt-2">
                        <button id="cancel-save-video" class="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex justify-center items-center gap-2">
                            <i class="fas fa-trash-alt"></i> Hủy & Xóa
                        </button>
                        <button id="confirm-save-video" class="py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2">
                            <i class="fas fa-download"></i> Tải Xuống
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}