require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const SessionModel = require('./models/Session');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB session setup
const uri = process.env.MONGODB_URI;
app.use(session({
  secret: '4985i09uoi09u89kuih82jfd0i9i2',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: uri,
    ttl: 15 * 60,
    autoRemove: 'native',
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
  },
}));

// Connect to MongoDB
mongoose.connect(uri)
  .then(() => console.log("Successfully connected to MongoDB!"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Session-based middleware for navbar visibility
app.use((req, res, next) => {
  const isLoggedIn = req.session?.user;
  res.locals.currentUser = isLoggedIn ? req.session.user : null;
  res.locals.showHomeLink = isLoggedIn;
  res.locals.showDashboardLink = isLoggedIn;
  res.locals.showDiscoverLink = isLoggedIn;
  res.locals.showWatchlistLink = isLoggedIn;
  res.locals.isLoggedIn = isLoggedIn;
  next();
});

// Routes
const accountRoutes = require('./routes/account');
const discoverRoutes = require('./routes/discover');

app.use('/account', accountRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/', discoverRoutes);

app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', (req, res) => res.render('watchlist/watchlist'));
app.get('/history', (req, res) => res.render('watchlist/history'));

app.get('/login', (req, res) => res.send('✅ Login route is working.'));
app.get('/register', (req, res) => res.render('account/register'));
app.get('/forgotPassword', (req, res) => res.render('account/forgotPassword'));

app.get('/profile', (req, res) => {
  if (res.locals.currentUser) {
    res.redirect('/account/profile');
  } else {
    res.redirect('/login');
  }
});

app.get('/account/login', (req, res) => res.render('account/login'));
app.get('/account/register', (req, res) => res.render('account/register'));
app.get('/account/forgotPassword', (req, res) => res.render('account/forgotPassword'));

app.post('/account/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'test@example.com' && password === '123456') {
    res.cookie('isLoggedIn', 'true');
    return res.redirect('/account/profile');
  } else {
    return res.send('❌ Invalid email or password');
  }
});

app.get('/account/profile', (req, res) => {
  res.render('account/profile');
});

app.get('/aboutus', (req, res) => res.render('utility/AboutUs'));
app.get('/contactus', (req, res) => res.render('utility/ContactUs'));
app.get('/faq', (req, res) => res.render('utility/FAQ'));
app.get('/privacypolicy', (req, res) => res.render('utility/PrivacyPolicy'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));