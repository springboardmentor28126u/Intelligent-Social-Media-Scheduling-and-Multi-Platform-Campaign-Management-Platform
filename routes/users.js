const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const router = express.Router();

// ============================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                message: "Server authentication configuration is missing"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        console.error("AUTHENTICATION ERROR:", error);

        return res.status(401).json({
            message: "Invalid or expired authentication token"
        });
    }
};


// ============================================================
// REGISTER USER
// POST /api/users/register
// ============================================================

router.post("/register", async (req, res) => {
    try {

        const {
            name,
            email,
            password
        } = req.body;

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // --------------------------------------------------------
        // Clean input
        // --------------------------------------------------------

        const cleanName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();

        if (!cleanName || !cleanEmail) {
            return res.status(400).json({
                message: "Name and email cannot be empty"
            });
        }

        // --------------------------------------------------------
        // Basic password validation
        // --------------------------------------------------------

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        // --------------------------------------------------------
        // Check whether email already exists
        // --------------------------------------------------------

        const existingUser = await pool.query(
            `SELECT user_id
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        // --------------------------------------------------------
        // Hash password
        // --------------------------------------------------------

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // --------------------------------------------------------
        // Insert new user
        // --------------------------------------------------------

        const result = await pool.query(
            `INSERT INTO users
             (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING
                user_id,
                name,
                email,
                created_at`,
            [
                cleanName,
                cleanEmail,
                hashedPassword
            ]
        );

        // --------------------------------------------------------
        // Registration successful
        // --------------------------------------------------------

        res.status(201).json({
            message: "User registered successfully",

            user: result.rows[0]
        });

    } catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );

        // PostgreSQL duplicate key error
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
});


// ============================================================
// LOGIN USER
// POST /api/users/login
// ============================================================

router.post("/login", async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // --------------------------------------------------------
        // Check JWT secret
        // --------------------------------------------------------

        if (!process.env.JWT_SECRET) {

            console.error(
                "JWT_SECRET is not configured"
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing"
            });
        }

        // --------------------------------------------------------
        // Clean email
        // --------------------------------------------------------

        const cleanEmail = String(email)
            .trim()
            .toLowerCase();

        // --------------------------------------------------------
        // Find user
        // --------------------------------------------------------

        const result = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                password,
                created_at
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [cleanEmail]
        );

        // --------------------------------------------------------
        // User not found
        // --------------------------------------------------------

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // --------------------------------------------------------
        // Compare password
        // --------------------------------------------------------

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // --------------------------------------------------------
        // Create JWT token
        // IMPORTANT:
        // user_id identifies the logged-in user
        // --------------------------------------------------------

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // --------------------------------------------------------
        // Login successful
        // --------------------------------------------------------

        res.json({
            message: "Login successful",

            token: token,

            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});


// ============================================================
// GET CURRENT LOGGED-IN USER
// GET /api/users/me
// ============================================================

router.get("/me", authenticateToken, async (req, res) => {
    try {

        const userId = req.user.user_id;

        const result = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                created_at
             FROM users
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            user: result.rows[0]
        });

    } catch (error) {

        console.error(
            "GET CURRENT USER ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to get current user"
        });
    }
});


// ============================================================
// GET ALL USERS
// GET /api/users
//
// Useful for testing multiple users.
// In a production application, this should normally be
// restricted to an administrator.
// ============================================================

router.get("/", authenticateToken, async (req, res) => {
    try {

        const result = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                created_at
             FROM users
             ORDER BY user_id ASC`
        );

        res.json({
            users: result.rows,
            total_users: result.rows.length
        });

    } catch (error) {

        console.error(
            "GET USERS ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch users"
        });
    }
});


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

