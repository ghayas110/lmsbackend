const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const dbPool = mysql.createPool({
    host: process.env.DBHOST,
    database: process.env.DBNAME,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    connectionLimit: process.env.CONNECTION,
});

const dbConnection = dbPool.promise();

module.exports = dbConnection;