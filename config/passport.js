const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;
const axios = require("axios");

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
        if (!profile.emails || profile.emails.length === 0) {
          return done(null, false, { message: "No email found" });
        }
        const user = await User.findOne({ where: { facebookId: profile.id } });
        if (user) {
          return done(null, user);
        }
        const userWithSameEmail = await User.findOne({
          where: { email: profile.emails[0].value },
        });
        if (userWithSameEmail) {
          const updatedUser = await userWithSameEmail.update({
            facebookId: profile.id,
          });
          const savedUser = await userWithSameEmail.save();
          return done(null, userWithSameEmail);
        } else {
          const newUser = await User.create({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            facebookId: profile.id,
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
      scope: ["profile", "email"],
    },
    async function (token, tokenSecret, profile, done) {
      console.log("google Profile:", profile);
      try {
        const user = await User.findOne({ where: { googleId: profile.id } });
        if (user) {
          return done(null, user);
        }
        const userWithSameEmail = await User.findOne({
          where: { email: profile.emails[0].value },
        });
        if (userWithSameEmail) {
          userWithSameEmail.googleId = profile.id;
          const updatedUser = await userWithSameEmail.save();
          return done(null, updatedUser);
        } else {
          const newUser = await User.create({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        return done(error, null);
      }
    }
  )
);
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ["user:email"],
    },
    async function (accessToken, refreshToken, profile, done) {
      console.log(profile);

      try {
        if (!profile.emails || profile.emails.length === 0) {
          return done(null, false, { message: "No email found" });
        }
        // Find or create user
        let user = await User.findOne({ where: { githubId: profile.id } });
        if (user) {
          return done(null, user);
        }
        const userWithSameEmail = await User.findOne({
          where: { email: email },
        });
        if (userWithSameEmail) {
          const updatedUser = await userWithSameEmail.update({
            githubId: profile.id,
          });
          const savedUser = await userWithSameEmail.save();
          return done(null, userWithSameEmail);
        } else {
          user = await User.create({
            githubId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
          });
          return done(null, user);
        }
      } catch (error) {
        console.error("Error during GitHub authentication:", error);
        return done(error, null);
      }
    }
  )
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_SECRET_KEY,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      includeEmail: true,
    },
    async function (token, tokenSecret, profile, done) {
      try {
        console.log("Twitter profile:", profile);
        const user = await User.findOne({ where: { twitterId: profile.id } });
        if (user) {
          return done(null, user);
        }
        const userWithSameEmail = await User.findOne({
          where: { email: profile.emails[0].value },
        });
        if (userWithSameEmail) {
          const updatedUser = await userWithSameEmail.update({
            twitterId: profile.id,
          });
          const savedUser = await userWithSameEmail.save();
          return done(null, userWithSameEmail);
        } else {
          const newUser = await User.create({
            twitterId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
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
