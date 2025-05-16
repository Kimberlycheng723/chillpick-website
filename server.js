require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session'); // ✅ Only declare once
const cors = require('cors');
const MongoStore = require('connect-mongo');
const SessionModel = require('./models/Session');  // Import the Session model
const router = express.Router();


const app = express();
app.use(cors());
// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uri = process.env.MONGODB_URI;

app.use(session({
  secret: '4985i09uoi09u89kuih82jfd0i9i2', // Replace with a secure secret key
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 15 * 60, // Time-to-live in seconds (15 minutes)
    autoRemove: 'native', // Automatically remove expired sessions
  }),
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // 15minutes
  },
}));

// Use the account routes
const accountRoutes = require('./routes/account'); // Import the account routes
app.use('/account', accountRoutes); // Mount the account routes at the '/account' path

// ✅ Connect to MongoDB
mongoose
  .connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB!");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });


// ✅ Session-based middleware for nav visibility
app.use((req, res, next) => {
  const isLoggedIn = req.session?.user; // Now checking for 'user' object in session

  res.locals.currentUser = isLoggedIn ? req.session.user : null;
  res.locals.showHomeLink = isLoggedIn;
  res.locals.showDashboardLink = isLoggedIn;
  res.locals.showDiscoverLink = isLoggedIn;
  res.locals.showWatchlistLink = isLoggedIn;
  res.locals.isLoggedIn = isLoggedIn;

  next();
});

// ✅ Routes
app.get('/', (req, res) => res.render('landing')); // ✅
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', (req, res) => res.render('watchlist/watchlist'));
app.get('/history', (req, res) => res.render('watchlist/history'));

app.get('/login', (req, res) => res.send('✅ Login route is working.'));
app.get('/register', (req, res) => res.render('account/register'));
app.get('/forgotPassword', (req, res) => res.render('account/forgotPassword'));
app.get('/movie_detail', (req, res) => {
  res.render('detail_page/movie_detail');
});
app.get('/book_detail', (req, res) => {
  res.render('detail_page/book_detail');
});

app.get('/profile', (req, res) => {
  if (res.locals.currentUser) {
    console.log('✅ User logged in, redirecting to profile');
    res.redirect('/account/profile');
  } else {
    res.redirect('/login');
  }
});

app.get('/account/login', (req, res) => res.render('account/login'));
app.get('/account/register', (req, res) => res.render('account/register'));
app.get('/account/forgotPassword', (req, res) => res.render('account/forgotPassword'));

// Fake login processing (replace with real DB validation later)
app.post('/account/login', (req, res) => {
  const { email, password } = req.body;

  // Simulated login logic
  if (email === 'test@example.com' && password === '123456') {
    res.cookie('isLoggedIn', 'true');
    return res.redirect('/account/profile');
  } else {
    return res.send('❌ Invalid email or password');
  }
});

app.get('/account/profile', (req, res) => {
  console.log('✅ User logged in, rendering profile');
  res.render('account/profile');
});

app.get('/aboutus', (req, res) => res.render('utility/AboutUs'));
app.get('/contactus', (req, res) => res.render('utility/ContactUs'));
app.get('/faq', (req, res) => res.render('utility/FAQ'));
app.get('/privacypolicy', (req, res) => res.render('utility/PrivacyPolicy'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));