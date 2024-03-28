const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./examples.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});


const secret = crypto.randomBytes(32); // 256-bit key

function encryptPassword(password) {
  const iv = crypto.randomBytes(16); // 128-bit IV
  const cipher = crypto.createCipheriv('aes-256-cbc', secret, iv);
  let encryptedPassword = cipher.update(password, 'utf8', 'hex');
  encryptedPassword += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedPassword };
}

function decryptPassword(encryptedPassword, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', secret, Buffer.from(iv, 'hex'));
  let decryptedPassword = decipher.update(encryptedPassword, 'hex', 'utf8');
  decryptedPassword += decipher.final('utf8');
  return decryptedPassword;
}

// Handle form submission from signup page
app.post('/index', (req, res) => {
  const { email, password } = req.body;
  const { iv, encryptedPassword } = encryptPassword(password);
  db.run(`INSERT INTO users (email, password, iv) VALUES(?, ?, ?)`, [email, encryptedPassword, iv], function (err) {
    if (err) {
      console.error('Failed to insert user:', err);
      return res.status(500).send({ error: 'Failed to register user' });
    }
    console.log('User registered successfully:', email, this.lastID);
    res.status(200).send({ message: 'User registered successfully' });
  });
});

// Handle form submission from login page
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) {
      console.error('Failed to retrieve user:', err);
      return res.status(500).send({ error: 'Failed to login' });
    }
    if (!row) {
      return res.status(401).send({ error: 'User not found' });
    }
    const decryptedPassword = decryptPassword(row.password, row.iv);
    if (decryptedPassword !== password) {
      return res.status(401).send({ error: 'Incorrect password' });
    }
    
    res.status(200).send({ message: 'Login successful' });
  });
}); 


db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (email TEXT, password TEXT, iv TEXT)`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});