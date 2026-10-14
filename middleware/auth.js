
const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        // Check whether the login token was provided.
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication token is missing. Please log in again."
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                message: "Authentication token is empty."
            });
        }

        // Use the same secret that the login route uses in jwt.sign().
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                message: "Server authentication is not configured."
            });
        }

        // Verify the token.
        const decoded = jwt.verify(token, secret);

        if (
            !decoded ||
            typeof decoded !== "object" ||
            !Number.isInteger(Number(decoded.user_id)) ||
            Number(decoded.user_id) <= 0
        ) {
            return res.status(401).json({
                message: "Invalid login token. Please log in again."
            });
        }

        // Make the authenticated user available to API routes.
        req.user = {
            ...decoded,
            user_id: Number(decoded.user_id)
        };

        return next();
    } catch (error) {
        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired login token. Please log in again."
            });
        }

        console.error("AUTHENTICATION ERROR:", error.message);

        return res.status(500).json({
            message: "Authentication failed due to a server error."
        });
    }
}

module.exports = authenticateToken;
