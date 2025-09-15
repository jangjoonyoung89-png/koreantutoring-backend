const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  const db = new sqlite3.Database('db.sqlite3');

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).send(err.message);
    if (!user) return res.status(401).send("사용자 없음");

    if (password === user.password) {
      res.send("로그인 성공!");
    } else {
      res.status(401).send("비밀번호 틀림");
    }
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));