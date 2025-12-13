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
using System.Runtime.InteropServices;

namespace RCS.Agent.Services.Windows
{
    public class ProcessMonitor
    {
        #region --- MAIN FUNCTION: GET PROCESS LIST ---

        // --- 1. ĐỊNH NGHĨA API WINDOWS ĐỂ LẤY DISK I/O ---
        [DllImport("kernel32.dll")]
        private static extern bool GetProcessIoCounters(IntPtr hProcess, out IO_COUNTERS lpIoCounters);

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;  // Bytes đọc
            public ulong WriteTransferCount; // Bytes ghi
            public ulong OtherTransferCount;
        }

        // --- 2. LOGIC LẤY DANH SÁCH ---
        public List<ProcessInfo> GetProcesses()
        {
            var list = new List<ProcessInfo>();
            var processes = Process.GetProcesses();
            
            // Lưu trạng thái ban đầu
            var startCpuUsage = new Dictionary<int, TimeSpan>();
            var startDiskUsage = new Dictionary<int, ulong>(); 
            var startTime = DateTime.UtcNow;

            // --- BƯỚC 1: LẤY MẪU (SNAPSHOT 1) ---
            foreach (var p in processes)
            {
                try 
                { 
                    // CPU
                    startCpuUsage[p.Id] = p.TotalProcessorTime; 
                    
                    // DISK (Dùng hàm API riêng để fix lỗi không tìm thấy property)
                    if (GetProcessIoCounters(p.Handle, out var counters))
                    {
                        startDiskUsage[p.Id] = counters.ReadTransferCount + counters.WriteTransferCount;
                    }
                } 
                catch { }
            }

            // --- BƯỚC 2: CHỜ (SAMPLING) ---
            Thread.Sleep(300); // 300ms delay

            var endTime = DateTime.UtcNow;
            
            // SỬA LỖI: Khai báo biến này ở đây để dùng được bên dưới
            double totalSampleTimeMs = (endTime - startTime).TotalMilliseconds;
            int cpuCoreCount = Environment.ProcessorCount;

            // Lấy Top 100 process nặng nhất để tối ưu hiệu năng
            var sortedProcesses = processes.OrderByDescending(p => p.WorkingSet64).Take(1000).ToList();

            // --- BƯỚC 3: TÍNH TOÁN (SNAPSHOT 2) ---
            foreach (var p in sortedProcesses)
            {
                try
                {
                    string cpuText = "0%";
                    string diskText = "0 KB/s";

                    // Tính CPU
                    if (startCpuUsage.ContainsKey(p.Id))
                    {
                        try 
                        {
                            var endCpuUsage = p.TotalProcessorTime;
                            var cpuUsedMs = (endCpuUsage - startCpuUsage[p.Id]).TotalMilliseconds;
                            
                            // Công thức tính % CPU
                            double cpuPercent = (cpuUsedMs / totalSampleTimeMs) / cpuCoreCount * 100;
                            if (cpuPercent > 0) cpuText = cpuPercent.ToString("0.0") + "%";
                        }
                        catch {}
                    }

                    // Tính Disk I/O
                    if (startDiskUsage.ContainsKey(p.Id))
                    {
                        try
                        {
                            if (GetProcessIoCounters(p.Handle, out var endCounters))
                            {
                                ulong endDisk = endCounters.ReadTransferCount + endCounters.WriteTransferCount;
                                
                                // Tính lượng thay đổi (Delta)
                                if (endDisk > startDiskUsage[p.Id])
                                {
                                    ulong deltaBytes = endDisk - startDiskUsage[p.Id];
                                    
                                    // Bytes trên giây
                                    double bytesPerSec = deltaBytes / (totalSampleTimeMs / 1000.0);

                                    // Format hiển thị
                                    if (bytesPerSec > 1024 * 1024) 
                                        diskText = $"{bytesPerSec / 1024 / 1024:F1} MB/s";
                                    else if (bytesPerSec > 0) 
                                        diskText = $"{bytesPerSec / 1024:F0} KB/s";
                                }
                            }
                        }
                        catch {}
                    }

                    // Metadata
                    string description = "";
                    try { description = p.MainModule?.FileVersionInfo.FileDescription; } catch { }
                    if (string.IsNullOrEmpty(description)) description = p.ProcessName;

                    int threads = 0, handles = 0;
                    try { threads = p.Threads.Count; } catch { }
                    try { handles = p.HandleCount; } catch { }

                    double memMb = p.WorkingSet64 / 1024.0 / 1024.0;

                    list.Add(new ProcessInfo
                    {
                        Pid = p.Id,
                        Name = p.ProcessName,
                        Description = description,
                        Threads = threads,
                        Handles = handles,
                        Cpu = cpuText,
                        Mem = $"{memMb:F0} MB",
                        Disk = diskText
                    });
                }
                catch { } 
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