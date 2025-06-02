require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');
const SessionModel = require('./models/Session');
const User = require('./models/User');
const app = express();
const recommendationService = require('./services/recommendationService');

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
const saveSearchRoutes = require('./routes/save-search');
const recommendationRoutes = require('./routes/recommendations');

app.use('/api/recommendations', recommendationRoutes);
app.use('/account', accountRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/interactions', saveSearchRoutes);
app.use('/', discoverRoutes);

app.get('/', (req, res) => res.render('landing'));
// app.get('/dashboard', (req, res) => res.render('dashboard'));

// app.get('/dashboard', async (req, res) => {
//   try {
//     const recommendations = await recommendationService.getRecommendations(8);
//     // Always get exactly 8 recommendations
//     //const recommendations = await getRecommendations(8);

//     //check whether API is returning a result or not
//     console.log('Recommendations:', recommendations);

//     res.render('dashboard', {
//       recommendations,
//       recentlyAdded: [],
//       recentActivity: []
//     });
//   } catch (error) {
//     console.error('Error loading dashboard:', error);
//     res.status(500).send('Error loading dashboard');
//   }
// });
app.get('/dashboard', async (req, res) => {
  try {
    console.log('Dashboard - Full session:', req.session);
    // console.log('Dashboard - Session userId:', req.session?.userId);
    console.log('Dashboard - Session user:', req.session?.user);
    
    // Get the user ID from the session - use the consistent approach
    const userId = req.session?.userId;
    
    if (!userId) {
      console.log('❌ No userId in session, redirecting to login');
      return res.redirect('/account/login');
    }
    
    // Get recommendations for the user
    const recommendations = await recommendationService.getRecommendations(userId);
    
    console.log('Dashboard user ID:', userId);
    console.log('Recommendations count:', recommendations.length);
    
    res.render('dashboard', {
      recommendations,
      recentlyAdded: [],
      recentActivity: [],
      currentUser: req.session.user
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Route to manually refresh recommendations (clear DB and refetch)
app.post('/api/recommendations/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual refresh triggered...');
    const userId = req.session?.userId; // Get userId from session
    const result = await recommendationService.refreshRecommendations();
    res.json(result);
  } catch (error) {
    console.error('Error refreshing recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to check Google Books API directly (for debugging)
app.get('/api/debug/googlebooks', async (req, res) => {
  try {
    const googleBooksService = require('./services/googleBooksService');
    const books = await googleBooksService.getPopularBooks(3);
    res.json({ books, count: books.length });
  } catch (error) {
    console.error('Error testing Google Books:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to test both APIs together
app.get('/api/debug/all', async (req, res) => {
  try {
    const tmdbService = require('./services/tmdbService');
    const googleBooksService = require('./services/googleBooksService');
    
    const [movies, books] = await Promise.all([
      tmdbService.getTrendingMovies(3),
      googleBooksService.getPopularBooks(3)
    ]);
    
    res.json({ 
      movies: { data: movies, count: movies.length },
      books: { data: books, count: books.length },
      total: movies.length + books.length
    });
  } catch (error) {
    console.error('Error testing both APIs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to clear all recommendations (for debugging)
app.delete('/api/recommendations/clear', async (req, res) => {
  try {
    const Recommendation = require('./models/Recommendation');
    await Recommendation.deleteMany({});
    console.log('🗑️ All recommendations cleared from database');
    res.json({ success: true, message: 'All recommendations cleared' });
  } catch (error) {
    console.error('Error clearing recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to check TMDB API directly (for debugging)
app.get('/api/debug/tmdb', async (req, res) => {
  try {
    const tmdbService = require('./services/tmdbService');
    const movies = await tmdbService.getTrendingMovies(3);
    res.json({ movies, count: movies.length });
  } catch (error) {
    console.error('Error testing TMDB:', error);
    res.status(500).json({ error: error.message });
  }
});

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