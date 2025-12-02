using OpenCvSharp; // Thư viện mới
// using OpenCvSharp.Extensions; // Đã xóa dòng này để fix lỗi thiếu reference
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
// System.Windows.Forms vẫn cần để lấy độ phân giải màn hình
using System.Windows.Forms; 

namespace RCS.Agent.Services.Windows
{
    public class MediaCapture : IDisposable
    {
        // --- 1. PHẦN CHỤP MÀN HÌNH (Giữ nguyên dùng GDI+) ---
        [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();

        public MediaCapture()
        {
            try { SetProcessDPIAware(); } catch { }
        }

        public string CaptureScreenBase64()
        {
            try
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        // SỬA LỖI CS0104: Chỉ định rõ System.Drawing.Point để tránh nhầm với OpenCvSharp.Point
                        g.CopyFromScreen(System.Drawing.Point.Empty, System.Drawing.Point.Empty, bounds.Size);
                    }
                    return BitmapToBase64(bitmap);
                }
            }
            catch { return ""; }
        }

        // --- 2. PHẦN WEBCAM (SỬ DỤNG OPENCV - KHÔNG CẦN EXTENSIONS) ---
        
        private VideoCapture _capture;
        private bool _isWebcamReady = false;

        public bool StartWebcam()
        {
            if (_isWebcamReady && _capture != null && _capture.IsOpened()) return true;

            try
            {
                // Mở Camera số 0
                _capture = new VideoCapture(0);
                
                // Cấu hình Camera
                _capture.Set(VideoCaptureProperties.FrameWidth, 640);
                _capture.Set(VideoCaptureProperties.FrameHeight, 480);
                _capture.Set(VideoCaptureProperties.Fps, 30);

                if (_capture.IsOpened())
                {
                    _isWebcamReady = true;
                    Console.WriteLine("[Webcam] OpenCV connected successfully!");
                    return true;
                }
                
                Console.WriteLine("[Webcam] OpenCV cannot open camera 0.");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Webcam Init Error] {ex.Message}");
                StopWebcam();
                return false;
            }
        }

        public void StopWebcam()
        {
            try
            {
                if (_capture != null)
                {
                    _capture.Release();
                    _capture.Dispose();
                    _capture = null;
                }
            }
            catch { }
            _isWebcamReady = false;
        }

        public byte[] GetWebcamFrameBytes()
        {
            if (!_isWebcamReady || _capture == null) return null;

            try
            {
                using (Mat frame = new Mat())
                {
                    // Lấy frame từ camera
                    if (_capture.Read(frame) && !frame.Empty())
                    {
                        // SỬA LỖI: Dùng Cv2.ImEncode thay vì BitmapConverter
                        // Cách này nén thẳng Mat sang mảng byte JPEG mà không cần System.Drawing
                        // Giúp loại bỏ sự phụ thuộc vào OpenCvSharp.Extensions
                        
                        var encodeParams = new int[] { (int)ImwriteFlags.JpegQuality, 50 };
                        Cv2.ImEncode(".jpg", frame, out byte[] buf, encodeParams);
                        
                        return buf;
                    }
                }
                return null;
            }
            catch 
            { 
                return null; 
            }
        }

        public void Dispose()
        {
            StopWebcam();
        }

        // Helper: Bitmap -> Base64 String (Chỉ dùng cho chụp màn hình)
        private string BitmapToBase64(Bitmap bitmap, long quality = 75L)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                var encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
                bitmap.Save(ms, jpgEncoder, encoderParams);
                return "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
            }
        }

        private ImageCodecInfo GetEncoder(ImageFormat format)
        {
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageDecoders())
            {
                if (codec.FormatID == format.Guid) return codec;
            }
            return null;
        }
    }
}