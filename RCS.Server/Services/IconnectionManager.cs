using System.Collections.Generic;

namespace RCS.Server.Services
{
    /// <summary>
    /// Giao diện quản lý kết nối (Contract).
    /// Định nghĩa các hành vi bắt buộc để theo dõi trạng thái Online/Offline của các Agent.
    /// </summary>
    public interface IConnectionManager
    {
        #region --- STATE MODIFICATION (THAY ĐỔI TRẠNG THÁI) ---

        /// <summary>
        /// Đăng ký một Agent mới hoặc cập nhật ID kết nối nếu Agent kết nối lại.
        /// </summary>
        /// <param name="agentId">Mã định danh duy nhất của Agent (VD: Agent_01)</param>
        /// <param name="connectionId">ID kết nối SignalR (Guid string)</param>
        void AddAgent(string agentId, string connectionId);

        /// <summary>
        /// Hủy đăng ký Agent khi ngắt kết nối.
        /// </summary>
        /// <param name="connectionId">ID kết nối SignalR cần xóa</param>
        void RemoveAgent(string connectionId);

        #endregion

        #region --- QUERIES (TRUY VẤN THÔNG TIN) ---

        /// <summary>
        /// Tìm ID kết nối SignalR dựa trên mã Agent.
        /// Dùng để gửi lệnh đến đúng máy đích.
        /// </summary>
        /// <param name="agentId">Mã Agent cần tìm</param>
        /// <returns>ConnectionID nếu tìm thấy, hoặc null.</returns>
        string GetAgentConnectionId(string agentId);

        /// <summary>
        /// Lấy danh sách toàn bộ các mã Agent đang hoạt động.
        /// </summary>
        /// <returns>Danh sách AgentId</returns>
        IEnumerable<string> GetAllActiveAgents();

        #endregion
    }
}