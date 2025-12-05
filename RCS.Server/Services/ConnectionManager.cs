using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace RCS.Server.Services
{
    /// <summary>
    /// Lớp quản lý danh sách các kết nối Agent đang online.
    /// Sử dụng ConcurrentDictionary để đảm bảo an toàn luồng (Thread-Safe) khi có nhiều truy cập cùng lúc.
    /// </summary>
    public class ConnectionManager : IConnectionManager
    {
        // Bộ nhớ lưu trữ ánh xạ: AgentID (Key) -> ConnectionID (Value)
        // Dùng ConcurrentDictionary thay vì Dictionary thường để tránh lỗi race condition.
        private readonly ConcurrentDictionary<string, string> _agentConnections = new();

        #region --- QUẢN LÝ KẾT NỐI (ADD / REMOVE) ---

        /// <summary>
        /// Thêm hoặc cập nhật thông tin kết nối của một Agent.
        /// </summary>
        /// <param name="agentId">Mã định danh Agent</param>
        /// <param name="connectionId">ID kết nối SignalR mới nhất</param>
        public void AddAgent(string agentId, string connectionId)
        {
            // AddOrUpdate: Nếu chưa có thì Thêm, nếu có rồi thì Cập nhật ConnectionId mới
            _agentConnections.AddOrUpdate(agentId, connectionId, (key, oldValue) => connectionId);
        }

        /// <summary>
        /// Xóa Agent khỏi danh sách khi mất kết nối.
        /// </summary>
        /// <param name="connectionId">ID kết nối SignalR vừa bị ngắt</param>
        public void RemoveAgent(string connectionId)
        {
            // Vấn đề: Dictionary được Key theo AgentID, nhưng sự kiện OnDisconnected chỉ trả về ConnectionID.
            // Giải pháp: Phải duyệt qua toàn bộ Dictionary để tìm Key tương ứng với Value này (Reverse Lookup).
            
            var item = _agentConnections.FirstOrDefault(kvp => kvp.Value == connectionId);
            
            // Kiểm tra xem có tìm thấy không (tránh lỗi nếu item là default struct)
            if (!item.Equals(default(KeyValuePair<string, string>)))
            {
                // Xóa Key (AgentID) ra khỏi bộ nhớ
                _agentConnections.TryRemove(item.Key, out _);
            }
        }

        #endregion

        #region --- TRUY VẤN THÔNG TIN (GET) ---

        /// <summary>
        /// Lấy ConnectionID hiện tại của một Agent.
        /// </summary>
        public string GetAgentConnectionId(string agentId)
        {
            _agentConnections.TryGetValue(agentId, out var connectionId);
            return connectionId; // Trả về null nếu không tìm thấy
        }

        /// <summary>
        /// Lấy danh sách toàn bộ các AgentID đang online.
        /// </summary>
        public IEnumerable<string> GetAllActiveAgents()
        {
            return _agentConnections.Keys;
        }

        #endregion
    }
}