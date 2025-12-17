using Microsoft.AspNetCore.SignalR;
using RCS.Common.Models;
using RCS.Server.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace RCS.Server.Hubs
{
    /// <summary>
    /// Hub dành cho người điều khiển (Web Dashboard) kết nối.
    /// Tại đây xử lý việc đăng nhập và nhận lệnh điều khiển để gửi sang Agent.
    /// </summary>
    public class ClientHub : Hub
    {
        private readonly AgentCommandService _commandService;

        private readonly IConnectionManager _connectionManager;

        // =========================================================================
        // MOCK DATABASE (DANH SÁCH TÀI KHOẢN)
        // Trong thực tế, phần này nên được thay thế bằng Database (SQL, MongoDB...)
        // =========================================================================
        private static readonly Dictionary<string, string> _users = new()
        {   
            { "admin", "admin123" },
            { "Khoi", "1901" },
            { "Khiem", "admin123" },
            { "Huy", "admin123" }
        };

        public ClientHub(AgentCommandService commandService, IConnectionManager connectionManager)
        {
            _commandService = commandService;
            _connectionManager = connectionManager; // Gán biến
        }

        #region --- CONNECTION LIFECYCLE & AUTH (XÁC THỰC KẾT NỐI) ---

        /// <summary>
        /// Được gọi tự động khi một Client cố gắng kết nối tới Hub.
        /// Tại đây thực hiện kiểm tra Username/Password.
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            
            string username = "";
            string password = "";

            if (httpContext != null)
            {
                // Lấy thông tin xác thực từ Query String của URL kết nối
                // Ví dụ: ws://localhost:5000/clienthub?username=admin&access_token=admin123
                username = httpContext.Request.Query["username"].ToString();
                
                // SignalR JS Client thường gửi token qua biến "access_token"
                password = httpContext.Request.Query["access_token"].ToString();
            }

            Console.WriteLine($"[Auth] Đăng nhập: User='{username}'");

            // Kiểm tra logic đăng nhập:
            // 1. Username không rỗng
            // 2. Username có tồn tại trong danh sách
            // 3. Password khớp
            if (string.IsNullOrEmpty(username) || 
                !_users.ContainsKey(username) || 
                _users[username] != password)
            {
                Console.WriteLine($"[Auth] Thất bại. Từ chối kết nối.");
                
                // Quan trọng: Ngắt kết nối ngay lập tức nếu sai mật khẩu.
                // Client phía Web sẽ nhận được sự kiện Error/Closed.
                Context.Abort(); 
                return;
            }
            
            // 3. THÊM: Lấy danh sách Agent đang online
            var onlineAgents = _connectionManager.GetAllActiveAgents();

            // 4. THÊM: Gửi ngay cho Client vừa kết nối (Caller)
            await Clients.Caller.SendAsync("UpdateAgentList", onlineAgents);

            Console.WriteLine($"[Auth] Thành công. User='{username}'. Sent {onlineAgents} agents.");
            await base.OnConnectedAsync();
        }

        #endregion

        #region --- PUBLIC METHODS (LỆNH TỪ WEB GỬI LÊN) ---

        /// <summary>
        /// Web Client gọi hàm này để gửi một lệnh điều khiển tới một Agent cụ thể.
        /// </summary>
        /// <param name="agentId">ID của máy trạm cần điều khiển.</param>
        /// <param name="command">Nội dung lệnh (Action, Params).</param>
        public async Task SendToAgent(string agentId, CommandMessage command)
        {
            try
            {
                // Chuyển tiếp lệnh sang Service trung gian để xử lý gửi qua AgentHub
                await _commandService.SendCommandToAgentAsync(agentId, command);
            }
            catch (Exception ex)
            {
                // Nếu có lỗi (ví dụ: Agent không tồn tại, Agent Offline), báo lại cho Web Client biết
                await Clients.Caller.SendAsync("ReceiveResponse", new { error = ex.Message });
            }
        }

        #endregion
    }
}