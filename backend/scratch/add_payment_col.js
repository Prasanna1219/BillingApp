require('dotenv').config();
const db = require('../db');

async function run() {
  try {
    console.log('Running migration: Add payment_method to orders...');
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN payment_method ENUM('Cash', 'UPI') DEFAULT 'Cash'
    `);
    console.log('Migration successful!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column payment_method already exists, skipping.');
    } else {
      console.error('Migration failed:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

run();
