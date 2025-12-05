import { CONFIG, state } from './config.js';
import { updateStatus } from './utils.js';

export function startSignalR(username, password, callbacks) {
    return new Promise((resolve, reject) => {
        const finalUrl = `${CONFIG.CONNECTION_URL}?username=${encodeURIComponent(username)}&access_token=${encodeURIComponent(password)}`;

        state.connection = new signalR.HubConnectionBuilder()
            .withUrl(finalUrl)
            .withAutomaticReconnect()
            .build();

        // Gắn các callback từ Main Controller
        state.connection.on("ReceiveResponse", callbacks.onResponse);
        state.connection.on("ReceiveUpdate", callbacks.onUpdate);
        state.connection.on("ReceiveBinaryChunk", callbacks.onBinary);

        state.connection.onclose((error) => {
            const isDashboardVisible = !document.getElementById('app').classList.contains('hidden');
            if (isDashboardVisible) {
                updateStatus("Mất kết nối. Vui lòng đăng nhập lại.", 'error');
                setTimeout(() => window.location.reload(), 2000);
            }
        });

        state.connection.start().then(() => resolve()).catch(err => reject(err));
    });
}

export async function sendCommand(action, params = {}) {
    if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
        try {
            await state.connection.invoke("SendToAgent", CONFIG.AGENT_ID, { action, params });
        } catch (err) {
            console.error("Lỗi gửi lệnh:", err);
        }
    }
}