const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    movieId: {
      type: String,
      required: [true, 'Movie ID is required'],
      trim: true,
    },
    userId: {
      // FIXED: Changed to String to match your test user ID
      type: String,
      required: [true, 'User ID is required'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      minlength: [1, 'Comment must be at least 1 character'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    spoiler: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


// Add logging middleware for debugging
reviewSchema.pre('save', function (next) {
  console.log('📝 Saving review:', {
    movieId: this.movieId,
    userId: this.userId,
    username: this.username,
    rating: this.rating,
    commentLength: this.comment.length,
  });
  next();
});

// Method to return client-safe JSON
reviewSchema.methods.toClientJSON = function() {
  return {
    id: this._id,
    movieId: this.movieId,
    username: this.username,
    rating: this.rating,
    comment: this.comment,
    spoiler: this.spoiler,
    createdAt: this.createdAt
  };
};

reviewSchema.post('save', function (doc) {
  console.log('✅ Review saved successfully:', doc._id);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;