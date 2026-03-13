const db = require("./config/db");

db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  // Restaurants table (with image column for hero/card images)
  db.run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      image TEXT
    )
  `);

  // Backwards‑compatible migration: add image column if the table
  // was created earlier without it.
  db.run(
    `ALTER TABLE restaurants ADD COLUMN image TEXT`,
    (err) => {
      if (err && !String(err.message).includes("duplicate column name")) {
        console.error("Error adding image column to restaurants:", err.message);
      }
    }
  );

  // Menu items table
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      name TEXT,
      price REAL
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    )
  `);

  // Seed sample restaurants with Unsplash images if table is empty
  db.get(`SELECT COUNT(*) AS count FROM restaurants`, (err, row) => {
    if (err) {
      console.error("Error checking restaurants count:", err.message);
      return;
    }

    if (row && row.count === 0) {
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO restaurants (name, description, image) VALUES (?, ?, ?)`
      );

      stmt.run(
        "Spice Route Kitchen",
        "North Indian, Biryani and more",
        "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80"
      );

      stmt.run(
        "Green Bowl Salads",
        "Fresh salads, bowls and healthy eats",
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80"
      );

      stmt.run(
        "Bella Pasta",
        "Authentic Italian pastas and pizzas",
        "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80"
      );

      stmt.run(
        "Mumbai Grill House",
        "Tandoor grills and Indo‑Chinese",
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80"
      );

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          console.error(
            "Error inserting sample restaurants:",
            finalizeErr.message
          );
        } else {
          console.log("✅ Seeded sample restaurants into SQLite database");
        }
      });
    }
  });

  // Seed sample menu items if table is empty
  db.get(`SELECT COUNT(*) AS count FROM menu_items`, (err, row) => {
    if (err) {
      console.error("Error checking menu_items count:", err.message);
      return;
    }

    if (row && row.count === 0) {
      db.all(`SELECT id, name FROM restaurants`, (restErr, restaurants) => {
        if (restErr) {
          console.error("Error fetching restaurants for menu seed:", restErr.message);
          return;
        }

        if (!restaurants || restaurants.length === 0) {
          console.warn(
            "Skipping menu_items seed because no restaurants exist yet."
          );
          return;
        }

        const byName = {};
        restaurants.forEach((r) => {
          byName[r.name] = r.id;
        });

        const menuItems = [
          {
            restaurantName: "Spice Route Kitchen",
            name: "Hyderabadi Chicken Biryani",
            price: 299,
          },
          {
            restaurantName: "Spice Route Kitchen",
            name: "Paneer Tikka Masala",
            price: 249,
          },
          {
            restaurantName: "Spice Route Kitchen",
            name: "Tandoori Roti (2 pcs)",
            price: 79,
          },
          {
            restaurantName: "Green Bowl Salads",
            name: "Mediterranean Veg Salad",
            price: 229,
          },
          {
            restaurantName: "Green Bowl Salads",
            name: "Grilled Chicken Salad",
            price: 259,
          },
          {
            restaurantName: "Green Bowl Salads",
            name: "Quinoa Power Bowl",
            price: 249,
          },
          {
            restaurantName: "Bella Pasta",
            name: "Penne Alfredo Pasta",
            price: 279,
          },
          {
            restaurantName: "Bella Pasta",
            name: "Margherita Pizza",
            price: 299,
          },
          {
            restaurantName: "Bella Pasta",
            name: "Garlic Breadsticks",
            price: 149,
          },
          {
            restaurantName: "Mumbai Grill House",
            name: "Paneer Tikka",
            price: 239,
          },
          {
            restaurantName: "Mumbai Grill House",
            name: "Chicken Seekh Kebab",
            price: 259,
          },
          {
            restaurantName: "Mumbai Grill House",
            name: "Hakka Noodles",
            price: 219,
          },
        ];

        const stmt = db.prepare(
          `INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)`
        );

        menuItems.forEach((item) => {
          const restaurantId = byName[item.restaurantName];
          if (!restaurantId) {
            return;
          }
          stmt.run(restaurantId, item.name, item.price);
        });

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            console.error(
              "Error inserting sample menu_items:",
              finalizeErr.message
            );
          } else {
            console.log("✅ Seeded sample menu_items into SQLite database");
          }
        });
      });
    }
  });
});

console.log("✅ Database initialized");
