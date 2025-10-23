const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('db.sqlite3');

// 관리자 계정 정보
const adminEmail = "admin@example.com";
const adminPassword = "admin123"; // 초기 비밀번호
const adminName = "Admin";
const adminRole = "admin";

async function setupAdmin() {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`, (err) => {
    if (err) throw err;

    db.get("SELECT * FROM users WHERE email = ?", [adminEmail], (err, user) => {
      if (err) throw err;

      if (user) {
        console.log("관리자 계정 이미 존재:", user);
        db.close();
      } else {
        db.run(
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
          [adminName, adminEmail, hashedPassword, adminRole],
          function(err) {
            if (err) throw err;
            console.log("✅ 관리자 계정 생성 완료! ID:", this.lastID);
            db.close();
          }
        );
      }
    });
  });
}

setupAdmin();