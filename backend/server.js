const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

// ============================================================
// CONFIGURATION
// ============================================================

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_BYTES = 72;
const JWT_EXPIRY = "1h";

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Server authentication configuration is missing",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.user_id) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};

// ============================================================
// REGISTER USER
// POST /api/users/register
// Body: { name, email, password }
// ============================================================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate input.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({
        message: "Name and email cannot be empty",
      });
    }

    if (cleanName.length > 100 || cleanEmail.length > 254) {
      return res.status(400).json({
        message: "Name or email is too long",
      });
    }

    // Correct email validation regex.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    if (
      password.length < PASSWORD_MIN_LENGTH ||
      Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES
    ) {
      return res.status(400).json({
        message:
          "Password must contain at least 6 characters and no more than 72 UTF-8 bytes",
      });
    }

    // Check whether the email already exists.
    const existingUser = await pool.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already exists. Please log in.",
      });
    }

    // Hash the password before saving it.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the new user.
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING user_id, name, email, created_at`,
      [cleanName, cleanEmail, hashedPassword]
    );

    return res.status(201).json({
      message: "Account created successfully. Please log in.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email already exists. Please log in.",
      });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

// ============================================================
// LOGIN USER
// POST /api/users/login
// Body: { email, password }
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Server authentication configuration is missing",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the account.
    const result = await pool.query(
      `SELECT user_id, name, email, password, created_at
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Compare the supplied password with the saved hash.
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate a token for this user.
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

// ============================================================
// GET CURRENT LOGGED-IN USER
// GET /api/users/me
// Requires: Authorization: Bearer <token>
// ============================================================

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, created_at
       FROM users
       WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("GET CURRENT USER ERROR:", error);

    return res.status(500).json({
      message: "Failed to retrieve user details",
    });
  }
});

// ============================================================
// GET ALL USERS — DEVELOPMENT ONLY
// GET /api/users
// Requires a valid login token
// ============================================================

if (process.env.NODE_ENV !== "production") {
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT user_id, name, email, created_at
         FROM users
         ORDER BY user_id ASC`
      );

      return res.status(200).json({
        users: result.rows,
        total_users: result.rows.length,
      });
    } catch (error) {
      console.error("GET USERS ERROR:", error);

      return res.status(500).json({
        message: "Failed to retrieve users",
      });
    }
  });
}

module.exports = router;
