require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('./models/User');
const requireAuth = require('./middleware/requireAuth');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const SessionModel = require('./models/Session');
const app = express();
const Contact = require('./models/Contact');
const Watchlist = require('./models/Watchlist');
const History = require('./models/History');
const WatchlistRoutes = require('./routes/WatchlistRoutes');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET ||'4985i09uoi09u89kuih82jfd0i9i2',
  resave: false,
  saveUninitialized: false,
  name: 'chillpick.sid', // Custom cookie name
  store: MongoStore.create({
    mongoUrl: uri,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'interval',
    autoRemoveInterval: 60 // Minutes
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  },
}));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));


app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true, // Required for cookies/sessions
  exposedHeaders: ['set-cookie'],
  methods: ['GET', 'POST', 'PUT', 'DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB session setup
const uri = process.env.MONGODB_URI;


// Connect to MongoDB
mongoose.connect(uri)
  .then(() => console.log("Successfully connected to MongoDB!"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Session middleware to set user context
app.use(async (req, res, next) => {
  console.log('Session verification middleware');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  // Skip session checks for static files and API routes
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images') ) {
    return next();
  }

  //For all other routes, verify session
  if (req.session.user) {
    console.log('✅ Valid session found for user:', req.session.user.username);
    res.locals.isLoggedIn = true;
    res.locals.currentUser = req.session.user;
    req.user = req.session.user; // Attach to request
  }else {
  res.locals.isLoggedIn = false;
  res.locals.currentUser = null;
}
  
  // Set locals for template rendering
  const isLoggedIn = user !== null;
  res.locals.currentUser = isLoggedIn ? user : null;
  res.locals.isLoggedIn = isLoggedIn;
  
  // Navigation visibility
  res.locals.showHomeLink = true;
  res.locals.showDashboardLink = isLoggedIn;
  res.locals.showDiscoverLink = isLoggedIn;
  res.locals.showWatchlistLink = isLoggedIn;
  
  next();
});

// Routes
const accountRoutes = require('./routes/account');
const discoverRoutes = require('./routes/discover');

app.use('/account', accountRoutes);
app.use('/api/discover',requireAuth, discoverRoutes);
app.use('/', discoverRoutes);
app.use('/api/watchlist',requireAuth, WatchlistRoutes);

app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard',requireAuth, (req, res) => res.render('dashboard'));
app.get('/discover', requireAuth, (req, res) => {
  // Debug logging
  console.log('Discover route - session:', req.session);
  
  // Ensure user is in session
  if (!req.session.user) {
    console.log('No user in session - redirecting to login');
    return res.redirect(`/account/login?redirect=${encodeURIComponent('/discover')}`);
  }

  // Render the discover page
  res.render('discover', {
    isLoggedIn: true,
    currentUser: req.session.user
  });
});
app.get('/watchlist',requireAuth, (req, res) => res.render('watchlist/watchlist'));
app.get('/history',requireAuth, (req, res) => res.render('watchlist/history'));

// Authentication routes - FIXED to prevent redirect loops
app.get('/login', (req, res) => {
  // If user is already logged in, redirect to dashboard
  if (req.session?.user) {
    return res.redirect('/dashboard');
  }
  // Redirect to the proper login route
  res.redirect('/account/login');
});

app.get('/register', (req, res) => {
  // If user is already logged in, redirect to dashboard
  if (req.session?.user) {
    return res.redirect('/dashboard');
  }
  // Redirect to the proper register route
  res.redirect('/account/register');
});

//app.get('/login', (req, res) => res.send('✅ Login route is working.'));
//app.get('/register', (req, res) => res.render('account/register'));
//app.get('/forgotPassword', (req, res) => res.render('account/forgotPassword'));

app.get('/profile', (req, res) => {
  if (res.locals.currentUser) {
    res.redirect('/account/profile');
  } else {
    res.redirect('/login');
  }
});

// Account routes - Main login/register pages
app.get('/account/login', (req, res) => {
  // Prevent redirect loop - if user is already logged in
  if (req.session?.user) {
    const redirectUrl = req.query.redirect && req.query.redirect !== '/account/login' ? req.query.redirect : '/dashboard';
    return res.redirect(redirectUrl);
  }
  
  res.render('account/login', { 
    error: null,
    redirect: req.query.redirect || '/dashboard'
  });
});

app.get('/account/register', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard');
  }
  res.render('account/register', { error: null });
});

app.get('/account/forgotPassword', (req, res) => {
  res.render('account/forgotPassword');
});
//app.get('/account/login', (req, res) => res.render('account/login'));
//app.get('/account/register', (req, res) => res.render('account/register'));
//app.get('/account/forgotPassword', (req, res) => res.render('account/forgotPassword'));

// Login form handler - FIXED with proper session management
app.post('/account/login', async (req, res) => {
  const { email, password, username, redirect } = req.body;
  
  try {
    let user = null;
    
    // Test user fallback for development
    const isTestUser = (email === 'test@example.com' && password === '123456') || 
                      (email === 'test@gmail.com' && password === 'password') || 
                      (username === 'testuser' && password === 'password');
    
    if (isTestUser) {
      user = {
        id: 'test-user-id',
        username: username || 'TestUser',
        email: email || 'test@example.com',
        profilePic: '/images/profile_pic.png'
      };
    } else {
      // Check database for real users
      const dbUser = await User.findOne({ 
        $or: [
          { email: email },
          { username: username }
        ]
      });
      
      if (dbUser && await bcrypt.compare(password, dbUser.password)) {
        user = {
          id: dbUser._id.toString(),
          username: dbUser.username,
          email: dbUser.email,
          profilePic: dbUser.profilePic || '/images/profile_pic.png'
        };
      }
    }
    
    if (!user) {
      return res.render('account/login', { 
        error: 'Invalid username/email or password',
        redirect: redirect || '/dashboard'
      });
    }
    // Regenerate session to prevent fixation
    req.session.regenerate(async (err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('account/login', {
          error: 'Login failed. Please try again.',
          redirect: redirect || '/dashboard'
        });
      }
    // Save user to session
    req.session.user = user;
    
    // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.render('account/login', {
            error: 'Login failed. Please try again.',
            redirect: redirect || '/dashboard'
          });
        }
    
    // Handle redirect URL safely
        let redirectUrl = '/dashboard';
        if (redirect && 
            !redirect.includes('/account/login') && 
            !redirect.includes('/login')) {
          redirectUrl = redirect;
        }

        console.log('✅ Login successful. Redirecting to:', redirectUrl);
        return res.redirect(redirectUrl);
      });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('account/login', { 
      error: 'Login failed. Please try again.',
      redirect: redirect || '/dashboard'
    });
  }
});

app.get('/account/profile', (req, res) => {
  res.render('account/profile');
});

app.get('/aboutus', (req, res) => res.render('utility/AboutUs'));
app.get('/contactus', (req, res) => res.render('utility/ContactUs', {
  success: req.query.success,
  error: req.query.error
}));
app.get('/faq', (req, res) => res.render('utility/FAQ'));
app.get('/privacypolicy', (req, res) => res.render('utility/PrivacyPolicy'));

app.post('/contactus', async (req, res) => {
  console.log('POST /contactus received with body:', req.body);
  
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      console.log('Validation failed - missing fields');
      return res.redirect('/contactus?error=missing_fields');
    }

    const newContact = new Contact({ 
      name: name.trim(),
      email: email.trim(),
      message: message.trim()
    });
    
    await newContact.save();
    console.log('Contact saved successfully:', newContact);
    
    res.redirect('/contactus?success=true');
  } catch (error) {
    console.error('Error saving contact:', error);
    res.redirect('/contactus?error=server_error');
  }
});
app.get('/account/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));