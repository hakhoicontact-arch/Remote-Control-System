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
        private static readonly Dictionary<string, string> _users = new()
        {   
            { "admin", "admin123" },
            { "Khoi", "1901" },
            { "Khiem", "admin123" },
            { "Huy", "admin123" }
        };

        public ClientHub(AgentCommandService commandService)
        {
            _commandService = commandService;
        }

        // --- XÁC THỰC KẾT NỐI ---
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            
            string username = "";
            string password = "";

            if (httpContext != null)
            {
                // Lấy thông tin từ đường dẫn kết nối
                username = httpContext.Request.Query["username"].ToString();
                password = httpContext.Request.Query["access_token"].ToString();
            }

            Console.WriteLine($"[Auth] Đăng nhập: User='{username}'");

            // Kiểm tra Tài khoản và Mật khẩu
            if (string.IsNullOrEmpty(username) || 
                !_users.ContainsKey(username) || 
                _users[username] != password)
            {
                Console.WriteLine($"[Auth] Thất bại. Từ chối kết nối.");
                Context.Abort(); // Ngắt kết nối ngay lập tức -> Client sẽ nhận lỗi
                return;
            }

            Console.WriteLine($"[Auth] Thành công. User='{username}'");
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
                await Clients.Caller.SendAsync("ReceiveResponse", new { error = ex.Message });
            }
        }
    }
}