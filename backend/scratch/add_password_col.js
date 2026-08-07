require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../db');

async function run() {
  try {
    console.log('Altering users table to add password column...');
    await db.query('ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL');
    console.log('Password column added successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Password column already exists. Skipping alteration.');
    } else {
      console.error('Error altering table:', error);
    }
  } finally {
    process.exit();
  }
}

run();
