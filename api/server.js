require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function sendDbError(res, err) {
  console.error('Database error:', err);
  return res.status(500).json({
    ok: false,
    error: 'DATABASE_ERROR',
    message: 'Database request failed.',
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/api/sites', (req, res) => {
  db.query('SELECT * FROM sites', (err, results) => {
    if (err) return sendDbError(res, err);
    return res.json({ ok: true, data: results });
  });
});

app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({
    ok: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected API error.',
  });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
