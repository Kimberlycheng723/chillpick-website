const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const router = express.Router();
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cookieParser());

app.use((req, res, next) => {
  // Dev-only: Toggle login state with URL query
  if (req.query.login === 'true') {
    res.cookie('isLoggedIn', 'true');
    return res.redirect(req.path);
  }

  if (req.query.login === 'false') {
    res.clearCookie('isLoggedIn');
    return res.redirect(req.path);
  }

  const isLoggedIn = req.cookies.isLoggedIn === 'true';

  if (isLoggedIn) {
    res.locals.currentUser = {
      username: 'Kimberly',
      profilePicture: '/images/profile_pic.png'
    };
    res.locals.showHomeLink = true;
    res.locals.showDiscoverLink = true;
  } else {
    res.locals.currentUser = null;
    res.locals.showHomeLink = true;
    res.locals.showDiscoverLink = false;
  }

  next();
});

// Routes
app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', (req, res) => res.render('watchlist/watchlist'));
app.get('/history', (req, res) => res.render('watchlist/history'));

app.get('/profile', (req, res) => {
    if (res.locals.currentUser) {
      console.log('✅ User logged in, redirecting to profile');
      res.redirect('/account/profile');
    } else {
      console.log('🚫 Not logged in, redirecting to login');
      res.redirect('/login');
    }
  });

// ✅ Add this:
app.get('/account/profile', (req, res) => res.render('account/profile'));

app.get('/login', (req, res) => res.send('✅ Login route is working.'));
app.get('/register', (req, res) => res.render('account/register'));
app.get('/forgotPassword', (req, res) => res.render('account/forgotPassword'));
app.get('/movie_detail', (req, res) => {
    res.render('detail_page/movie_detail'); // make sure this file exists
  });
  app.get('/book_detail', (req, res) => {
    res.render('detail_page/book_detail');
  });

app.get('/aboutus', (req, res) => res.render('utility/AboutUs'));
app.get('/contactus', (req, res) => res.render('utility/ContactUs'));
app.get('/faq', (req, res) => res.render('utility/FAQ'));
app.get('/privacypolicy', (req, res) => res.render('utility/PrivacyPolicy'));
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));