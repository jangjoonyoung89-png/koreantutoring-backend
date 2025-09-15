const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');

// 관리자 계정 정보
const adminEmail = "admin@example.com";
const adminPassword = "admin123"; // 원래는 해시로 저장하는 것이 안전
const adminName = "Admin";
const adminRole = "admin";

// Users 테이블 확인/생성 (없으면 생성)
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT
)` , (err) => {
  if (err) throw err;

  // 관리자 계정이 이미 있는지 확인
  db.get("SELECT * FROM users WHERE email = ?", [adminEmail], (err, user) => {
    if (err) throw err;

    if (user) {
      console.log("관리자 계정 이미 존재:", user);
    } else {
      // 관리자 계정 추가
      db.run(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [adminName, adminEmail, adminPassword, adminRole],
        function(err) {
          if (err) throw err;
          console.log("관리자 계정 생성 완료! ID:", this.lastID);
        }
      );
    }
    db.close();
  });
});