using Microsoft.Win32;
using RCS.Common.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace RCS.Agent.Services.Windows
{
    public class ApplicationManager
    {
        /// <summary>
        /// Quét toàn bộ Registry để lấy danh sách các phần mềm đã cài đặt.
        /// Kết hợp kiểm tra xem ứng dụng nào đang chạy.
        /// </summary>
        public List<ApplicationInfo> GetInstalledApps()
        {
            // Sử dụng Dictionary để lưu trữ ứng dụng, Key là tên ứng dụng.
            // Giúp tự động loại bỏ các ứng dụng trùng tên hoặc cập nhật trạng thái nếu tìm thấy nhiều mục giống nhau.
            var appDictionary = new Dictionary<string, ApplicationInfo>();

            // --- BƯỚC 1: Lấy danh sách các tiến trình đang chạy ---
            // Việc lấy trước danh sách này giúp tối ưu hiệu năng, không cần gọi Process.GetProcesses() nhiều lần trong vòng lặp.
            var runningProcesses = Process.GetProcesses()
                .Select(p => p.ProcessName.ToLower())
                .ToHashSet(); // Dùng HashSet để tra cứu (Contains) nhanh hơn List.

            // --- BƯỚC 2: Định nghĩa các vị trí Registry cần quét ---
            // Windows lưu thông tin gỡ cài đặt ở nhiều nơi khác nhau tùy thuộc vào loại App (32/64bit) và User (All/Current).
            var hives = new List<(RegistryKey Hive, string Path)>
            {
                // 1. App 64-bit cài đặt cho toàn bộ máy (LocalMachine)
                (Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
                
                // 2. App 32-bit cài đặt trên Windows 64-bit (WOW6432Node)
                (Registry.LocalMachine, @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
                
                // 3. App cài đặt riêng cho người dùng hiện tại (CurrentUser) - Ví dụ: Zalo, VSCode, Zoom...
                (Registry.CurrentUser, @"Software\Microsoft\Windows\CurrentVersion\Uninstall")
            };

            // --- BƯỚC 3: Duyệt qua từng Hive Registry ---
            foreach (var (hive, path) in hives)
            {
                try
                {
                    using (var key = hive.OpenSubKey(path))
                    {
                        // Nếu key không tồn tại (ít khi xảy ra), bỏ qua
                        if (key == null) continue;

                        // Duyệt qua từng thư mục con (mỗi thư mục con đại diện cho một phần mềm)
                        foreach (var subKeyName in key.GetSubKeyNames())
                        {
                            using (var subKey = key.OpenSubKey(subKeyName))
                            {
                                try
                                {
                                    // 3.1. Lấy tên hiển thị của ứng dụng
                                    var name = subKey.GetValue("DisplayName") as string;
                                    if (string.IsNullOrWhiteSpace(name)) continue; // Không có tên thì bỏ qua

                                    // 3.2. Bộ lọc rác: Bỏ qua các bản vá lỗi hoặc driver update của Windows
                                    if (name.StartsWith("Security Update") || name.StartsWith("Update for")) continue;

                                    // 3.3. Tìm đường dẫn file .exe thực thi
                                    // Ưu tiên theo thứ tự độ chính xác: Icon hiển thị -> Nơi cài đặt -> Chuỗi gỡ cài đặt
                                    string exePath = GetExePath(subKey.GetValue("DisplayIcon") as string)
                                                  ?? GetExePath(subKey.GetValue("InstallLocation") as string)
                                                  ?? GetExePath(subKey.GetValue("UninstallString") as string);

                                    // 3.4. Kiểm tra hợp lệ: Phải có đường dẫn và file đó phải tồn tại trên ổ cứng
                                    if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                                    {
                                        // Lấy tên file exe (không đuôi) để so sánh với process đang chạy
                                        string exeName = Path.GetFileNameWithoutExtension(exePath).ToLower();
                                        string status = runningProcesses.Contains(exeName) ? "Running" : "Stopped";

                                        // 3.5. Thêm vào danh sách kết quả
                                        if (!appDictionary.ContainsKey(name))
                                        {
                                            // Nếu chưa có thì thêm mới
                                            appDictionary[name] = new ApplicationInfo
                                            {
                                                Name = name,
                                                Path = exePath,
                                                Status = status
                                            };
                                        }
                                        else if (status == "Running")
                                        {
                                            // Nếu đã có (trùng tên) nhưng lần quét này phát hiện nó đang chạy
                                            // -> Cập nhật trạng thái đè lên cái cũ (ưu tiên hiển thị trạng thái Running)
                                            appDictionary[name].Status = "Running";
                                        }
                                    }
                                }
                                catch 
                                { 
                                    // Bỏ qua lỗi khi đọc key con cụ thể, tiếp tục với key khác
                                }
                            }
                        }
                    }
                }
                catch 
                { 
                    // Bỏ qua lỗi khi mở Hive lớn, tiếp tục với Hive khác
                }
            }

            // --- BƯỚC 4: Sắp xếp và trả về kết quả ---
            return appDictionary.Values.OrderBy(x => x.Name).ToList();
        }

        /// <summary>
        /// Khởi động một ứng dụng dựa trên đường dẫn file .exe.
        /// </summary>
        /// <param name="path">Đường dẫn đầy đủ tới file thực thi.</param>
        public void StartApp(string path)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = path,
                    UseShellExecute = true, // Cần thiết để chạy như một lệnh Shell, tránh lỗi quyền hạn
                    WorkingDirectory = Path.GetDirectoryName(path) // Đặt thư mục làm việc là thư mục chứa file exe để load dll ổn định
                });
            }
            catch { }
        }

        /// <summary>
        /// Dừng ứng dụng. Thử đóng nhẹ nhàng trước, nếu không được thì buộc dừng (Kill).
        /// </summary>
        /// <param name="pathOrName">Đường dẫn file hoặc tên ứng dụng.</param>
        public void StopApp(string pathOrName)
        {
            try
            {
                // Cách 1: Tìm process bằng tên file exe (chính xác nhất)
                string processName = Path.GetFileNameWithoutExtension(pathOrName);
                var procs = Process.GetProcessesByName(processName);

                // Cách 2: Nếu không tìm thấy bằng tên file, thử tìm bằng tiêu đề cửa sổ (Fallback)
                if (procs.Length == 0)
                {
                    procs = Process.GetProcesses()
                        .Where(p => p.MainWindowTitle.Contains(pathOrName))
                        .ToArray();
                }

                if (procs.Length > 0)
                {
                    foreach (var p in procs)
                    {
                        try
                        {
                            // Ưu tiên dùng CloseMainWindow để gửi lệnh đóng (giống bấm nút X).
                            // Việc này cho phép ứng dụng lưu dữ liệu hoặc hiện hộp thoại "Do you want to save?".
                            // Nếu ứng dụng chạy ngầm (không có UI) hoặc bị treo, hàm này trả về false.
                            if (!p.CloseMainWindow())
                            {
                                // Khi đóng nhẹ nhàng thất bại, dùng Kill để cưỡng chế tắt ngay lập tức.
                                p.Kill();
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        // =========================================================================
        // PHẦN PRIVATE HELPER (Hàm hỗ trợ nội bộ)
        // =========================================================================

        /// <summary>
        /// Làm sạch chuỗi đường dẫn lấy từ Registry để ra được đường dẫn file .exe chuẩn.
        /// </summary>
        private string GetExePath(string rawPath)
        {
            if (string.IsNullOrEmpty(rawPath)) return null;

            // Registry thường trả về dạng phức tạp như: "C:\Path\App.exe" /arg hoặc C:\Path\App.exe,0
            
            // 1. Xử lý dấu ngoặc kép bao quanh (nếu có)
            string clean = rawPath.Trim();
            if (clean.StartsWith("\""))
            {
                int endQuote = clean.IndexOf("\"", 1);
                if (endQuote > 0) clean = clean.Substring(1, endQuote - 1);
            }

            // 2. Cắt bỏ các tham số phía sau (ngăn cách bởi dấu phẩy)
            // Ví dụ: C:\Program Files\App\app.exe,0 -> Lấy phần trước dấu phẩy
            if (clean.Contains(",")) clean = clean.Split(',')[0];

            // 3. Kiểm tra đuôi file
            // Chỉ chấp nhận nếu kết thúc là .exe để đảm bảo đây là file chạy được
            if (!clean.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return clean;
        }
    }
}