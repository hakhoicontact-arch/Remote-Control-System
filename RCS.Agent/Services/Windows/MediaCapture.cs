// -----------------------------------------------------------------------------
// File: MediaCapture.cs
// Description: Dịch vụ chụp ảnh màn hình và quay webcam.
// Mục đích: Cung cấp các chức năng để chụp ảnh màn hình (trả về Base64) 
//           và lấy frame từ webcam (trả về byte array).
// -----------------------------------------------------------------------------

using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms; // Cần thiết để lấy thông tin Screen.PrimaryScreen
using OpenCvSharp;

namespace RCS.Agent.Services.Windows
{
    public class MediaCapture : IDisposable
    {
        #region --- CONFIGURATION & CONSTANTS ---

        // Kích thước mong muốn cho khung hình Webcam
        public const double FRAME_WIDTH = 480*2;
        public const double FRAME_HEIGHT = 270*2;

        #endregion

        #region --- NATIVE INTEROP (GIAO TIẾP WIN32 API) ---

        // Import hàm từ user32.dll để báo cho Windows biết ứng dụng này hỗ trợ DPI cao.
        // Tác dụng: Giúp ảnh chụp màn hình lấy đúng độ phân giải thực tế (Physical Pixels), 
        // tránh bị mờ hoặc bị phóng to/thu nhỏ sai lệch trên các màn hình 2K/4K (Scaling > 100%).
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        #endregion

        #region --- FIELDS (BIẾN TOÀN CỤC) ---

        // Đối tượng Webcam của OpenCvSharp
        private VideoCapture _capture;
        
        // Cờ đánh dấu trạng thái webcam đã sẵn sàng chưa
        private bool _isWebcamReady = false;

        #endregion

        #region --- CONSTRUCTOR ---

        public MediaCapture()
        {
            // Cố gắng đặt chế độ DPI Aware ngay khi khởi tạo service
            try 
            { 
                SetProcessDPIAware(); 
            } 
            catch { }
        }

        #endregion

        #region --- SCREEN CAPTURE FEATURES (CHỤP MÀN HÌNH) ---

        /// <summary>
        /// Chụp toàn bộ màn hình chính và trả về chuỗi Base64 (để hiển thị trên Web).
        /// </summary>
        public string CaptureScreenBase64()
        {
            try
            {
                // 1. Lấy kích thước màn hình chính
                Rectangle bounds = Screen.PrimaryScreen.Bounds;

                // 2. Tạo Bitmap trống với kích thước tương ứng
                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    // 3. Tạo đối tượng Graphics từ Bitmap để vẽ
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        // 4. Copy điểm ảnh từ màn hình vào Bitmap
                        g.CopyFromScreen(System.Drawing.Point.Empty, System.Drawing.Point.Empty, bounds.Size);
                    }

                    // 5. Chuyển đổi Bitmap thành chuỗi Base64
                    return BitmapToBase64(bitmap);
                }
            }
            catch 
            { 
                // Trả về chuỗi rỗng nếu có lỗi (ví dụ: màn hình bị khóa, không có quyền)
                return ""; 
            }
        }

        #endregion

        #region --- WEBCAM FEATURES (QUAY VIDEO) ---

        /// <summary>
        /// Khởi động kết nối tới Webcam số 0.
        /// </summary>
        public bool StartWebcam()
        {
            // Nếu đã mở rồi thì không mở lại
            if (_isWebcamReady && _capture != null && _capture.IsOpened()) return true;

            try
            {
                // 1. Mở Camera index 0 (Camera mặc định)
                _capture = new VideoCapture(0, VideoCaptureAPIs.DSHOW);

                // 2. Cấu hình các thông số cho Camera
                _capture.Set(VideoCaptureProperties.FrameWidth, FRAME_WIDTH);
                _capture.Set(VideoCaptureProperties.FrameHeight, FRAME_HEIGHT);
                // Lưu ý: Program.FRAME_PER_SECOND là biến global từ bên ngoài (giữ nguyên theo code gốc)
                _capture.Set(VideoCaptureProperties.Fps, Program.FRAME_PER_SECOND);

                // 3. Kiểm tra kết quả mở
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
                StopWebcam(); // Dọn dẹp nếu lỗi
                return false;
            }
        }

        /// <summary>
        /// Đọc một khung hình (frame) từ Webcam và nén sang định dạng JPEG (byte array).
        /// </summary>
        public byte[] GetWebcamFrameBytes()
        {
            if (!_isWebcamReady || _capture == null) return null;

            try
            {
                using (Mat frame = new Mat())
                {
                    // 1. Đọc frame từ thiết bị vào matrix
                    if (_capture.Read(frame) && !frame.Empty())
                    {
                        // 2. Cấu hình nén ảnh JPEG
                        // - JpegQuality = 80: Cân bằng tốt giữa chất lượng và dung lượng (phù hợp stream qua mạng)
                        var encodeParams = new int[] { (int)ImwriteFlags.JpegQuality, 65 };
                        
                        // 3. Encode (nén) matrix thành mảng byte .jpg
                        Cv2.ImEncode(".jpg", frame, out byte[] buf, encodeParams);

                        return buf;
                    }
                }
                return null;
            }
            catch (Exception ex)
            {
                // Nếu lỗi xảy ra (ví dụ: rút camera đột ngột), cập nhật trạng thái và dừng cam
                _isWebcamReady = false;
                Console.WriteLine($"[Webcam Error] Failed to get webcam frame: {ex.Message}");
                StopWebcam();
                return null;
            }
        }

        /// <summary>
        /// Dừng Webcam và giải phóng tài nguyên OpenCV.
        /// </summary>
        public void StopWebcam()
        {
            try
            {
                if (_capture != null)
                {
                    _capture.Release(); // Nhả thiết bị phần cứng
                    _capture.Dispose(); // Dọn dẹp đối tượng C#
                    _capture = null;
                }
            }
            catch { }
            _isWebcamReady = false;
        }

        #endregion

        #region --- DISPOSAL & HELPERS ---

        /// <summary>
        /// Hàm dọn dẹp tài nguyên khi hủy đối tượng MediaCapture.
        /// </summary>
        public void Dispose()
        {
            StopWebcam();
        }

        /// <summary>
        /// Helper: Chuyển đổi Bitmap sang chuỗi Base64 (Dùng riêng cho chụp màn hình).
        /// </summary>
        private string BitmapToBase64(Bitmap bitmap, long quality = 75L)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                // Lấy bộ mã hóa JPEG
                ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                
                // Cấu hình tham số chất lượng (Quality)
                var encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);

                // Lưu bitmap vào MemoryStream dưới dạng JPEG
                bitmap.Save(ms, jpgEncoder, encoderParams);
                
                // Chuyển mảng byte thành chuỗi Base64 có header
                return "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
            }
        }

        /// <summary>
        /// Helper: Tìm codec thông tin dựa trên định dạng ảnh (JPEG, PNG...).
        /// </summary>
        private ImageCodecInfo GetEncoder(ImageFormat format)
        {
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageDecoders())
            {
                if (codec.FormatID == format.Guid) return codec;
            }
            return null;
        }

        #endregion
    }
}