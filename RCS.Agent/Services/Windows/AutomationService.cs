using System;
using System.Speech.Synthesis; // Cần package System.Speech
using System.Threading.Tasks;
using System.Windows.Forms;

namespace RCS.Agent.Services.Windows
{
    public class AutomationService
    {
        private readonly SpeechSynthesizer _synthesizer;

        public AutomationService()
        {
            // Khởi tạo bộ tổng hợp tiếng nói (chỉ chạy trên Windows)
            if (OperatingSystem.IsWindows())
            {
                _synthesizer = new SpeechSynthesizer();
                _synthesizer.Volume = 100; // Max volume
                _synthesizer.Rate = 0;     // Tốc độ bình thường (-10 đến 10)
            }
        }

        public void ShowMessageBox(string message)
        {
            // Chạy trong Task mới để không chặn luồng chính của Agent
            Task.Run(() =>
            {
                MessageBox.Show(
                    message, 
                    "CẢNH BÁO TỪ HỆ THỐNG", 
                    MessageBoxButtons.OK, 
                    MessageBoxIcon.Warning, 
                    MessageBoxDefaultButton.Button1, 
                    MessageBoxOptions.ServiceNotification // Quan trọng: Giúp hiện lên trên các cửa sổ khác
                );
            });
        }

        public void SpeakText(string text)
        {
            if (_synthesizer == null) return;

            Task.Run(() =>
            {
                try
                {
                    _synthesizer.Speak(text);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[TTS Error] {ex.Message}");
                }
            });
        }
    }
}