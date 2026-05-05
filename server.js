const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "mysecretkey";

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// ================= DB CONNECTION =================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectTimeout: 10000
});

console.log("Connecting to DB:", process.env.DB_HOST, process.env.DB_PORT);

db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed ❌", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});

// ================= AUTH MIDDLEWARE =================
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) return res.status(403).json({ message: "No token ❌" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token ❌" });

    req.userId = decoded.id;
    next();
  });
}

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
  res.send("Farm Track Backend Running 🚀");
});

// ================= AUTH =================

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

  db.query(sql, [name, email, hashedPassword], (err) => {
    if (err) {
      return res.status(500).json({ message: "User already exists ❌" });
    }

    res.json({ message: "User registered successfully ✅" });
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(400).json({ message: "User not found ❌" });
    }

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Wrong password ❌" });
    }

    const token = jwt.sign({ id: user.id }, SECRET);

    res.json({ message: "Login successful 🎉", token });
  });
});

// ================= CROPS =================

// Add Crop
app.post("/add-crop", verifyToken, (req, res) => {
  const { crop_name, land_area, season } = req.body;

  const sql = "INSERT INTO crops (crop_name, land_area, season, user_id) VALUES (?, ?, ?, ?)";

  db.query(sql, [crop_name, land_area, season, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: "Crop added 🌾" });
  });
});

// Get Crops
app.get("/crops", verifyToken, (req, res) => {
  const sql = "SELECT * FROM crops WHERE user_id = ?";

  db.query(sql, [req.userId], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    res.json(result);
  });
});

// ================= EXPENSE =================

app.post("/add-expense", verifyToken, (req, res) => {
  const { crop_id, type, amount, date } = req.body;

  const sql = "INSERT INTO expenses (crop_id, type, amount, date) VALUES (?, ?, ?, ?)";

  db.query(sql, [crop_id, type, amount, date], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: "Expense added 💸" });
  });
});

// ================= INCOME =================

app.post("/add-income", verifyToken, (req, res) => {
  const { crop_id, quantity, price_per_unit, date } = req.body;

  const total_amount = quantity * price_per_unit;

  const sql = `
    INSERT INTO income (crop_id, quantity, price_per_unit, total_amount, date)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [crop_id, quantity, price_per_unit, total_amount, date], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: "Income added 💰", total_amount });
  });
});

// ================= PROFIT =================

app.get("/profit/:crop_id", verifyToken, (req, res) => {
  const cropId = req.params.crop_id;

  const expenseQuery = "SELECT SUM(amount) AS total_expense FROM expenses WHERE crop_id = ?";
  const incomeQuery = "SELECT SUM(total_amount) AS total_income FROM income WHERE crop_id = ?";

  db.query(expenseQuery, [cropId], (err, exp) => {
    if (err) return res.status(500).json({ error: err });

    db.query(incomeQuery, [cropId], (err, inc) => {
      if (err) return res.status(500).json({ error: err });

      const totalExpense = exp[0].total_expense || 0;
      const totalIncome = inc[0].total_income || 0;

      res.json({
        crop_id: cropId,
        total_expense: totalExpense,
        total_income: totalIncome,
        profit: totalIncome - totalExpense
      });
    });
  });
});

// ================= UPDATE / DELETE =================

app.put("/update-crop/:id", verifyToken, (req, res) => {
  const { crop_name, land_area, season } = req.body;
  const id = req.params.id;

  const sql = `
    UPDATE crops 
    SET crop_name=?, land_area=?, season=? 
    WHERE id=? AND user_id=?
  `;

  db.query(sql, [crop_name, land_area, season, id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: "Crop updated ✏️" });
  });
});

app.delete("/delete-crop/:id", verifyToken, (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM crops WHERE id=? AND user_id=?";

  db.query(sql, [id, req.userId], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ message: "Crop deleted 🗑️" });
  });
});

// ================= MONTHLY ANALYTICS =================

app.get("/monthly-stats/:crop_id", verifyToken, (req, res) => {
  const cropId = req.params.crop_id;

  const sql = `
    SELECT DATE_FORMAT(date, '%Y-%m') AS month,
           SUM(total_amount) AS income
    FROM income
    WHERE crop_id = ?
    GROUP BY month
  `;

  const expenseSql = `
    SELECT DATE_FORMAT(date, '%Y-%m') AS month,
           SUM(amount) AS expense
    FROM expenses
    WHERE crop_id = ?
    GROUP BY month
  `;

  db.query(sql, [cropId], (err, incomeData) => {
    if (err) return res.status(500).json(err);

    db.query(expenseSql, [cropId], (err, expenseData) => {
      if (err) return res.status(500).json(err);

      res.json({
        income: incomeData,
        expense: expenseData
      });
    });
  });
});

// ================= START SERVER =================

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});