const express = require('express');
const path = require('path');
const router = express.Router();
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware to simulate login state
app.use((req, res, next) => {
  const isLoggedIn = false; // Change to true to simulate logged in

  if (isLoggedIn) {
    res.locals.currentUser = {
      username: 'hELLO',
      profilePicture: '/images/profile_pic.png'
    };
  } else {
    res.locals.currentUser = null;
  }

  next();
});

// Routes
app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', (req, res) => res.render('watchlist/watchlist'));
app.get('/history', (req, res) => res.render('watchlist/history'));


app.get('/account/login', (req, res) => res.render('account/login'));


app.get('/account/register', (req, res) => res.render('account/register'));


app.get('/account/profile', (req, res) => {
  //if (res.locals.currentUser) {
    console.log('✅ User logged in, rendering profile');
    res.render('account/profile');
  // } else {
  //   console.log('🚫 Not logged in, redirecting to login');
  //   res.redirect('/account/login');
  // }
});

app.get('/account/forgotPassword', (req, res) => res.render('account/forgotPassword'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));