const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware to simulate logged-in user
app.use((req, res, next) => {
  res.locals.currentUser = {
    username: 'Kimberly',
    profilePicture: '/images/profile_pic.png'  // Make sure this image exists
  };
  next();
});

// Routes
app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', (req, res) => res.render('watchlist/watchlist'));
app.get('/history', (req, res) => res.render('watchlist/history'));
app.get('/profile', (req, res) => res.render('profile/profile'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));