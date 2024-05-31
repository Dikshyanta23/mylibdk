function checkIsLogged(req, res, next) {
  if (req.user && req.user.dataValues.isLogged) {
    return res.render("alreadyOpen"); // Assuming you have an 'error' EJS template
  }
  next();
}
module.exports = checkIsLogged;
