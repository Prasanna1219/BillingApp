require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

const crypto = require('crypto');

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Auth Routes - Register
app.post('/api/auth/register', async (req, res) => {
  const { phoneNumber, username, password } = req.body;
  
  if (!phoneNumber || !password) {
    return res.status(400).json({ status: 'error', message: 'Phone number and password are required' });
  }

  try {
    // Check if user already exists
    const [existing] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already exists with this phone number' });
    }

    // Hash the password
    const hashedPassword = hashPassword(password);

    // Insert user (default role Owner)
    const [result] = await db.query(
      'INSERT INTO users (phone_number, username, password, role) VALUES (?, ?, ?, ?)',
      [phoneNumber, username || null, hashedPassword, 'Owner']
    );

    const user = {
      id: result.insertId,
      phone_number: phoneNumber,
      username: username || null,
      role: 'Owner'
    };

    res.json({ status: 'success', message: 'Registration successful', user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error during registration', error: error.message });
  }
});

// Auth Routes - Login
app.post('/api/auth/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ status: 'error', message: 'Phone number and password are required' });
  }

  try {
    // Query user
    const [rows] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid phone number or password' });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ status: 'error', message: 'Invalid phone number or password' });
    }

    // Remove password field from the returned user object
    const { password: _, ...safeUser } = user;

    res.json({ status: 'success', message: 'Login successful', user: safeUser });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error during login', error: error.message });
  }
});

// Business Profile Routes
app.get('/api/business/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM business_profile WHERE owner_id = ?', [userId]);
    if (rows.length === 0) {
      return res.json({ status: 'success', hasBusiness: false });
    }
    return res.json({ status: 'success', hasBusiness: true, business: rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error', error: error.message });
  }
});

app.post('/api/business', async (req, res) => {
  const { owner_id, business_name, phone_number, outlet_address, upi_id, fssai_number, tax_slab, seating_capacity, business_type, business_category, gstin, footer_message } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO business_profile 
      (owner_id, business_name, phone_number, outlet_address, upi_id, fssai_number, tax_slab, seating_capacity, business_type, business_category, gstin, footer_message) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [owner_id, business_name, phone_number, outlet_address, upi_id, fssai_number, tax_slab, seating_capacity, business_type, business_category, gstin, footer_message]
    );
    res.json({ status: 'success', message: 'Business profile created', businessId: result.insertId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create business profile', error: error.message });
  }
});

// Inventory Routes
app.get('/api/items/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM items WHERE business_id = ? ORDER BY id DESC', [businessId]);
    res.json({ status: 'success', items: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch items', error: error.message });
  }
});

app.post('/api/items', async (req, res) => {
  const { business_id, name, sales_price, tax_percentage, price_includes_tax } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO items (business_id, name, sales_price, tax_percentage, price_includes_tax) VALUES (?, ?, ?, ?, ?)',
      [business_id, name, sales_price, tax_percentage || 0, price_includes_tax || false]
    );
    res.json({ status: 'success', message: 'Item added', itemId: result.insertId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to add item', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
