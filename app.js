// Imports
const http = require("http");
const express = require("express");
const app = express();
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const authRoutes = require("./routes/auth");
const dashboardRoute = require("./routes/dashboardRoutes");
require("./config/connection");

const bodyParser = require("body-parser");
const injectEnvVariables = require("./config/injectenv");
const { setupCronJob, separateCronJob } = require("./config/cronjob");
const MySQLStore = require("express-mysql-session")(session);
const passportImp = require("./config/passport");
const flash = require("connect-flash");
const checkIsLogged = require("./config/loggedMiddleware");

const cors = require("cors");
require("dotenv").config();

// Initialize activeUsers variable before middleware
let activeUsers = 0;

// Socket.io setup
// const server = http.createServer(app);
// const socketIo = require("socket.io");
// const io = socketIo(server);

// io.on("connection", (socket) => {
//   activeUsers++;

//   socket.on("disconnect", () => {
//     activeUsers--;
//   });
// });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.use(express.static(__dirname + "/assets"));
app.use("/uploads", express.static("uploads"));
app.use(passport.initialize());
app.use(express.json({ limit: "100mb" }));
app.use(express.static("/views/images"));
app.use(bodyParser.json());
app.use(injectEnvVariables);
app.use(cors());

// Single socket middleware
// app.use((req, res, next) => {
//   if (activeUsers > 0 && req.path !== "/already-open") {
//     return res.redirect("/already-open");
//   }
//   next();
// });

// Config
app.set("trust proxy", 1);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Options for db connection
const options = {
  host: process.env.HOST,
  port: 3306,
  user: "root",
  password: process.env.PASS,
  database: process.env.DATABASE,
};

const sessionStore = new MySQLStore(options);

// Express session
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

app.use(flash());

// Passport session
app.use(passport.initialize());
app.use(passport.session());

// Cronjob
setupCronJob();
// separateCronJob();

// Routes
app.use("/", authRoutes);
app.use("/dashboard", dashboardRoute);

// Route for "already open" page
app.get("/already-open", (req, res) => {
  res.render("alreadyOpen");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
