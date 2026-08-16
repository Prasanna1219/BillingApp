require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDB() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'billing_app',
      multipleStatements: true
    };

    if (process.env.DB_PORT || process.env.DB_SSL === 'true') {
      config.ssl = { rejectUnauthorized: false };
    }

    console.log(`Connecting to MySQL database at ${config.host}:${config.port}...`);
    const connection = await mysql.createConnection(config);

    console.log('Connected to MySQL server successfully!');

    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    schema = schema.replace(/CREATE DATABASE IF NOT EXISTS billing_app;/gi, '');
    schema = schema.replace(/USE billing_app;/gi, '');

    console.log('Executing schema.sql...');
    await connection.query(schema);

    console.log('✅ Database schema and tables created successfully!');
    await connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDB();
