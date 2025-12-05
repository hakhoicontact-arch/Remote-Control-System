// -----------------------------------------------------------------------------
// File: Program.cs
// Role: Entry Point (Điểm khởi chạy) của Server ASP.NET Core.
//
// Nhiệm vụ:
//      1. Cấu hình Dependency Injection (DI Container).
//      2. Cấu hình Pipeline xử lý Request (Middleware).
//      3. Khởi động SignalR Hubs và các Service chạy ngầm (UDP Listener).
// -----------------------------------------------------------------------------

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RCS.Server.Hubs;
using RCS.Server.Services;

namespace RCS.Server
{
    public class Program
    {
        // Hằng số cấu hình kích thước tối đa cho gói tin (Ảnh/Video)
        // Được sử dụng bởi cả SignalR và UDP Listener
        public const int ReceiveMessageSize_MB = 50;

        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            #region --- 1. SERVICE CONFIGURATION (CẤU HÌNH DỊCH VỤ) ---

            // A. Cấu hình SignalR
            // Tăng giới hạn kích thước tin nhắn mặc định (32KB) lên 50MB
            // để Server có thể nhận được ảnh chụp màn hình hoặc luồng video chất lượng cao từ Agent.
            builder.Services.AddSignalR(options => {
                options.MaximumReceiveMessageSize = ReceiveMessageSize_MB * 1024 * 1024;
            });

            // B. Cấu hình CORS (Cross-Origin Resource Sharing)
            // Cho phép Frontend (Web Dashboard) chạy ở domain/port khác có thể gọi vào API của Server.
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowClient", policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:5500",  // Live Server (VSCode)
                            "http://127.0.0.1:5500"   // Live Server IP
                          )
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials(); // Bắt buộc phải có để SignalR hoạt động qua CORS
                });
            });

            // C. Đăng ký Dependency Injection (DI)
            
            // ConnectionManager: Singleton để duy trì danh sách Agent online xuyên suốt vòng đời ứng dụng
            builder.Services.AddSingleton<IConnectionManager, ConnectionManager>();
            
            // AgentCommandService: Service trung gian giúp gửi lệnh từ ClientHub sang AgentHub
            builder.Services.AddSingleton<AgentCommandService>();

            // D. Hosted Services (Dịch vụ chạy ngầm)
            // QUAN TRỌNG: Khởi chạy UDP Listener để mở cổng 6000 nhận video streaming
            builder.Services.AddHostedService<UdpListenerService>();

            #endregion

            // --- BUILD APP ---
            var app = builder.Build();

            #region --- 2. MIDDLEWARE PIPELINE (LUỒNG XỬ LÝ) ---

            // Kích hoạt Routing
            app.UseRouting();
            
            // Kích hoạt CORS (Phải đặt giữa UseRouting và UseEndpoints/MapHub)
            app.UseCors("AllowClient");

            // Map các đường dẫn SignalR Hub
            // 1. /clienthub -> Nơi Web Dashboard kết nối
            app.MapHub<ClientHub>("/clienthub");
            
            // 2. /agenthub -> Nơi Máy trạm (Agent) kết nối
            app.MapHub<AgentHub>("/agenthub");

            // Endpoint kiểm tra trạng thái Server (Health Check đơn giản)
            app.MapGet("/", () => "RCS Server is running...");

            #endregion

            // --- RUN APP ---
            app.Run();
        }
    }
}