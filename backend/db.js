const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'billing_app',
  waitForConnections: true,
  connectionLimit: 3, // Clever Cloud free tier max is 5 total
  queueLimit: 0
});

module.exports = pool;
