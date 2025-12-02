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
    public class UdpListenerService : BackgroundService
    {
        private readonly IHubContext<ClientHub> _hubContext;
        private readonly UdpClient _udpServer;
        private const int LISTEN_PORT = 6000;

        private readonly ConcurrentDictionary<int, ReceivedFrame> _frameBuffer = new();

        public UdpListenerService(IHubContext<ClientHub> hubContext)
        {
            _hubContext = hubContext;
            try 
            {
                _udpServer = new UdpClient(LISTEN_PORT);
                // Tăng bộ đệm lên 10MB
                _udpServer.Client.ReceiveBufferSize = 10 * 1024 * 1024; 
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UDP INIT ERROR] {ex.Message}");
                throw; 
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            Console.WriteLine($"[UDP] Server started listening on port {LISTEN_PORT}...");

            _ = Task.Run(async () => {
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(2000);
                    CleanupOldFrames();
                }
            });

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = await _udpServer.ReceiveAsync(stoppingToken);
                    
                    // --- QUAN TRỌNG: Hiện dấu chấm để biết có tín hiệu ---
                    Console.Write("."); 
                    
                    ProcessPacket(result.Buffer);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"\n[UDP Loop Error] {ex.Message}");
                }
            }
        }

        private void ProcessPacket(byte[] data)
        {
            if (data.Length < 12) return; 

            int frameId = BitConverter.ToInt32(data, 0);
            ushort packetIndex = BitConverter.ToUInt16(data, 4);
            ushort totalPackets = BitConverter.ToUInt16(data, 6);
            int dataSize = BitConverter.ToInt32(data, 8);

            if (data.Length != 12 + dataSize) return;

            byte[] payload = new byte[dataSize];
            Array.Copy(data, 12, payload, 0, dataSize);

            // Dùng GetOrAdd để an toàn luồng
            var currentFrame = _frameBuffer.GetOrAdd(frameId, _ => new ReceivedFrame 
            { 
                TotalPackets = totalPackets, 
                Timestamp = DateTime.Now 
            });
            
            lock (currentFrame)
            {
                if (!currentFrame.Packets.ContainsKey(packetIndex))
                {
                    currentFrame.Packets[packetIndex] = payload;
                }

                // Kiểm tra xem đã đủ mảnh chưa
                if (currentFrame.Packets.Count == totalPackets)
                {
                    // In xuống dòng mới để không bị dính vào dấu chấm
                    Console.WriteLine($"\n[UDP] Frame {frameId} OK. Sending...");
                    ReassembleAndSend(frameId, currentFrame);
                    _frameBuffer.TryRemove(frameId, out _);
                }
            }
        }

        private async void ReassembleAndSend(int frameId, ReceivedFrame frame)
        {
            try
            {
                int totalSize = frame.Packets.Values.Sum(p => p.Length);
                byte[] fullImage = new byte[totalSize];

                int offset = 0;
                for (ushort i = 0; i < frame.TotalPackets; i++)
                {
                    if (frame.Packets.TryGetValue(i, out byte[] part))
                    {
                        Array.Copy(part, 0, fullImage, offset, part.Length);
                        offset += part.Length;
                    }
                    else return; 
                }

                string base64 = "data:image/jpeg;base64," + Convert.ToBase64String(fullImage);
                await _hubContext.Clients.All.SendAsync("ReceiveBinaryChunk", base64);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Reassemble Error] {ex.Message}");
            }
        }

        private void CleanupOldFrames()
        {
            var now = DateTime.Now;
            var expiredKeys = _frameBuffer.Where(f => (now - f.Value.Timestamp).TotalSeconds > 1).Select(k => k.Key).ToList();
            if (expiredKeys.Count > 0)
            {
                // Thông báo nếu có frame bị hủy do thiếu gói
                // Console.WriteLine($"\n[UDP] Dropped {expiredKeys.Count} incomplete frames");
            }
            foreach (var key in expiredKeys) _frameBuffer.TryRemove(key, out _);
        }

        private class ReceivedFrame
        {
            public ushort TotalPackets { get; set; }
            public DateTime Timestamp { get; set; }
            public Dictionary<ushort, byte[]> Packets { get; set; } = new();
        }
    }
}