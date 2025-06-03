const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');

console.log('📋 Watchlist router loaded successfully');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    console.log('🔐 Auth check - Session user:', req.session?.user?.id || 'Not logged in');
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  next();
};
// Test route (no auth required for testing)
router.get('/test', (req, res) => {
  console.log('✅ Test route hit');
  res.json({ 
    message: 'Watchlist router is working!', 
    timestamp: new Date().toISOString(),
    sessionExists: !!req.session,
    userExists: !!req.session?.user
  });
});
// Apply auth middleware to all watchlist routes
router.use(requireAuth);

// Add/remove item from watchlist
router.post('/add', async (req, res) => {
  try {
    console.log('📝 POST /add route hit');
    console.log('📝 Request body:', req.body);
    console.log('📝 User ID:', req.session.user.id);
    const { itemId, title, type, image, rating, genres,synopsis } = req.body;
    const userId = req.session.user.id; // Get from session instead of body
    
    if (!itemId || !title || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create watchlist for user
    let watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      watchlist = new Watchlist({ userId, items: [] });
    }

    // Check if item already exists in watchlist
    const existingItemIndex = watchlist.items.findIndex(item => item.itemId === itemId && item.type === type);
    
    if (existingItemIndex >= 0) {
      // Item exists, remove it
      watchlist.items.splice(existingItemIndex, 1);
      await watchlist.save();
      return res.json({ 
        success: true, 
        message: 'Item removed from watchlist',
        action: 'removed'
      });
    } else {
      // Add new item
      watchlist.items.push({
        itemId,
        title,
        type,
        image,
        rating,
        genres,
        synopsis
      });
      await watchlist.save();
      return res.json({ 
        success: true, 
        message: 'Item added to watchlist',
        action: 'added'
      });
    }
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's watchlist
router.get('/', async (req, res) => { // Changed from '/:userId' to '/'
  console.log('📋 GET / route hit');
  console.log('📋 User ID:', req.session.user.id);
    try {
    const watchlist = await Watchlist.findOne({ userId: req.session.user.id });
    res.json(watchlist?.items || []);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;