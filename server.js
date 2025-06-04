require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');

const app = express();
const UserInteraction = require('./models/savedsearch');

// Models and services
const SessionModel = require('./models/Session');
const Contact = require('./models/Contact');
const User = require('./models/User');
const recommendationService = require('./services/recommendationService');
const watchlistRoutes = require('./routes/watchlist');
const Watchlist=require('./models/Watchlist')
const History=require('./models/History')

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cors({
  origin: 'http://your-frontend.com',
  credentials: true
}));
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
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  },
}));

// MongoDB connection
mongoose.connect(uri)
  .then(() => console.log("✅ Successfully connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Session-based navbar visibility
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

// ✅ Movie detail routes must come AFTER session middleware
const movieDetailRoutes = require('./routes/movie_detail');
app.use('/movie_detail', movieDetailRoutes);

// Other routes
const accountRoutes = require('./routes/account');
const discoverRoutes = require('./routes/discover');
const saveSearchRoutes = require('./routes/save-search');
const recommendationRoutes = require('./routes/recommendations');

app.use('/account', accountRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/interactions', saveSearchRoutes);
app.use('/', discoverRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Views
app.get('/', (req, res) => res.render('landing'));
app.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.redirect('/account/login');
    const recommendations = await recommendationService.getRecommendations(userId);
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

app.get('/discover', (req, res) => res.render('discover'));
app.get('/watchlist', async (req, res) => {
  if (!req.session?.user?.id) {
    return res.redirect('/account/login');
  }

  try {
    const watchlist = await Watchlist.findOne({ userId: req.session.user.id });
    const items = watchlist?.items || [];

    res.render('watchlist/watchlist', {
      items,
      currentUser: req.session.user
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).send('Error loading watchlist');
  }
});
app.get('/history', async (req, res) => {
  if (!req.session?.user?.id) {
    return res.redirect('/account/login');
  }

  try {
    const History = require('./models/History');
    const history = await History.findOne({ userId: req.session.user.id });
    const items = history?.items || [];

    res.render('watchlist/history', {
      items,
      currentUser: req.session.user
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).send('Error loading history');
  }
});

app.get('/login', (req, res) => res.send('✅ Login route is working.'));
app.get('/register', (req, res) => res.render('account/register'));
app.get('/forgotPassword', (req, res) => res.render('account/forgotPassword'));

app.get('/test/db', async (req, res) => {
  const results = await UserInteraction.find().sort({ timestamp: -1 }).limit(5);
  res.json(results);
});

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

app.post('/account/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === 'test@example.com' && password === '123456') {
    req.session.user = {
      id: 'fake-user-id-123',
      username: 'TestUser',
      email
    };
    return req.session.save(() => {
      res.redirect('/account/profile');
    });
  } else {
    return res.send('❌ Invalid email or password');
  }
});
app.get('/account/profile', (req, res) => res.render('account/profile'));

// Utility pages
app.get('/aboutus', (req, res) => res.render('utility/AboutUs'));
app.get('/contactus', (req, res) => res.render('utility/ContactUs', {
  success: req.query.success,
  error: req.query.error
}));
app.get('/faq', (req, res) => res.render('utility/FAQ'));
app.get('/privacypolicy', (req, res) => res.render('utility/PrivacyPolicy'));

app.post('/contactus', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.redirect('/contactus?error=missing_fields');
    }
    const newContact = new Contact({ name, email, message });
    await newContact.save();
    res.redirect('/contactus?success=true');
  } catch (error) {
    console.error('Error saving contact:', error);
    res.redirect('/contactus?error=server_error');
  }
});

// Debug endpoints
app.post('/api/recommendations/refresh', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const result = await recommendationService.refreshRecommendations();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/debug/googlebooks', async (req, res) => {
  try {
    const googleBooksService = require('./services/googleBooksService');
    const books = await googleBooksService.getPopularBooks(3);
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/all', async (req, res) => {
  try {
    const tmdbService = require('./services/tmdbService');
    const googleBooksService = require('./services/googleBooksService');
    const [movies, books] = await Promise.all([
      tmdbService.getTrendingMovies(3),
      googleBooksService.getPopularBooks(3),
    ]);
    res.json({ movies, books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/recommendations/clear', async (req, res) => {
  try {
    const Recommendation = require('./models/Recommendation');
    await Recommendation.deleteMany({});
    res.json({ success: true, message: 'All recommendations cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/tmdb', async (req, res) => {
  try {
    const tmdbService = require('./services/tmdbService');
    const movies = await tmdbService.getTrendingMovies(3);
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const History = require('./models/History');
    const history = await History.findOne({ userId: req.session.user.id });
    res.json(history?.items || []);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));