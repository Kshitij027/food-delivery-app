import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function App() {
  const [cart, setCart] = useState({});
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [restaurantsError, setRestaurantsError] = useState("");
  const [activeRestaurantId, setActiveRestaurantId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("fasteat_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authValues, setAuthValues] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const setCartFromApi = (apiCart) => {
    if (!apiCart || !Array.isArray(apiCart.items)) {
      setCart({});
      return;
    }
    const map = {};
    apiCart.items.forEach((item) => {
      const id = item.menu_item_id ?? item.id;
      if (id == null) return;
      map[id] = {
        id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        restaurantId: item.restaurant_id ?? null,
      };
    });
    setCart(map);
  };

  const handleAddToCart = (restaurant) => {
    // This function is now used for menu items instead of whole restaurants.
    // Kept for compatibility but not used directly.
  };

  const handleDecrease = (id) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return {
        ...prev,
        [id]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  const handleAddMenuItemToCart = async (item, restaurantId) => {
    try {
      const res = await axios.post(`${API_BASE}/cart/add`, {
        menu_item_id: item.id,
        name: item.name,
        price: Number(item.price),
        restaurant_id: restaurantId,
      });
      setCartFromApi(res.data);
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  const handleDecreaseMenuItem = async (itemId) => {
    try {
      const res = await axios.post(`${API_BASE}/cart/remove`, {
        menu_item_id: itemId,
      });
      setCartFromApi(res.data);
    } catch (err) {
      console.error("Failed to remove from cart", err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCart({});
    try {
      localStorage.removeItem("fasteat_token");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("fasteat_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("fasteat_user");
      }
    } catch {
      // ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    // Fetch restaurants from backend
    const fetchRestaurants = async () => {
      setRestaurantsLoading(true);
      setRestaurantsError("");
      try {
        const res = await axios.get(`${API_BASE}/restaurants`);
        const data = res.data || [];
        // Enhance with some UI-only fields (rating, delivery time, etc.)
        const enhanced = data.map((r, index) => {
          const rating = 4 + ((index * 17) % 10) / 10; // 4.0 - 4.9
          const deliveryTime = `${25 + ((index * 7) % 15)}-${30 +
            ((index * 7) % 15)} mins`;
          const distance = `${(1 + (index % 4)) * 1.1} km`;
          const priceForTwo = 300 + (index % 5) * 100;
          const isVeg = index % 2 === 0;
          return {
            id: r.id,
            name: r.name,
            cuisine: r.description || "Delicious food",
            image: r.image_url || undefined,
            rating,
            deliveryTime,
            distance,
            priceForTwo,
            isVeg,
          };
        });
        setRestaurants(enhanced);
      } catch (e) {
        setRestaurantsError("Failed to load restaurants from server.");
      } finally {
        setRestaurantsLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    // Attach token to axios if present
    try {
      const token = localStorage.getItem("fasteat_token");
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        delete axios.defaults.headers.common.Authorization;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Load cart for logged-in user
    const fetchCart = async () => {
      try {
        const res = await axios.get(`${API_BASE}/cart`);
        setCartFromApi(res.data);
      } catch (err) {
        // ignore if unauthorized or server down
      }
    };

    if (user) {
      fetchCart();
    } else {
      setCart({});
    }
  }, [user]);

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError("");

    const name = authValues.name.trim();
    const email = authValues.email.trim();
    const password = authValues.password.trim();

    if (!email || !password || (authMode === "signup" && !name)) {
      setAuthError(
        authMode === "signup"
          ? "Please enter name, email and password."
          : "Please enter both email and password."
      );
      return;
    }

    setAuthLoading(true);

    const run = async () => {
      try {
        if (authMode === "signup") {
          const res = await axios.post(`${API_BASE}/auth/register`, {
            name,
            email,
            password,
          });
          const { token, user } = res.data;
          setUser(user);
          localStorage.setItem("fasteat_token", token);
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          setAuthValues({ name: "", email: "", password: "" });
        } else {
          const res = await axios.post(`${API_BASE}/auth/login`, {
            email,
            password,
          });
          const { token, user } = res.data;
          setUser(user);
          localStorage.setItem("fasteat_token", token);
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          setAuthValues({ name: "", email: "", password: "" });
        }
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Authentication failed. Please try again.";
        setAuthError(message);
      } finally {
        setAuthLoading(false);
      }
    };

    run();
  };

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const filteredRestaurants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return restaurants;
    return restaurants.filter((rest) => {
      const inName = rest.name.toLowerCase().includes(term);
      const inCuisine = rest.cuisine.toLowerCase().includes(term);
      return inName || inCuisine;
    });
  }, [searchTerm, restaurants]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const loadMenuForRestaurant = async (restaurantId) => {
    setActiveRestaurantId(restaurantId);
    setMenuLoading(true);
    setMenuError("");
    try {
      const res = await axios.get(
        `${API_BASE}/restaurants/${restaurantId}/menu`
      );
      setMenuItems(res.data || []);
    } catch (e) {
      setMenuError("Failed to load menu for this restaurant.");
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    try {
      const res = await axios.post(`${API_BASE}/orders`);
      const { order_id } = res.data || {};
      setCart({});
      const msg = order_id != null
        ? `Order #${order_id} placed successfully!`
        : "Order placed successfully!";
      alert(msg);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Failed to place order. Please try again.";
      alert(message);
    }
  };

  if (!user) {
    return (
      <div style={styles.app}>
        <div style={styles.authShell}>
          <div style={styles.authCard}>
            <div style={styles.authBrand}>
              <span style={styles.logo}>
                fasteat<span style={styles.logoAccent}>.</span>
              </span>
              <p style={styles.authSubtitle}>
                Sign in to discover top restaurants around you.
              </p>
            </div>
            <div style={styles.authTabs}>
              <button
                style={{
                  ...styles.authTab,
                  ...(authMode === "login" ? styles.authTabActive : {}),
                }}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Login
              </button>
              <button
                style={{
                  ...styles.authTab,
                  ...(authMode === "signup" ? styles.authTabActive : {}),
                }}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
              >
                Sign up
              </button>
            </div>
            <form style={styles.authForm} onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <label style={styles.authLabel}>
                  Name
                  <input
                    style={styles.authInput}
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={authValues.name}
                    onChange={handleAuthChange}
                  />
                </label>
              )}
              <label style={styles.authLabel}>
                Email
                <input
                  style={styles.authInput}
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={authValues.email}
                  onChange={handleAuthChange}
                />
              </label>
              <label style={styles.authLabel}>
                Password
                <input
                  style={styles.authInput}
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={authValues.password}
                  onChange={handleAuthChange}
                />
              </label>
              {authError && (
                <p style={styles.authError}>{authError}</p>
              )}
              <button
                type="submit"
                style={styles.authButton}
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Login"
                  : "Create account"}
              </button>
            </form>
            <p style={styles.authHint}>
              Demo-only authentication. Credentials are stored locally in your
              browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>
            fasteat<span style={styles.logoAccent}>.</span>
          </span>
          <span style={styles.location}>Delivering to • Your Location</span>
        </div>
        <div style={styles.headerRight}>
          <input
            placeholder="Search for restaurants or dishes"
            style={styles.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={styles.userArea}>
            <div style={styles.userChip}>
              <span style={styles.userAvatar}>
                {user.email?.charAt(0)?.toUpperCase() || "U"}
              </span>
              <span style={styles.userEmail}>{user.email}</span>
            </div>
            <div style={styles.cartBadge}>
              <span role="img" aria-label="cart" style={{ marginRight: 6 }}>
                🛒
              </span>
              <span>{totalItems} items</span>
            </div>
            <button style={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.listSection}>
          <h2 style={styles.sectionTitle}>Top restaurants near you</h2>
          {restaurantsLoading ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>Loading restaurants...</p>
          ) : restaurantsError ? (
            <p style={{ fontSize: 13, color: "#b91c1c" }}>{restaurantsError}</p>
          ) : filteredRestaurants.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No restaurants match "<strong>{searchTerm}</strong>". Try a
              different name or cuisine.
            </p>
          ) : (
            <div style={styles.cardGrid}>
              {filteredRestaurants.map((rest) => {
                const cuisineTags = (rest.cuisine || "")
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                const isHovered = hoveredRestaurantId === rest.id;

                return (
                  <article
                    key={rest.id}
                    style={{
                      ...styles.card,
                      ...(isHovered ? styles.cardHover : {}),
                    }}
                    onMouseEnter={() => setHoveredRestaurantId(rest.id)}
                    onMouseLeave={() => setHoveredRestaurantId(null)}
                  >
                    <div style={styles.imageWrapper}>
                      <img
                        src={
                          rest.image ||
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80"
                        }
                        alt={rest.name}
                        style={{
                          ...styles.image,
                          ...(isHovered ? styles.imageHover : {}),
                        }}
                      />
                      <div style={styles.imageOverlay} />
                      <div style={styles.deliveryChip}>{rest.deliveryTime}</div>
                    </div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardHeaderRow}>
                        <h3 style={styles.cardTitle}>{rest.name}</h3>
                        <span
                          style={{
                            ...styles.ratingPill,
                            backgroundColor:
                              rest.rating >= 4.5 ? "#166534" : "#15803d",
                          }}
                        >
                          ★ {rest.rating.toFixed(1)}
                        </span>
                      </div>
                      <p style={styles.cuisine}>{rest.cuisine}</p>
                      <div style={styles.metaRow}>
                        <span>{rest.isVeg ? "Pure Veg" : "Veg & Non-veg"}</span>
                        <span>•</span>
                        <span>{rest.distance}</span>
                        <span>•</span>
                        <span>₹{rest.priceForTwo} for two</span>
                      </div>
                      {cuisineTags.length > 0 && (
                        <div style={styles.tagRow}>
                          {cuisineTags.map((tag) => (
                            <span key={tag} style={styles.tagChip}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={styles.cardFooter}>
                      <button
                        style={styles.addButton}
                        onClick={() => loadMenuForRestaurant(rest.id)}
                      >
                        View menu
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {activeRestaurantId && (
            <div style={styles.menuSection}>
              <div style={styles.menuHeader}>
                <h3 style={styles.menuTitle}>Menu</h3>
                <button
                  style={styles.menuBackButton}
                  onClick={() => {
                    setActiveRestaurantId(null);
                    setMenuItems([]);
                    setMenuError("");
                  }}
                >
                  Close
                </button>
              </div>
              {menuLoading ? (
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  Loading menu...
                </p>
              ) : menuError ? (
                <p style={{ fontSize: 13, color: "#b91c1c" }}>{menuError}</p>
              ) : menuItems.length === 0 ? (
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  No active menu items for this restaurant.
                </p>
              ) : (
                <ul style={styles.menuList}>
                  {menuItems.map((item) => {
                    const inCart = cart[item.id];
                    return (
                      <li key={item.id} style={styles.menuItem}>
                        <div>
                          <p style={styles.menuItemName}>{item.name}</p>
                          <p style={styles.menuItemMeta}>
                            ₹{Number(item.price).toFixed(0)}
                          </p>
                        </div>
                        <div>
                          {inCart ? (
                            <div style={styles.quantityControlsSmall}>
                              <button
                                style={styles.qtyButton}
                                onClick={() => handleDecreaseMenuItem(item.id)}
                              >
                                -
                              </button>
                              <span style={styles.qtyValue}>
                                {inCart.quantity}
                              </span>
                              <button
                                style={styles.qtyButton}
                                onClick={() =>
                                  handleAddMenuItemToCart(
                                    item,
                                    activeRestaurantId
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              style={styles.addButton}
                              onClick={() =>
                                handleAddMenuItemToCart(
                                  item,
                                  activeRestaurantId
                                )
                              }
                            >
                              ADD
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>

        <aside style={styles.cartSection}>
          <h2 style={styles.sectionTitle}>Your Cart</h2>
          {cartItems.length === 0 ? (
            <div style={styles.emptyCart}>
              <span style={styles.emptyEmoji}>🧺</span>
              <p style={styles.emptyTitle}>Your cart is empty</p>
              <p style={styles.emptySubtitle}>
                Add some delicious food to begin.
              </p>
            </div>
          ) : (
            <>
              <ul style={styles.cartList}>
                {cartItems.map((item) => (
                  <li key={item.id} style={styles.cartItem}>
                    <div>
                      <p style={styles.cartItemName}>{item.name}</p>
                      <p style={styles.cartItemMeta}>
                        ₹{Number(item.price).toFixed(0)} per item
                      </p>
                    </div>
                    <div style={styles.cartItemRight}>
                      <div style={styles.quantityControlsSmall}>
                        <button
                          style={styles.qtyButton}
                          onClick={() => handleDecrease(item.id)}
                        >
                          -
                        </button>
                        <span style={styles.qtyValue}>{item.quantity}</span>
                        <button
                          style={styles.qtyButton}
                          onClick={() =>
                            handleAddToCart(
                              restaurants.find((r) => r.id === item.id)
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <span style={styles.cartItemPrice}>
                        ₹{(Number(item.price) * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div style={styles.cartSummary}>
                <div style={styles.summaryRow}>
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toFixed(0)}</span>
                </div>
                <button style={styles.checkoutButton} onClick={handlePlaceOrder}>
                  Proceed to Checkout
                </button>
                <button style={styles.clearButton} onClick={handleClearCart}>
                  Clear Cart
                </button>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #ffe0b2 0, #fff3e0 35%, #ffffff 80%)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    color: "#1f2933",
    padding: "16px 32px 32px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    marginBottom: 24,
    backdropFilter: "blur(10px)",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    fontWeight: 800,
    fontSize: 24,
    letterSpacing: 0.5,
    color: "#111827",
  },
  logoAccent: {
    color: "#ef4444",
  },
  location: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  search: {
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    padding: "8px 14px",
    minWidth: 260,
    fontSize: 14,
    outline: "none",
    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
  },
  cartBadge: {
    borderRadius: 999,
    backgroundColor: "#111827",
    color: "#f9fafb",
    padding: "6px 14px",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 4,
    boxShadow: "0 8px 22px rgba(15,23,42,0.4)",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 3fr) minmax(320px, 1.2fr)",
    gap: 24,
  },
  listSection: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 14px 40px rgba(15,23,42,0.1)",
  },
  cartSection: {
    backgroundColor: "rgba(15,23,42,0.98)",
    color: "#e5e7eb",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100vh - 120px)",
    position: "sticky",
    top: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    transition: "transform 0.18s ease-out, box-shadow 0.18s ease-out",
  },
  cardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
  },
  imageWrapper: {
    position: "relative",
    height: 140,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.25s ease-out, filter 0.25s ease-out",
  },
  imageHover: {
    transform: "scale(1.05)",
    filter: "brightness(1.05)",
  },
  imageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(15,23,42,0.0) 40%, rgba(15,23,42,0.55) 100%)",
    pointerEvents: "none",
  },
  deliveryChip: {
    position: "absolute",
    bottom: 10,
    left: 10,
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.9)",
    color: "#f9fafb",
    fontSize: 11,
    boxShadow: "0 8px 20px rgba(15,23,42,0.8)",
  },
  cardBody: {
    padding: "10px 12px 4px",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    color: "#111827",
  },
  ratingPill: {
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 11,
    color: "#f9fafb",
    fontWeight: 600,
  },
  cuisine: {
    fontSize: 12,
    color: "#6b7280",
    margin: "0 0 6px",
  },
  metaRow: {
    display: "flex",
    gap: 4,
    fontSize: 11,
    color: "#4b5563",
    alignItems: "center",
    flexWrap: "wrap",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  cardFooter: {
    padding: "8px 12px 10px",
    display: "flex",
    justifyContent: "flex-end",
  },
  addButton: {
    borderRadius: 999,
    border: "1px solid #111827",
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: "#111827",
    color: "#f9fafb",
    cursor: "pointer",
  },
  quantityControls: {
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid #111827",
    overflow: "hidden",
  },
  quantityControlsSmall: {
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid #9ca3af",
    overflow: "hidden",
  },
  qtyButton: {
    border: "none",
    backgroundColor: "#111827",
    color: "#f9fafb",
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 16,
  },
  qtyValue: {
    padding: "0 10px",
    fontSize: 13,
    fontWeight: 600,
  },
  emptyCart: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    paddingTop: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
  cartList: {
    listStyle: "none",
    padding: 0,
    margin: "4px 0 16px",
    flex: 1,
    overflowY: "auto",
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px dashed rgba(148, 163, 184, 0.4)",
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
  },
  cartItemMeta: {
    fontSize: 12,
    color: "#9ca3af",
    margin: 0,
  },
  cartItemRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: 600,
  },
  cartSummary: {
    borderTop: "1px solid rgba(148, 163, 184, 0.4)",
    paddingTop: 12,
    marginTop: 4,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    marginBottom: 4,
  },
  checkoutButton: {
    width: "100%",
    marginTop: 10,
    padding: "9px 0",
    borderRadius: 999,
    border: "none",
    background:
      "linear-gradient(135deg, #f97316 0%, #ea580c 35%, #dc2626 100%)",
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 14px 35px rgba(248,113,113,0.35)",
  },
  clearButton: {
    width: "100%",
    marginTop: 6,
    padding: "7px 0",
    borderRadius: 999,
    border: "1px solid rgba(148, 163, 184, 0.5)",
    background: "transparent",
    color: "#e5e7eb",
    fontSize: 12,
    cursor: "pointer",
  },
  menuSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
  },
  menuHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  menuBackButton: {
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    fontSize: 12,
    padding: "4px 10px",
    cursor: "pointer",
    color: "#4b5563",
  },
  menuList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px dashed #e5e7eb",
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
  },
  menuItemMeta: {
    fontSize: 12,
    color: "#6b7280",
    margin: 0,
  },
  authShell: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  authCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
  },
  authBrand: {
    marginBottom: 18,
  },
  authSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
  },
  authTabs: {
    display: "flex",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  authTab: {
    flex: 1,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    padding: "6px 0",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
    color: "#4b5563",
  },
  authTabActive: {
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 10px rgba(15,23,42,0.08)",
    color: "#111827",
  },
  authForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  authLabel: {
    fontSize: 13,
    color: "#374151",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  authInput: {
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  },
  authButton: {
    marginTop: 6,
    borderRadius: 999,
    border: "none",
    padding: "9px 0",
    fontSize: 14,
    fontWeight: 600,
    background:
      "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)",
    color: "#f9fafb",
    cursor: "pointer",
  },
  authError: {
    margin: 0,
    fontSize: 12,
    color: "#b91c1c",
  },
  authHint: {
    marginTop: 10,
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    backgroundColor: "#111827",
    color: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
  },
  userEmail: {
    fontSize: 12,
    color: "#111827",
  },
  logoutButton: {
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    fontSize: 12,
    padding: "4px 10px",
    cursor: "pointer",
    color: "#4b5563",
  },
};

export default App;
