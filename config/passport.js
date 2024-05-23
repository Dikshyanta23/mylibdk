const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcryptjs");
const { User, Admin } = require("../models");

const FACEBOOK_APP_ID = '776536324264708';
const FACEBOOK_APP_SECRET = 'a21340a8d9ae34765972f1ee0839e6cd';
const CALLBACK_URL = 'http://localhost:5000/auth/facebook/callback';

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: CALLBACK_URL,
  profileFields: ['id', 'displayName', 'picture.type(large)', 'email']
}, function (accessToken, refreshToken, profile, done) {
  // Here, you can handle the user profile data and create/update the user in your database
  // For example:
  console.log("came here");
  console.log(profile);

  return done(null, profile)

}
))


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
