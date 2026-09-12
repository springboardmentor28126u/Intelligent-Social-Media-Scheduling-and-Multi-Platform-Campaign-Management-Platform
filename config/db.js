const { Pool } = require("pg");
require("dotenv").config();

/*
=========================================================
DATABASE CONNECTION
=========================================================

This file connects the Node.js/Express backend
to PostgreSQL.

The database details are loaded from .env
so passwords and connection information are
not hard-coded in the source code.
=========================================================
*/

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,

    /*
    -----------------------------------------------------
    SSL
    -----------------------------------------------------

    Required when connecting to many cloud PostgreSQL
    providers such as Supabase.

    For local PostgreSQL this can normally be removed
    if SSL is not configured.
    -----------------------------------------------------
    */

    ssl:
        process.env.DB_SSL === "true"
            ? {
                  rejectUnauthorized: false,
              }
            : false,

    /*
    -----------------------------------------------------
    CONNECTION POOL SETTINGS
    -----------------------------------------------------
    */

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

/*
=========================================================
DATABASE CONNECTION TEST
=========================================================
*/

pool.on("connect", () => {
    console.log("PostgreSQL connection established.");
});

pool.on("error", (error) => {
    console.error(
        "Unexpected PostgreSQL pool error:",
        error.message
    );
});

/*
=========================================================
EXPORT
=========================================================
*/

module.exports = pool;