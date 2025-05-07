const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=subject:fiction&maxResults=10';

// --- Movies from TMDB ---
router.get('/movies', async (req, res) => {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`);
    const movies = response.data.results.slice(0, 10).map(m => ({
      id: m.id,
      title: m.title,
      type: 'movie',
      rating: m.vote_average.toFixed(1),
      image: m.poster_path
        ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
        : '/images/default-movie.jpg'
    }));
    res.json(movies);
  } catch (err) {
    console.error('TMDB Error:', err.message);
    res.status(500).json([]);
  }
});

// --- Books from Google Books ---
router.get('/books', async (req, res) => {
  try {
    const response = await axios.get(GOOGLE_BOOKS_API);
   X
    res.json(books);
  } catch (err) {
    console.error('Google Books Error:', err.message);
    res.status(500).json([]);
  }
});

module.exports = router;