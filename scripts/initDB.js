const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');

db.serialize(() => {
  // users 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  // 관리자 계정 생성
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123'; // 실제로는 bcrypt 등으로 암호화 필요
  const adminName = 'Admin';
  const adminRole = 'admin';

  db.run(`
    INSERT OR IGNORE INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `, [adminName, adminEmail, adminPassword, adminRole]);

  console.log('DB 초기화 완료');
});

db.close();