/**
 * Watchlist Routes
 * - POST /api/watchlist        → Add item
 * - DELETE /api/watchlist/:id → Remove item
 * - GET /api/watchlist        → Get all user items
 */

const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const requireAuth = require('../middleware/requireAuth');


// Get user's watchlist
router.get('/', async (req, res) => {
  try {
    const watchlist = await Watchlist.findOne({ userId: req.user.id });
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to watchlist
router.post('/add', async (req, res) => {
  try {
    const { mediaId, mediaType, title, poster } = req.body;
    
    const watchlist = await Watchlist.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { items: { mediaId, mediaType, title, poster } } },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove from watchlist
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { type } = req.query;
    const userId = req.session.user._id;
    
    const result = await Watchlist.findOneAndDelete({ userId, itemId, type });
    if (!result) {
      return res.status(404).json({ message: 'Item not found in watchlist' });
    }
    res.status(200).json({ message: 'Removed from watchlist' });
  } catch (err) {
    console.error('Error removing from watchlist:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// In WatchlistRoutes.js
router.get('/test', (req, res) => {
  res.send('Watchlist routes are working!');
});

module.exports = router;