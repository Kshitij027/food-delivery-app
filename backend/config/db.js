const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../food_delivery.db");

const sqlite = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// MySQL compatibility wrapper
sqlite.query = function (sql, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  if (sql.trim().toUpperCase().startsWith("SELECT")) {
    sqlite.all(sql, params, callback);
  } else {
    sqlite.run(sql, params, function (err) {
      callback(err, { insertId: this.lastID, affectedRows: this.changes });
    });
  }
};

module.exports = sqlite;
