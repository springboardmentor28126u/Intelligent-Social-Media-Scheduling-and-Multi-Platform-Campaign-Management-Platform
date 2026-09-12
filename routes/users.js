const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const router = express.Router();


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
                message:
                    "Name, email and password are required"
            });
        }

        // --------------------------------------------------------
        // Basic password validation
        // --------------------------------------------------------

        if (password.length < 6) {
            return res.status(400).json({
                message:
                    "Password must contain at least 6 characters"
            });
        }

        // --------------------------------------------------------
        // Check whether email already exists
        // --------------------------------------------------------

        const existingUser = await pool.query(
            `SELECT user_id
             FROM users
             WHERE email = $1`,
            [email]
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
        // Insert user
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
                name,
                email,
                hashedPassword
            ]
        );

        // --------------------------------------------------------
        // Response
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
                message:
                    "Email and password are required"
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
             WHERE email = $1`,
            [email]
        );

        // --------------------------------------------------------
        // User not found
        // --------------------------------------------------------

        if (result.rows.length === 0) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // --------------------------------------------------------
        // Compare password
        // --------------------------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        // --------------------------------------------------------
        // Create JWT token
        // --------------------------------------------------------

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email
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
// EXPORT ROUTER
// ============================================================

module.exports = router;