const notAuthenticated = (req, res, next) => {
  // Check if user is not authenticated (you can use any method you prefer to check this)
  if (!req.isAuthenticated()) {
    return next(); // User is not authenticated, proceed to the next middleware or route handler
  }
  // User is authenticated, redirect them to a different route (e.g., home page)
  return res.redirect("/dashboard/"); // You can change this to redirect to any other route
};

// Define a custom middleware function to check authentication
const requireAuth = (req, res, next) => {
  // Assuming you have a method to check authentication status
  if (req.isAuthenticated()) {
    // User is authenticated, proceed to the next middleware
    return next();
  } else {
    // User is not authenticated, send a response indicating authentication is required
    return res.redirect("/login"); // Redirect to your login page or send an error response
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.isAdmin) {
    return next();
  }
  res.redirect("/dashboard");
};

module.exports = { notAuthenticated, requireAuth, isAdmin };
