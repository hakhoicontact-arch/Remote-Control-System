using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Server.Hubs;
using System.Threading.Tasks;

namespace RCS.Server.Services
{
    /// <summary>
    /// Service đóng vai trò trung gian (Bridge).
    /// Giúp chuyển tiếp lệnh từ phía người điều khiển (ClientHub/Controller) sang cho máy trạm (AgentHub).
    /// </summary>
    public class AgentCommandService
    {
        // Context của AgentHub: Cho phép gửi tin nhắn tới các Agent mà không cần ở trong AgentHub
        private readonly IHubContext<AgentHub> _agentHubContext;
        
        // Quản lý danh sách kết nối: Để tra cứu ConnectionId từ AgentId
        private readonly IConnectionManager _connectionManager;

        public AgentCommandService(IHubContext<AgentHub> agentHubContext, IConnectionManager connectionManager)
        {
            _agentHubContext = agentHubContext;
            _connectionManager = connectionManager;
        }

        /// <summary>
        /// Gửi một lệnh điều khiển tới một Agent cụ thể.
        /// </summary>
        /// <param name="agentId">Mã định danh của máy trạm (VD: Agent_12345)</param>
        /// <param name="command">Gói tin lệnh cần gửi</param>
        public async Task SendCommandToAgentAsync(string agentId, CommandMessage command)
        {
            // Bước 1: Tra cứu ConnectionID (ID kết nối SignalR) dựa trên AgentID
            var connectionId = _connectionManager.GetAgentConnectionId(agentId);
            
            if (!string.IsNullOrEmpty(connectionId))
            {
                // Bước 2: Gửi lệnh đích danh tới đúng ConnectionId đó.
                // Hàm "ReceiveCommand" phải trùng khớp với tên hàm lắng nghe bên phía Agent (SignalRClient.cs)
                await _agentHubContext.Clients.Client(connectionId).SendAsync("ReceiveCommand", command);
            }
            else
            {
                // Bước 3: Xử lý lỗi nếu Agent không online
                throw new System.Exception($"Agent '{agentId}' is offline or not found.");
            }
        }
    }
}