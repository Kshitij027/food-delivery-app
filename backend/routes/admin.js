const express = require('express');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin: create menu item
router.post('/restaurants/:restaurantId/menu', authenticateToken, requireAdmin, (req, res) => {
  const { restaurantId } = req.params;
  const { name, description, price, image_url, is_active } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  const item = {
    restaurant_id: restaurantId,
    name,
    description: description || '',
    price,
    image_url: image_url || '',
    is_active: is_active !== undefined ? is_active : 1
  };

  db.query('INSERT INTO menu_items SET ?', item, (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(201).json({ id: result.insertId, ...item });
  });
});

// Admin: update menu item
router.put('/menu/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  db.query('UPDATE menu_items SET ? WHERE id = ?', [fields, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json({ message: 'Menu item updated', affectedRows: result.affectedRows });
  });
});

// Admin: update order status
router.put('/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: 'Status is required' });

  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json({ message: 'Order status updated', affectedRows: result.affectedRows });
  });
});

// Admin: list all orders
router.get('/orders', authenticateToken, requireAdmin, (req, res) => {
  const sql = `
    SELECT o.*, u.name AS user_name, r.name AS restaurant_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN restaurants r ON o.restaurant_id = r.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
});

module.exports = router;

