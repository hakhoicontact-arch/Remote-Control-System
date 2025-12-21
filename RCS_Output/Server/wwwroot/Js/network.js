import { CONFIG, state } from './config.js';
import { updateStatus } from './utils.js';

export function startSignalR(url, username, password, callbacks) {
    return new Promise((resolve, reject) => {
        const finalUrl = `${url}?username=${encodeURIComponent(username)}&access_token=${encodeURIComponent(password)}`;

        // Tạo kết nối và lưu vào state ngay tại đây
        state.connection = new signalR.HubConnectionBuilder()
            .withUrl(finalUrl)
            .withAutomaticReconnect()
            .build();

        // Gắn các callback
        state.connection.on("ReceiveResponse", callbacks.onResponse);
        state.connection.on("ReceiveUpdate", callbacks.onUpdate);
        state.connection.on("ReceiveBinaryChunk", callbacks.onBinary);

        if (callbacks.onAgentListUpdate) {
            state.connection.on("UpdateAgentList", callbacks.onAgentListUpdate);
        }


        state.connection.onclose((error) => {
            const isDashboardVisible = !document.getElementById('app').classList.contains('hidden');
            if (isDashboardVisible) {
                updateStatus("Mất kết nối. Vui lòng đăng nhập lại.", 'error');
                setTimeout(() => window.location.reload(), 2000);
            }
        });

        // Trả về state.connection trong resolve để bên main.js nhận được
        state.connection.start()
            .then(() => resolve(state.connection)) 
            .catch(err => reject(err));

        state.connection.on("ReceiveChatMessage", (sender, message, time) => {
            if (callbacks.onChatMessage) {
                callbacks.onChatMessage(sender, message, time);
            }
        });
    });
}

export async function sendCommand(action, params = {}) {
    // Kiểm tra kỹ trạng thái trước khi gửi
    if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
        try {
            await state.connection.invoke("SendToAgent", CONFIG.AGENT_ID, { action, params });
        } catch (err) {
            console.error("Lỗi gửi lệnh:", err);
        }
    } else {
        console.warn("Chưa kết nối hoặc mất kết nối tới Server.");
    }
}

export async function requestAgentList() {
    if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
        try {
            await state.connection.invoke("GetActiveAgents");
        } catch (err) {
            console.error("Lỗi lấy danh sách Agent:", err);
        }
    }
}