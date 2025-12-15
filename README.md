# RCS - Remote Control System (Hệ thống Điều khiển Từ xa)

RCS là một giải pháp quản trị hệ thống cho phép điều khiển và giám sát máy tính trong mạng LAN thông qua giao diện Web.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Core](https://img.shields.io/badge/Core-C%2B%2B17-blue)
![Backend](https://img.shields.io/badge/Backend-.NET%208.0-purple)
![Frontend](https://img.shields.io/badge/Frontend-html)

## 🚀 Tính năng nổi bậc

### 1. Giám sát Hệ thống (System Monitoring)

- Real-time Metrics: Theo dõi % CPU, RAM, Disk I/O theo thời gian thực (Sampling interval: 500ms).

- Process Manager: Liệt kê, tìm kiếm và cưỡng chế tắt (Kill) tiến trình.

- Application Manager: Quét sâu Registry (LocalMachine & CurrentUser) để liệt kê phần mềm đã cài đặt, hỗ trợ mở/đóng ứng dụng từ xa.

- System Specs: Trích xuất thông tin phần cứng chi tiết qua WMI (CPU Name, Cores, GPU, RAM Bus, MAC Address, Uptime...).

### 2. Streaming Video Chất lượng cao (Advanced Webcam)

- Hybrid Protocol: Sử dụng giao thức lai ghép để tối ưu hóa hiệu năng:
  
  - UDP (Agent -> Server): Dữ liệu hình ảnh được cắt nhỏ (Fragmentation) và bắn qua UDP để giảm độ trễ (Low Latency) và tránh nghẽn cổ chai TCP (Head-of-line blocking).

  - SignalR/WebSocket (Server -> Client): Server lắp ghép gói tin và chuyển tiếp xuống trình duyệt.

- High Performance: Sử dụng thư viện OpenCvSharp (truy cập DirectShow) để đạt 30 FPS và độ phân giải HD (720p).

- Client-side Recording: Hỗ trợ ghi hình và lưu video .webm ngay trên trình duyệt.

### 3. Các Tiện ích Khác

- Keylogger: Ghi lại phím bấm thời gian thực với thuật toán chống nảy phím (Debounce).

- Screen Capture: Chụp ảnh màn hình độ nét cao (DPI Aware).

- Power Control: Shutdown/Restart máy trạm từ xa.

- Security: Cơ chế xác thực mật khẩu an toàn.

## 🛠️ Kiến Trúc Hệ Thống

Hệ thống được xây dựng trên mô hình 3 lớp (3-Tier Architecture): 
```
graph LR
    A[Web Client (Browser)] <-->|SignalR (TCP)| B(RCS.Server - Broker)
    C[RCS.Agent (Target PC)] <-->|SignalR (Cmd) + UDP (Video)| B
```

### 1.RCS.Client (Frontend):

- Giao diện HTML5/TailwindCSS hiện đại.

- Xử lý luồng dữ liệu Binary sang Blob Object URL để hiển thị video mượt mà, tối ưu bộ nhớ.

### 2. RCS.Server (Middleware):

- ASP.NET Core 8.0.

- Đóng vai trò định tuyến lệnh (Routing) và cầu nối dữ liệu (Relay).

- Chứa UdpListenerService để hứng và lắp ghép các gói tin video UDP.

### 3. RCS.Agent (Target):

- Console Application chạy ngầm (.NET 8).

- Sử dụng P/Invoke để gọi Windows API (User32, Kernel32) và WMI.

## 📦 Hướng Dẫn Cài Đặt & Sử Dụng

### Yêu cầu hệ thống

- .NET SDK 8.0 trở lên.

- Hệ điều hành: Windows 10/11 (cho Agent và Server).

- Môi trường mạng: LAN hoặc VPN (Radmin/Hamachi).

### Bước 1: Khởi chạy Server (Máy Quản Lý)

- Mở Terminal tại thư mục `RCS.Server`.

- Chạy lệnh sau (Bắt buộc dùng `0.0.0.0` để nghe mọi IP):

```
dotnet run --urls="[http://0.0.0.0:5000](http://0.0.0.0:5000)"
```

*Lưu ý quan trọng: Cần mở cổng **5000 (TCP)** và **6000 (UDP)** trên Windows Firewall của máy Server.*

### Bước 2: Khởi chạy Agent (Máy Bị Điều Khiển)

- Copy thư mục `RCS.Agent` sang máy cần điều khiển.

- Mở Terminal tại thư mục đó.

- Chạy lệnh kết nối tới IP của Server:

```
# Cú pháp: dotnet run -- <IP_CỦA_SERVER>
dotnet run -- 192.168.1.10
```

- *(Nếu không nhập tham số, chương trình sẽ dừng lại và hỏi IP).*

- Nhập tên định danh cho máy (Ví dụ: `PC_KeToan`).

### Bước 3: Điều khiển trên Web

- Tại máy quản lý, mở file `RCS.Client/public/index.html` (Khuyến khích dùng Live Server của VS Code).

**Nhập thông tin:**

> **IP Server: `172.0.0.1` (IP máy chạy Server).**
>
> **Tài khoản: `admin`**
>
> **Mật khẩu: `admin123`**

- Nhấn nút `Đăng nhập`

## 🔧 Khắc phục sự cố (Troubleshooting)

| Vấn đề | Nguyên nhân | Giải pháp |
| :--- | :--- | :--- |
| **Web báo "Mất kết nối"** | Server chưa chạy hoặc Firewall chặn. | - Kiểm tra xem Server có đang chạy lệnh `dotnet run` không.<br>- Tắt tạm thời Firewall trên máy Server. |
| **Agent báo "Refused"** | Agent kết nối sai IP hoặc Port 5000 chưa mở. | Kiểm tra lại IP Server đã nhập khi chạy Agent. |
| **Webcam đen thui** | Mất gói tin UDP hoặc Camera bị chiếm dụng. | - Đảm bảo không có app nào khác (Zoom, Zalo) đang dùng Camera.<br>- Kiểm tra xem `Port 6000 UDP` có được mở không. |


## 📝 License & Credits

Dự án được thực hiện nhằm mục đích nghiên cứu và học tập môn Mạng Máy Tính.

Authors: Lớp 24CTT5 - HCMUS.

- Thành viên 1: Hà Đăng Khôi

- Thành viên 2: Vương Đắc Gia Khiêm

- Thành viên 3: Lê Đình Húy


