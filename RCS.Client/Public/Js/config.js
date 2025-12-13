// --- CẤU HÌNH & TRẠNG THÁI ---

export const CONFIG = {
    CONNECTION_URL: "http://localhost:5000/clienthub",
    AGENT_ID: 'Agent_12345',
    SAMPLE_INTERVAL_MS: 500 // Cập nhật FPS/Rate mỗi 500ms
};

// State quản lý dữ liệu
export const state = {
    connection: null,
    currentUser: '',
    currentView: 'applications',
    
    // Dữ liệu ứng dụng/tiến trình
    globalAppData: [],
    globalProcessData: [],
    
    // Sort
    currentSort: { column: 'pid', direction: 'asc' }, // Cho Process
    currentAppSort: { column: 'name', direction: 'asc' }, // Cho App

    screenshotPending: false,

    // Webcam Stats
    webcam: {
        isStreaming: false,     // Cờ kiểm soát nhận dữ liệu

        isStatsVisible: false,
        lastFrameTime: performance.now(),
        currentFPS: 0,
        currentPing: 0,
        framesReceived: 0,
        lastSampleTime: performance.now(),
        currentFrameSize: 0,
        totalDataReceived: 0,
        totalTimeElapsed: 0,

        // --- CHO GHI HÌNH ---
        isRecording: false,      // Đang ghi hay không
        recordStartTime: 0,      // Thời điểm bắt đầu
        recorder: null,          // Đối tượng MediaRecorder
        recordedChunks: [],      // Dữ liệu video tạm
        recordTimerInterval: null, // ID của bộ đếm giờ
        canvasDrawerInterval: null // ID của vòng lặp vẽ canvas
    },

    // Screenshot
    screenshotPending: false
};