const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { User, Admin } = require("../models");

// User login strategy
passport.use(
  "user-login",
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User.findOne({ where: { email: email } })
      .then((user) => {
        if (!user) {
          var err = "no user";
          return done(err);
        }
        // Compare the password using bcrypt
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) console.log(err);
          if (!result) {
            var err = "password mismatch";
            return done(err);
          }
          return done(null, user);
        });
      })
      .catch((err) => {
        return done(err);
      });
  })
);

// Admin login strategy
passport.use(
  "admin-login",
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    Admin.findOne({ where: { email: email } })
      .then((admin) => {
        if (!admin) {
          var err = "no admin";
          return done(err);
        }
        // Compare the password using bcrypt
        bcrypt.compare(password, admin.password, (err, result) => {
          if (err) console.log(err);
          if (!result) {
            var err = "password mismatch";
            return done(err);
          }
          return done(null, admin);
        });
      })
      .catch((err) => {
        return done(err);
      });
  })
);


// Serialize and deserialize user
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(async function (serializedUser, done) {
  try {
    const userInstance = await User.findByPk(serializedUser.id);
    if (userInstance) return done(null, userInstance);

    const organization = await Organization.findByPk(serializedUser.id);
    if (organization) return done(null, organization);

    const admin = await Admin.findByPk(serializedUser.id);
    if (admin) return done(null, admin);

    return done(new Error("User not found"));
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;
