const sendEmail = async (to, subject, text) => {
  console.log(`[가상 이메일 발송] 받는 사람: ${to}`);
  console.log(`제목: ${subject}`);
  console.log(`내용: ${text}`);
  return true;
};

module.exports = sendEmail;