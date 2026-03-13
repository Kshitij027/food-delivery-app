const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

// In-memory cart store: { [userId]: { items: { [menu_item_id]: { menu_item_id, name, price, quantity, restaurant_id } } } }
const carts = {};

function getUserCart(userId) {
  if (!carts[userId]) {
    carts[userId] = { items: {} };
  }
  return carts[userId];
}

function serializeCart(cart) {
  return {
    items: Object.values(cart.items || {}),
  };
}

// GET /api/cart - return current user's cart
router.get("/", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const cart = getUserCart(userId);
  res.json(serializeCart(cart));
});

// POST /api/cart/add - add or increment an item
// Body: { menu_item_id, name, price, restaurant_id }
router.post("/add", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { menu_item_id, name, price, restaurant_id } = req.body || {};

  if (!menu_item_id || !name || typeof price !== "number") {
    return res
      .status(400)
      .json({ message: "menu_item_id, name and numeric price are required" });
  }

  const cart = getUserCart(userId);

  // For simplicity, restrict cart to a single restaurant, like Swiggy.
  const existingItems = Object.values(cart.items);
  if (
    existingItems.length > 0 &&
    restaurant_id &&
    existingItems[0].restaurant_id &&
    existingItems[0].restaurant_id !== restaurant_id
  ) {
    cart.items = {};
  }

  const key = String(menu_item_id);
  const existing = cart.items[key];
  const quantity = existing ? existing.quantity + 1 : 1;

  cart.items[key] = {
    menu_item_id,
    name,
    price,
    quantity,
    restaurant_id: restaurant_id || existing?.restaurant_id || null,
  };

  res.json(serializeCart(cart));
});

// POST /api/cart/remove - decrement or remove an item
// Body: { menu_item_id }
router.post("/remove", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { menu_item_id } = req.body || {};

  if (!menu_item_id) {
    return res.status(400).json({ message: "menu_item_id is required" });
  }

  const cart = getUserCart(userId);
  const key = String(menu_item_id);
  const existing = cart.items[key];

  if (!existing) {
    return res.json(serializeCart(cart));
  }

  if (existing.quantity <= 1) {
    delete cart.items[key];
  } else {
    existing.quantity -= 1;
  }

  res.json(serializeCart(cart));
});

function clearUserCart(userId) {
  if (carts[userId]) {
    carts[userId].items = {};
  }
}

function getCartForUser(userId) {
  return getUserCart(userId);
}

module.exports = {
  router,
  clearUserCart,
  getCartForUser,
};

