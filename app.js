//imports
const express = require("express");
const app = express();
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const multer = require("multer");
const authRoutes = require("./routes/auth");
const dashboardRoute = require("./routes/dashboardRoutes");
require("./config/connection");
const axios = require("axios");
const setupCronJob = require("./config/cronjob");
let MySQLStore = require("express-mysql-session")(session);
require("./config/passport")(passport);
require("dotenv").config();

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/assets"));
app.use("/uploads", express.static("uploads"));
app.use(passport.initialize());
app.use(express.json({ limit: "100mb" }));
app.use(express.static("/views/images"));

//config
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//options for db connection
let options = {
  host: process.env.HOST,
  port: 3306,
  user: "root",
  password: process.env.PASS,
  database: process.env.DATABASE,
};

let sessionStore = new MySQLStore(options);

//Express session
app.use(
  session({
    secret: "test",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 6000 * 24 * 24,
    },
  })
);

//passport session
app.use(passport.session());

//cronjob
// setupCronJob();

//middleware
app.use("/", authRoutes);
app.use("/dashboard", dashboardRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
