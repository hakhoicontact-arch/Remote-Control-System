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
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // --- 1. Cấu hình SignalR ---
            // Tăng giới hạn tin nhắn lên 10MB để server có thể nhận ảnh (screenshot/webcam)
            builder.Services.AddSignalR(options => {
                options.MaximumReceiveMessageSize = 10 * 1024 * 1024;
            });

            // --- 2. Cấu hình CORS ---
            // Cấu hình này cực kỳ quan trọng để Frontend (HTML) gọi được vào Server
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowClient", policy =>
                {
                    // Lưu ý: Nếu bạn chạy Frontend ở cổng khác, hãy thêm vào đây
                    policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // --- 3. Đăng ký Services (Dependency Injection) ---
            // ConnectionManager cần là Singleton để giữ danh sách Agent đang online trong bộ nhớ
            builder.Services.AddSingleton<IConnectionManager, ConnectionManager>();
            builder.Services.AddSingleton<AgentCommandService>();

            // QUAN TRỌNG: Đăng ký dịch vụ lắng nghe UDP chạy ngầm (Hosted Service)
            // Nếu thiếu dòng này, Server sẽ không mở cổng 6000 để nhận Video
            builder.Services.AddHostedService<UdpListenerService>();

            // --- 4. Build App ---
            var app = builder.Build();

            // --- 5. Middleware Pipeline ---
            app.UseRouting();
            
            // Kích hoạt CORS
            app.UseCors("AllowClient");

            // Map các Hub SignalR
            app.MapHub<ClientHub>("/clienthub");
            app.MapHub<AgentHub>("/agenthub");

            // Endpoint kiểm tra server sống hay chết
            app.MapGet("/", () => "RCS Server is running...");

            // Chạy ứng dụng
            app.Run();
        }
    }
}