const express = require("express");
const { User, Message, LoginAttempts } = require("../models");
const bcrypt = require("bcryptjs");
const client = require("../config/mailer");
const { notAuthenticated } = require("../config/authentication");
const { requireAuth } = require("../config/authentication");
const passport = require("../config/passport");
const zlib = require("zlib");
const { initializeRedisClient } = require("../config/reddis");
const { trackLoginAttempts } = require("../config/trackLogin");
const { where } = require("sequelize");
const mysql = require("mysql2/promise");

const router = express.Router();

const MAX_ATTEMPTS = 2;
const LOCKOUT_TIME = 30 * 1000;

// Initiate Facebook login
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

// Facebook callback URL
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/github/failure",
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/oauth2callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard");
  }
);

router.get("/auth/github", passport.authenticate("github", { scope: "email" }));

// Callback route
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/auth/github/failure",
    failureFlash: true,
  }),
  (req, res) => {
    // Successful authentication, redirect to profile page
    res.redirect("/dashboard");
  }
);
router.get("/auth/github/failure", (req, res) => {
  const message = req.flash("error")[0];
  res.render("failure", { message });
});

router.get("/auth/twitter", passport.authenticate("twitter"));

// Callback route
router.get(
  "/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to profile page
    res.redirect("/dashboard");
  }
);

//contact page
router.get("/message", (req, res) => {
  res.render("message");
});

//contact page
router.post("/message", async (req, res) => {
  const { name, email, address1, city, message } = req.body;
  if (!name || !email || !address1 || !city || !message) {
    return res.json({ title: "missing fields" });
  }
  const adressone = address1;
  const messageE = Message.create({
    name,
    email,
    adressone,
    city,
    message,
  });

  if (!messageE) {
    return res.json({ title: "create error" });
  }

  return res.json({ title: "success" });
  // console.log(name, email, address1, city, message);
});
//login page
router.get("/login", notAuthenticated, (req, res) => {
  res.render("login");
});

//login submit
router.post("/login", notAuthenticated, async (req, res) => {
  let activeSessions = [];
  const options = {
    host: process.env.HOST,
    port: 3306,
    user: "root",
    password: process.env.PASS,
    database: process.env.DATABASE,
  };
  const connection = await mysql.createConnection(options);
  try {
    // Query the session table to get active sessions
    const [rows] = await connection.execute("SELECT * FROM sessions"); // Replace 'sessions' with your actual session table name

    // Assuming the sessions table has a `data` column where session data is stored as JSO

    const userIdList = rows.map((row) => {
      const jsonObject = JSON.parse(row.data);
      const validId = jsonObject.passport?.user?.id;
      if (validId && validId !== "undefined") {
        return validId;
      }
    });
    activeSessions = userIdList.filter((id) => id !== undefined);
  } catch (error) {
    console.error("Error querying active sessions:", error);
  } finally {
    await connection.end();
  }
  const { email, password } = req.body;
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",").shift()
    : req.socket.remoteAddress;

  try {
    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      return res.json({ title: "no user" });
    }
    if (activeSessions.includes(user.id)) {
      return res.json({ title: "already logged in" });
    }
    if (user.dataValues.suspended === true) {
      return res.json({ title: "suspended" });
    }
    if (user.dataValues.isVerified === false) {
      return res.json({ title: "not verified" });
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
      // Track login attempts
      const previousLoginAttempt = await LoginAttempts.findOne({
        where: { email: email },
      });
      let isLimitCrossed = false;
      if (previousLoginAttempt) {
        if (previousLoginAttempt.dataValues.tries >= MAX_ATTEMPTS) {
          const currentTimeat = Date.now();
          if (
            previousLoginAttempt.dataValues.triggerDate + LOCKOUT_TIME <
            currentTimeat
          ) {
            const remainingTimeAt =
              previousLoginAttempt.dataValues.triggerDate +
              LOCKOUT_TIME -
              currentTimeat;
            return res.json({ title: "lockout", time: remainingTimeAt || 0 });
          }
          if (previousLoginAttempt.dataValues.tries % MAX_ATTEMPTS == 0) {
            const updatedLoginAttempt = await previousLoginAttempt.update({
              triggerDate: Date.now(),
            });
            isLimitCrossed = true;
          }
          isLimitCrossed = true;
        }

        const updatedLoginAttempt = await previousLoginAttempt.update({
          tries: previousLoginAttempt.tries + 1,
        });
        const savedLoginAttempt = await updatedLoginAttempt.save();
        if (!updatedLoginAttempt || !savedLoginAttempt) {
          return res.json({ title: "save error" });
        }
      } else {
        const newLoginAttempt = await LoginAttempts.create({
          email: email,
          tries: 1,
          ipAddress: ip,
          triggerDate: new Date().getTime(),
        });
        if (!newLoginAttempt) {
          return res.json({ title: "create error" });
        }
      }
      if (isLimitCrossed) {
        const currentTime = Date.now();
        const remainingTime =
          previousLoginAttempt.dataValues.triggerDate +
          LOCKOUT_TIME -
          currentTime;
        if (remainingTime <= 0) {
          await previousLoginAttempt.destroy();
          isLimitCrossed = false;
        }
        return res.json({ title: "locked", time: remainingTime || 0 });
      }
      return res.json({ title: "password" });
    }
    const successCurrentDate = Date.now();
    const existingFailedAttempts = await LoginAttempts.findOne({
      where: { email: email, ipAddress: ip },
    });
    if (existingFailedAttempts) {
      if (
        existingFailedAttempts.dataValues.triggerDate + LOCKOUT_TIME >
        successCurrentDate
      ) {
        const successRemainingTime =
          existingFailedAttempts.dataValues.triggerDate +
          LOCKOUT_TIME -
          successCurrentDate;
        return res.json({ title: "locked", time: successRemainingTime || 0 });
      }
      await existingFailedAttempts.destroy();
      const updatedUser = await user.update({
        hertbeatTime: Date.now() + 10000,
      });
      const savedUser = await user.save();
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.json({ title: "login error" });
      }

      return res.json({ title: "success" });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ title: "server error" });
  }
});

//register page
router.get("/register", notAuthenticated, (req, res) => {
  res.render("register");
});

//register submit
router.post("/register", notAuthenticated, async (req, res) => {
  function randCode() {
    const min = 1000;
    const max = 9999;
    const randomCode = Math.floor(Math.random() * (max - min + 1)) + min;

    return randomCode;
  }
  const mailuser = process.env.MAILID;
  const { email, password, fullName, code, countryName, phone } = req.body;
  const user = await User.findOne({ where: { email: email } });

  if (user) {
    var data = { title: "user exists" };
    return res.json(data);
  }
  //validity checks
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    var data = { title: "invalid email" };
    return res.json(data);
  }
  if (!fullName) {
    var data = { title: "fullname error" };
    return res.json(data);
  }
  // if (password.length < 6) {
  //   var data = { title: "password too short" };
  //   return res.json(data);
  // }
  // if (!/[A-Z]/.test(password)) {
  //   const data = { title: "password uppercase error" };
  //   return res.json(data);
  // }
  // if (!/[a-z]/.test(password)) {
  //   const data = { title: "password lowercase error" };
  //   return res.json(data);
  // }
  // if (!/\d/.test(password)) {
  //   const data = { title: "password number error" };
  //   return res.json(data);
  // }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  User.create({
    email,
    password: hashedPassword,
    fullName,
    code,
    countryName,
    phone,
  })
    .then(() => {
      const randomCode = randCode();
      const sendEmail = {
        from: mailuser,
        to: email,
        subject: "Registration sucess",
        html: `
      <body style="padding: 0;margin: 0;box-sizing: border-box;font-family: &quot;Poppins&quot;, sans-serif;">
          <div>
              <table
                  style="background: #F5F6F9;font-size: 14px;line-height: 22px;font-weight: 400;color: #56666D;width: 100%;text-align: center;padding-top: 30px;">
                  <tr>
                      <td>
                          <table style="width: 96%;max-width: 620px;margin: 0 auto;background: #FFFFFF;padding: 40px;">
                              <tbody>
                                  <tr>
                                      <td style="padding: 20px 0;">
                                          <a href="#" style="color: #C7271E;word-break: break-all;">
                                              <img class="logo-svg"
                                                  src="https://hireme.caandd.com/"
                                                  alt="" style="height: 40px;width: auto;">
                                          </a>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <h2
                                              style="font-size: 18px;color: #0E9E49;font-weight: 600;margin: 0;line-height: 1.4;">
                                              New Message received</h2>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <p>Hello, ${fullName}</p>
                                          <p>Your account as a jobseeker has been created on <a href="https://hireme.caandd.com">Hire Me Service</a>.</p>
                                          <p>Your Account has been verified by Hire Me ! Here is your code ${randomCode}</p> <p></p>Proceed to Login !</p>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <p style="margin: 0;font-size: 12px;line-height: 22px;color: #56666D;">
                                          This is an automatically generated email. Please do not reply to this email. If this message does not concern you, then please contact us. For all questions, please contact us at xxxxxx@xxxxgmailcom
                                          </p>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                          <table style="width: 100%;max-width: 620px;margin: 0 auto;">
                              <tbody>
                                  <tr>
                                      <td>
                                          <p style="font-size: 13px;margin-top: 30px;">
                                              Copyright
                                              © 2023 Hire Me. All rights
                                              reserved. <br>
                                          </p>
                                          <p>
                                              This email was sent to you as a registered member of
                                              <a href="https://hireme.caandd.com" style="color: #0E9E49;word-break: break-all;">Hire Me</a>
                                          </p>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </td>
                  </tr>
              </table>
          </div>
      </body>
      `,
      };
      client.sendMail(sendEmail, (err, info) => {
        if (err) {
          console.log(err);
        }
      });

      //start the validity time
      req.session.startTime = new Date().getTime();
      req.session.randomCode = randomCode;

      const newUser = {
        email: email,
        password: hashedPassword,
        fullName: fullName,
        code: code,
        countryName: countryName,
        phone: phone,
      };
      req.session.user = newUser;
      return res.json({ title: "success" });
      // return res.redirect("login");
    })
    .catch((err) => {
      console.log(err);

      var data = { title: "error" };
      return res.json(data);
    });
});

// Logout route handler
router.post("/logout/", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const user = await User.findOne({ where: { id: userId } });

  // Perform logout logic here
  req.logOut((err) => {
    if (err) {
      return res.json({ title: "logout error" });
    }
    return res.redirect("/login");
  });
});

router.get("/otpentry", notAuthenticated, (req, res) => {
  res.render("otpentry");
});

router.post("/otpentry", notAuthenticated, async (req, res) => {
  const { code } = req.body;
  const { startTime, randomCode } = req.session;
  const currentTime = new Date().getTime();
  if (!startTime || !randomCode) {
    return res.json({ title: "error" });
  }

  if (currentTime - startTime < 50000) {
    if (code == randomCode) {
      const userEmail = req.session.user.email;
      const user = await User.findOne({ where: { email: userEmail } });
      await user.update({ isVerified: true });
      const savedUser = user.save();
      if (!savedUser) {
        return res.json({ title: "save error" });
      }
      req.session.destroy();
      return res.json({ title: "success" });
    }
    return res.json({ title: "incorrect code" });
  }
  return res.json({ title: "timeout" });
});

router.post("/resend", notAuthenticated, (req, res) => {
  function randCode() {
    const min = 1000;
    const max = 9999;
    const randomCode = Math.floor(Math.random() * (max - min + 1)) + min;

    return randomCode;
  }
  const randomCode = randCode();
  const mailuser = process.env.MAILID;
  const { fullName, email } = req.session.user;
  const sendEmail = {
    from: mailuser,
    to: email,
    subject: "Re-send code",
    html: `
  <body style="padding: 0;margin: 0;box-sizing: border-box;font-family: &quot;Poppins&quot;, sans-serif;">
      <div>
          <table
              style="background: #F5F6F9;font-size: 14px;line-height: 22px;font-weight: 400;color: #56666D;width: 100%;text-align: center;padding-top: 30px;">
              <tr>
                  <td>
                      <table style="width: 96%;max-width: 620px;margin: 0 auto;background: #FFFFFF;padding: 40px;">
                          <tbody>
                              <tr>
                                  <td style="padding: 20px 0;">
                                      <a href="#" style="color: #C7271E;word-break: break-all;">
                                          <img class="logo-svg"
                                              src="https://hireme.caandd.com/"
                                              alt="" style="height: 40px;width: auto;">
                                      </a>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <h2
                                          style="font-size: 18px;color: #0E9E49;font-weight: 600;margin: 0;line-height: 1.4;">
                                          New Message received</h2>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <p>Hello, ${fullName}</p>
                                      <p>Here is your new code: ${randomCode}</p>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <p style="margin: 0;font-size: 12px;line-height: 22px;color: #56666D;">
                                      This is an automatically generated email. Please do not reply to this email. If this message does not concern you, then please contact us. For all questions, please contact us at xxxxxx@xxxxgmailcom
                                      </p>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                      <table style="width: 100%;max-width: 620px;margin: 0 auto;">
                          <tbody>
                              <tr>
                                  <td>
                                      <p style="font-size: 13px;margin-top: 30px;">
                                          Copyright
                                          © 2023 Hire Me. All rights
                                          reserved. <br>
                                      </p>
                                      <p>
                                          This email was sent to you as a registered member of
                                          <a href="https://hireme.caandd.com" style="color: #0E9E49;word-break: break-all;">Hire Me</a>
                                      </p>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </td>
              </tr>
          </table>
      </div>
  </body>
  `,
  };
  client.sendMail(sendEmail, (err, info) => {
    if (err) {
      return res.json({ title: "mail error" });
    }

    req.session.startTime = new Date().getTime();
    req.session.randomCode = randomCode;

    return res.json({ title: "success" });
  });
});

router.post("/heartbeat", async (req, res) => {
  console.log(
    "Received heartbeat from client at:",
    new Date(req.body.timestamp)
  );
  const user = await User.findOne({ where: { id: req.user.id } });
  const updatedUser = await user.update({ hertbeatTime: Date.now() });
  const savedUser = await user.save();
  res.sendStatus(200);
});

module.exports = router;
