const tmdbService = require("./tmdbService");
const googleBooksService = require("./googleBooksService");
const Interaction = require("../models/SavedSearch");
const mongoose = require("mongoose");
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
const User = require("../models/User");
const getRecommendations = async (userId) => {
  try {
    console.log(
      "Recommendation request for:",
      userId ? `user ${userId}` : "anonymous"
    );

    if (userId) {
      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log("❌ Invalid userId format:", userId);
        return getDefaultRecommendations();
      }
      // Check if user exists
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log("❌ User ID not found in DB:", userId);
        return getDefaultRecommendations();
      }
      console.log("✅ Valid user found, getting personalized recommendations");
      const personalized = await getPersonalizedRecommendations(userId);
      return personalized;
    }

    // No userId provided, return default recommendations
    console.log("ℹ️ No userId provided, returning default recommendations");
    return getDefaultRecommendations();
  } catch (error) {
    console.error("Recommendation error:", error);
    return getDefaultRecommendations();
  }
};
const getDefaultRecommendations = async () => {
  try {
    console.log(`🔄 Getting default recommendations: 4 movies and 4 books`);
    const movieCount = 4;
    const bookCount = 4;
    const fetchLimit = 20; // fetch extra to ensure enough valid items
    const [movies, books] = await Promise.all([
      tmdbService.getTrendingMovies(fetchLimit),
      googleBooksService.getPopularBooks(fetchLimit),
    ]);
    console.log(`🎬 Movies fetched: ${movies.length}`);
    console.log(`📚 Books fetched: ${books.length}`);
    if (movies.length < movieCount || books.length < bookCount) {
      console.warn(
        "⚠️ Not enough movies or books fetched to meet the requirement."
      );
      return [];
    }
    const normalize = (rec, type) => ({
      ...rec,
      type,
      genre:
        Array.isArray(rec.genre) && rec.genre.length > 0
          ? rec.genre
          : ["Unknown"],
      year: rec.year || new Date().getFullYear(),
      description: rec.description || "No description available.",
    });
    const shuffledMovies = shuffleArray(movies)
      .slice(0, movieCount)
      .map((rec) => normalize(rec, "Movie"));
    const shuffledBooks = shuffleArray(books)
      .slice(0, bookCount)
      .map((rec) => normalize(rec, "Book"));
    const combined = shuffleArray([...shuffledMovies, ...shuffledBooks]);
    console.log(
      `✅ Final list: ${combined.length} items (Movies: ${shuffledMovies.length}, Books: ${shuffledBooks.length})`
    );
    return combined;
  } catch (error) {
    console.error("🔥 Error:", error.message);
    return [];
  }
};
const getPersonalizedRecommendations = async (userId) => {
  try {
    console.log(`🎯 Getting personalized recommendations for user ${userId}`);

    // Get user's interaction history and fetches up to 100 of the most recent activities
    const interactions = await Interaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100);
    console.log(
      `📊 Found ${interactions.length} interactions for user ${userId}`
    );

    if (interactions.length === 0) {
      console.log("ℹ️ No interactions found, falling back to default");
      return await getDefaultRecommendations();
    }
    // Analyze interactions to get genre occurrences
    const genreOccurrences = analyzeUserPreferences(interactions);
    console.log("📊 Genre occurrences:", genreOccurrences);

    // Get top 5 genres by occurrence count
    const topGenres = Object.entries(genreOccurrences.genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Fetch content based on top genres
    const fetchLimit = 30;
    const [moviesRaw, booksRaw] = await Promise.all([
      tmdbService.getMoviesByPreferences
        ? tmdbService.getMoviesByPreferences({ topGenres }, fetchLimit)
        : tmdbService.getTrendingMovies(fetchLimit),
      googleBooksService.getBooksByPreferences
        ? googleBooksService.getBooksByPreferences({ topGenres }, fetchLimit)
        : googleBooksService.getPopularBooks(fetchLimit),
    ]);

    console.log(`🎬 Personalized movies fetched: ${moviesRaw.length}`);
    console.log(`📚 Personalized books fetched: ${booksRaw.length}`);

    // Add type label if missing (safety)
    const movies = moviesRaw.map((movie) => ({ ...movie, type: "Movie" }));
    const books = booksRaw.map((book) => ({ ...book, type: "Book" }));

    // RANDOMLY SELECT 4 movies and 4 books
    let selectedMovies = [];
    let selectedBooks = [];

    if (movies.length >= 4) {
      // Randomly shuffle and select 4 movies
      selectedMovies = shuffleArray(movies).slice(0, 4);
      console.log(
        `🎲 Randomly selected 4 movies from ${movies.length} available`
      );
    } else {
      // Use all available movies and fill with trending movies if needed
      selectedMovies = movies;
      if (selectedMovies.length < 4) {
        console.log(
          `⚠️ Only ${selectedMovies.length} personalized movies, fetching trending to fill gap`
        );
        const fallbackMovies = await tmdbService.getTrendingMovies(
          4 - selectedMovies.length
        );
        const normalizedFallback = fallbackMovies
          .slice(0, 4 - selectedMovies.length)
          .map((movie) => normalize(movie, "Movie"));
        selectedMovies = [...selectedMovies, ...normalizedFallback];
      }
    }

    if (books.length >= 4) {
      // Randomly shuffle and select 4 books
      selectedBooks = shuffleArray(books).slice(0, 4);
      console.log(
        `🎲 Randomly selected 4 books from ${books.length} available`
      );
    } else {
      // Use all available books and fill with popular books if needed
      selectedBooks = books;
      if (selectedBooks.length < 4) {
        console.log(
          `⚠️ Only ${selectedBooks.length} personalized books, fetching popular to fill gap`
        );
        const fallbackBooks = await googleBooksService.getPopularBooks(
          4 - selectedBooks.length
        );
        const normalizedFallback = fallbackBooks
          .slice(0, 4 - selectedBooks.length)
          .map((book) => normalize(book, "Book"));
        selectedBooks = [...selectedBooks, ...normalizedFallback];
      }
    }

    // Combine and shuffle the final results for even more randomness
    const final = shuffleArray([...selectedMovies, ...selectedBooks]);

    console.log(
      `✅ Personalized recommendations: ${final.length} items (${selectedMovies.length} movies, ${selectedBooks.length} books)`
    );
    console.log(
      `🎲 User will see different results on each refresh due to random selection`
    );

    return final;

  } catch (error) {
    console.error("Error in getPersonalizedRecommendations:", error);
    return await getDefaultRecommendations(); // Fallback
  }
};


const analyzeUserPreferences = (interactions) => {
  const genreOccurrences = {
    genres: {}, 
    topGenres: [], 
  };

  interactions.forEach((interaction) => {
    // Track clicked items and their genres
    if (
      interaction.interactionType === "item clicked" &&
      interaction.clickedItem
    ) {
      const itemGenres =
        interaction.clickedItem.genres || interaction.clickedItem.genre || [];

      if (Array.isArray(itemGenres)) {
        itemGenres.forEach((genre) => {
          genreOccurrences.genres[genre] =
            (genreOccurrences.genres[genre] || 0) + 1;
        });
      }
    }

    // Track watchlisted items and their genres
    if (
      interaction.interactionType === "add to watchlist" &&
      interaction.itemDetails
    ) {
      const itemGenres =
        interaction.itemDetails.genres || interaction.itemDetails.genre || [];

      if (Array.isArray(itemGenres)) {
        itemGenres.forEach((genre) => {
          genreOccurrences.genres[genre] =
            (genreOccurrences.genres[genre] || 0) + 1;
        });
      }
    }

    // Track explicit genre filters
    if (interaction.interactionType === "filter genre" && interaction.genre) {
      genreOccurrences.genres[interaction.genre] =
        (genreOccurrences.genres[interaction.genre] || 0) + 1;
    }
  });

  // Get top genres by count
  genreOccurrences.topGenres = Object.entries(genreOccurrences.genres)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .slice(0, 5) // Take top 5
    .map(([genre]) => genre); 

  return genreOccurrences;
};

// Randomly shuffles items to avoid the same order every time.
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const refreshRecommendations = async (targetCount = 8) => {
  try {
    console.log(`🔄 Refreshing recommendations for ${targetCount} items...`);

    // Use the same logic as getRecommendations
    const result = await getRecommendations(targetCount);

    const movieCount = result.filter((r) => r.type === "Movie").length;
    const bookCount = result.filter((r) => r.type === "Book").length;

    console.log("✅ Recommendations refreshed successfully");
    console.log(
      `📊 Final distribution: ${movieCount} movies, ${bookCount} books`
    );

    return {
      success: true,
      count: result.length,
      distribution: { movies: movieCount, books: bookCount },
    };
  } catch (error) {
    console.error("❌ Error refreshing recommendations:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getRecommendations,
  getDefaultRecommendations,
  getPersonalizedRecommendations,
  refreshRecommendations,
  analyzeUserPreferences, 
};
