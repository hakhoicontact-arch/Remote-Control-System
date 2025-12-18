using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Common.Protocols;
using RCS.Server.Services;
using System;
using System.Threading.Tasks;

namespace RCS.Server.Hubs
{
    
    public class AgentHub : Hub
    {
        private readonly IHubContext<ClientHub> _clientHubContext;
        
        private readonly IConnectionManager _connectionManager;

        public AgentHub(IHubContext<ClientHub> clientHubContext, IConnectionManager connectionManager)
        {
            _clientHubContext = clientHubContext;
            _connectionManager = connectionManager;
        }

        #region --- CONNECTION LIFECYCLE (QUẢN LÝ KẾT NỐI) ---

        public void RegisterAgent(string agentId)
        {
            // Lưu mapping: AgentId <-> ConnectionId hiện tại
            _connectionManager.AddAgent(agentId, Context.ConnectionId);
            
            Console.WriteLine($"[AgentHub] Agent Registered: {agentId} (ConnId: {Context.ConnectionId})");
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            // Xóa Agent khỏi danh sách quản lý để tránh gửi lệnh vào hư vô
            _connectionManager.RemoveAgent(Context.ConnectionId);
            
            Console.WriteLine($"[AgentHub] Agent Disconnected: {Context.ConnectionId}");
            return base.OnDisconnectedAsync(exception);
        }

        #endregion

        #region --- DATA FORWARDING (CHUYỂN TIẾP DỮ LIỆU SANG CLIENT) ---

        public async Task SendResponse(ResponseMessage response)
        {

            await _clientHubContext.Clients.All.SendAsync("ReceiveResponse", response);
        }

        public async Task SendUpdate(RealtimeUpdate update)
        {
            await _clientHubContext.Clients.All.SendAsync("ReceiveUpdate", update);
            Console.WriteLine($"[AgentHub] đã gửi {update.GetType()} update đến ClientHub.");
        }

        public async Task SendBinaryStream(string base64Data)
        {
            // Chuyển tiếp chuỗi Base64 hình ảnh sang Client để hiển thị lên thẻ <img>
            await _clientHubContext.Clients.All.SendAsync("ReceiveBinaryChunk", base64Data);
        }

        public async Task SendChatReply(string message)
        {
            // Tạo timestamp tại Server để đồng bộ
            string timestamp = DateTime.Now.ToString("HH:mm:ss");
            
            // Chuyển tiếp tin nhắn về Web Client
            await _clientHubContext.Clients.All.SendAsync("ReceiveChatMessage", "Agent", message, timestamp);

            Console.WriteLine($"[AgentHub] đã phản hồi: {message} at {timestamp}");
        }
        #endregion
    }
}