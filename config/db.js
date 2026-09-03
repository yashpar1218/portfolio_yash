const mysql = require('mysql2');
const util = require('util');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'portfolio',
    port: parseInt(process.env.DB_PORT || '3307', 10),

    ssl: process.env.DB_HOST
        ? {
            ca: fs.readFileSync(
                path.join(__dirname, '../certs/ca.pem')
            )
        }
        : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const exe = util.promisify(pool.query).bind(pool);

module.exports = { pool, exe };