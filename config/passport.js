const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(password, salt);
  return hashedPass;
}

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      profileFields: ["id", "displayName", "picture.type(large)", "email"],
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const user = await User.findOne({ where: { id: profile.id } });
        if (user) {
          return done(null, user);
        } else {
          const newUser = await User.create({
            id: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            password: await hashPassword(generateRandomString(8)),
          });
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.use(
  "user-login",
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User.findOne({ where: { email: email } })
      .then((user) => {
        if (!user) {
          var err = "no user";
          return done(err);
        }
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

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async function (token, tokenSecret, profile, done) {
      try {
        const user = await User.findOne({ where: { id: profile.id } });
        if (user) {
          return done(null, user);
        } else {
          const newUser = await User.create({
            id: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            password: await hashPassword(generateRandomString(8)),
          });

          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, { id: user.id });
});

passport.deserializeUser(async function (serializedUser, done) {
  try {
    const userInstance = await User.findByPk(serializedUser.id);
    if (userInstance) {
      return done(null, userInstance);
    } else {
      return done(new Error("User not found"));
    }
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;
