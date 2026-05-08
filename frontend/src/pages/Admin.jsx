import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";

export function AdminPanel({ token, refresh }) {
  const [allExams, setAllExams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tab, setTab] = useState("users");

  const loadExams = () => axios.get(`${API}/exams`).then(r => setAllExams(r.data));
  const loadUsers = () => axios.get(`${API}/auth/users`, { headers: { Authorization: "Bearer " + token } }).then(r => setAllUsers(r.data));

  useEffect(() => { loadExams(); loadUsers(); }, [token]);

  const delExam = async (id) => {
    if (!window.confirm("Hành động này sẽ xóa sạch dữ liệu đề thi. Tiếp tục?")) return;
    await axios.delete(`${API}/exams/${id}`, { headers: { Authorization: "Bearer " + token } });
    loadExams(); refresh();
  };

  const changeRole = async (userId, newRole) => {
    if (!window.confirm(`Xác nhận cấp quyền ${newRole.toUpperCase()} cho người dùng này?`)) return;
    try {
      await axios.put(`${API}/auth/users/${userId}/role`, { role: newRole }, { headers: { Authorization: "Bearer " + token } });
      loadUsers();
    } catch (err) { alert("Lỗi khi đổi quyền!"); }
  };

  const delUser = async (userId) => {
    if (!window.confirm("CẢNH BÁO: Bạn sắp xóa vĩnh viễn tài khoản này khỏi hệ thống. Bạn có chắc chắn?")) return;
    try {
      await axios.delete(`${API}/auth/users/${userId}`, { headers: { Authorization: "Bearer " + token } });
      loadUsers();
    } catch (err) { alert("Lỗi khi xóa tài khoản!"); }
  };

  return (
    <div className="card admin-card" style={{marginTop:'20px', background: '#fff1f1', padding: '20px', borderRadius: '10px', border: '2px solid #fecaca', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3 style={{margin: 0, color: '#dc2626'}}>🛠 Bảng Điều Khiển Quản Trị Hệ Thống</h3>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className={tab === "exams" ? "btn-primary" : "btn-outline"} onClick={() => setTab("exams")}>📚 Quản lý Đề thi</button>
          <button className={tab === "users" ? "btn-primary" : "btn-outline"} onClick={() => setTab("users")}>👥 Quản lý Người dùng</button>
        </div>
      </div>

      {tab === "exams" ? (
        <div style={{background: 'white', padding: '15px', borderRadius: '8px'}}>
          {allExams.map(e => (
            <div key={e.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom: '1px solid #fee2e2', alignItems: 'center'}}>
              <span style={{fontSize: '16px'}}>Tên đề: <strong>{e.title}</strong></span>
              <button className="btn-logout" onClick={() => delExam(e.id)}>Xóa đề thi</button>
            </div>
          ))}
          {allExams.length === 0 && <p style={{color: '#666', textAlign: 'center'}}>Hệ thống chưa có đề thi nào.</p>}
        </div>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table className="history-table" style={{width: '100%', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden'}}>
            <thead style={{background: '#fecaca'}}>
              <tr><th>Tài khoản</th><th>Email</th><th>Quyền hệ thống</th><th>Thao tác quản lý</th></tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id}>
                  <td style={{fontSize: '15px'}}><strong>{u.username}</strong></td>
                  <td>{u.email || "Chưa cập nhật"}</td>
                  <td>
                    <span style={{
                      padding: '5px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
                      backgroundColor: u.role === 'admin' ? '#fee2e2' : u.role === 'teacher' ? '#e0e7ff' : '#d1fae5',
                      color: u.role === 'admin' ? '#ef4444' : u.role === 'teacher' ? '#4f46e5' : '#10b981'
                    }}>
                      {u.role ? u.role.toUpperCase() : 'STUDENT'}
                    </span>
                  </td>
                  <td style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <select 
                      className="login-input" 
                      style={{margin: 0, padding: '6px', width: 'auto', fontSize: '13px', cursor: 'pointer'}}
                      value={u.role || 'student'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={u.role === 'admin'} 
                    >
                      <option value="student">🎓 Cấp quyền: Student</option>
                      <option value="teacher">👨‍🏫 Cấp quyền: Teacher</option>
                    </select>
                    
                    {u.role !== 'admin' && (
                      <button className="btn-logout" style={{padding: '6px 12px', fontSize: '13px'}} onClick={() => delUser(u.id)}>
                        🗑️ Xóa User
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}