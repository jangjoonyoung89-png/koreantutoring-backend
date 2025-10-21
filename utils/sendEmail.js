const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"코리안튜터링" <${EMAIL_USER}>`, // 반드시 Gmail 계정
      to,
      subject,
      html,
    });

    console.log("✅ 이메일 발송 성공:", to);
  } catch (err) {
    console.error("❌ 이메일 발송 실패:", err.message);
    throw err;
  }
}

module.exports = sendEmail;