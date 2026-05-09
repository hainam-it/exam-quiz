import express from "express";
import { Pool } from "pg";
import cors from "cors";

const app = express();

// 1. Cấu hình CORS và JSON
app.use(cors());
app.use(express.json());

// 2. Kết nối Database
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000 
});

// 3. Log request để dễ debug
app.use((req, res, next) => {
    console.log(`>>> [USER-SERVICE] ${req.method} ${req.url}`);
    next();
});

// --- ENDPOINT 1: Lấy danh sách toàn bộ Profiles (Để hiện tên trên bảng điểm) ---
app.get("/users", async (req, res) => {
    try {
        // Chỉ lấy những cột cần thiết, bỏ class để tránh lỗi 500
        const r = await pool.query('SELECT user_id, username, full_name, role FROM profiles');
        res.json(r.rows);
    } catch (err: any) {
        console.error("Lỗi lấy danh sách user:", err.message);
        res.status(500).json({ error: "Lỗi Server khi truy vấn danh sách user" });
    }
});

// --- ENDPOINT 2: Lấy thông tin Profile chi tiết theo ID ---
app.get("/users/:id/profile", async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query("SELECT * FROM profiles WHERE user_id=$1", [id]);
        
        if (r.rows.length === 0) {
            return res.status(404).json({ error: "Profile không tồn tại" });
        }
        res.json(r.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- ENDPOINT 3: Lưu hoặc cập nhật Profile (Dùng cho cả Auth-Service và Frontend) ---
app.post("/profiles", async (req, res) => {
    const { user_id, username, full_name, role } = req.body;
    try {
        // Thực hiện Upsert: Nếu trùng user_id thì cập nhật full_name mới
        const query = `
            INSERT INTO profiles (user_id, username, full_name, role) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                username = EXCLUDED.username,
                role = EXCLUDED.role
            RETURNING *
        `;
        const r = await pool.query(query, [user_id, username, full_name, role]);
        console.log(`✅ Đã lưu profile thành công cho: ${full_name}`);
        res.status(201).json(r.rows[0]);
    } catch (err: any) {
        console.error("Lỗi lưu profile:", err.message);
        res.status(500).json({ error: "Không thể lưu hồ sơ vào Database" });
    }
});

// Giữ lại route cũ để tương thích với các phần khác của hệ thống
app.post("/users/:id/profile", async (req, res) => {
    const { id } = req.params;
    const { full_name, role } = req.body;
    try {
        const query = `
            INSERT INTO profiles(user_id, full_name, role) 
            VALUES($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
            RETURNING *
        `;
        const r = await pool.query(query, [id, full_name, role]);
        res.json(r.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

const port = parseInt(process.env.PORT || "3002", 10);
app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`👤 USER SERVICE ĐÃ SẴN SÀNG TẠI CỔNG ${port}`);
    console.log(`=========================================`);
});