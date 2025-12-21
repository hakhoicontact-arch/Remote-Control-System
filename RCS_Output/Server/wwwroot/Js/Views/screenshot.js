export function renderScreenshotView() {
    return `
        <div class="h-full flex flex-col gap-6 animate-fade-in-up relative">
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 transition-colors">
                <div class="flex items-center gap-4 w-full md:w-auto">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-sm border border-indigo-100 dark:border-indigo-800">
                        <i class="fas fa-camera"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-white text-base">Chụp Màn Hình</h3>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Ready to capture</p>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto">
                    <button id="capture-screenshot-btn" class="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:scale-95 group">
                        <i class="fas fa-aperture group-hover:rotate-180 transition-transform duration-500"></i>
                        <span>Chụp Ngay</span>
                    </button>
                    <button id="save-screenshot-btn" class="hidden flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:scale-95 animate-fade-in">
                        <i class="fas fa-save"></i>
                        <span>Lưu Ảnh</span>
                    </button>
                </div>
            </div>
            ${renderScreenshotArea()}
            ${renderSaveScreenshotModal()}
        </div>
    `;
}

export function renderScreenshotArea() {
    return `
        <div id="screenshot-area" class="flex-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 relative overflow-hidden flex items-center justify-center group transition-colors p-4">
            <div id="screenshot-placeholder" class="text-center p-8 transition-all duration-300 group-hover:scale-105">
                <div class="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <i class="fas fa-image text-4xl text-slate-300 dark:text-slate-600"></i>
                </div>
                <h4 class="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">Chưa có dữ liệu hình ảnh</h4>
                <p class="text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Nhấn nút <span class="font-bold text-blue-500">"Chụp Ngay"</span> phía trên để yêu cầu Agent gửi về hình ảnh màn hình hiện tại.
                </p>
            </div>
            <div id="screenshot-loader" class="hidden absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center transition-all">
                <div class="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4 shadow-lg"></div>
                <p class="text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">Đang xử lý ảnh...</p>
            </div>
            <img id="screenshot-image" src="" alt="Screenshot" class="hidden max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-slate-200 dark:border-slate-600 transition-opacity duration-500">
            <div id="screenshot-info" class="hidden absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full font-mono shadow-lg border border-white/10">
                Captured at: <span id="screenshot-time" class="font-bold text-blue-400">--:--:--</span>
            </div>
        </div>
    `;
}

export function renderSaveScreenshotModal() {
    return `
        <div id="save-confirm-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 transform scale-100 transition-all">
                <div class="p-5">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Lưu Ảnh Chụp</h3>
                    <div class="flex gap-4 mb-5 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                        <img id="modal-thumb-img" src="" class="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-500 bg-black">
                        <div class="flex flex-col justify-center">
                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kích thước ảnh</span>
                            <span id="modal-img-dims" class="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">1920 x 1080 px</span>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Đặt tên file:</label>
                        <div class="relative">
                            <input type="text" id="modal-filename-input" class="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-medium" placeholder="screenshot_abc...">
                            <span class="absolute right-3 top-2.5 text-slate-400 text-xs font-bold pointer-events-none">.PNG</span>
                        </div>
                    </div>
                </div>
                <div class="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
                    <button id="modal-cancel-btn" class="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Hủy</button>
                    <button id="modal-download-btn" class="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2">
                        <i class="fas fa-download"></i> Tải Về
                    </button>
                </div>
            </div>
        </div>
    `;
}