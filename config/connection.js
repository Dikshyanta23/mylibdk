const Sequelize = require("sequelize");
require("dotenv").config();

// Initialize Sequelize with your MySQL database credentials
const sequelize = new Sequelize(
  process.env.DATABASE,
  "root",
  process.env.PASS,
  {
    host: process.env.HOST,
    dialect: "mysql",
    // Additional options if needed
  }
);

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = sequelize;
