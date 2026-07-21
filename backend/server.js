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

// Auth Routes
app.post('/api/auth/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ status: 'error', message: 'Phone number is required' });

  // In production, integrate Twilio/Fast2SMS here.
  // For development, we will just simulate a sent OTP.
  const mockOtp = '1234'; 
  console.log(`[DEV ONLY] OTP for ${phoneNumber} is ${mockOtp}`);
  
  res.json({ status: 'success', message: 'OTP sent successfully' });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) return res.status(400).json({ status: 'error', message: 'Phone and OTP required' });

  // Development static check
  if (otp !== '1234') {
    return res.status(401).json({ status: 'error', message: 'Invalid OTP' });
  }

  try {
    // Check if user exists
    const [rows] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    let user = rows[0];

    if (!user) {
      // Create new user if they don't exist
      const [result] = await db.query('INSERT INTO users (phone_number) VALUES (?)', [phoneNumber]);
      user = { id: result.insertId, phone_number: phoneNumber, role: 'Owner' };
    }

    res.json({ status: 'success', message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error', error: error.message });
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
