require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json());

// ================= DATABASE =================

const db = new Pool({

  connectionString:
    process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }

});

db.connect()
  .then(() =>
    console.log(
      "PostgreSQL Connected ✅"
    )
  )
  .catch(err =>
    console.log(
      "DB Connection Failed ❌",
      err
    )
  );

// ================= JWT VERIFY =================

function verifyToken(req, res, next) {

  const authHeader =
    req.headers.authorization;

  if (!authHeader) {

    return res.status(401).json({
      message: "Access denied ❌"
    });
  }

  let token = authHeader;

  if (
    authHeader.startsWith("Bearer ")
  ) {

    token =
      authHeader.split(" ")[1];
  }

  try {

    const verified = jwt.verify(

      token,

      process.env.JWT_SECRET
    );

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

  res.send(
    "Farm Track Backend Running 🚀"
  );
});

// ================= REGISTER =================

app.post("/register", async (req, res) => {

  try {

    const {
      name,
      email,
      password
    } = req.body;

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (name, email, password)
      VALUES ($1, $2, $3)
    `;

    await db.query(sql, [

      name,
      email,
      hashedPassword

    ]);

    res.json({
      message:
        "Registration successful 🎉"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "User already exists ❌"
    });
  }
});

// ================= LOGIN =================

app.post("/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const sql =
      "SELECT * FROM users WHERE email = $1";

    const result =
      await db.query(sql, [email]);

    if (result.rows.length === 0) {

      return res.status(400).json({
        message:
          "User not found ❌"
      });
    }

    const user =
      result.rows[0];

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {

      return res.status(400).json({
        message:
          "Wrong password ❌"
      });
    }

    const token = jwt.sign(

      {
        id: user.id,
        email: user.email
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d"
      }
    );

    res.json({

      message:
        "Login successful 🎉",

      token

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Server error ❌"
    });
  }
});

// ================= GET CROPS =================

app.get("/crops", verifyToken, async (req, res) => {

  try {

    const sql = `
      SELECT *
      FROM crops
      WHERE user_id = $1
      ORDER BY id DESC
    `;

    const result =
      await db.query(
        sql,
        [req.user.id]
      );

    res.json(result.rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Failed to load crops ❌"
    });
  }
});

// ================= ADD CROP =================

app.post("/add-crop", verifyToken, async (req, res) => {

  try {

    const {
      crop_name,
      land_area,
      season
    } = req.body;

    const sql = `
      INSERT INTO crops
      (
        crop_name,
        land_area,
        season,
        user_id
      )
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(sql, [

      crop_name,
      land_area,
      season,
      req.user.id

    ]);

    res.json({
      message:
        "Crop added 🌾"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Failed to add crop ❌"
    });
  }
});

// ================= ADD EXPENSE =================

app.post("/add-expense", verifyToken, async (req, res) => {

  try {

    const {
      crop_id,
      type,
      amount,
      date
    } = req.body;

    const sql = `
      INSERT INTO expenses
      (
        crop_id,
        type,
        amount,
        date,
        user_id
      )
      VALUES ($1, $2, $3, $4, $5)
    `;

    await db.query(sql, [

      crop_id,
      type,
      amount,
      date,
      req.user.id

    ]);

    res.json({
      message:
        "Expense added 💸"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Expense add failed ❌"
    });
  }
});

// ================= GET EXPENSES =================

app.get("/expenses", verifyToken, async (req, res) => {

  try {

    const sql = `
      SELECT *
      FROM expenses
      WHERE user_id = $1
      ORDER BY id DESC
    `;

    const result =
      await db.query(
        sql,
        [req.user.id]
      );

    res.json(result.rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Failed to fetch expenses ❌"
    });
  }
});

// ================= ADD INCOME =================

app.post("/add-income", verifyToken, async (req, res) => {

  try {

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
        date,
        user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await db.query(sql, [

      crop_id,
      quantity,
      price_per_unit,
      total_amount,
      date,
      req.user.id

    ]);

    res.json({
      message:
        "Income added 💰"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Income add failed ❌"
    });
  }
});

// ================= GET INCOME =================

app.get("/income", verifyToken, async (req, res) => {

  try {

    const sql = `
      SELECT *
      FROM income
      WHERE user_id = $1
      ORDER BY id DESC
    `;

    const result =
      await db.query(
        sql,
        [req.user.id]
      );

    res.json(result.rows);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Failed to fetch income ❌"
    });
  }
});

// ================= PROFIT =================

app.get("/profit/:crop_id", verifyToken, async (req, res) => {

  try {

    const cropId =
      req.params.crop_id;

    const userId =
      req.user.id;

    const incomeSql = `
      SELECT
        COALESCE(
          SUM(total_amount), 0
        ) AS total_income
      FROM income
      WHERE crop_id = $1
      AND user_id = $2
    `;

    const expenseSql = `
      SELECT
        COALESCE(
          SUM(amount), 0
        ) AS total_expense
      FROM expenses
      WHERE crop_id = $1
      AND user_id = $2
    `;

    const incomeResult =
      await db.query(
        incomeSql,
        [cropId, userId]
      );

    const expenseResult =
      await db.query(
        expenseSql,
        [cropId, userId]
      );

    const totalIncome =
      Number(
        incomeResult.rows[0]
          .total_income
      );

    const totalExpense =
      Number(
        expenseResult.rows[0]
          .total_expense
      );

    const profit =
      totalIncome - totalExpense;

    res.json({

      total_income:
        totalIncome,

      total_expense:
        totalExpense,

      profit

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        "Profit calculation failed ❌"
    });
  }
});

// ================= MONTHLY STATS =================

app.get(
  "/monthly-stats/:crop_id",
  verifyToken,

  async (req, res) => {

    try {

      const cropId =
        req.params.crop_id;

      const userId =
        req.user.id;

      const incomeSql = `
        SELECT
          EXTRACT(MONTH FROM date)
          AS month,

          SUM(total_amount)
          AS income

        FROM income

        WHERE crop_id = $1
        AND user_id = $2

        GROUP BY month
        ORDER BY month
      `;

      const expenseSql = `
        SELECT
          EXTRACT(MONTH FROM date)
          AS month,

          SUM(amount)
          AS expense

        FROM expenses

        WHERE crop_id = $1
        AND user_id = $2

        GROUP BY month
        ORDER BY month
      `;

      const incomeData =
        await db.query(
          incomeSql,
          [cropId, userId]
        );

      const expenseData =
        await db.query(
          expenseSql,
          [cropId, userId]
        );

      res.json({

        income:
          incomeData.rows,

        expense:
          expenseData.rows

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message:
          "Monthly stats failed ❌"
      });
    }
  }
);

// ================= UPDATE CROP =================

app.put(
  "/update-crop/:id",
  verifyToken,

  async (req, res) => {

    try {

      const cropId =
        req.params.id;

      const {
        crop_name,
        land_area,
        season
      } = req.body;

      const sql = `
        UPDATE crops

        SET

          crop_name = $1,
          land_area = $2,
          season = $3

        WHERE id = $4
      `;

      await db.query(sql, [

        crop_name,
        land_area,
        season,
        cropId

      ]);

      res.json({
        message:
          "Crop updated ✏️"
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message:
          "Update failed ❌"
      });
    }
  }
);

// ================= DELETE CROP =================

app.delete(
  "/delete-crop/:id",
  verifyToken,

  async (req, res) => {

    try {

      const cropId =
        req.params.id;

      const sql =
        "DELETE FROM crops WHERE id = $1";

      await db.query(sql, [cropId]);

      res.json({
        message:
          "Crop deleted 🗑️"
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message:
          "Delete failed ❌"
      });
    }
  }
);

// ================= SERVER =================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});