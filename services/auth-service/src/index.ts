import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "khanh_secret_key_2026";

// Logger để soi lỗi trong Docker Terminal
app.use((req, res, next) => {
    console.log(`>>> [AUTH-INTERNAL] ${req.method} ${req.url}`);
    next();
});


// --- ROUTE ĐĂNG KÝ (BẢN ĐÃ TỐI ƯU HIỂN THỊ TÊN) ---
app.post("/register", async (req, res) => {
    // 1. Nhận data từ Frontend
    const { username, email, password, role, full_name } = req.body; 

    // Log này cực kỳ quan trọng: Nam nhìn trong Docker Terminal xem full_name có giá trị không
    console.log(`>>> [AUTH-REQUEST] Đang đăng ký cho User: ${username}, Tên thật: ${full_name}`);

    if (!username || !password) {
        return res.status(400).json({ error: "Thiếu username hoặc mật khẩu" });
    }

    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash(password, 10);
        await client.query('BEGIN');
        
        // 2. Lưu vào DB Auth
        // Nếu full_name từ Web gửi lên bị trống, mình sẽ lấy username làm tên luôn, không để mặc định vô nghĩa
        const nameToSave = full_name && full_name.trim() !== "" ? full_name : username;

        const userRes = await client.query(
            "INSERT INTO users(username, email, password_hash, full_name) VALUES($1, $2, $3, $4) RETURNING id",
            [username, email || null, hash, nameToSave]
        );
        const userId = userRes.rows[0].id;

        const roleName = role || "student";
        const roleRes = await client.query("SELECT id FROM roles WHERE name=$1", [roleName]);
        if (roleRes.rows[0]) {
            await client.query("INSERT INTO user_roles(user_id, role_id) VALUES($1, $2)", [userId, roleRes.rows[0].id]);
        }
        await client.query('COMMIT');

        // 3. 🚀 ĐỒNG BỘ SANG USER SERVICE
        try {
            const axios = require('axios');
            // Thêm timeout 5s để nếu user-service chết thì auth vẫn chạy tiếp
            await axios.post("http://user-service:3002/profiles", {
                user_id: userId,
                username: username,
                full_name: nameToSave,
                role: roleName
            }, { timeout: 5000 }); 
            
            console.log(`✅ [AUTH] Đã bắn data sang User Service thành công!`);
        } catch (syncErr: any) { 
            console.error("❌ [AUTH] Lỗi đồng bộ:", syncErr.response?.data || syncErr.message); 
        }

        res.status(201).json({ message: "Đăng ký thành công", user_id: userId });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error("❌ [AUTH-SQL-ERROR]", err.message);
        res.status(400).json({ error: "Tài khoản đã tồn tại hoặc lỗi hệ thống" });
    } finally {
        client.release();
    }
});

// --- ROUTE ĐĂNG NHẬP ---
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const r = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
        const user = r.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }

        const rolesQ = await pool.query(
            "SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id=r.id WHERE ur.user_id=$1",
            [user.id]
        );
        const roles = rolesQ.rows.map((x: any) => x.name);

        const token = jwt.sign({ id: user.id, username: user.username, roles }, JWT_SECRET, { expiresIn: "6h" });
        res.json({ access_token: token, user: { id: user.id, username: user.username, roles } });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server" });
    }
});

// --- THÔNG TIN CÁ NHÂN ---
app.get("/me", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    try {
        const payload: any = jwt.verify(token, JWT_SECRET);
        const r = await pool.query("SELECT email, full_name FROM users WHERE id=$1", [payload.id]);
        const user = r.rows[0];
        res.json({ ...payload, email: user?.email || "", full_name: user?.full_name || "" });
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
});

// --- ĐỔI MẬT KHẨU ---
app.put("/change-password", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    try {
        const payload: any = jwt.verify(token, JWT_SECRET);
        const userId = payload.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });

        const r = await pool.query("SELECT password_hash FROM users WHERE id=$1", [userId]);
        const user = r.rows[0];
        if (!user) return res.status(404).json({ message: "User không tồn tại" });

        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không chính xác" });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, userId]);
        res.json({ message: "Cập nhật mật khẩu thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server" });
    }
});

// --- ADMIN: Lấy danh sách user ---
app.get("/users", async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT u.id, u.username, u.email, u.full_name, r.name as role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            ORDER BY u.id DESC
        `);
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: "Lỗi lấy danh sách" }); }
});

// --- ADMIN: Cập nhật quyền ---
app.put("/users/:id/role", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleRes = await client.query("SELECT id FROM roles WHERE name=$1", [role]);
        if (roleRes.rows.length === 0) throw new Error("Quyền không hợp lệ");
        await client.query("DELETE FROM user_roles WHERE user_id=$1", [id]);
        await client.query("INSERT INTO user_roles(user_id, role_id) VALUES($1, $2)", [id, roleRes.rows[0].id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// --- ADMIN: Xóa tài khoản ---
app.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM user_roles WHERE user_id=$1", [id]);
        await client.query("DELETE FROM users WHERE id=$1", [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Đã xóa" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi xóa" });
    } finally { client.release(); }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`🔐 Auth Service (Internal) flying on ${port}`));