// --- CÁC HẰNG SỐ VÀ KHỞI TẠO CHUNG ---
// const connectionUrl = "[http://192.168.1.10:5000/clienthub](http://192.168.1.10:5000/clienthub)"; 
const connectionUrl = "http://localhost:5000/clienthub"; 
let connection = null;
let currentView = 'applications';
let agentId = 'Agent_12345'; 
let currentUser = ''; // Lưu user hiện tại

document.getElementById('agent-id-display').textContent = agentId;

let globalProcessData = []; 
let currentSort = { column: 'pid', direction: 'asc' }; 

//  Biến cho Sort Ứng Dụng
let globalAppData = [];
let currentAppSort = { column: 'name', direction: 'asc' };

// --- BIẾN MỚI CHO STATS VÀ FPS ---
let isStatsVisible = false;
let lastFrameTime = performance.now();
let currentFPS = 0;
let currentPing = 0; // Ping sẽ được mô phỏng/ước tính (vì SignalR không có ping trực tiếp)
let framesReceived = 0;
let lastSampleTime = performance.now();
const SAMPLE_INTERVAL_MS = 500; // Cập nhật FPS/Rate mỗi 500ms (0.5 giây)
let currentFrameSize = 0; // Kích thước frame gần nhất (bytes)
let totalDataReceived = 0; // Tổng dữ liệu nhận được (bytes)
let totalTimeElapsed = 0; // Tổng thời gian đã trôi qua (ms)
let lastFPSUpdateTime = performance.now(); // Thời gian cập nhật FPS/Rate gần nhất

// --- HÀM SIGNALR CORE ---
function startSignalR(username, password) {
    return new Promise((resolve, reject) => {
        const finalUrl = `${connectionUrl}?username=${encodeURIComponent(username)}&access_token=${encodeURIComponent(password)}`;

        connection = new signalR.HubConnectionBuilder()
            .withUrl(finalUrl)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveResponse", handleResponse);
        connection.on("ReceiveUpdate", handleRealtimeUpdate);
        connection.on("ReceiveBinaryChunk", handleBinaryStream);

        connection.onclose((error) => {
            const isDashboardVisible = !document.getElementById('app').classList.contains('hidden');
            if (isDashboardVisible) {
                updateStatus("Mất kết nối. Vui lòng đăng nhập lại.", 'error');
                setTimeout(doLogout, 2000);
            }
        });

        connection.start().then(() => resolve()).catch(err => reject(err));
    });
}

// --- LOGIC ĐĂNG NHẬP / ĐĂNG XUẤT ---
function doLogin(username, password) {
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    btnText.textContent = "Đang xác thực...";
    btnLoader.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    loginBtn.disabled = true;

    startSignalR(username, password)
        .then(() => {
            currentUser = username;
            document.getElementById('user-display').textContent = `Hi, ${username}`;
            updateStatus("Đã kết nối an toàn", "success");
            
            const loginScreen = document.getElementById('login-screen');
            const appScreen = document.getElementById('app');

            loginScreen.classList.add('opacity-0');
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                setTimeout(() => {
                    appScreen.classList.remove('opacity-0');
                    refreshCurrentViewData();
                }, 50);
            }, 500);
        })
        .catch((err) => {
            console.warn("Đăng nhập thất bại:", err);
            btnText.textContent = "Đăng Nhập";
            btnLoader.classList.add('hidden');
            loginBtn.disabled = false;
            errorMsg.classList.remove('hidden');
        });
}

function doLogout() {
    if (connection) connection.stop();
    location.reload(); 
}

// --- HÀM GỬI LỆNH ---
async function sendCommand(action, params = {}) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        try {
            await connection.invoke("SendToAgent", agentId, { action, params });
        } catch (err) {
            console.error("Lỗi gửi lệnh:", err);
        }
    }
}

function refreshCurrentViewData() {
    if (currentView === 'applications') sendCommand('app_list');
    if (currentView === 'processes') sendCommand('process_list');
}

// --- XỬ LÝ PHẢN HỒI ---
function handleResponse(data) {
    if (!data) return;

    if (currentView === 'applications' && Array.isArray(data.response)) {
        globalAppData = data.response;
        updateAppTable(data.response);
    } 
    else if (currentView === 'processes' && Array.isArray(data.response)) {
        globalProcessData = data.response;
        updateProcessTable(); 
    }
    // SỬA: Xử lý sự kiện "stopped" của Webcam
    else if (data.response === 'stopped') { 
        if(currentView === 'keylogger') document.getElementById('keylogger-status').textContent = "Trạng thái: Đã dừng.";
        if(currentView === 'applications') sendCommand('app_list'); 
        if(currentView === 'applications') {
            setTimeout(() => sendCommand('app_list'), 200); 
        }
        
        // QUAN TRỌNG: Dọn dẹp khung hình Webcam khi nhận lệnh dừng
        if(currentView === 'webcam') {
            const videoElement = document.getElementById('webcam-stream');
            const placeholder = document.getElementById('webcam-placeholder');
            const stats = document.getElementById('webcam-stats-overlay');
            
            if(videoElement) {
                videoElement.style.display = 'none'; // Ẩn thẻ video
                videoElement.src = ""; // Xóa dữ liệu ảnh cũ để không hiện lại frame cuối
            }
            if(placeholder) {
                placeholder.style.display = 'flex'; // Hiện lại placeholder (text 'Camera Off')
                placeholder.innerHTML = '<i class="fas fa-video-slash fa-2x mb-2 text-slate-400"></i><br>Webcam đang tắt';
            }
            if (stats) stats.style.display = 'none';
            currentFPS = 0; // Reset FPS
        }
    }
    else if (data.response === 'started') {
        // QUAN TRỌNG: Khi nhận tin 'started' (đã mở app), tải lại danh sách
        if(currentView === 'applications') {
            setTimeout(() => sendCommand('app_list'), 500); // Delay 0.5s để app kịp hiện lên trong list process
        }
        if(currentView === 'processes') sendCommand('process_list');
    }
    else if (data.response === 'killed' && currentView === 'processes') sendCommand('process_list');
    else if (data.response === 'done' || data.response === 'ok') showModal("Thông báo", "Thao tác thành công.", null, true);
}

function handleRealtimeUpdate(data) {
    if (currentView === 'keylogger' && data.event === 'key_pressed') {
        const logArea = document.getElementById('keylogger-log');
        if (logArea) {
            logArea.value += data.data;
            logArea.scrollTop = logArea.scrollHeight;
        }
    }
}


function toggleStats() {
    isStatsVisible = !isStatsVisible;
    const statsOverlay = document.getElementById('webcam-stats-overlay');
    const statsButton = document.getElementById('toggle-stats-btn');
    
    if (statsOverlay) {
        statsOverlay.style.display = isStatsVisible ? 'block' : 'none';
    }
    if (statsButton) {
        statsButton.classList.toggle('bg-blue-600', isStatsVisible);
        statsButton.classList.toggle('text-white', isStatsVisible);
    }
}

function handleBinaryStream(data, frameSize = 0, senderTicks = 0) {
    const view = currentView;
    // Dùng Date.now() để tính Ping (thời gian thực)
    const nowRealTime = Date.now(); 
    // Dùng performance.now() để tính FPS (độ mượt)
    const nowPerf = performance.now();

    if (view === 'screenshot' && screenshotPending && data.startsWith("data:")) {
        const img = document.getElementById('screenshot-image');
        img.src = data;
        img.style.display = 'block';
        document.getElementById('screenshot-placeholder').style.display = 'none';
        document.getElementById('save-screenshot-btn').classList.remove('hidden');
        screenshotPending = false;
        updateStatus("Đã nhận ảnh.", 'success');
    }
    if (view === 'webcam' && data.startsWith("data:image")) {
        const now = performance.now();
        const elapsedSinceLastFrame = now - lastFrameTime;

        // Công thức chuyển C# Ticks sang Javascript Time chuẩn xác hơn:
        // C# Ticks bắt đầu từ năm 0001, JS từ năm 1970. 
        // Số 621355968000000000 là khoảng cách giữa 2 mốc này.
        const ticksToMicrotime = (senderTicks - 621355968000000000) / 10000;

        // --- 1. TÍNH PING (ĐỘ TRỄ) ---
        // Chuyển ticks về DateTime, tính chênh lệch với thời gian hiện tại
        const sentTime = (new Date(senderTicks / 10000 + Date.UTC(0, 0, 1))).getTime();currentPing = Math.max(0, nowRealTime - ticksToMicrotime);

        // --- 2. TÍNH FPS VÀ BITRATE TRUNG BÌNH ---
        
        framesReceived++;
        totalDataReceived += frameSize;
        currentFrameSize = frameSize;
        
        if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
            totalTimeElapsed = now - lastSampleTime;
            
            // FPS trung bình trong 500ms vừa qua
            currentFPS = framesReceived / (totalTimeElapsed / 1000);
            
            // Cập nhật Overlay
            updateWebcamStats(); 

            // Reset bộ đếm
            framesReceived = 0;
            lastSampleTime = now;
        }

        lastFrameTime = now;
        
        // Cập nhật Overlay
        updateWebcamStats();

        const video = document.getElementById('webcam-stream');
        const placeholder = document.getElementById('webcam-placeholder');
        
        if (video && data.length > 100) { 
            // Chỉ hiện video khi có dữ liệu mới
            if (placeholder) placeholder.style.display = 'none';
            video.style.display = 'block';
            video.src = data;
        }
    }
}

function updateWebcamStats() {
    const overlay = document.getElementById('webcam-stats-overlay');
    if (!overlay) return;
    
    // Stats for Nerds: Hiển thị chi tiết
    if (isStatsVisible) {
        const resolution = '1280x720'; // Lấy từ cấu hình Agent
        const bitrateKBps = (currentFrameSize / 1024) * currentFPS; // Ước tính Bitrate (KB/s, 85 là chất lượng nén)

        overlay.innerHTML = `
            <div class="text-sm font-mono text-white/90 p-2 space-y-0.5">
                <p>FPS: <span class="font-bold text-green-400">${currentFPS.toFixed(1)}</span></p>
                <p>Ping: <span class="font-bold text-yellow-400">${currentPing.toFixed(0)} ms</span></p>
                <p>Res: <span class="font-bold text-cyan-400">${resolution}</span></p>
                <p>Rate: <span class="font-bold text-purple-400">${bitrateKBps.toFixed(1)} KB/s</span></p>
                <p>Size: <span class="font-bold text-slate-300">${(currentFrameSize / 1024).toFixed(1)} KB</span></p>
            </div>
        `;
    } else {
        // Chế độ đơn giản: Chỉ hiện chữ LIVE
        overlay.innerHTML = `
            <p class="text-white bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">LIVE</p>
        `;
    }
    overlay.style.display = 'block'; // Đảm bảo nó hiện
}

// --- UI HELPER FUNCTIONS ---
function updateStatus(msg, type) {
    const el = document.getElementById('status-display');
    const dot = document.getElementById('status-dot');
    el.textContent = msg;
    if (type === 'success') {
        el.className = "text-xs font-semibold text-green-600 uppercase";
        dot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
    } else {
        el.className = "text-xs font-semibold text-red-600 uppercase";
        dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
    }
}

function sortProcessTable(column) {
    if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else {
        currentSort.column = column;
        currentSort.direction = column === 'name' ? 'asc' : 'desc'; 
    }
    updateProcessTable();
}

function getSortIcon(column) {
    const active = currentSort.column === column;
    const iconName = active ? (currentSort.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up') : 'fa-caret-right';
    const style = active ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-400 bg-gray-50 border-gray-200';
    return `<span class="ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border ${style} cursor-pointer"><i class="fas ${iconName} text-xs"></i></span>`;
}

function updateSortIcons() {
    ['pid', 'name', 'cpu', 'mem'].forEach(col => {
        const span = document.querySelector(`th[onclick="sortProcessTable('${col}')"] span`);
        if(span) span.outerHTML = getSortIcon(col);
    });
}

function renderAppLayout() {
    return `<div class="space-y-4"><div class="flex items-center space-x-3"><button id="list-apps-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg">Làm Mới</button><input id="app-start-name" type="text" placeholder="Tên ứng dụng..." class="p-2 border rounded-lg"><button id="start-app-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg">Mở</button></div><div class="table-container bg-gray-50 rounded-lg"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-200 sticky top-0"><tr><th class="px-6 py-3 text-left text-xs font-bold uppercase">Tên</th><th class="px-6 py-3 text-left text-xs font-bold uppercase">Đường Dẫn</th><th class="px-6 py-3 text-center text-xs font-bold uppercase">Thao Tác</th></tr></thead><tbody id="app-list-body" class="bg-white divide-y divide-gray-200"></tbody></table></div></div>`;
}

function updateAppTable(apps) {
    const tbody = document.getElementById('app-list-body');
    if(!apps.length) { tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>'; return; }
    
    tbody.innerHTML = apps.map(a => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${a.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-xs" title="${a.path}">${a.path}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                ${a.status === 'Running' 
                    ? `<button data-action="stop-app" data-id="${a.name}" class="bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 transition-colors"><i class="fas fa-stop-circle"></i> Đóng</button>`
                    : `<button data-action="start-app" data-id="${a.path}" class="bg-green-50 text-green-600 px-3 py-1 rounded hover:bg-green-100 transition-colors"><i class="fas fa-play-circle"></i> Mở</button>`
                }
            </td>
        </tr>
    `).join('');
}

function renderProcessLayout() {
    return `<div class="space-y-4"><div class="flex justify-between"><button id="list-proc-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg">Cập Nhật</button><div class="text-sm font-mono"><span id="total-cpu" class="mr-4 text-blue-600">CPU: 0%</span><span id="total-mem" class="text-purple-600">RAM: 0 MB</span></div></div><div class="table-container bg-gray-50 rounded-lg"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-200 sticky top-0 select-none"><tr><th class="px-6 py-3 cursor-pointer" onclick="sortProcessTable('pid')">PID ${getSortIcon('pid')}</th><th class="px-6 py-3 cursor-pointer" onclick="sortProcessTable('name')">Tên ${getSortIcon('name')}</th><th class="px-6 py-3 cursor-pointer" onclick="sortProcessTable('cpu')">CPU ${getSortIcon('cpu')}</th><th class="px-6 py-3 cursor-pointer" onclick="sortProcessTable('mem')">RAM ${getSortIcon('mem')}</th><th class="px-6 py-3 text-center">Thao Tác</th></tr></thead><tbody id="process-list-body" class="bg-white divide-y divide-gray-200"></tbody></table></div></div>`;
}

function updateProcessTable() {
    const tbody = document.getElementById('process-list-body');
    let totalCpu = 0, totalMem = 0;
    globalProcessData.forEach(p => {
        totalCpu += parseFloat(p.cpu) || 0;
        totalMem += parseFloat(p.mem) || 0;
    });
    document.getElementById('total-cpu').textContent = `CPU: ${totalCpu.toFixed(1)}%`;
    document.getElementById('total-mem').textContent = `RAM: ${totalMem.toFixed(0)} MB`;

    const sorted = [...globalProcessData].sort((a,b) => {
        let valA, valB;
        if(currentSort.column === 'pid') { valA = a.pid; valB = b.pid; }
        else if(currentSort.column === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
        else if(currentSort.column === 'cpu') { valA = parseFloat(a.cpu); valB = parseFloat(b.cpu); }
        else { valA = parseFloat(a.mem); valB = parseFloat(b.mem); }
        return currentSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    tbody.innerHTML = sorted.map(p => `<tr><td class="px-6 py-4 text-sm font-mono">${p.pid}</td><td class="px-6 py-4 text-sm font-medium">${p.name}</td><td class="px-6 py-4 text-sm ${parseFloat(p.cpu)>50?'text-red-600 text-bold':''}">${p.cpu}</td><td class="px-6 py-4 text-sm text-gray-500">${p.mem}</td><td class="px-6 py-4 text-center"><button onclick="sendCommand('process_stop', {pid: ${p.pid}})" class="text-red-600 hover:text-red-800"><i class="fas fa-times-circle"></i> Kill</button></td></tr>`).join('');
    updateSortIcons();
}

function renderScreenshotView() {
    return `<div class="space-y-6 text-center"><button id="capture-btn" class="btn-primary bg-blue-600 text-white px-6 py-3 rounded-lg">Chụp Màn Hình</button><div class="bg-gray-100 border-2 border-dashed p-6"><p id="screenshot-placeholder" class="text-gray-500">Chưa có ảnh</p><img id="screenshot-image" class="hidden max-w-full mx-auto shadow-lg"></div><button id="save-screenshot-btn" class="hidden btn-primary bg-green-600 text-white px-6 py-3 rounded-lg">Lưu Ảnh</button></div>`;
}
function renderKeyloggerDisplay() { return `<div class="space-y-4"><div class="space-x-2"><button id="start-key" class="bg-green-600 text-white px-4 py-2 rounded">Bắt Đầu</button><button id="stop-key" class="bg-red-600 text-white px-4 py-2 rounded">Dừng</button><button id="clear-key" class="bg-gray-500 text-white px-4 py-2 rounded">Xóa</button></div><p id="keylogger-status" class="text-blue-600 font-bold"></p><textarea id="keylogger-log" class="w-full h-64 border p-2 font-mono" readonly></textarea></div>`; }
function renderWebcamControl() { 
    return `
        <div class="space-y-4">
            <p class="text-lg font-semibold text-red-600 bg-red-100 p-3 rounded-lg shadow">
                <i class="fas fa-exclamation-triangle mr-2"></i> CẢNH BÁO: Truy cập Webcam Agent.
            </p>
            <div class="flex justify-between items-center">
                <div class="flex space-x-3">
                    <button id="webcam-on-btn" class="btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                        <i class="fas fa-video mr-2"></i> Bật Webcam
                    </button>
                    <button id="webcam-off-btn" class="btn-primary bg-red-600 text-white px-6 py-3 rounded-lg shadow hover:bg-red-700 transition-all font-semibold">
                        <i class="fas fa-stop mr-2"></i> Tắt Webcam
                    </button>
                </div>
                
                <!-- THÊM NÚT BẬT/TẮT STATS -->
                <button id="toggle-stats-btn" class="text-slate-600 bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    <i class="fas fa-cogs mr-1"></i> Stats for Nerds
                </button>
            </div>
            
            <div id="webcam-area" class="bg-gray-900 border-2 border-gray-700 rounded-lg p-2 text-center overflow-hidden min-h-[300px] relative flex items-center justify-center">
                
                <!-- THÊM OVERLAY THỐNG KÊ (Nằm trên video) -->
                <div id="webcam-stats-overlay" class="absolute top-3 left-3 bg-black/50 p-2 rounded-lg pointer-events-none" style="display: block;">
                    <!-- Mặc định chỉ hiện LIVE, sẽ được updateWebcamStats() ghi đè -->
                    <p class="text-white bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">LIVE</p>
                </div>
                
                <div id="webcam-placeholder" class="text-gray-500 flex flex-col items-center">
                    <i class="fas fa-video-slash fa-2x mb-2 text-slate-600"></i>
                    <span>Camera Off</span>
                </div>
                <img id="webcam-stream" src="" alt="Video Webcam Agent" class="w-full h-auto block" style="display:none" />
            </div>
        </div>
    `;
}
function renderSystemControls() { 
    return `<div class="flex gap-4 justify-center mt-10"><button id="shutdown-btn" class="bg-red-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-red-700">SHUTDOWN</button><button id="restart-btn" class="bg-yellow-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-yellow-700">RESTART</button></div>`; 
}

function showModal(title, msg, confirmFn, isInfo=false) {
    const c = document.getElementById('modal-container');
    c.querySelector('h3').textContent = title;
    c.querySelector('p').textContent = msg;
    const btn = c.querySelector('#modal-confirm-btn');
    if(isInfo) { btn.textContent='Đóng'; c.querySelector('#modal-cancel-btn').classList.add('hidden'); }
    else { btn.textContent='Xác Nhận'; c.querySelector('#modal-cancel-btn').classList.remove('hidden'); }
    
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.onclick = () => { c.classList.add('hidden'); if(confirmFn) confirmFn(); };
    c.classList.remove('hidden');
    c.querySelector('#modal-cancel-btn').onclick = () => c.classList.add('hidden');
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`button[data-view="${view}"]`).classList.add('active');
    const area = document.getElementById('content-area');
    
    if(view === 'applications') { 
        area.innerHTML = renderAppLayout(); 
        document.getElementById('list-apps-btn').onclick = refreshCurrentViewData; 
        document.getElementById('start-app-btn').onclick = () => sendCommand('app_start', {name: document.getElementById('app-start-name').value});
        
        // SỬA LỖI TẮT/MỞ: Sử dụng Event Delegation để bắt sự kiện
        document.getElementById('app-list-body').addEventListener('click', (e) => {
            const stopBtn = e.target.closest('button[data-action="stop-app"]');
            const startBtn = e.target.closest('button[data-action="start-app"]');
            
            if (stopBtn) {
                const name = stopBtn.getAttribute('data-id');
                showModal("Dừng Ứng Dụng", `Dừng ứng dụng "${name}"?`, () => {
                    // Hiển thị spinner khi đã xác nhận
                    stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    sendCommand('app_stop', { name: name });
                });
            }
            if (startBtn) {
                const path = startBtn.getAttribute('data-id');
                // Hiển thị spinner ngay lập tức vì không cần Modal
                startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                sendCommand('app_start', { name: path });
            }
        });
        
        refreshCurrentViewData(); 
    }
    else if(view === 'processes') { 
        area.innerHTML = renderProcessLayout(); 
        document.getElementById('list-proc-btn').onclick = refreshCurrentViewData; 
        document.getElementById('start-process-btn').onclick = () => sendCommand('process_start', {name: document.getElementById('process-start-path').value}); 
        
        // Event Delegation cho Kill Process
        document.getElementById('process-list-body').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="kill-process"]');
            if (btn) {
                const pid = btn.getAttribute('data-id');
                showModal("Kill Process", `Chấm dứt tiến trình PID ${pid}?`, () => sendCommand('process_stop', { pid: parseInt(pid) }));
            }
        });
        
        refreshCurrentViewData(); 
    }
    else if(view === 'screenshot') { area.innerHTML = renderScreenshotView(); document.getElementById('capture-btn').onclick = () => {screenshotPending=true; document.getElementById('screenshot-image').style.display='none'; document.getElementById('screenshot-placeholder').style.display='block'; sendCommand('screenshot');}; document.getElementById('save-screenshot-btn').onclick = () => { const link = document.createElement('a'); link.href = document.getElementById('screenshot-image').src; link.download = prompt("Tên file:", "screenshot.png") || "screenshot.png"; link.click(); }; }
    else if(view === 'keylogger') { area.innerHTML = renderKeyloggerDisplay(); document.getElementById('start-key').onclick = () => sendCommand('keylogger_start'); document.getElementById('stop-key').onclick = () => sendCommand('keylogger_stop'); document.getElementById('clear-key').onclick = () => document.getElementById('keylogger-log').value = ''; }
    else if(view === 'webcam') { 
        area.innerHTML = renderWebcamControl(); 
        document.getElementById('cam-on').onclick = () => {
            sendCommand('webcam_on'); 
            const placeholder = document.getElementById('webcam-placeholder');
            if(placeholder) placeholder.innerHTML = '<div class="loader mb-2"></div> Đang kết nối...';
            // Cập nhật: Khởi tạo Stats khi bật cam
            updateWebcamStats();
        }; 
        document.getElementById('cam-off').onclick = () => sendCommand('webcam_off'); 
        
        // BIND SỰ KIỆN NÚT STATS
        document.getElementById('toggle-stats-btn').onclick = toggleStats;
    }
    else if(view === 'system') { area.innerHTML = renderSystemControls(); document.getElementById('shutdown-btn').onclick = () => showModal("Cảnh báo", "Tắt máy?", () => sendCommand('shutdown')); document.getElementById('restart-btn').onclick = () => showModal("Cảnh báo", "Khởi động lại?", () => sendCommand('restart')); }
}

document.addEventListener('DOMContentLoaded', () => {   
    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => switchView(b.dataset.view));
    document.getElementById('login-form').onsubmit = (e) => {
        e.preventDefault();
        doLogin(document.getElementById('username-input').value, document.getElementById('password-input').value);
    };
    document.getElementById('logout-btn').onclick = doLogout;
});

// ==========================================
// LOGIC SẮP XẾP ỨNG DỤNG (MỚI)
// ==========================================

function sortAppTable(column) {
    if (currentAppSort.column === column) {
        currentAppSort.direction = currentAppSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentAppSort.column = column;
        currentAppSort.direction = 'asc'; // Mặc định tăng dần cho text
    }
    updateAppTable();
}

function getAppSortIcon(column) {
    const active = currentAppSort.column === column;
    const iconName = active 
        ? (currentAppSort.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up')
        : 'fa-caret-right';
    
    const styleClass = active 
        ? 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
        : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:text-gray-600';

    return `<span class="sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border ${styleClass} transition-all cursor-pointer" title="Sắp xếp">
        <i class="fas ${iconName} text-xs"></i>
    </span>`;
}

function updateAppSortIcons() {
    ['name', 'path', 'status'].forEach(col => {
        const span = document.querySelector(`th[onclick="sortAppTable('${col}')"] span`);
        if(span) span.outerHTML = getAppSortIcon(col);
    });
}

// ==========================================
// LOGIC SẮP XẾP TIẾN TRÌNH
// ==========================================

function sortProcessTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc'; 
        if (column === 'name') currentSort.direction = 'asc'; 
    }
    updateProcessTable();
}

// Tạo icon lần đầu
function getSortIcon(column) {
    const active = currentSort.column === column;
    
    const iconName = active 
        ? (currentSort.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up')
        : 'fa-caret-right';
    
    const styleClass = active 
        ? 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
        : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:text-gray-600';

    return `<span class="sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border ${styleClass} transition-all cursor-pointer" title="Sắp xếp">
        <i class="fas ${iconName} text-xs"></i>
    </span>`;
}

// Cập nhật icon khi bấm (Sửa lỗi: Đồng nhất icon Caret)
function updateSortIcons() {
    ['pid', 'name', 'cpu', 'mem'].forEach(col => {
        const span = document.querySelector(`th[onclick="sortProcessTable('${col}')"] span`);
        const icon = span ? span.querySelector('i') : null;
        
        if (span && icon) {
            const active = currentSort.column === col;
            span.className = "sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border transition-all cursor-pointer";
            
            if (active) {
                span.classList.add('text-blue-600', 'bg-blue-50', 'border-blue-200', 'shadow-sm', 'ring-1', 'ring-blue-200');
                icon.className = `fas ${currentSort.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up'} text-xs`;
            } else {
                span.classList.add('text-gray-400', 'bg-gray-50', 'border-gray-200', 'hover:bg-gray-100', 'hover:text-gray-600');
                icon.className = 'fas fa-caret-right text-xs';
            }
        }
    });
}

// --- HÀM CẬP NHẬT UI ---

function updateStatus(message, type) {
    const statusEl = document.getElementById('status-display');
    const statusDot = document.getElementById('status-dot');
    
    statusEl.textContent = message;
    
    if (type === 'success') {
        statusEl.className = "text-xs font-semibold text-green-600 uppercase tracking-wide";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
    } else if (type === 'error') {
        statusEl.className = "text-xs font-semibold text-red-600 uppercase tracking-wide";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
    } else {
        statusEl.className = "text-xs font-semibold text-yellow-600 uppercase tracking-wide";
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping";
    }
}

function showModal(title, message, onConfirm = null, isInfo = false) {
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (isInfo) {
        confirmBtn.textContent = 'Đóng';
        confirmBtn.className = 'px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors';
        cancelBtn.classList.add('hidden');
    } else {
        confirmBtn.textContent = 'Xác Nhận';
        confirmBtn.className = 'px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all';
        cancelBtn.classList.remove('hidden');
    }

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.onclick = () => {
        container.classList.add('hidden');
        if (!isInfo && onConfirm) onConfirm();
    };
    newCancelBtn.onclick = () => container.classList.add('hidden');
    container.classList.remove('hidden');
}

function getLoadingRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center"><div class="loader mb-2"></div><span class="text-gray-500 text-sm">Đang tải dữ liệu từ Agent...</span></td></tr>`;
}

function getEmptyRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center text-gray-500 italic">Không có dữ liệu nào được tìm thấy.</td></tr>`;
}

function switchView(view) {
    currentView = view;
    const contentArea = document.getElementById('content-area');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    let html = '';
    switch (view) {
        case 'applications':
            html = renderAppLayout(); 
            setTimeout(() => sendCommand('app_list'), 100);
            break;
        case 'processes':
            html = renderProcessLayout();
            setTimeout(() => sendCommand('process_list'), 100);
            break;
        case 'screenshot':
            html = renderScreenshotView();
            break;
        case 'keylogger':
            html = renderKeyloggerDisplay();
            break;
        case 'webcam':
            html = renderWebcamControl();
            break;
        case 'system':
            html = renderSystemControls();
            break;
    }
    contentArea.innerHTML = html;
    attachViewListeners(view);
}

// 1. Ứng Dụng
function renderAppLayout() {
    return `
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                <button id="list-apps-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all">
                    <i class="fas fa-sync-alt mr-2"></i> Làm Mới
                </button>
                <input id="app-start-name" type="text" placeholder="Tên ứng dụng (.exe) để mở" class="p-2 border border-gray-300 rounded-lg flex-grow max-w-xs">
                <button id="start-app-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all">
                    <i class="fas fa-play mr-2"></i> Mở App
                </button>
            </div>
            <div class="table-container bg-gray-50 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-200 sticky top-0">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tên Ứng Dụng</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Đường Dẫn</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Trạng Thái</th>
                            <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="app-list-body" class="bg-white divide-y divide-gray-200">
                        ${getLoadingRow(4)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function updateAppTable(apps) {
    const tbody = document.getElementById('app-list-body');
    if (!tbody) return;

    if (!apps || apps.length === 0) {
        tbody.innerHTML = getEmptyRow(4);
        return;
    }

    tbody.innerHTML = apps.map(app => {
        const isRunning = app.status === 'Running';
        
        // Cấu hình nút bấm dựa trên trạng thái
        const btnColor = isRunning ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100';
        const btnIcon = isRunning ? 'fa-stop-circle' : 'fa-play-circle';
        const btnText = isRunning ? 'Đóng' : 'Mở';
        const btnAction = isRunning ? 'stop-app' : 'start-app';
        
        // ID để gửi lệnh: Nếu Mở thì gửi Path, Nếu Đóng thì cũng gửi Path (Server sẽ tự cắt lấy tên process)
        const actionId = app.path; 

        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded bg-slate-200 flex items-center justify-center mr-3 text-slate-500">
                        <i class="fas fa-cube"></i>
                    </div>
                    ${app.name || 'Unknown'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-xs" title="${app.path}">${app.path || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${isRunning ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                    <i class="fas ${isRunning ? 'fa-check-circle' : 'fa-minus-circle'} mr-1"></i>
                    ${app.status || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-action="${btnAction}" data-id="${actionId}" class="${btnColor} px-4 py-1.5 rounded-lg transition-colors shadow-sm border border-transparent hover:border-current flex items-center mx-auto w-24 justify-center font-semibold">
                    <i class="fas ${btnIcon} mr-2"></i> ${btnText}
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Gắn sự kiện cho cả nút Mở và Đóng
    document.querySelectorAll('button[data-action="start-app"]').forEach(btn => {
        btn.onclick = () => {
            // Hiệu ứng loading nhẹ
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            sendCommand('app_start', { name: btn.dataset.id });
        };
    });

    document.querySelectorAll('button[data-action="stop-app"]').forEach(btn => {
        btn.onclick = () => {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        };
    });
}

// 2. Tiến Trình (Đã cập nhật Header)
function renderProcessLayout() {
    return `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <button id="list-processes-btn" class="btn-primary bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all">
                        <i class="fas fa-sync-alt mr-2"></i> Cập Nhật
                    </button>
                    <input id="process-search" type="text" placeholder="Tìm PID hoặc Tên..." class="p-2 border border-gray-300 rounded-lg w-48">
                    <button id="start-process-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all">
                        <i class="fas fa-plus mr-2"></i> Mở Process
                    </button>
                </div>
                <div class="bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 text-sm font-mono text-gray-700">
                    <span id="total-cpu" class="mr-4 font-bold text-blue-600">CPU: 0%</span>
                    <span id="total-mem" class="font-bold text-purple-600">RAM: 0 MB</span>
                </div>
            </div>
            
            <div class="table-container bg-gray-50 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-200 sticky top-0 select-none">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer group" onclick="sortProcessTable('pid')">
                                <div class="flex items-center">PID ${getSortIcon('pid')}</div>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer group" onclick="sortProcessTable('name')">
                                <div class="flex items-center">Tên Tiến Trình ${getSortIcon('name')}</div>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer group" onclick="sortProcessTable('cpu')">
                                <div class="flex items-center">CPU ${getSortIcon('cpu')}</div>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer group" onclick="sortProcessTable('mem')">
                                <div class="flex items-center">RAM ${getSortIcon('mem')}</div>
                            </th>
                            <th class="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody id="process-list-body" class="bg-white divide-y divide-gray-200">
                        ${getLoadingRow(5)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function updateProcessTable() {
    const processes = globalProcessData;
    const tbody = document.getElementById('process-list-body');
    const totalCpuEl = document.getElementById('total-cpu');
    const totalMemEl = document.getElementById('total-mem');

    if (!tbody) return;

    if (!processes || processes.length === 0) {
        tbody.innerHTML = getEmptyRow(5);
        if(totalCpuEl) totalCpuEl.textContent = "CPU: 0%";
        if(totalMemEl) totalMemEl.textContent = "RAM: 0 MB";
        return;
    }

    let totalCpu = 0;
    let totalMem = 0;

    processes.forEach(p => {
        const cpuVal = parseFloat(p.cpu.replace('%', '')) || 0;
        totalCpu += cpuVal;
        const memVal = parseFloat(p.mem.replace(' MB', '').replace(',', '')) || 0;
        totalMem += memVal;
    });

    if(totalCpuEl) totalCpuEl.textContent = `CPU: ${totalCpu.toFixed(1)}%`;
    if(totalMemEl) totalMemEl.textContent = `RAM: ${totalMem.toFixed(0)} MB`;

    const sortedProcesses = [...processes].sort((a, b) => {
        let valA, valB;
        switch (currentSort.column) {
            case 'pid':
                valA = a.pid;
                valB = b.pid;
                break;
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'cpu':
                valA = parseFloat(a.cpu.replace('%', '')) || 0;
                valB = parseFloat(b.cpu.replace('%', '')) || 0;
                break;
            case 'mem':
                valA = parseFloat(a.mem.replace(' MB', '').replace(',', '')) || 0;
                valB = parseFloat(b.mem.replace(' MB', '').replace(',', '')) || 0;
                break;
            default: return 0;
        }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    tbody.innerHTML = sortedProcesses.map(p => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">${p.pid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title="${p.name}">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold ${parseFloat(p.cpu) > 50 ? 'text-red-600' : ''}">${p.cpu || '0%'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.mem || '0 MB'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-action="kill-process" data-id="${p.pid}" class="text-red-600 hover:text-red-900 transition-colors">
                    <i class="fas fa-times-circle"></i> Kill
                </button>
            </td>
        </tr>
    `).join('');
    
    updateSortIcons();
}

function updateSortIcons() {
    ['pid', 'name', 'cpu', 'mem'].forEach(col => {
        const span = document.querySelector(`th[onclick="sortProcessTable('${col}')"] span`);
        const icon = span ? span.querySelector('i') : null;
        
        if (span && icon) {
            const active = currentSort.column === col;
            span.className = "sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border transition-all cursor-pointer";
            
            if (active) {
                span.classList.add('text-blue-600', 'bg-blue-50', 'border-blue-200', 'shadow-sm', 'ring-1', 'ring-blue-200');
                icon.className = `fas ${currentSort.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up'} text-xs`;
            } else {
                span.classList.add('text-gray-400', 'bg-gray-50', 'border-gray-200', 'hover:bg-gray-100', 'hover:text-gray-600');
                icon.className = 'fas fa-caret-right text-xs';
            }
        }
    });
}

// 3. Các View khác
function renderScreenshotView() {
    return `
        <div class="space-y-6">
            <button id="capture-screenshot-btn" class="btn-primary bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-all font-semibold">
                <i class="fas fa-camera mr-2"></i> Yêu Cầu Chụp Màn Hình
            </button>
            <div id="screenshot-area" class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
                <p class="text-gray-500 mb-4" id="screenshot-placeholder">Hình ảnh chụp màn hình sẽ xuất hiện ở đây.</p>
                <img id="screenshot-image" src="" alt="Màn hình Agent" class="hidden max-w-full h-auto mx-auto rounded-lg shadow-lg border border-gray-200">
            </div>
            <button id="save-screenshot-btn" class="btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold hidden">
                <i class="fas fa-download mr-2"></i> Lưu Ảnh
            </button>
        </div>
    `;
}

function renderKeyloggerDisplay() {
    return `
        <div class="space-y-4">
            <div class="flex space-x-3">
                <button id="start-keylogger-btn" class="btn-primary bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                    <i class="fas fa-play mr-2"></i> Bắt Đầu
                </button>
                <button id="stop-keylogger-btn" class="btn-primary bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-all font-semibold">
                    <i class="fas fa-stop mr-2"></i> Dừng
                </button>
                <button id="clear-keylogger-btn" class="btn-primary bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition-all font-semibold">
                    <i class="fas fa-eraser mr-2"></i> Xóa
                </button>
            </div>
            <p id="keylogger-status" class="text-sm font-medium text-blue-600">Trạng thái: Đang chờ lệnh...</p>
            <textarea id="keylogger-log" class="w-full h-80 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm resize-none bg-gray-50" readonly></textarea>
        </div>
    `;
}


function renderSystemControls() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-10">
            <div class="p-6 bg-red-50 rounded-lg shadow-lg border-l-4 border-red-500">
                <h3 class="text-xl font-bold text-red-800 mb-3">Tắt Nguồn (Shutdown)</h3>
                <p class="text-gray-600 mb-4">Lệnh: shutdown /s /t 0</p>
                <button id="shutdown-btn" class="w-full btn-primary bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-all font-semibold">
                    <i class="fas fa-power-off mr-2"></i> SHUTDOWN
                </button>
            </div>
            <div class="p-6 bg-yellow-50 rounded-lg shadow-lg border-l-4 border-yellow-500">
                <h3 class="text-xl font-bold text-yellow-800 mb-3">Khởi Động Lại (Restart)</h3>
                <p class="text-gray-600 mb-4">Lệnh: shutdown /r /t 0</p>
                <button id="restart-btn" class="w-full btn-primary bg-yellow-600 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-700 transition-all font-semibold">
                    <i class="fas fa-redo-alt mr-2"></i> RESTART
                </button>
            </div>
        </div>
    `;
}

// --- EVENT LISTENERS ---

function attachViewListeners(view) {
    switch (view) {
        case 'applications':
            document.getElementById('list-apps-btn').onclick = () => {
                    document.getElementById('app-list-body').innerHTML = getLoadingRow(4);
                    sendCommand('app_list');
            };
            document.getElementById('start-app-btn').onclick = () => {
                const name = document.getElementById('app-start-name').value;
                if (name) sendCommand('app_start', { name: name });
            };
            document.getElementById('app-list-body').addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action="stop-app"]');
                if (btn) {
                    const name = btn.getAttribute('data-id');
                    showModal("Dừng Ứng Dụng", `Dừng ứng dụng "${name}"?`, () => sendCommand('app_stop', { name: name }));
                }
            });
            break;

        case 'processes':
            document.getElementById('list-processes-btn').onclick = () => {
                document.getElementById('process-list-body').innerHTML = getLoadingRow(5);
                sendCommand('process_list');
            };
            document.getElementById('start-process-btn').onclick = () => {
                const path = document.getElementById('process-start-path').value;
                if (path) sendCommand('process_start', { name: path });
            };
            document.getElementById('process-list-body').addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action="kill-process"]');
                if (btn) {
                    const pid = btn.getAttribute('data-id');
                    showModal("Kill Process", `Chấm dứt tiến trình PID ${pid}?`, () => sendCommand('process_stop', { pid: parseInt(pid) }));
                }
            });
            document.getElementById('process-search').addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#process-list-body tr');
                rows.forEach(row => {
                    const text = row.innerText.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
            break;

        case 'screenshot':
            document.getElementById('capture-screenshot-btn').onclick = () => {
                const img = document.getElementById('screenshot-image');
                img.src = '';
                img.style.display = 'none';
                document.getElementById('screenshot-placeholder').textContent = 'Đang chờ Agent chụp và gửi ảnh...';
                document.getElementById('screenshot-placeholder').style.display = 'block';
                document.getElementById('save-screenshot-btn').classList.add('hidden');
                screenshotPending = true;
                sendCommand('screenshot');
            };
            document.getElementById('save-screenshot-btn').onclick = () => {
                const img = document.getElementById('screenshot-image');
                if (img.src) {
                    let filename = prompt("Nhập tên file muốn lưu (Để trống sẽ dùng mặc định):");
                    if (!filename || filename.trim() === "") {
                        filename = `screenshot_${new Date().getTime()}.png`;
                    }
                    if (!filename.toLowerCase().endsWith('.png')) {
                        filename += '.png';
                    }
                    const link = document.createElement('a');
                    link.href = img.src;
                    link.download = filename;
                    link.click();
                }
            };
            break;

        case 'keylogger':
            document.getElementById('start-keylogger-btn').onclick = () => {
                sendCommand('keylogger_start');
                document.getElementById('keylogger-status').textContent = "Trạng thái: Đang Ghi...";
            };
            document.getElementById('stop-keylogger-btn').onclick = () => sendCommand('keylogger_stop');
            document.getElementById('clear-keylogger-btn').onclick = () => document.getElementById('keylogger-log').value = '';
            break;

        case 'webcam':
            document.getElementById('webcam-on-btn').onclick = () => {
                sendCommand('webcam_on');
                const placeholder = document.getElementById('webcam-placeholder');
                if(placeholder) placeholder.innerHTML = '<div class="loader mb-2"></div> Đang kết nối...';
            };
            document.getElementById('webcam-off-btn').onclick = () => sendCommand('webcam_off');
            break;

        case 'system':
            document.getElementById('shutdown-btn').onclick = () => {
                showModal("XÁC NHẬN TẮT NGUỒN", "CẢNH BÁO: Thao tác này sẽ TẮT NGUỒN máy Agent ngay lập tức.", () => sendCommand('shutdown'));
            };
            document.getElementById('restart-btn').onclick = () => {
                showModal("XÁC NHẬN KHỞI ĐỘNG LẠI", "CẢNH BÁO: Thao tác này sẽ KHỞI ĐỘNG LẠI máy Agent ngay lập tức.", () => sendCommand('restart'));
            };
            break;
    }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchView(e.currentTarget.getAttribute('data-view'));
        });
    });

    // --- NEW: Bind Login/Logout events ---
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username-input').value;
        const password = document.getElementById('password-input').value;
        doLogin(username, password);
    });

    document.getElementById('logout-btn').addEventListener('click', doLogout);

    document.getElementById('app').addEventListener('click', (e) => {
        if (e.target.id === 'toggle-stats-btn') {
            toggleStats();
        }
    });

    // Switch view to default initially (but hidden)
    switchView(currentView);
});