// middleware to inject environment variables into locals
const injectEnvVariables = (req, res, next) => {
  res.locals.APP_KEY = process.env.APP_KEY;
  res.locals.CLUSTER = process.env.CLUSTER;
  // Add more environment variables as needed
  next();
};

module.exports = injectEnvVariables;
