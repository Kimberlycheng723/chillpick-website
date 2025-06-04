const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const History = require('../models/History');

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

// Mark item as completed (move to history)
router.post('/complete', async (req, res) => {
  try {
    console.log('✅ POST /complete route hit');
    const { itemId, type } = req.body;
    const userId = req.session.user.id;
    
    if (!itemId || !type) {
      return res.status(400).json({ error: 'Missing itemId or type' });
    }

    // Find user's watchlist
    const watchlist = await Watchlist.findOne({ userId });
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Find the item in watchlist
    const itemIndex = watchlist.items.findIndex(item => 
      item.itemId === itemId && item.type === type
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in watchlist' });
    }

    // Get the item data
    const completedItem = watchlist.items[itemIndex];
    
    // Remove from watchlist
    watchlist.items.splice(itemIndex, 1);
    await watchlist.save();

    // Add to history
    let history = await History.findOne({ userId });
    if (!history) {
      history = new History({ userId, items: [] });
    }

    // Add completion date and mark as completed
    const historyItem = {
      ...completedItem.toObject(),
      completedAt: new Date(),
      status: 'completed'
    };

    history.items.unshift(historyItem); // Add to beginning of array
    await history.save();

    res.json({ 
      success: true, 
      message: 'Item marked as completed and moved to history'
    });
  } catch (error) {
    console.error('Error completing item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from watchlist permanently
router.delete('/remove', async (req, res) => {
  try {
    console.log('🗑️ DELETE /remove route hit');
    const { itemId, type } = req.body;
    const userId = req.session.user.id;
    
    if (!itemId || !type) {
      return res.status(400).json({ error: 'Missing itemId or type' });
    }

    // Find user's watchlist
    const watchlist = await Watchlist.findOne({ userId });
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Find and remove the item
    const itemIndex = watchlist.items.findIndex(item => 
      item.itemId === itemId && item.type === type
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in watchlist' });
    }

    // Remove the item
    watchlist.items.splice(itemIndex, 1);
    await watchlist.save();

    res.json({ 
      success: true, 
      message: 'Item removed from watchlist'
    });
  } catch (error) {
    console.error('Error removing item:', error);
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