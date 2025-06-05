const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/MovieReview');
const User = require('../models/User');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'your_api_key_here';

const genreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session?.user?.id) {
    req.user = req.session.user;
    return next();
  }
  res.status(401).json({ success: false, message: 'Not logged in' });
};

// Movie detail route
router.get('/:id', async (req, res) => {
  try {
    const movieId = req.params.id;

    if (!req.session.user) {
      return res.redirect('/account/login');
    }

    const { data: movie } = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`);
    const { data: videos } = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);

    movie.trailerKey = videos.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))?.key || null;
    movie.backdrop_path = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
      : movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/images/default-backdrop.jpg';

    movie.runtimeFormatted = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
    movie.releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
    movie.genres = movie.genres || [];

    const recommendations = await getRecommendationsByMovieGenres(movie);

    res.render('detail_page/movie_detail', {
      movie,
      recommendations,
      isLoggedIn: !!req.session?.user,
      currentUser: req.session?.user || null
    });
  } catch (error) {
    console.error("❌ Error fetching movie detail:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Submit review route
router.post('/reviews', requireAuth, async (req, res) => {
  const { movieId, rating, comment, spoiler } = req.body;

  if (!movieId || !rating || !comment) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  const review = new Review({
    movieId: movieId.toString().trim(),
    userId: req.session.user.id,
    username: req.session.user.username,
    rating: parseInt(rating),
    comment: comment.trim(),
    spoiler: Boolean(spoiler),
    likedBy: [],
    replies: [],
    likes: 0
  });

  try {
    const saved = await review.save();
    
    const reviewResponse = {
      id: saved._id.toString(),
      movieId: saved.movieId,
      userId: saved.userId,
      username: saved.username,
      rating: saved.rating,
      comment: saved.comment,
      spoiler: saved.spoiler,
      likes: saved.likes || 0,
      likedBy: [],  // Always empty since we're ignoring this
      replies: saved.replies || [],
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt
    };
    
    res.json({ success: true, review: reviewResponse });
  } catch (err) {
    console.error('❌ Error saving review:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get reviews route
router.get('/reviews/:movieId', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 2;
  const skip = (page - 1) * limit;
  const movieId = req.params.movieId;

  try {
    const reviews = await Review.find({ movieId: movieId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ movieId: movieId });

    const clientReviews = reviews.map(review => ({
      id: review._id.toString(),
      movieId: review.movieId,
      userId: review.userId,
      username: review.username,
      rating: review.rating,
      comment: review.comment,
      spoiler: review.spoiler,
      likes: review.likes || 0,
      likedBy: [],  // Always empty since we're ignoring this
      replies: review.replies || [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }));

    res.json({
      success: true,
      reviews: clientReviews,
      page,
      hasMore: page * limit < total,
      total
    });

  } catch (err) {
    console.error('❌ Error fetching reviews:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reviews',
      error: err.message 
    });
  }
});

// FIXED: Like Route - Now properly handles like/unlike with session tracking
router.post('/reviews/:id/like', requireAuth, async (req, res) => {
  const { id: reviewId } = req.params;
  const userId = req.session.user.id;

  try {
    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid review ID format' 
      });
    }

    const existingReview = await Review.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Initialize session likes tracking if not exists
    if (!req.session.likedReviews) {
      req.session.likedReviews = [];
    }

    const hasLiked = req.session.likedReviews.includes(reviewId);
    let updatedReview;
    let newLikedStatus;

    if (hasLiked) {
      // User wants to unlike - decrease count and remove from session
      updatedReview = await Review.findByIdAndUpdate(
        reviewId,
        { 
          $inc: { likes: -1 }
        },
        { new: true }
      );
      
      // Remove from session tracking
      req.session.likedReviews = req.session.likedReviews.filter(id => id !== reviewId);
      newLikedStatus = false;
      
      // Ensure likes doesn't go below 0
      if (updatedReview.likes < 0) {
        updatedReview = await Review.findByIdAndUpdate(
          reviewId,
          { likes: 0 },
          { new: true }
        );
      }
      
    } else {
      // User wants to like - increase count and add to session
      updatedReview = await Review.findByIdAndUpdate(
        reviewId,
        { 
          $inc: { likes: 1 }
        },
        { new: true }
      );
      
      // Add to session tracking
      req.session.likedReviews.push(reviewId);
      newLikedStatus = true;
    }

    res.json({
      success: true,
      liked: newLikedStatus,
      likes: updatedReview.likes || 0,
      message: newLikedStatus ? 'Like added successfully' : 'Like removed successfully'
    });

  } catch (err) {
    console.error('❌ Error in like route:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while processing like',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  }
});

// Add this new route to check session status
router.get('/check-session', async (req, res) => {
  try {
    if (req.session?.user?.id) {
      res.json({
        success: true,
        isLoggedIn: true,
        user: req.session.user,
        likedReviews: req.session.likedReviews || []
      });
    } else {
      res.json({
        success: false,
        isLoggedIn: false,
        user: null,
        likedReviews: []
      });
    }
  } catch (error) {
    console.error('❌ Error checking session:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking session',
      error: error.message
    });
  }
});

// Reply to review functionality
router.post('/reviews/reply', requireAuth, async (req, res) => {
  const { reviewId, text } = req.body;

  if (!reviewId) {
    return res.status(400).json({ success: false, message: 'Review ID is required' });
  }

  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: 'Reply content is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({ success: false, message: 'Invalid review ID format' });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const newReply = {
      userId: req.session.user.id,
      username: req.session.user.username,
      text: text.trim(),
      createdAt: new Date()
    };

    review.replies.push(newReply);
    await review.save();

    // Format the reply for the client
    const formattedReply = {
      _id: newReply._id || Date.now().toString(),
      userId: newReply.userId,
      username: newReply.username,
      text: newReply.text,
      date: newReply.createdAt
    };

    res.json({
      success: true,
      reply: formattedReply
    });

  } catch (err) {
    console.error('❌ Error adding reply:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add reply',
      error: err.message
    });
  }
});

// Helper to get recommendations
async function getRecommendationsByMovieGenres(movie) {
  const genreIds = (movie.genres || [])
    .map(g => Object.keys(genreMap).find(k => genreMap[k] === g.name))
    .filter(Boolean);

  if (genreIds.length === 0) return [];

  try {
    const { data } = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: genreIds[0],
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: 1
      }
    });

    return (data.results || [])
      .filter(m => m.id !== movie.id)
      .slice(0, 4)
      .map(m => ({
        id: m.id,
        title: m.title,
        year: m.release_date?.split('-')[0] || 'N/A',
        genres: m.genre_ids.map(id => genreMap[id] || 'Unknown').join(' • '),
        image: m.poster_path
          ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : '/images/default-movie.jpg'
      }));
  } catch (err) {
    console.error('Failed to get recommendations:', err.message);
    return [];
  }
}

module.exports = router;