using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using RCS.Server.Hubs;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace RCS.Server.Services
{
    /// <summary>
    /// Service chạy ngầm (Background Service) chuyên trách việc nhận dữ liệu UDP.
    /// Nó hoạt động độc lập với luồng chính của Web để đảm bảo hiệu năng cao cho việc streaming.
    /// </summary>
    public class UdpListenerService : BackgroundService
    {
        #region --- CONFIGURATION & STATE (CẤU HÌNH & TRẠNG THÁI) ---

        private readonly IHubContext<ClientHub> _hubContext;
        private readonly UdpClient _udpServer;
        
        // Cổng lắng nghe (Phải trùng với cổng Agent gửi lên)
        private const int LISTEN_PORT = 6000;
        
        // Tần suất log (Chỉ in log console mỗi 60 frame để đỡ rác màn hình)
        private const int FRAME_PER_SECOND = 60; 

        // Bộ đệm lưu trữ các Frame đang chờ ghép. 
        // Key: FrameID, Value: Dữ liệu các mảnh của frame đó.
        // Dùng ConcurrentDictionary để an toàn khi truy xuất từ nhiều luồng.
        private readonly ConcurrentDictionary<int, ReceivedFrame> _frameBuffer = new();

        #endregion

        #region --- CONSTRUCTOR ---

        public UdpListenerService(IHubContext<ClientHub> hubContext)
        {
            _hubContext = hubContext;
            try
            {
                // Khởi tạo UDP Server lắng nghe trên tất cả IP (0.0.0.0) tại port 6000
                _udpServer = new UdpClient(LISTEN_PORT);

                // Tăng kích thước bộ đệm nhận của Socket lên mức cao (ví dụ 50MB)
                // Điều này cực kỳ quan trọng với Video Stream để tránh việc OS vứt gói tin
                // khi ứng dụng chưa kịp xử lý.
                // Lưu ý: Program.ReceiveMessageSize_MB cần được định nghĩa bên Program.cs của Server
                _udpServer.Client.ReceiveBufferSize = Program.ReceiveMessageSize_MB * 1024 * 1024;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UDP INIT ERROR] {ex.Message}");
                throw; // Ném lỗi để dừng ứng dụng nếu không mở được Port (VD: Port đang bị chiếm)
            }
        }

        #endregion

        #region --- MAIN LOOP (VÒNG LẶP CHÍNH) ---

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            Console.WriteLine($"[UDP] Server started listening on port {LISTEN_PORT}...");

            // 1. Khởi chạy luồng dọn dẹp (Garbage Collection cho Frame lỗi)
            // Chạy song song, không chặn luồng nhận tin
            _ = Task.Run(async () => {
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(2000); // Chạy mỗi 2 giây
                    CleanupOldFrames();
                }
            });

            // 2. Vòng lặp nhận dữ liệu liên tục
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Chờ và nhận gói tin UDP tiếp theo (Bất đồng bộ)
                    var result = await _udpServer.ReceiveAsync(stoppingToken);
                    
                    // --- Debug: Hiện dấu chấm để biết có tín hiệu (Tắt khi chạy thật) ---
                    // Console.Write("."); 

                    // Xử lý gói tin vừa nhận được
                    ProcessPacket(result.Buffer);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"\n[UDP Loop Error] {ex.Message}");
                }
            }
        }

        #endregion

        #region --- PACKET PROCESSING (XỬ LÝ GÓI TIN) ---

        /// <summary>
        /// Phân tích gói tin thô (Byte array) và đưa vào bộ đệm lắp ráp.
        /// </summary>
        private void ProcessPacket(byte[] data)
        {
            const int HEADER_SIZE = 20;
            
            // Bỏ qua nếu gói tin quá nhỏ (không đủ chứa Header)
            if (data.Length < HEADER_SIZE) return;

            // --- GIẢI MÃ HEADER (20 Bytes đầu tiên) ---
            // Phải khớp hoàn toàn với cấu trúc gửi bên Agent
            int frameId = BitConverter.ToInt32(data, 0);          // ID của bức ảnh
            ushort packetIndex = BitConverter.ToUInt16(data, 4);  // Số thứ tự gói tin này
            ushort totalPackets = BitConverter.ToUInt16(data, 6); // Tổng số gói của bức ảnh
            int dataSize = BitConverter.ToInt32(data, 8);         // Kích thước dữ liệu ảnh
            long timestampTicks = BitConverter.ToInt64(data, 12); // Thời gian chụp (để tính delay)

            // Kiểm tra tính toàn vẹn: Kích thước thực tế phải bằng Header + Payload
            if (data.Length != HEADER_SIZE + dataSize) return;

            // Tách phần dữ liệu ảnh (Payload) ra khỏi Header
            byte[] payload = new byte[dataSize];
            Array.Copy(data, HEADER_SIZE, payload, 0, dataSize);

            // --- QUẢN LÝ BỘ ĐỆM ---
            
            // Nếu đây là gói đầu tiên nhận được của Frame ID này -> Tạo mới entry trong buffer
            if (!_frameBuffer.ContainsKey(frameId))
            {
                _frameBuffer[frameId] = new ReceivedFrame
                {
                    TotalPackets = totalPackets,
                    Timestamp = DateTime.Now,    // Thời điểm Server nhận gói đầu tiên
                    SenderTicks = timestampTicks // Thời điểm Agent gửi
                };
            }

            var currentFrame = _frameBuffer[frameId];

            // Lock để đảm bảo an toàn nếu có nhiều luồng cùng ghi vào một Frame (dù ở đây là tuần tự)
            lock (currentFrame)
            {
                // Lưu gói tin vào vị trí tương ứng (packetIndex)
                if (!currentFrame.Packets.ContainsKey(packetIndex))
                {
                    currentFrame.Packets[packetIndex] = payload;
                }

                // Kiểm tra xem đã nhận đủ tất cả các mảnh chưa?
                if (currentFrame.Packets.Count == totalPackets)
                {
                    // Log thông tin (giới hạn tần suất để đỡ lag console)
                    if (frameId % FRAME_PER_SECOND == 0 || frameId == 1)
                    {
                        Console.WriteLine($"\n[UDP] Frame {frameId} OK. Sending...");
                    }

                    // Đủ mảnh -> Ghép lại và gửi đi
                    ReassembleAndSend(frameId, currentFrame);
                    
                    // Xử lý xong -> Xóa khỏi bộ nhớ ngay
                    _frameBuffer.TryRemove(frameId, out _);
                }
            }
        }

        /// <summary>
        /// Ghép các mảnh dữ liệu lại thành file ảnh hoàn chỉnh và gửi qua SignalR.
        /// </summary>
        private async void ReassembleAndSend(int frameId, ReceivedFrame frame)
        {
            try
            {
                // 1. Tính tổng kích thước ảnh sau khi ghép
                int totalSize = frame.Packets.Values.Sum(p => p.Length);
                byte[] fullImage = new byte[totalSize];

                // 2. Ghép từng mảnh vào mảng lớn (theo đúng thứ tự Index 0 -> N)
                int offset = 0;
                for (ushort i = 0; i < frame.TotalPackets; i++)
                {
                    if (frame.Packets.TryGetValue(i, out byte[] part))
                    {
                        Array.Copy(part, 0, fullImage, offset, part.Length);
                        offset += part.Length;
                    }
                    else return; // Nếu thiếu gói giữa chừng (lỗi logic) -> Hủy
                }

                // 3. Chuyển đổi sang Base64 để hiển thị được trên thẻ <img> HTML
                string base64 = "data:image/jpeg;base64," + Convert.ToBase64String(fullImage);
                
                // 4. Gửi Broadcast tới tất cả Dashboard đang xem
                await _hubContext.Clients.All.SendAsync("ReceiveBinaryChunk", base64, fullImage.Length, frame.SenderTicks);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Reassemble Error] {ex.Message}");
            }
        }

        #endregion

        #region --- MAINTENANCE (BẢO TRÌ) ---

        /// <summary>
        /// Xóa các Frame bị lỗi (mất gói tin) quá lâu để giải phóng RAM.
        /// UDP không đảm bảo gửi tới 100%, nên sẽ có những Frame không bao giờ đủ mảnh.
        /// </summary>
        private void CleanupOldFrames()
        {
            var now = DateTime.Now;
            
            // Tìm các frame đã tồn tại quá 1 giây mà chưa ghép xong
            var expiredKeys = _frameBuffer
                .Where(f => (now - f.Value.Timestamp).TotalSeconds > 1)
                .Select(k => k.Key)
                .ToList();

            if (expiredKeys.Count > 0)
            {
                // Console.WriteLine($"\n[UDP] Dropped {expiredKeys.Count} incomplete frames");
            }

            // Xóa sổ
            foreach (var key in expiredKeys)
            {
                _frameBuffer.TryRemove(key, out _);
            }
        }

        #endregion

        #region --- INNER CLASSES (MODEL DỮ LIỆU) ---

        /// <summary>
        /// Class nội bộ lưu trạng thái của một Frame đang được lắp ráp.
        /// </summary>
        private class ReceivedFrame
        {
            public ushort TotalPackets { get; set; }    // Tổng số gói cần nhận
            public DateTime Timestamp { get; set; }     // Thời gian server bắt đầu nhận (để timeout)
            public long SenderTicks { get; set; }       // Thời gian agent chụp (để tính latency)
            
            // Dictionary lưu các mảnh: Key=Index, Value=Data
            public Dictionary<ushort, byte[]> Packets { get; set; } = new();
        }

        #endregion
    }
}