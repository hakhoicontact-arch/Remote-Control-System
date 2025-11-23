using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Server.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace RCS.Server.Hubs
{
    public class ClientHub : Hub
    {
        private readonly AgentCommandService _commandService;
        
        // DANH SÁCH TÀI KHOẢN (Username / Password)
        // Trong thực tế nên lưu trong Database, ở đây dùng Dictionary demo
        private static readonly Dictionary<string, string> _users = new()
        {
            { "hakhoi1901@gmail.com", "Hakhoi1901tvtcm@" },
            { "khiem", "12345678" },
            { "huy", "12345678" }
        };

        public ClientHub(AgentCommandService commandService)
        {
            _commandService = commandService;
        }

        // --- XÁC THỰC KẾT NỐI ---
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            
            // Lấy username và token (password) từ Query String
            string username = "";
            string token = "";

            if (httpContext != null)
            {
                username = httpContext.Request.Query["username"].ToString();
                token = httpContext.Request.Query["access_token"].ToString();
            }

            // --- LOG ---
            Console.WriteLine($"[ClientHub] Login attempt: User='{username}'");

            // Kiểm tra: 
            // 1. Username có tồn tại không?
            // 2. Password có khớp không?
            if (string.IsNullOrEmpty(username) || 
                !_users.ContainsKey(username) || 
                _users[username] != token)
            {
                Console.WriteLine($"[ClientHub] ❌ Auth FAILED for '{username}'. Aborting.");
                Context.Abort(); // Ngắt kết nối ngay lập tức -> Client sẽ nhận lỗi
                return;
            }

            Console.WriteLine($"[ClientHub] ✅ Auth SUCCESS for '{username}'.");
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
                Console.WriteLine($"[ClientHub] Error: {ex.Message}");
                await Clients.Caller.SendAsync("ReceiveResponse", new { error = ex.Message });
            }
        }
    }
}