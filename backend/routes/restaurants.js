const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all restaurants
router.get("/", (req, res) => {
  db.all("SELECT * FROM restaurants", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Get menu for a restaurant
router.get("/:restaurantId/menu", (req, res) => {
  const id = req.params.restaurantId;

  db.all(
    "SELECT * FROM menu_items WHERE restaurant_id = ?",
    [id],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
