const { client } = require("./reddis");

async function trackLoginAttempts(req, res, next) {
  const email = req.body.email;
  const key = `login_attempts:${email}`;
  let userAttempts = await new Promise((resolve, reject) => {
    client.get(key, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });

  if (userAttempts) {
    userAttempts = JSON.parse(userAttempts);
  } else {
    userAttempts = { attempts: 0, lockUntil: null };
  }

  req.userAttempts = userAttempts;
  next();
}

module.exports = { trackLoginAttempts };
