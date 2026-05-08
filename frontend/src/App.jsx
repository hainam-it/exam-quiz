import './App.css';
import React, { useState, useEffect } from "react";
import axios from "axios";

import { AdminPanel } from "./pages/Admin";
// 👇 Đã thêm ExamManager vào dòng dưới đây
import { TeacherPanel, ExamStats, ExamQuestionEditor, QuestionBankManager, ExamManager } from "./pages/Teacher";
import { StudentHistory, ExamTake, ExamReview } from "./pages/Student";
import { ProfileSettings } from "./pages/Profile";

const API = "http://localhost:4000";

// --- 1a. COMPONENT ĐĂNG NHẬP (NÂNG CẤP MODAL QUÊN MẬT KHẨU) ---
function Login({ onLogin, onSwitchRegister }) {
  const [u, setU] = useState(localStorage.getItem("savedUsername") || "");
  const [p, setP] = useState(localStorage.getItem("savedPassword") || "");
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("savedUsername"));
  const [loading, setLoading] = useState(false);
  // State cho hiển thị/ẩn mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  // Thêm state để quản lý Modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/login`, { username: u, password: p });
      if (rememberMe) {
        localStorage.setItem("savedUsername", u);
        localStorage.setItem("savedPassword", p);
      } else {
        localStorage.removeItem("savedUsername");
        localStorage.removeItem("savedPassword");
      }
      onLogin(r.data.access_token);
    } catch (err) {
      alert("Đăng nhập thất bại! Kiểm tra lại tài khoản hoặc mật khẩu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '28px' }}>Welcome Back</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Đăng nhập để tiếp tục hệ thống.</p>
        </div>

        <input className="login-input" placeholder="Tên đăng nhập" value={u} onChange={e => setU(e.target.value)} required />
        <div style={{ position: 'relative' }}>
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
            value={p}
            onChange={e => setP(e.target.value)}
            required
            style={{ paddingRight: '40px' }}
          />
          <span
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 18,
              userSelect: 'none',
            }}
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? '👁️' : '🙈'}
          </span>
        </div>

        <div className="login-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          {/* Đổi sự kiện onClick mở Modal thay vì alert */}
          <span className="forgot-password" onClick={() => setShowForgotModal(true)}>
            Quên mật khẩu?
          </span>
        </div>

        <button type="submit" className="btn-primary login-btn" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>

        <p style={{ marginTop: '25px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Chưa có tài khoản? <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 'bold' }} onClick={onSwitchRegister}>Tạo tài khoản</span>
        </p>
      </form>

      {/* GIAO DIỆN HỘP THOẠI QUÊN MẬT KHẨU (NỔI LÊN TRÊN) */}
      {showForgotModal && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '20px' }}>Khôi phục mật khẩu</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Vui lòng nhập địa chỉ email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
            </p>
            <input className="login-input" type="email" placeholder="Nhập email của bạn..." style={{ marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  alert("Hệ thống đã ghi nhận yêu cầu. Vui lòng kiểm tra hộp thư đến!");
                  setShowForgotModal(false);
                }}
              >
                Gửi yêu cầu
              </button>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForgotModal(false)}>
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 1b. COMPONENT ĐĂNG KÝ ---
function Register({ onSwitch }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [confirmP, setConfirmP] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (p !== confirmP) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      await axios.post(`${API}/auth/register`, { username: u, password: p, email: email });
      alert("Đăng ký thành công!"); onSwitch();
    } catch (err) { setError("Lỗi đăng ký!"); }
  }
  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Tạo tài khoản mới</h2>
        <input className="login-input" placeholder="Username" value={u} onChange={e => setU(e.target.value)} required />
        <input className="login-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={p}
            onChange={e => setP(e.target.value)}
            required
            style={{ paddingRight: '40px' }}
          />
          <span
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 18,
              userSelect: 'none',
            }}
            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? '👁️' : '🙈'}
          </span>
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            className="login-input"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Xác nhận mật khẩu"
            value={confirmP}
            onChange={e => setConfirmP(e.target.value)}
            required
            style={{ paddingRight: '40px' }}
          />
          <span
            onClick={() => setShowConfirmPassword(v => !v)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: 18,
              userSelect: 'none',
            }}
            title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showConfirmPassword ? '👁️' : '🙈'}
          </span>
        </div>
        {error && <div style={{ color: 'red', marginBottom: 10, fontSize: 14 }}>{error}</div>}
        <button type="submit" className="btn-primary login-btn">Đăng ký ngay</button>
        <p style={{ marginTop: '15px', textAlign: 'center' }}>Đã có tài khoản? <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 'bold' }} onClick={onSwitch}>Đăng nhập</span></p>
      </form>
    </div>
  );
}

// --- 2. COMPONENT CHÍNH (APP) ---
function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isRegister, setIsRegister] = useState(false);
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);
  if (!token) {
    return isRegister ? <Register onSwitch={() => setIsRegister(false)} /> : <Login onLogin={setToken} onSwitchRegister={() => setIsRegister(true)} />;
  }
  return <Main token={token} onLogout={() => setToken("")} />;
}


// --- COMPONENT CHÍNH (PHÂN TÁCH TRIỆT ĐỂ QUYỀN GIÁO VIÊN & HỌC SINH) ---
function Main({ token, onLogout }) {
  const [me, setMe] = useState(null);
  const [exams, setExams] = useState([]);
  const [selected, setSelected] = useState(null);

  // Biến view quản lý các tab
  const [view, setView] = useState("exam_list");
  const [viewStatsId, setViewStatsId] = useState(null);
  const [editExamId, setEditExamId] = useState(null);

  const fetchExams = () => {
    axios.get(`${API}/exams`).then(r => setExams(r.data)).catch(console.error);
  };

  useEffect(() => {
    axios.get(`${API}/auth/me`, { headers: { Authorization: "Bearer " + token } })
      .then(r => setMe(r.data)).catch(onLogout);
    fetchExams();
  }, [token]);

  if (!me) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;

  return (
    <div className="modern-layout">
      {/* ================= SIDEBAR ================= */}
      <div className="modern-sidebar">
        <div className="sidebar-brand">
          🎓 THI TRẮC NGHIỆM ONLINE
        </div>

        <div className="sidebar-user">
          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{me.username}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', textTransform: 'capitalize' }}>{me.roles?.join(", ")}</div>
        </div>

        <div className="sidebar-menu">
          {[
            { id: "exam_list", label: "Trang chủ", icon: "🏠", show: true },
            { id: "history", label: "Lịch sử làm bài", icon: "🕒", show: !me.roles?.includes("admin") && !me.roles?.includes("teacher") },
            { id: "create_exam", label: "Soạn đề thi mới", icon: "➕", show: me.roles?.includes("teacher") },
            { id: "question_bank", label: "Ngân hàng câu hỏi", icon: "🗄️", show: me.roles?.includes("teacher") || me.roles?.includes("admin") },
            { id: "manage_exams", label: "Quản lý đề thi", icon: "📁", show: me.roles?.includes("teacher") || me.roles?.includes("admin") },
            { id: "admin_panel", label: "Quản trị hệ thống", icon: "⚙️", show: me.roles?.includes("admin") },
            { id: "profile", label: "Cài đặt tài khoản", icon: "👤", show: true }
          ].filter(item => item.show).map(item => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="btn-logout-modern" onClick={onLogout}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* ================= NỘI DUNG CHÍNH ================= */}
      <div className="modern-content">

        {/* Render Tab 1: Danh sách đề thi */}
        {view === "exam_list" && (
          <div className="animate-fade-in">
            {me.roles?.includes("admin") ? (
              <>
                <div style={{ marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '8px' }}>
                    Bảng điều khiển quản trị 👑
                  </h1>
                  <p style={{ color: '#64748b' }}>Chào mừng quản trị viên {me.username}. Chúc bạn một ngày làm việc hiệu quả.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                  <div className="stat-card-new" style={{ borderLeft: '4px solid #ef4444' }}>
                    <span className="stat-icon-new">⚙️</span>
                    <div>
                      <h4 className="stat-title">Quản trị hệ thống</h4>
                      <p className="stat-number">Đang hoạt động</p>
                    </div>
                  </div>
                  <div className="stat-card-new" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <span className="stat-icon-new">📚</span>
                    <div>
                      <h4 className="stat-title">Tổng số đề thi</h4>
                      <p className="stat-number">{exams.length}</p>
                    </div>
                  </div>
                </div>
                <h3 style={{ marginBottom: '20px', color: '#334155' }}>Lối tắt quản trị</h3>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <button onClick={() => setView("admin_panel")} className="quick-btn" style={{ background: '#fee2e2', color: '#ef4444' }}>
                    👥 Quản lý Người dùng & Hệ thống
                  </button>
                  <button onClick={() => setView("question_bank")} className="quick-btn purple">
                    🗄️ Ngân hàng câu hỏi
                  </button>
                </div>
              </>
            ) : me.roles?.includes("teacher") ? (
              <>
                {/* Phần tiêu đề chào mừng */}
                <div style={{ marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '8px' }}>
                    Bảng điều khiển giáo viên 👨‍🏫
                  </h1>
                  <p style={{ color: '#64748b' }}>Chào mừng trở lại, {me.username}. Đây là tóm tắt hệ thống của bạn.</p>
                </div>

                {/* Hàng thẻ thống kê (Stats) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '40px'
                }}>
                  <div className="stat-card-new" style={{ borderLeft: '4px solid #4f46e5' }}>
                    <span className="stat-icon-new">📝</span>
                    <div>
                      <h4 className="stat-title">Đề thi đã tạo</h4>
                      <p className="stat-number">{exams.length}</p>
                    </div>
                  </div>

                  <div className="stat-card-new" style={{ borderLeft: '4px solid #10b981' }}>
                    <span className="stat-icon-new">📊</span>
                    <div>
                      <h4 className="stat-title">Lượt làm bài</h4>
                      <p className="stat-number">128</p> {/* Số ảo hoặc lấy từ API */}
                    </div>
                  </div>

                  <div className="stat-card-new" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="stat-icon-new">📚</span>
                    <div>
                      <h4 className="stat-title">Ngân hàng câu hỏi</h4>
                      <p className="stat-number">450+</p>
                    </div>
                  </div>
                </div>

                {/* Phần lối tắt hành động nhanh (Quick Actions) */}
                <h3 style={{ marginBottom: '20px', color: '#334155' }}>Thao tác nhanh</h3>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <button onClick={() => setView("create_exam")} className="quick-btn">
                    ➕ Soạn đề thi mới
                  </button>
                  <button onClick={() => setView("manage_exams")} className="quick-btn gray">
                    📂 Quản lý kho đề
                  </button>
                  <button onClick={() => setView("question_bank")} className="quick-btn purple">
                    🗄️ Ngân hàng câu hỏi
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '8px' }}>
                    Các đề thi hiện có
                  </h1>
                  <p style={{ color: '#64748b' }}>Chọn một đề thi bên dưới để bắt đầu làm bài.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {exams.length === 0 ? <p>Chưa có đề thi nào.</p> : exams.map(ex => (
                    <div key={ex.id} className="card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{margin: '0 0 10px 0', color: '#1f2937'}}>{ex.title}</h3>
                      <p style={{color: '#6b7280', marginBottom: '15px'}}>Môn học: <span style={{fontWeight: '500', color: '#4f46e5'}}>{ex.subject}</span></p>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{fontSize: '14px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', color: '#475569', fontWeight: '500'}}>⏱ {ex.duration} phút</span>
                        <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '6px' }} onClick={() => setSelected(ex.id)}>Làm bài</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Các Tab Khác */}
        {view === "question_bank" && (
          <div className="animate-fade-in">
            <h1 className="page-title mb-4">Ngân hàng câu hỏi</h1>
            <QuestionBankManager token={token} />
          </div>
        )}

        {view === "manage_exams" && (
          <div className="animate-fade-in">
            <h1 className="page-title mb-4">Quản lý đề thi</h1>
            <ExamManager token={token} me={me} />
          </div>
        )}

        {view === "history" && !me.roles?.includes("teacher") && (
          <div className="animate-fade-in">
            <h1 className="page-title mb-4">Lịch sử làm bài</h1>
            <StudentHistory token={token} exams={exams} />
          </div>
        )}

        {view === "create_exam" && me.roles?.includes("teacher") && (
          <div className="animate-fade-in">
            <h1 className="page-title mb-4">Khu vực Soạn đề</h1>
            <TeacherPanel token={token} me={me} refresh={() => { fetchExams(); setView("manage_exams"); }} />
          </div>
        )}


        {view === "admin_panel" && me.roles?.includes("admin") && (
          <div className="animate-fade-in">
            <AdminPanel token={token} refresh={fetchExams} />
          </div>
        )}

        {/* Tab Cài đặt Tài khoản */}
        {view === "profile" && (
          <div className="animate-fade-in">
            <div className="page-header">
              <h1 className="page-title">Hồ sơ cá nhân</h1>
              <p className="page-subtitle">Quản lý thông tin định danh và bảo mật tài khoản.</p>
            </div>
            <ProfileSettings token={token} user={me} />
          </div>
        )}
      </div>

      {/* MODALS HIỂN THỊ ĐÈ LÊN */}
      {selected && <ExamTake token={token} examId={selected} me={me} onClose={(goto) => { setSelected(null); if (goto) setView("history"); }} />}
      {viewStatsId && <ExamStats token={token} examId={viewStatsId} onClose={() => setViewStatsId(null)} />}
      {editExamId && <ExamQuestionEditor token={token} examId={editExamId} onClose={() => setEditExamId(null)} />}
    </div>
  );
}


export default App;
