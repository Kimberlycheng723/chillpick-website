const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: String, required: true },
  type: { type: String, enum: ['movie', 'book'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

// Create compound index to prevent duplicate entries
watchlistSchema.index({ userId: 1, itemId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);