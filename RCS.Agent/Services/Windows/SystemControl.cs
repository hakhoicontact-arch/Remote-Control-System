// -----------------------------------------------------------------------------
// File: SystemControl.cs
// Description: Định nghĩa dịch vụ điều khiển nguồn hệ thống.
// Mục đích: Cung cấp các chức năng để Tắt máy (Shutdown) và Khởi động lại (Restart)
//           thông qua dòng lệnh CMD của Windows.
// -----------------------------------------------------------------------------

using System.Diagnostics;

namespace RCS.Agent.Services.Windows
{
    public class SystemControl
    {
        // =========================================================================
        // PUBLIC METHODS (Chức năng chính)
        // =========================================================================

        /// <summary>
        /// Tắt máy tính ngay lập tức.
        /// </summary>
        public void Shutdown()
        {
            // /s: Shutdown (Tắt máy)
            // /t 0: Time 0 (Thực hiện ngay lập tức không đếm ngược)
            RunCommand("shutdown", "/s /t 0");
        }

        /// <summary>
        /// Khởi động lại máy tính ngay lập tức.
        /// </summary>
        public void Restart()
        {
            // /r: Restart (Khởi động lại)
            // /t 0: Time 0 (Thực hiện ngay lập tức)
            RunCommand("shutdown", "/r /t 0");
        }

        // =========================================================================
        // PRIVATE HELPER (Hàm hỗ trợ chạy lệnh CMD)
        // =========================================================================

        /// <summary>
        /// Hàm nội bộ để thực thi một lệnh hệ thống.
        /// </summary>
        /// <param name="fileName">Tên file thực thi (ví dụ: shutdown.exe)</param>
        /// <param name="args">Các tham số đi kèm</param>
        private void RunCommand(string fileName, string args)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = args,
                
                // Quan trọng: Chạy ngầm, không hiện cửa sổ CMD đen ngòm lên màn hình nạn nhân
                CreateNoWindow = true, 
                
                // Cần set false để có thể cấu hình các luồng I/O (nếu sau này cần RedirectOutput)
                UseShellExecute = false 

                // --- Các tùy chọn mở rộng (đang tắt) ---
                // RedirectStandardOutput = true, // Bật nếu muốn lấy kết quả trả về từ cmd
                // RedirectStandardError = true   // Bật nếu muốn bắt lỗi chi tiết
            });
        }
    }
}