// -----------------------------------------------------------------------------
// File: ProcessMonitor.cs
// Description: Định nghĩa dịch vụ quản lý tiến trình trên Windows
// Mục đích: Cung cấp các chức năng liệt kê (kèm thông số CPU/RAM), khởi động 
//           và dừng tiến trình.
// -----------------------------------------------------------------------------

using RCS.Common.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;

namespace RCS.Agent.Services.Windows
{
    public class ProcessMonitor
    {
        #region --- MAIN FUNCTION: GET PROCESS LIST ---

        /// <summary>
        /// Lấy danh sách các tiến trình đang chạy, bao gồm tính toán % CPU và RAM.
        /// Lưu ý: Hàm này sẽ mất khoảng 300ms để thực thi do cần lấy mẫu (sampling) CPU.
        /// </summary>
        public List<ProcessInfo> GetProcesses()
        {
            var list = new List<ProcessInfo>();

            // Lấy danh sách toàn bộ tiến trình hiện tại từ OS
            var processes = Process.GetProcesses();
            
            // Dictionary lưu thời gian sử dụng CPU của từng process tại thời điểm bắt đầu đo
            var startCpuUsage = new Dictionary<int, TimeSpan>();
            
            // --- BƯỚC 1: SNAPSHOT BAN ĐẦU ---
            // Ghi nhận thời gian hiện tại và thời gian CPU đã dùng của mỗi tiến trình
            var startTime = DateTime.UtcNow;

            foreach (var p in processes)
            {
                try
                {
                    // Chỉ lấy được thông tin nếu có quyền truy cập (Tránh lỗi Access Denied với process hệ thống)
                    startCpuUsage[p.Id] = p.TotalProcessorTime;
                }
                catch 
                { 
                    // Bỏ qua nếu không truy cập được
                }
            }

            // --- BƯỚC 2: SAMPLING (LẤY MẪU) ---
            // Tạm dừng 300ms để tạo "khoảng chênh lệch". 
            // CPU Usage là con số tức thời, ta cần đo (Work Done) / (Time Elapsed).
            Thread.Sleep(300);

            // --- BƯỚC 3: TÍNH TOÁN ---
            var endTime = DateTime.UtcNow;
            var totalSampleTime = (endTime - startTime).TotalMilliseconds; // Tổng thời gian trôi qua thực tế
            var cpuCoreCount = Environment.ProcessorCount; // Số nhân CPU (để chia tỉ lệ % tổng)

            // Lọc và sắp xếp: Chỉ lấy Top 100 tiến trình ngốn RAM nhất để tối ưu băng thông mạng khi gửi về Client
            var sortedProcesses = processes
                .OrderByDescending(p => p.WorkingSet64)
                .Take(100)
                .ToList();

            foreach (var p in sortedProcesses)
            {
                try
                {
                    string cpuText = "0%";

                    // Nếu tiến trình này đã tồn tại từ lúc bắt đầu đo (có trong Dictionary)
                    if (startCpuUsage.ContainsKey(p.Id))
                    {
                        var endCpuUsage = p.TotalProcessorTime;
                        
                        // Thời gian CPU tiến trình đã dùng trong khoảng 300ms vừa qua
                        var cpuUsedMs = (endCpuUsage - startCpuUsage[p.Id]).TotalMilliseconds;

                        // Công thức tính % CPU:
                        // (Thời gian CPU dùng / Tổng thời gian trôi qua) / Số nhân * 100
                        // Chia cho cpuCoreCount vì TotalProcessorTime có thể lớn hơn thời gian thực (trên máy đa nhân)
                        double cpuPercent = (cpuUsedMs / totalSampleTime) / cpuCoreCount * 100;

                        // Làm tròn 1 chữ số thập phân cho đẹp
                        if (cpuPercent > 0)
                            cpuText = cpuPercent.ToString("0.0") + "%";
                    }

                    // Chuyển đổi RAM từ Bytes sang MB
                    double memMb = p.WorkingSet64 / 1024.0 / 1024.0;

                    list.Add(new ProcessInfo
                    {
                        Pid = p.Id,
                        Name = p.ProcessName,
                        Cpu = cpuText,
                        Mem = $"{memMb:F0} MB" // F0: Không lấy số lẻ thập phân cho gọn
                    });
                }
                catch 
                { 
                    // Bỏ qua các process bị tắt giữa chừng hoặc không truy cập được
                }
            }

            return list;
        }

        #endregion

        #region --- ACTIONS: START & KILL ---

        /// <summary>
        /// Khởi động một tiến trình mới từ đường dẫn.
        /// </summary>
        /// <param name="path">Đường dẫn file .exe</param>
        public void StartProcess(string path)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = path,
                    UseShellExecute = true // Quan trọng: Cho phép chạy file như khi click đúp trong Explorer
                });
            }
            catch 
            { 
                // Xử lý lỗi im lặng (hoặc có thể log lại nếu cần)
            }
        }

        /// <summary>
        /// Buộc dừng một tiến trình dựa trên ID (PID).
        /// </summary>
        /// <param name="pid">Process ID</param>
        public void KillProcess(int pid)
        {
            try
            {
                // Lấy đối tượng process và gọi lệnh Kill
                var p = Process.GetProcessById(pid);
                p.Kill();
            }
            catch (Exception ex)
            {
                // Log lỗi ra Console để debug nếu không kill được (ví dụ: quyền Admin, process đã tắt...)
                Console.WriteLine($"[ProcessMonitor] Error killing {pid}: {ex.Message}");
            }
        }

        #endregion
    }
}