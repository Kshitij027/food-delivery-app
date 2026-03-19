# 🍔 ZestyGo – Food Delivery Web App

A modern full-stack **Food Delivery Web Application** inspired by platforms like Swiggy and Zomato.
This project simulates a real-world food ordering experience with authentication, cart system, chatbot, and payments.

---

## 🚀 Features

* 🔐 User Authentication (Login / Signup using JWT)
* 🍽️ Browse Restaurants & Food Items
* 🛒 Add to Cart & Manage Orders
* 📦 Order Tracking (Preparing → Out for Delivery → Delivered)
* 🤖 AI Chatbot Assistant (Food suggestions & order help)
* 💳 Stripe Payment Integration (Test Mode)
* 📊 User Dashboard (Orders & activity summary)

---

## 🧱 Tech Stack

### Frontend

* React (TypeScript)
* CSS Modules
* Axios

### Backend

* Node.js
* Express.js
* SQLite

### Other Tools

* JWT Authentication
* Stripe (Payments)
* AI API (Chatbot)

---

## 📁 Project Structure

```
food-delivery-app/
│── backend/          # Backend APIs (Node + Express)
│── src/              # Frontend (React)
│── public/           # Static files
│── package.json
│── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/Kshitij027/food-delivery-app.git
cd food-delivery-app
```

---

### 2️⃣ Install dependencies

#### Frontend

```
npm install
```

#### Backend

```
cd backend
npm install
```

---

### 3️⃣ Setup Environment Variables

Create `.env` files:

#### Frontend:

```
REACT_APP_API_BASE_URL=http://localhost:5000
```

#### Backend:

```
PORT=5000
JWT_SECRET=your_secret
STRIPE_SECRET_KEY=your_key
CLIENT_URL=http://localhost:3000
```

---

### 4️⃣ Run the project

#### Start backend:

```
cd backend
npm start
```

#### Start frontend:

```
npm start
```

---

## 🎯 Future Improvements

* 🔍 Search & filtering for restaurants
* 📱 Better mobile responsiveness
* 📍 Live order tracking
* ⭐ Ratings & reviews system

---

## 👨‍💻 Author

**Kshitij Tomar**
GitHub: https://github.com/Kshitij027

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub!

---
