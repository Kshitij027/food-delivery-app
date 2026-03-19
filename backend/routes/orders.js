const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { getCartForUser, clearUserCart } = require('./cart');

const router = express.Router();

// POST /api/orders - create order from current cart, save order + order_items, clear cart
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const cart = getCartForUser(userId);
  const items = Object.values(cart.items || {});

  if (items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty. Add items before checkout.' });
  }

  const restaurant_id = items[0].restaurant_id;
  if (!restaurant_id) {
    return res.status(400).json({ message: 'Cart has no restaurant. Add items from a restaurant.' });
  }

  const total_price = items.reduce((sum, i) => sum + Number(i.price) * (i.quantity || 1), 0);

  db.run(
    `INSERT INTO orders (user_id, restaurant_id, total_price, status) VALUES (?, ?, ?, ?)`,
    [userId, restaurant_id, total_price, 'pending'],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }

      const orderId = this.lastID;

      const placeholders = items.map(() => '(?, ?, ?, ?)').join(', ');
      const params = items.flatMap((i) => [
        orderId,
        i.menu_item_id,
        i.quantity || 1,
        Number(i.price),
      ]);

      db.run(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ${placeholders}`,
        params,
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ message: 'Failed to save order items', error: insertErr.message });
          }

          clearUserCart(userId);

          res.status(201).json({
            message: 'Order placed successfully',
            order_id: orderId,
            confirmation: {
              order_id: orderId,
              total_price,
              item_count: items.length,
            },
          });
        }
      );
    }
  );
});

// GET /api/orders/my - order history for current user
router.get('/my', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT o.*, r.name AS restaurant_name
     FROM orders o
     JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }

      if (!orders || orders.length === 0) {
        return res.json([]);
      }

      const orderIds = orders.map((o) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');

      db.all(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
        orderIds,
        (itemsErr, orderItems) => {
          if (itemsErr) {
            return res.status(500).json({ message: 'Database error', error: itemsErr.message });
          }

          const byOrder = {};
          (orderItems || []).forEach((i) => {
            if (!byOrder[i.order_id]) byOrder[i.order_id] = [];
            byOrder[i.order_id].push(i);
          });

          const result = orders.map((o) => ({
            ...o,
            items: byOrder[o.id] || [],
          }));

          res.json(result);
        }
      );
    }
  );
});

module.exports = router;
