const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  itemId: {type: String,required: true},
  title: {type: String,required: true},
  synopsis: {type: String,default: ''},
  type: {type: String,required: true,enum: ['movie', 'book'] },// Restrict to valid types
  image: {type: String,default: ''},
  rating: {type: Number,default: 0},
  genres: [{type: String}],
  addedAt: {type: Date,default: Date.now}
});

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true // Each user has one watchlist
  },
  items: [watchlistItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field whenever the watchlist is modified
watchlistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ 'items.itemId': 1, 'items.type': 1 });
module.exports = mongoose.model('Watchlist', watchlistSchema);