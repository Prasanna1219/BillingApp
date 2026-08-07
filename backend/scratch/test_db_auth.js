require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../db');
const crypto = require('crypto');

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function test() {
  const testPhone = '9999999999';
  const testName = 'Test Owner';
  const testPass = 'supersecret';

  try {
    console.log('1. Cleaning existing test user...');
    await db.query('DELETE FROM users WHERE phone_number = ?', [testPhone]);

    console.log('2. Inserting test user with hashed password...');
    const hashed = hashPassword(testPass);
    const [insRes] = await db.query(
      'INSERT INTO users (phone_number, username, password, role) VALUES (?, ?, ?, ?)',
      [testPhone, testName, hashed, 'Owner']
    );
    console.log(`User inserted with ID: ${insRes.insertId}`);

    console.log('3. Simulating login query...');
    const [rows] = await db.query('SELECT * FROM users WHERE phone_number = ?', [testPhone]);
    const user = rows[0];

    if (!user) {
      throw new Error('User not found in database after insertion!');
    }

    console.log('4. Verifying password match...');
    const inputHash = hashPassword(testPass);
    if (user.password !== inputHash) {
      throw new Error('Password verification failed! Hash mismatch.');
    }
    console.log('Password verified successfully!');

    console.log('5. Cleaning up test user...');
    await db.query('DELETE FROM users WHERE phone_number = ?', [testPhone]);
    console.log('Clean up complete. Database auth verification PASSED!');
  } catch (error) {
    console.error('Database auth verification FAILED:', error);
  } finally {
    process.exit();
  }
}

test();
