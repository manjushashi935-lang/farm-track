require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());

// ================= MYSQL CONNECTION =================

const db = mysql.createConnection({

  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,

  connectTimeout: 10000

});

console.log(
  "Connecting to DB:",
  process.env.DB_HOST,
  process.env.DB_PORT
);

db.connect(err => {

  if (err) {

    console.log("DB Connection Failed ❌", err);

  } else {

    console.log("MySQL Connected ✅");

  }
});

// ================= JWT VERIFY =================

function verifyToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {

    return res.status(401).json({
      message: "Access denied ❌"
    });
  }

  let token = authHeader;

  // Handle Bearer token
  if (authHeader.startsWith("Bearer ")) {

    token = authHeader.split(" ")[1];
  }

  try {

    const verified =
      jwt.verify(token, "farmtracksupersecret123");

    req.user = verified;

    next();

  } catch (err) {

    res.status(400).json({
      message: "Invalid token ❌"
    });
  }
}

// ================= ROOT =================

app.get("/", (req, res) => {

  res.send("Farm Track Backend Running 🚀");
});

// ================= REGISTER =================

app.post("/register", async (req, res) => {

  const { name, email, password } = req.body;

  try {

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(
      sql,
      [name, email, hashedPassword],

      (err, result) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "User already exists ❌"
          });
        }

        res.json({
          message: "Registration successful 🎉"
        });
      }
    );

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error ❌"
    });
  }
});

// ================= LOGIN =================

app.post("/login", (req, res) => {

  const { email, password } = req.body;

  const sql =
    "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, result) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Server error ❌"
      });
    }

    if (result.length === 0) {

      return res.status(400).json({
        message: "User not found ❌"
      });
    }

    const user = result[0];

    const validPassword =
      await bcrypt.compare(password, user.password);

    if (!validPassword) {

      return res.status(400).json({
        message: "Wrong password ❌"
      });
    }

   const token = jwt.sign(

  {
    id: user.id,
    email: user.email
  },

  "farmtracksupersecret123",

  {
    expiresIn: "7d"
  }
);

    res.json({

      message: "Login successful 🎉",

      token

    });

  });
});

// ================= GET CROPS =================

app.get("/crops", verifyToken, (req, res) => {

  const sql =
    "SELECT * FROM crops WHERE user_id = ?";

  db.query(
    sql,
    [req.user.id],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Failed to load crops ❌"
        });
      }

      res.json(result);

    }
  );
});

// ================= ADD CROP =================

app.post("/add-crop", verifyToken, (req, res) => {

  const {
    crop_name,
    land_area,
    season
  } = req.body;

  const sql = `
    INSERT INTO crops
    (crop_name, land_area, season, user_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(

    sql,

    [
      crop_name,
      land_area,
      season,
      req.user.id
    ],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Failed to add crop ❌"
        });
      }

      res.json({
        message: "Crop added successfully 🌾"
      });

    }
  );
});

// ================= ADD EXPENSE =================

app.post("/add-expense", verifyToken, (req, res) => {

  const {
    crop_id,
    type,
    amount,
    date
  } = req.body;

  const sql = `
    INSERT INTO expenses
    (crop_id, type, amount, date)
    VALUES (?, ?, ?, ?)
  `;

  db.query(

    sql,

    [
      crop_id,
      type,
      amount,
      date
    ],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Expense add failed ❌"
        });
      }

      res.json({
        message: "Expense added 💸"
      });

    }
  );
});

// ================= ADD INCOME =================

app.post("/add-income", verifyToken, (req, res) => {

  const {
    crop_id,
    quantity,
    price_per_unit,
    date
  } = req.body;

  const total_amount =
    quantity * price_per_unit;

  const sql = `
    INSERT INTO income
    (
      crop_id,
      quantity,
      price_per_unit,
      total_amount,
      date
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(

    sql,

    [
      crop_id,
      quantity,
      price_per_unit,
      total_amount,
      date
    ],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Income add failed ❌"
        });
      }

      res.json({
        message: "Income added 💰"
      });

    }
  );
});

// ================= PROFIT =================
app.get("/profit/:crop_id", verifyToken, (req, res) => {

  const cropId = req.params.crop_id;

  const incomeSql = `
    SELECT SUM(total_amount) AS totalIncome
    FROM income
    WHERE crop_id = ?
  `;

  const expenseSql = `
    SELECT SUM(amount) AS totalExpense
    FROM expenses
    WHERE crop_id = ?
  `;

  db.query(incomeSql, [cropId], (err1, incomeResult) => {

    if (err1) {

      console.log(err1);

      return res.status(500).json({
        message: "Income fetch failed ❌"
      });
    }

    db.query(expenseSql, [cropId], (err2, expenseResult) => {

      if (err2) {

        console.log(err2);

        return res.status(500).json({
          message: "Expense fetch failed ❌"
        });
      }

      const totalIncome =
        Number(incomeResult[0].totalIncome || 0);

      const totalExpense =
        Number(expenseResult[0].totalExpense || 0);

      const profit =
        totalIncome - totalExpense;

      res.json({

        total_income: totalIncome,

        total_expense: totalExpense,

        profit: profit

      });

    });
  });
});

// ================= MONTHLY STATS =================

app.get("/monthly-stats/:crop_id", verifyToken, (req, res) => {

  const cropId = req.params.crop_id;

  const incomeSql = `
    SELECT
      MONTH(date) AS month,
      SUM(total_amount) AS income
    FROM income
    WHERE crop_id = ?
    GROUP BY MONTH(date)
  `;

  const expenseSql = `
    SELECT
      MONTH(date) AS month,
      SUM(amount) AS expense
    FROM expenses
    WHERE crop_id = ?
    GROUP BY MONTH(date)
  `;

  db.query(incomeSql, [cropId], (err1, incomeData) => {

    if (err1) {

      console.log(err1);

      return res.status(500).json({
        message: "Monthly income failed ❌"
      });
    }

    db.query(expenseSql, [cropId], (err2, expenseData) => {

      if (err2) {

        console.log(err2);

        return res.status(500).json({
          message: "Monthly expense failed ❌"
        });
      }

      res.json({

        income: incomeData,

        expense: expenseData

      });

    });
  });
});

// ================= UPDATE CROP =================

app.put("/update-crop/:id", verifyToken, (req, res) => {

  const cropId = req.params.id;

  const {
    crop_name,
    land_area,
    season
  } = req.body;

  const sql = `
    UPDATE crops
    SET crop_name = ?,
        land_area = ?,
        season = ?
    WHERE id = ?
  `;

  db.query(

    sql,

    [
      crop_name,
      land_area,
      season,
      cropId
    ],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Update failed ❌"
        });
      }

      res.json({
        message: "Crop updated ✏️"
      });

    }
  );
});

// ================= DELETE CROP =================

app.delete("/delete-crop/:id", verifyToken, (req, res) => {

  const cropId = req.params.id;

  const sql =
    "DELETE FROM crops WHERE id = ?";

  db.query(sql, [cropId], (err, result) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Delete failed ❌"
      });
    }

    res.json({
      message: "Crop deleted 🗑️"
    });

  });
});

// ================= SERVER =================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
});