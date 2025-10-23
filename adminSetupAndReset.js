const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const sendEmail = require('./utils/sendEmail'); // sendEmail 경로 확인

// 관리자 계정 정보
const ADMIN_EMAIL = "kimmersion@hanmail.net";
const ADMIN_NAME = "관리자";
const ADMIN_ROLE = "admin";
const INITIAL_PASSWORD = "임시비밀번호123!"; // 초기 비밀번호

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const db = new sqlite3.Database('db.sqlite3');

// -------------------------------
// 비밀번호 해시 생성
// -------------------------------
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// -------------------------------
// 관리자 계정 생성 또는 확인
// -------------------------------
async function setupAdmin() {
  const hashedPassword = await hashPassword(INITIAL_PASSWORD);

  return new Promise((resolve, reject) => {
    // 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`, (err) => {
      if (err) return reject(err);

      // 컬럼 추가 (기존 테이블에 없는 경우)
      db.run("ALTER TABLE users ADD COLUMN resetToken TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error(err);
      });
      db.run("ALTER TABLE users ADD COLUMN resetTokenExpire INTEGER", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error(err);
      });

      // 관리자 계정 확인
      db.get("SELECT * FROM users WHERE email = ?", [ADMIN_EMAIL], async (err, user) => {
        if (err) return reject(err);

        if (user) {
          console.log("✅ 관리자 계정 이미 존재:", user);
          resolve(user);
        } else {
          db.run(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, ADMIN_ROLE],
            function(err) {
              if (err) return reject(err);
              console.log("✅ 관리자 계정 생성 완료! ID:", this.lastID);
              db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, newUser) => {
                if (err) return reject(err);
                resolve(newUser);
              });
            }
          );
        }
      });
    });
  });
}

// -------------------------------
// 관리자 비밀번호 재설정 토큰 생성 + 이메일 발송
// -------------------------------
async function sendResetEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = Date.now() + 1000 * 60 * 30; // 30분 유효

  db.run(
    "UPDATE users SET resetToken = ?, resetTokenExpire = ? WHERE email = ?",
    [token, expire, user.email],
    (err) => {
      if (err) throw err;
    }
  );

  const resetLink = `${FRONTEND_URL}/admin/reset-password?token=${token}`;

  // 이메일 템플릿 로드
  const templatePath = path.join(__dirname, "templates/reset-password.html");
  let htmlContent = "";
  if (fs.existsSync(templatePath)) {
    htmlContent = fs
      .readFileSync(templatePath, "utf-8")
      .replace("{{full_name}}", user.name || user.email)
      .replace("{{resetLink}}", resetLink);
  } else {
    htmlContent = `<h3>${user.name || user.email}님,</h3>
<p>관리자 비밀번호를 재설정하려면 아래 링크를 클릭하세요.</p>
<a href="${resetLink}">비밀번호 재설정</a>`;
  }

  await sendEmail(user.email, "관리자 비밀번호 재설정 안내", htmlContent);
  console.log("✅ 관리자 비밀번호 재설정 이메일 발송 완료:", user.email);
}

// -------------------------------
// 실행
// -------------------------------
(async () => {
  try {
    const adminUser = await setupAdmin();
    await sendResetEmail(adminUser);
  } catch (err) {
    console.error("❌ 관리자 계정 설정/이메일 발송 오류:", err);
  } finally {
    db.close();
  }
})();