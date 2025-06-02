// middleware/requireAuth.js
module.exports = (req, res, next) => {
  console.log('Auth Middleware - Path:', req.path);
  console.log('Session ID:', req.sessionID);
  console.log('Session User:', req.session.user);
  
  // Skip auth for login/register routes
  if (req.path === '/account/login' || req.path === '/account/register') {
    return next();
  }

  if (!req.session?.user) {
    console.log('Unauthorized access to:', req.path);
    
    // API routes
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ 
        success: false,
        message: 'Please login to access this resource',
        path: req.path
      });
    }
    
    // Web routes
    return res.redirect(`/account/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  // Attach user to request for easy access
  req.user = req.session.user;
  next();
};