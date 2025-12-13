// -----------------------------------------------------------------------------
// File: ProcessInfo.cs
// Description:
//      Định nghĩa thông tin về một process đang chạy
//
//      Mục đích: Cung cấp cấu trúc dữ liệu để truyền thông tin ứng dụng giữa Client, Server và Agent.
// -----------------------------------------------------------------------------

namespace RCS.Common.Models
{
    public class ProcessInfo
    {
        public int Pid { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        
        // Các thông số chi tiết
        public int Threads { get; set; }
        public int Handles { get; set; }
        
        // Tài nguyên sử dụng
        public string Cpu { get; set; }     // VD: 12.5%
        public string Mem { get; set; }     // VD: 150 MB
        public string Disk { get; set; }    // MỚI: VD: 2.5 MB/s
    }
}