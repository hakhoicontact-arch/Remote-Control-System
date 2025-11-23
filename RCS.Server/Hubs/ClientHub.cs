using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Server.Services;
using System;
using System.Threading.Tasks;

namespace RCS.Server.Hubs
{
    public class ClientHub : Hub
    {
        private readonly AgentCommandService _commandService;
        
        // MẬT KHẨU QUẢN TRỊ (Mặc định là "admin")
        private const string ADMIN_PASSWORD = "1901"; 

        public ClientHub(AgentCommandService commandService)
        {
            _commandService = commandService;
        }

        // --- XÁC THỰC KẾT NỐI ---
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            
            // Lấy token một cách an toàn hơn
            string token = "";
            if (httpContext != null && httpContext.Request.Query.TryGetValue("access_token", out var tokenValue))
            {
                token = tokenValue.ToString();
            }

            // --- DEBUG LOG: In ra màn hình Server để kiểm tra ---
            Console.WriteLine($"[ClientHub] New connection attempt from {Context.ConnectionId}");
            Console.WriteLine($"[ClientHub] Received Token: '{token}'");

            if (string.IsNullOrEmpty(token) || token != ADMIN_PASSWORD)
            {
                Console.WriteLine($"[ClientHub] ❌ Authentication FAILED. Aborting connection.");
                Context.Abort(); 
                return;
            }

            Console.WriteLine($"[ClientHub] ✅ Authentication SUCCESS.");
            await base.OnConnectedAsync();
        }

        public async Task SendToAgent(string agentId, CommandMessage command)
        {
            try
            {
                await _commandService.SendCommandToAgentAsync(agentId, command);
            }
            catch (Exception ex)
            {
                // Nếu lỗi, log ra để biết
                Console.WriteLine($"[ClientHub] Error sending to agent: {ex.Message}");
                await Clients.Caller.SendAsync("ReceiveResponse", new { error = ex.Message });
            }
        }
    }
}