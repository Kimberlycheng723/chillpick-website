const express = require("express");
const axios = require("axios");

const router = express.Router();
require("dotenv").config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Genre ID-to-name mapping from TMDB
const genreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};
router.get("/movies", async (req, res) => {
  const { page = 1, genre, rating } = req.query;

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );

    let movies = response.data.results.map((m) => ({
      id: m.id,
      title: m.title,
      type: "movie",
      rating: m.vote_average.toFixed(1),
      image: m.poster_path
        ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
        : "/images/default-movie.jpg",
      genres: m.genre_ids.map((id) => genreMap[id] || "Unknown"),
    }));

    if (genre) {
      movies = movies.filter((m) => m.genres.includes(genre));
    }
    if (rating) {
      movies = movies.filter((m) => parseFloat(m.rating) >= parseFloat(rating));
    }

    res.json(movies);
  } catch (error) {
    console.error("❌ Error fetching movies:", error.message);
    res.status(500).send("Movie list error");
  }
});
router.get("/movie_detail/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const movie = response.data;
    res.render("detail_page/movie_detail", { movie });
  } catch (error) {
    console.error("❌ Error fetching movie detail:", error.message);
    res.status(500).send("Failed to fetch movie detail");
  }
});

// Route for book list (used in Discover page)
router.get("/books", async (req, res) => {
  const { genre, rating } = req.query;
  const startIndex = Number.isInteger(parseInt(req.query.startIndex))
    ? parseInt(req.query.startIndex)
    : 0;
  try {
    const response = await axios.get(
      `${process.env.GOOGLE_BOOKS_API}&startIndex=${startIndex}`
    );
    let books = (response.data.items || []).map((item) => ({
      id: item.id,
      title: item.volumeInfo.title,
      type: "book",
      rating: item.volumeInfo.averageRating || "N/A",
      image:
        item.volumeInfo.imageLinks?.thumbnail || "/images/default-book.jpg",
      genres: item.volumeInfo.categories || ["General"],
    }));

    if (genre) {
      books = books.filter((b) => b.genres.includes(genre));
    }
    if (rating) {
      books = books.filter((b) => parseFloat(b.rating) >= parseFloat(rating));
    }

    res.json(books);
  } catch (err) {
    console.error("❌ Failed to fetch book list:", err.message);
    res.status(500).send("Book list error");
  }
});

// Route for book detail (with ID)
router.get("/book_detail/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`
    );
    const book = response.data;
    res.render("detail_page/book_detail", { book });
  } catch (error) {
    console.error(
      "❌ Error fetching book detail:",
      error.response?.data || error.message
    );
    res.status(500).send("Failed to fetch book detail");
  }
});
module.exports = router;
