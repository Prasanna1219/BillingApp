require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auto-ensure is_active column exists on database startup
(async () => {
  try {
    await db.query("ALTER TABLE items ADD COLUMN is_active BOOLEAN DEFAULT true;");
    console.log("Auto-migration: is_active column verified/added to items table.");
  } catch (e) {
    // Column already exists or safely handled
  }
})();

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
  try {
    const hashedPassword = hashPassword(password);
    const [existing] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Phone number already registered' });
    }

    const [userResult] = await db.query(
      'INSERT INTO users (phone_number, username, password, role) VALUES (?, ?, ?, ?)',
      [phoneNumber, username, hashedPassword, 'Owner']
    );
    const userId = userResult.insertId;

    const [bizResult] = await db.query(
      'INSERT INTO business_profile (owner_id, business_name, phone_number) VALUES (?, ?, ?)',
      [userId, `${username}'s Business`, phoneNumber]
    );

    res.json({
      status: 'success',
      message: 'Account created successfully',
      user: { id: userId, phoneNumber, username, role: 'Owner', businessId: bizResult.insertId }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Registration failed', error: error.message });
  }
});

// Auth Routes - Login
app.post('/api/auth/login', async (req, res) => {
  const { phoneNumber, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const [users] = await db.query('SELECT * FROM users WHERE phone_number = ? AND password = ?', [phoneNumber, hashedPassword]);
    if (users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid phone number or password' });
    }
    const user = users[0];
    const [biz] = await db.query('SELECT * FROM business_profile WHERE owner_id = ?', [user.id]);
    const business = biz.length > 0 ? biz[0] : null;

    res.json({
      status: 'success',
      message: 'Login successful',
      user: { id: user.id, phoneNumber: user.phone_number, username: user.username, role: user.role, businessId: business ? business.id : null }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Login failed', error: error.message });
  }
});

// Business Profile Routes
app.get('/api/business/:ownerId', async (req, res) => {
  const { ownerId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM business_profile WHERE owner_id = ?', [ownerId]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Business profile not found' });
    }
    res.json({ status: 'success', business: rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch business profile', error: error.message });
  }
});

app.put('/api/business/:ownerId', async (req, res) => {
  const { ownerId } = req.params;
  const { business_name, phone_number, outlet_address, upi_id, fssai_number, tax_slab, seating_capacity, business_type, business_category, gstin, footer_message, google_link, swiggy_link, zomato_link } = req.body;
  try {
    await db.query(
      `UPDATE business_profile SET 
        business_name = ?, phone_number = ?, outlet_address = ?, upi_id = ?, 
        fssai_number = ?, tax_slab = ?, seating_capacity = ?, business_type = ?, 
        business_category = ?, gstin = ?, footer_message = ?, google_link = ?, 
        swiggy_link = ?, zomato_link = ? 
       WHERE owner_id = ?`,
      [business_name, phone_number, outlet_address, upi_id, fssai_number, tax_slab, seating_capacity, business_type, business_category, gstin, footer_message, google_link, swiggy_link, zomato_link, ownerId]
    );
    const [rows] = await db.query('SELECT * FROM business_profile WHERE owner_id = ?', [ownerId]);
    res.json({ status: 'success', message: 'Business profile updated', business: rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update business profile', error: error.message });
  }
});

// Inventory Routes
app.get('/api/items/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM items WHERE business_id = ? AND (is_active IS NULL OR is_active = true) ORDER BY id DESC', [businessId]);
    res.json({ status: 'success', items: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch items', error: error.message });
  }
});

app.post('/api/items', async (req, res) => {
  const { business_id, name, sales_price, tax_percentage, price_includes_tax } = req.body;
  try {
    // Check if an archived (soft-deleted) item with the same name exists
    const [existing] = await db.query(
      'SELECT id FROM items WHERE business_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_active = false',
      [business_id, name]
    );

    if (existing.length > 0) {
      // Reactivate archived item while preserving full historical sales links
      const itemId = existing[0].id;
      await db.query(
        'UPDATE items SET is_active = true, sales_price = ?, tax_percentage = ?, price_includes_tax = ? WHERE id = ?',
        [sales_price, tax_percentage || 0, price_includes_tax || false, itemId]
      );
      return res.json({ status: 'success', message: 'Item reactivated', itemId });
    }

    const [result] = await db.query(
      'INSERT INTO items (business_id, name, sales_price, tax_percentage, price_includes_tax, is_active) VALUES (?, ?, ?, ?, ?, true)',
      [business_id, name, sales_price, tax_percentage || 0, price_includes_tax || false]
    );
    res.json({ status: 'success', message: 'Item added', itemId: result.insertId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to add item', error: error.message });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sales_price, tax_percentage, price_includes_tax } = req.body;
  try {
    await db.query(
      'UPDATE items SET name = ?, sales_price = ?, tax_percentage = ?, price_includes_tax = ? WHERE id = ?',
      [name, sales_price, tax_percentage || 0, price_includes_tax || false, id]
    );
    res.json({ status: 'success', message: 'Item updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update item', error: error.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Soft-delete item so historical sales, analytics, and past receipts stay intact
    await db.query('UPDATE items SET is_active = false WHERE id = ?', [id]);
    res.json({ status: 'success', message: 'Item archived' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to delete item', error: error.message });
  }
});

// Ingredients Endpoints
app.get('/api/ingredients/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM ingredients WHERE business_id = ? ORDER BY purchase_date DESC, id DESC', [businessId]);
    res.json({ status: 'success', ingredients: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch ingredients', error: error.message });
  }
});

app.post('/api/ingredients', async (req, res) => {
  const { business_id, name, unit, purchase_cost, quantity_purchased, yield_percentage, purchase_date } = req.body;
  try {
    const yieldVal = parseFloat(yield_percentage) || 100.00;
    const [result] = await db.query(
      'INSERT INTO ingredients (business_id, name, unit, purchase_cost, quantity_purchased, remaining_quantity, yield_percentage, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [business_id, name, unit, purchase_cost, quantity_purchased, quantity_purchased, yieldVal, purchase_date]
    );
    res.json({ status: 'success', message: 'Ingredient log added', ingredientId: result.insertId });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to add ingredient', error: error.message });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM ingredients WHERE id = ?', [id]);
    res.json({ status: 'success', message: 'Ingredient log deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to delete ingredient log', error: error.message });
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, unit, purchase_cost, quantity_purchased, remaining_quantity, yield_percentage, purchase_date } = req.body;
  try {
    const yieldVal = parseFloat(yield_percentage) || 100.00;
    await db.query(
      'UPDATE ingredients SET name = ?, unit = ?, purchase_cost = ?, quantity_purchased = ?, remaining_quantity = ?, yield_percentage = ?, purchase_date = ? WHERE id = ?',
      [name, unit, purchase_cost, quantity_purchased, remaining_quantity, yieldVal, purchase_date, id]
    );
    res.json({ status: 'success', message: 'Ingredient log updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update ingredient log', error: error.message });
  }
});

// Stock Adjustments & Wastage Endpoints
app.get('/api/stock-adjustments/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT sa.*, ing.name AS ingredient_name, ing.unit 
       FROM stock_adjustments sa
       JOIN ingredients ing ON sa.ingredient_id = ing.id
       WHERE sa.business_id = ?
       ORDER BY sa.created_at DESC`,
      [businessId]
    );
    res.json({ status: 'success', adjustments: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch stock adjustments', error: error.message });
  }
});

app.post('/api/stock-adjustments', async (req, res) => {
  const { business_id, ingredient_id, quantity_deducted, reason, notes } = req.body;
  if (!business_id || !ingredient_id || !quantity_deducted || !reason) {
    return res.status(400).json({ status: 'error', message: 'Missing required adjustment fields' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const deductNum = parseFloat(quantity_deducted);

    // 1. Insert stock adjustment log
    const [result] = await connection.query(
      'INSERT INTO stock_adjustments (business_id, ingredient_id, quantity_deducted, reason, notes) VALUES (?, ?, ?, ?, ?)',
      [business_id, ingredient_id, deductNum, reason, notes || '']
    );

    // 2. Deduct remaining stock from active batches (FIFO)
    const [batches] = await connection.query(
      `SELECT * FROM ingredients 
       WHERE name = (SELECT name FROM ingredients WHERE id = ?) 
         AND business_id = ? 
         AND remaining_quantity > 0 
       ORDER BY purchase_date ASC, id ASC`,
      [ingredient_id, business_id]
    );

    let needed = deductNum;
    for (const batch of batches) {
      if (needed <= 0) break;
      const remaining = parseFloat(batch.remaining_quantity);
      const deduct = Math.min(needed, remaining);
      const newRemaining = remaining - deduct;
      needed -= deduct;

      await connection.query(
        'UPDATE ingredients SET remaining_quantity = ? WHERE id = ?',
        [newRemaining, batch.id]
      );
    }

    await connection.commit();
    res.json({ status: 'success', message: 'Stock adjustment logged successfully', adjustmentId: result.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ status: 'error', message: 'Failed to log stock adjustment', error: error.message });
  } finally {
    connection.release();
  }
});

// Recipes Endpoints
app.get('/api/recipes/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT r.*, i.name AS item_name, ing.name AS ingredient_name, ing.unit 
       FROM recipes r
       JOIN items i ON r.item_id = i.id
       JOIN ingredients ing ON r.ingredient_id = ing.id
       WHERE i.business_id = ?`,
      [businessId]
    );
    res.json({ status: 'success', recipes: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch recipes', error: error.message });
  }
});

app.post('/api/recipes', async (req, res) => {
  const { item_id, ingredient_id, quantity_needed } = req.body;
  try {
    const [existing] = await db.query('SELECT * FROM recipes WHERE item_id = ? AND ingredient_id = ?', [item_id, ingredient_id]);
    if (existing.length > 0) {
      await db.query('UPDATE recipes SET quantity_needed = ? WHERE item_id = ? AND ingredient_id = ?', [quantity_needed, item_id, ingredient_id]);
      res.json({ status: 'success', message: 'Recipe mapping updated' });
    } else {
      await db.query('INSERT INTO recipes (item_id, ingredient_id, quantity_needed) VALUES (?, ?, ?)', [item_id, ingredient_id, quantity_needed]);
      res.json({ status: 'success', message: 'Recipe mapping added' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to save recipe mapping', error: error.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM recipes WHERE id = ?', [id]);
    res.json({ status: 'success', message: 'Recipe mapping deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to delete recipe mapping', error: error.message });
  }
});

// POS Checkout & Ingredient Deduction Endpoint
app.post('/api/orders', async (req, res) => {
  const { business_id, biller_id, total_amount, payment_method, items } = req.body;

  if (!business_id || !biller_id || !total_amount || !items || !items.length) {
    return res.status(400).json({ status: 'error', message: 'Missing required order details' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert into orders table
    const [orderResult] = await connection.query(
      'INSERT INTO orders (business_id, total_amount, biller_id, payment_method, status) VALUES (?, ?, ?, ?, ?)',
      [business_id, total_amount, biller_id, payment_method || 'Cash', 'Closed']
    );
    const orderId = orderResult.insertId;

    // 2. Process each item in the order
    for (const item of items) {
      const { item_id, quantity, sales_price, tax_percentage } = item;
      const taxAmount = (sales_price * (tax_percentage || 0) / 100) * quantity;

      // Insert into order_items
      await connection.query(
        'INSERT INTO order_items (order_id, item_id, quantity, sales_price, tax_amount) VALUES (?, ?, ?, ?, ?)',
        [orderId, item_id, quantity, sales_price, taxAmount]
      );

      // Deduct item stock if tracked
      await connection.query(
        'UPDATE items SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?',
        [quantity, item_id]
      );

      // 3. Ingredient deduction logic based on Recipes
      const [recipes] = await connection.query(
        'SELECT * FROM recipes WHERE item_id = ?',
        [item_id]
      );

      for (const recipe of recipes) {
        // Fetch ingredient yield percentage to apply yield adjustment formula
        const [ingRows] = await connection.query('SELECT yield_percentage FROM ingredients WHERE id = ?', [recipe.ingredient_id]);
        const yieldPct = (ingRows.length && ingRows[0].yield_percentage) ? parseFloat(ingRows[0].yield_percentage) : 100.00;
        
        // Quantity Deducted = (Recipe Amount) / (Yield % / 100)
        const rawNeeded = quantity * parseFloat(recipe.quantity_needed);
        const totalNeeded = rawNeeded / (yieldPct / 100.0);

        // Fetch active ingredient batches for this ingredient (FIFO)
        const [batches] = await connection.query(
          `SELECT * FROM ingredients 
           WHERE name = (SELECT name FROM ingredients WHERE id = ?) 
             AND business_id = ? 
             AND remaining_quantity > 0 
           ORDER BY purchase_date ASC, id ASC`,
          [recipe.ingredient_id, business_id]
        );

        let needed = totalNeeded;
        for (const batch of batches) {
          if (needed <= 0) break;

          const remaining = parseFloat(batch.remaining_quantity);
          const deduct = Math.min(needed, remaining);
          const newRemaining = remaining - deduct;
          needed -= deduct;

          let daysLasted = null;
          if (newRemaining <= 0) {
            const pDate = new Date(batch.purchase_date);
            const today = new Date();
            const diffTime = Math.abs(today - pDate);
            daysLasted = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysLasted === 0) daysLasted = 1;
          }

          if (newRemaining <= 0) {
            await connection.query(
              'UPDATE ingredients SET remaining_quantity = ?, days_lasted = ? WHERE id = ?',
              [newRemaining, daysLasted, batch.id]
            );
          } else {
            await connection.query(
              'UPDATE ingredients SET remaining_quantity = ? WHERE id = ?',
              [newRemaining, batch.id]
            );
          }
        }
      }
    }

    await connection.commit();
    res.json({ status: 'success', message: 'Order checked out successfully', orderId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ status: 'error', message: 'Failed to process checkout transaction', error: error.message });
  } finally {
    connection.release();
  }
});

// Dashboard Analytics Reports Endpoint
app.get('/api/reports/dashboard/:businessId', async (req, res) => {
  const { businessId } = req.params;
  try {
    const todayQuery = db.query(
      'SELECT COUNT(*) as count, IFNULL(SUM(total_amount), 0) as total FROM orders WHERE business_id = ? AND DATE(created_at) = CURDATE()',
      [businessId]
    );

    const paymentSplitsQuery = db.query(
      'SELECT payment_method, IFNULL(SUM(total_amount), 0) as total FROM orders WHERE business_id = ? AND DATE(created_at) = CURDATE() GROUP BY payment_method',
      [businessId]
    );

    const weeklySalesQuery = db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, IFNULL(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE business_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') 
       ORDER BY date`,
      [businessId]
    );

    const overallRevenueQuery = db.query(
      'SELECT IFNULL(SUM(total_amount), 0) as total FROM orders WHERE business_id = ?',
      [businessId]
    );

    const cogsQuery = db.query(
      `SELECT IFNULL(SUM(oi.quantity * r.quantity_needed * (
          SELECT IFNULL(AVG(purchase_cost / quantity_purchased), 0) 
          FROM ingredients 
          WHERE name = ing.name AND business_id = o.business_id
       )), 0) AS cogs
       FROM order_items oi
       JOIN recipes r ON oi.item_id = r.item_id
       JOIN ingredients ing ON r.ingredient_id = ing.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.business_id = ?`,
      [businessId]
    );

    const lifespansQuery = db.query(
      'SELECT * FROM ingredients WHERE business_id = ? AND remaining_quantity = 0 ORDER BY purchase_date DESC LIMIT 5',
      [businessId]
    );

    const lowStockQuery = db.query(
      'SELECT * FROM ingredients WHERE business_id = ? AND remaining_quantity <= (quantity_purchased * 0.20) LIMIT 5',
      [businessId]
    );

    const totalSpentQuery = db.query(
      'SELECT IFNULL(SUM(purchase_cost), 0) as total FROM ingredients WHERE business_id = ?',
      [businessId]
    );

    const [
      [todayResult],
      [splitsResult],
      [weeklyResult],
      [overallResult],
      [cogsResult],
      [lifespansResult],
      [lowStockResult],
      [totalSpentResult]
    ] = await Promise.all([
      todayQuery,
      paymentSplitsQuery,
      weeklySalesQuery,
      overallRevenueQuery,
      cogsQuery,
      lifespansQuery,
      lowStockQuery,
      totalSpentQuery
    ]);

    const todayOrdersCount = todayResult[0].count;
    const todayRevenue = parseFloat(todayResult[0].total) || 0;
    
    let todayCash = 0;
    let todayUpi = 0;
    splitsResult.forEach(row => {
      if (row.payment_method === 'Cash') todayCash = parseFloat(row.total);
      if (row.payment_method === 'UPI') todayUpi = parseFloat(row.total);
    });

    const overallRevenue = parseFloat(overallResult[0].total) || 0;
    const overallCogs = parseFloat(cogsResult[0].cogs) || 0;
    const totalSpent = parseFloat(totalSpentResult[0].total) || 0;
    const netProfit = overallRevenue - overallCogs;

    res.json({
      status: 'success',
      today: {
        ordersCount: todayOrdersCount,
        revenue: todayRevenue,
        cash: todayCash,
        upi: todayUpi
      },
      overall: {
        revenue: overallRevenue,
        cogs: overallCogs,
        totalSpent,
        netProfit
      },
      weeklySales: weeklyResult,
      lifespans: lifespansResult,
      lowStock: lowStockResult
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to retrieve dashboard reports', error: error.message });
  }
});

// Analytics Endpoint for Date Ranges with Time Grouping & Multi-Metric Support
app.get('/api/reports/analytics/:businessId', async (req, res) => {
  const { businessId } = req.params;
  const { startDate, endDate, groupBy: reqGroupBy } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ status: 'error', message: 'Missing startDate or endDate query parameters' });
  }

  try {
    const isSingleDay = startDate === endDate;
    const groupBy = reqGroupBy || (isSingleDay ? 'hourly' : 'daily');

    let dateFormat;
    let dateGroup;

    if (groupBy === 'hourly') {
      dateFormat = "DATE_FORMAT(o.created_at, '%H:00')";
      dateGroup = "DATE_FORMAT(o.created_at, '%H:00')";
    } else if (groupBy === 'weekly') {
      dateFormat = "CONCAT('Wk ', WEEK(o.created_at, 1), ' (', DATE_FORMAT(o.created_at, '%b'), ')')";
      dateGroup = "YEARWEEK(o.created_at, 1)";
    } else if (groupBy === 'monthly') {
      dateFormat = "DATE_FORMAT(o.created_at, '%b %Y')";
      dateGroup = "DATE_FORMAT(o.created_at, '%Y-%m')";
    } else {
      dateFormat = "DATE_FORMAT(o.created_at, '%Y-%m-%d')";
      dateGroup = "DATE_FORMAT(o.created_at, '%Y-%m-%d')";
    }

    const [chartResult] = await db.query(
      `SELECT 
         ${dateFormat} as label,
         ${dateGroup} as group_key,
         IFNULL(SUM(o.total_amount), 0) as sales,
         IFNULL(SUM(
           (SELECT IFNULL(SUM(oi.quantity * r.quantity_needed * (ing.purchase_cost / GREATEST(ing.quantity_purchased, 0.001))), 0)
            FROM order_items oi
            JOIN recipes r ON oi.item_id = r.item_id
            JOIN ingredients ing ON r.ingredient_id = ing.id
            WHERE oi.order_id = o.id)
         ), 0) as cogs,
         IFNULL(SUM(
           (SELECT IFNULL(SUM(oi.quantity * r.quantity_needed), 0)
            FROM order_items oi
            JOIN recipes r ON oi.item_id = r.item_id
            WHERE oi.order_id = o.id)
         ), 0) as ingredients_used
       FROM orders o
       WHERE o.business_id = ? AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
       GROUP BY label, group_key
       ORDER BY group_key ASC`,
      [businessId, startDate, endDate]
    );

    const chartData = chartResult.map(item => {
      const sales = parseFloat(item.sales) || 0;
      const cogs = parseFloat(item.cogs) || 0;
      const profit = sales - cogs;
      const ingredients_used = parseFloat(item.ingredients_used) || 0;
      return {
        date: item.label,
        sales: sales.toFixed(2),
        cogs: cogs.toFixed(2),
        profit: profit.toFixed(2),
        ingredients_used: ingredients_used.toFixed(2),
        total: sales.toFixed(2)
      };
    });

    const [summaryResult] = await db.query(
      `SELECT COUNT(*) as count, IFNULL(SUM(total_amount), 0) as total
       FROM orders 
       WHERE business_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?`,
      [businessId, startDate, endDate]
    );

    const [splitsResult] = await db.query(
      `SELECT payment_method, IFNULL(SUM(total_amount), 0) as total
       FROM orders 
       WHERE business_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?
       GROUP BY payment_method`,
      [businessId, startDate, endDate]
    );

    // Per-Product Sales, Profit, and Ingredient Cost Breakdown
    const [productResult] = await db.query(
      `SELECT 
         i.id as item_id,
         i.name as item_name,
         IFNULL(SUM(oi.quantity), 0) as units_sold,
         IFNULL(SUM(oi.quantity * oi.sales_price), 0) as sales_amount,
         IFNULL(SUM(oi.quantity * (
           SELECT IFNULL(SUM(r.quantity_needed * (ing.purchase_cost / GREATEST(ing.quantity_purchased, 0.001))), 0)
           FROM recipes r
           JOIN ingredients ing ON r.ingredient_id = ing.id
           WHERE r.item_id = i.id
         )), 0) as ingredient_cost
       FROM items i
       JOIN order_items oi ON i.id = oi.item_id
       JOIN orders o ON oi.order_id = o.id AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
       WHERE i.business_id = ?
       GROUP BY i.id, i.name
       ORDER BY sales_amount DESC`,
      [startDate, endDate, businessId]
    );

    const productData = productResult.map(p => {
      const sales = parseFloat(p.sales_amount) || 0;
      const cogs = parseFloat(p.ingredient_cost) || 0;
      const profit = sales - cogs;
      return {
        item_id: p.item_id,
        item_name: p.item_name,
        units_sold: parseInt(p.units_sold, 10) || 0,
        sales_amount: sales.toFixed(2),
        ingredient_cost: cogs.toFixed(2),
        profit: profit.toFixed(2)
      };
    });

    res.json({
      status: 'success',
      groupBy,
      chartData,
      productData,
      summary: summaryResult[0],
      splits: splitsResult
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
