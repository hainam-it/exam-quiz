import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "khanh_secret_key_2026";

// Logger để Khánh soi lỗi
app.use((req, res, next) => {
    console.log(`>>> [AUTH-INTERNAL] ${req.method} ${req.url}`);
    next();
});

// --- ROUTE ĐĂNG KÝ ---
app.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin" });

    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash(password, 10);
        await client.query('BEGIN');
        
        const userRes = await client.query(
            "INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id",
            [username, email || null, hash]
        );
        const userId = userRes.rows[0].id;

        const roleName = role || "student";
        const roleRes = await client.query("SELECT id FROM roles WHERE name=$1", [roleName]);
        
        if (roleRes.rows[0]) {
            await client.query(
                "INSERT INTO user_roles(user_id, role_id) VALUES($1, $2)",
                [userId, roleRes.rows[0].id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Đăng ký thành công" });
    } catch (err) {
        await client.query('ROLLBACK');
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
        // ĐÃ SỬA: Thêm kiểu : any để TypeScript không báo lỗi thuộc tính
        const payload: any = jwt.verify(token, JWT_SECRET);
        
        const r = await pool.query("SELECT email FROM users WHERE id=$1", [payload.id]);
        const email = r.rows[0]?.email || "";

        res.json({ ...payload, email });
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
});

// --- ĐỔI MẬT KHẨU ---
app.put("/change-password", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        // ĐÃ SỬA: Thêm kiểu : any
        const payload: any = jwt.verify(token, JWT_SECRET);
        const userId = payload.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });
        }

        const r = await pool.query("SELECT password_hash FROM users WHERE id=$1", [userId]);
        const user = r.rows[0];
        if (!user) return res.status(404).json({ message: "User không tồn tại" });

        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không chính xác" });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, userId]);

        res.json({ message: "Cập nhật mật khẩu thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi Server hoặc Token không hợp lệ" });
    }
});

// ==========================================
// NHÓM API QUẢN LÝ USER (DÀNH CHO ADMIN)
// ==========================================

// 1. Lấy danh sách toàn bộ User kèm Quyền
app.get("/users", async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT u.id, u.username, u.email, r.name as role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            ORDER BY u.id DESC
        `);
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: "Lỗi lấy danh sách user" }); }
});

// 2. Cập nhật phân quyền cho User
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
        res.json({ success: true, message: "Cập nhật quyền thành công!" });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// 3. Xóa vĩnh viễn tài khoản (Kick User)
app.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM user_roles WHERE user_id=$1", [id]);
        await client.query("DELETE FROM users WHERE id=$1", [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Đã xóa tài khoản" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi khi xóa tài khoản" });
    } finally { client.release(); }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`🔐 Auth Service (Internal) flying on ${port}`));