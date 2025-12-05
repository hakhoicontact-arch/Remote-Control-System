// -----------------------------------------------------------------------------
// File: SignalRClient.cs
// Role: Định tuyến giao tiếp giữa Agent và Server thông qua SignalR.
//
// Chịu trách nhiệm:
//      1. Giữ kết nối (Connection Keep-Alive).
//      2. Nhận lệnh (CommandMessage) từ Server -> Kích hoạt Event cho Agent xử lý.
//      3. Gửi phản hồi (Response), cập nhật trạng thái (Update), hoặc dữ liệu (Binary) lên Server.
//
// Tác động hệ thống:
//      - Nếu kết nối chết -> Agent cô lập, không nhận được lệnh.
//      - Nếu sai Protocol -> Server từ chối xử lý.
// -----------------------------------------------------------------------------

using Microsoft.AspNetCore.SignalR.Client;
using RCS.Common.Models;
using RCS.Common.Protocols;
using System;
using System.Threading.Tasks;

namespace RCS.Agent.Services
{
    public class SignalRClient
    {
        #region --- FIELDS & EVENTS ---

        private readonly string _serverUrl;
        private HubConnection _connection;

        // Event này sẽ được kích hoạt khi nhận được lệnh từ Server.
        // Agent chính sẽ đăng ký vào event này để biết khi nào cần làm việc.
        public event Func<CommandMessage, Task> OnCommandReceived;

        #endregion

        #region --- INITIALIZATION (KHỞI TẠO) ---

        public SignalRClient(string serverUrl)
        {
            _serverUrl = serverUrl;

            // 1. Cấu hình kết nối SignalR
            _connection = new HubConnectionBuilder()
                .WithUrl(_serverUrl)
                .WithAutomaticReconnect() // Quan trọng: Tự động thử kết nối lại nếu mạng chập chờn
                .Build();

            // 2. Đăng ký các trình lắng nghe (Listeners) NGAY KHI khởi tạo
            // Lắng nghe lệnh "ReceiveCommand" từ Server gửi xuống
            _connection.On<CommandMessage>(ProtocolConstants.ReceiveCommand, async (cmd) =>
            {
                if (OnCommandReceived != null)
                {
                    // Delegate việc xử lý cho lớp bên trên (Agent) thông qua Event
                    await OnCommandReceived.Invoke(cmd);
                }
            });
        }

        #endregion

        #region --- CONNECTION MANAGEMENT (QUẢN LÝ KẾT NỐI) ---

        /// <summary>
        /// Bắt đầu kết nối tới Server và định danh (Register) bản thân Agent.
        /// </summary>
        /// <param name="agentId">Mã định danh duy nhất của máy này.</param>
        public async Task ConnectAsync(string agentId)
        {
            try
            {
                // Bắt đầu bắt tay (Handshake) với Server
                await _connection.StartAsync();
                Console.WriteLine($"[SignalR] Connected to {_serverUrl}");

                // Sau khi kết nối thành công, gửi ngay gói tin đăng ký để Server biết mình là ai
                // ProtocolConstants.RegisterAgent là tên hàm trên Server Hub
                await _connection.InvokeAsync(ProtocolConstants.RegisterAgent, agentId);
            }
            catch (Exception ex)
            {
                // Nếu Server chưa bật hoặc sai URL
                Console.WriteLine($"[SignalR] Connection Failed: {ex.Message}");
            }
        }

        #endregion

        #region --- OUTBOUND MESSAGES (GỬI DỮ LIỆU ĐI) ---

        /// <summary>
        /// Gửi kết quả thực thi lệnh (Thành công/Thất bại/Kết quả text) về Server.
        /// </summary>
        public async Task SendResponseAsync(ResponseMessage response)
        {
            // Luôn kiểm tra trạng thái kết nối trước khi gửi để tránh crash ứng dụng
            if (_connection.State == HubConnectionState.Connected)
            {
                await _connection.InvokeAsync(ProtocolConstants.SendResponse, response);
            }
        }

        /// <summary>
        /// Gửi các thông tin cập nhật thời gian thực (VD: % CPU, RAM, Log).
        /// </summary>
        public async Task SendUpdateAsync(RealtimeUpdate update)
        {
            if (_connection.State == HubConnectionState.Connected)
            {
                await _connection.InvokeAsync(ProtocolConstants.SendUpdate, update);
            }
        }

        /// <summary>
        /// Gửi dữ liệu nhị phân (VD: Ảnh chụp màn hình, luồng video) dạng Base64.
        /// </summary>
        public async Task SendBinaryAsync(string base64Data)
        {
            if (_connection.State == HubConnectionState.Connected)
            {
                // Lưu ý: Dữ liệu base64 có thể rất lớn, cần đảm bảo SignalR Server đã cấu hình MaxMessageSize đủ lớn
                await _connection.InvokeAsync(ProtocolConstants.SendBinaryStream, base64Data);
            }
        }

        #endregion
    }
}