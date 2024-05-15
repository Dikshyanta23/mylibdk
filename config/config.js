require("dotenv").config();
const x = {
  development: {
    username: "root",
    password: process.env.PASS,
    database: process.env.DATABASE,
    host: process.env.HOST,
    dialect: "mysql",
    logging: false,
  },
  test: {
    username: "root",
    password: process.env.PASS,
    database: process.env.DATABASE,
    host: process.env.HOST,
    dialect: "mysql",
  },
  production: {
    username: "root",
    password: process.env.PASS,
    database: process.env.DATABASE,
    host: process.env.HOST,
    dialect: "mysql",
    logging: false,
  },
};
module.exports = x;
