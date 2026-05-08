-- 1. Khởi tạo Extension và Bảng
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE
);

-- 2. Chèn Role
INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student') ON CONFLICT DO NOTHING;

-- 3. Thêm các User mẫu với mật khẩu chuẩn
INSERT INTO users (username, password_hash) VALUES 
('khanhsv', '$2a$12$JMtsB61N0asQsqJ1hCUeyekcLUhdr/hzarfjV/iJmXBGoYoTQtjay'),
('khanhgv', '$2a$12$Br9/inB8/9/UziwLolFrtujwn6v7JbiOm27942lOuPA2gve2bOdu6'),
('khanhad','$2a$12$ctRwjv/rtJZQLu2X5Hay6u43GSCkiPLv1SbI0xmmS.GP8N9Itoute')

ON CONFLICT (username) DO NOTHING;

-- 4. Gán Role tương ứng
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'khanhsv' AND r.name = 'student'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'khanhgv' AND r.name = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'khanhad' AND r.name = 'admin'
ON CONFLICT DO NOTHING;
