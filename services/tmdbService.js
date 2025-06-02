const axios = require('axios');
require('dotenv').config();

// Genre ID-to-name mapping from TMDB
const genreMapforMatch = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

const genreMap = {
  28: 'Act',
  12: 'Adv',
  16: 'Ani',
  35: 'Com',
  80: 'Cri',
  99: 'Doc',
  18: 'Dra',
  10751: 'Fam',
  14: 'Fan',
  36: 'His',
  27: 'Hor',
  10402: 'Mus',
  9648: 'Mys',
  10749: 'Rom',
  878: 'Sci',
  10770: 'TV Mov',
  53: 'Thriller',
  10752: 'War',
  37: 'Wes'
};

// Reverse genre map for lookup by name
const genreNameToId = {
  'action': 28,
  'adventure': 12,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'documentary': 99,
  'drama': 18,
  'family': 10751,
  'fantasy': 14,
  'history': 36,
  'horror': 27,
  'music': 10402,
  'mystery': 9648,
  'romance': 10749,
  'science fiction': 878,
  'sciencefiction': 878, // alias
  'scifi': 878, // alias
  'tv movie': 10770,
  'tvmovie': 10770, // alias
  'thriller': 53,
  'war': 10752,
  'western': 37
};




const getTrendingMovies = async (limit = 5) => {
  console.log("getTrendingMovies called");
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
    );
    
    const movies = response.data.results.slice(0, limit).map(movie => {
      // Ensure genre_ids exists and is an array
      const genreIds = Array.isArray(movie.genre_ids) ? movie.genre_ids : [];
      const genres = genreIds.map(id => genreMap[id]).filter(Boolean);
      
      // If no genres found, add 'Unknown' as fallback
      if (genres.length === 0) {
        genres.push('Unknown');
      }
      
      const movieData = {
        title: movie.title,
        type: 'Movie',
        genre: genres, // This should now always be a non-empty array
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
        posterPath: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/default-movie.jpg',
        externalId: movie.id.toString(),
        description: movie.overview || 'No description available.',
        sourceApi: 'tmdb'
      };
      
      console.log(`Movie: ${movie.title}, Genre IDs: ${genreIds}, Mapped Genres: ${genres}`);
      return movieData;
    });
    
    console.log("Fetched movies with genres:", movies.map(m => ({ title: m.title, genres: m.genre })));
    return movies;
  } catch (error) {
    console.error('❌ Error fetching trending movies:', error.message);
    return [];
  }
};


/**
 * Get movies by user preferences 
 */
// const getMoviesByPreferences = async (preferences) => {
//   console.log("🎬 Fetching movies by preferences:", preferences);
  
//   try {
//     // Build query parameters based on preferences
//     const params = {
//       api_key: process.env.TMDB_API_KEY,
//       sort_by: preferences.averageRating > 0 ? 'vote_average.desc' : 'popularity.desc',
//       'vote_count.gte': 100, // Ensure enough ratings
//       'primary_release_date.gte': `${new Date().getFullYear() - 5}-01-01` // Last 5 years
//     };
    
//     // Convert genre names to IDs
//     if (preferences.topGenres && preferences.topGenres.length > 0) {
//       const genreIds = preferences.topGenres
//         .map(name => genreNameToId[name.toLowerCase().replace(/\s+/g, '')])
//         .filter(Boolean);

//       if (genreIds.length > 0) {
//         params.with_genres = genreIds.join(',');
//       }
//     }

//     // Fetch from TMDB
//     const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
//       params,
//       timeout: 5000
//     });
    
//     // Process results with preference scoring
//     // Each movie from the API is transformed into your app’s format with additional details and a custom relevance score.
//     const movies = response.data.results.map(movie => {
//       const movieGenres = Array.isArray(movie.genre_ids) 
//         ? movie.genre_ids.map(id => genreMap[id]).filter(Boolean)
//         : ['General'];
      
//       // Calculate preference score for each movie
//       let score = 0;
      
//       // Genre match scoring
//       if (preferences.topGenres && movieGenres) {
//         const genreMatches = movieGenres.filter(genre => 
//           preferences.topGenres.includes(genre)).length;
//         score += genreMatches * 10;
//       }
      
//       // Rating match scoring
//       if (movie.vote_average && preferences.averageRating > 0) {
//         const ratingDiff = Math.abs(movie.vote_average - preferences.averageRating);
//         score += (5 - Math.min(ratingDiff, 5)) * 2;
//       }
      
//       // Search term match scoring
//       if (preferences.commonSearchTerms && movie.title) {
//         const titleLower = movie.title.toLowerCase();
//         preferences.commonSearchTerms.forEach(term => {
//           if (titleLower.includes(term.toLowerCase())) {
//             score += 5;
//           }
//         });
//       }
      
//       // format the movie data (builds a new object for each movie)
//       return {
//         title: movie.title,
//         type: 'Movie',
//         genre: movieGenres,
//         year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
//         posterPath: movie.poster_path
//           ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
//           : '/images/default-movie.jpg',
//         id: movie.id.toString(),
//         description: movie.overview || 'No description available.',
//         rating: movie.vote_average || 0,
//         score: score,
//         sourceApi: 'tmdb'
//       };
      
//     });
    
//     // Sort & return the best matches
//     return movies
//       .sort((a, b) => b.score - a.score)
//       .slice(0, 10); // Return top 10 matches
      
//   } catch (error) {
//     console.error('❌ Error fetching movies by preferences:', error.message);
//     // Fallback to trending movies if preference search fails
//     return await getTrendingMovies(10);
//   }
// };

// const getMoviesByPreferences = async (preferences, limit = 10) => {
//   console.log("🎬 Fetching movies by genre preferences:", preferences.topGenres);
  
//   try {
//     if (!preferences.topGenres || preferences.topGenres.length === 0) {
//       return await getTrendingMovies(limit);
//     }

//     // Convert genre names to TMDB genre IDs
//     const genreIds = preferences.topGenres
//       .map(name => genreNameToId[name.toLowerCase().replace(/\s+/g, '')])
//       .filter(Boolean);

//     if (genreIds.length === 0) {
//       return await getTrendingMovies(limit);
//     }

//     // Fetch movies with these genres
//     const params = {
//       api_key: process.env.TMDB_API_KEY,
//       with_genres: genreIds.join(','),
//       sort_by: 'popularity.desc',
//       'vote_count.gte': 50, // Minimum votes to ensure some quality
//       'primary_release_date.gte': `${new Date().getFullYear() - 5}-01-01`, // Last 5 years
//       page: 1
//     };

//     const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
//       params,
//       timeout: 5000
//     });

//     // Map results to our format
//     const movies = response.data.results.slice(0, limit).map(movie => {
//       const genres = Array.isArray(movie.genre_ids) 
//         ? movie.genre_ids.map(id => genreMap[id]).filter(Boolean)
//         : ['General'];

//       return {
//         title: movie.title,
//         type: 'Movie',
//         genre: genres,
//         year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
//         posterPath: movie.poster_path
//           ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
//           : '/images/default-movie.jpg',
//         id: movie.id.toString(),
//         description: movie.overview || 'No description available.',
//         rating: movie.vote_average || 0,
//         sourceApi: 'tmdb'
//       };
//     });

//     // If we don't have enough movies, fill with trending movies
//     if (movies.length < limit) {
//       const fallbackMovies = await getTrendingMovies(limit - movies.length);
//       return [...movies, ...fallbackMovies].slice(0, limit);
//     }

//     return movies;
//   } catch (error) {
//     console.error('❌ Error fetching movies by preferences:', error.message);
//     return await getTrendingMovies(limit);
//   }
// };

const getMoviesByPreferences = async (preferences, limit = 10) => {
  console.log("🎬 Fetching movies by genre preferences:", preferences.topGenres);
  
  try {
    if (!preferences.topGenres || preferences.topGenres.length === 0) {
      return await getTrendingMovies(limit);
    }

    // Normalize input genres to lowercase and no spaces for matching
    const normalizedInputGenres = preferences.topGenres.map(g => g.toLowerCase().replace(/\s+/g, ''));
    console.log("🔍 Normalized input genres:", normalizedInputGenres);

    // Convert genre names to TMDB genre IDs
    const genreIds = normalizedInputGenres
      .map(name => {
        const id = genreNameToId[name];
        console.log(`🎯 Mapping "${name}" -> ${id}`);
        return id;
      })
      .filter(Boolean);

    console.log("🎯 Found genre IDs:", genreIds);

    if (genreIds.length === 0) {
      console.log("❌ No valid genre IDs found, falling back to trending");
      return await getTrendingMovies(limit);
    }

    // TMDB API query params
    const params = {
      api_key: process.env.TMDB_API_KEY,
      with_genres: genreIds.join('|'),
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
      'primary_release_date.gte': `${new Date().getFullYear() - 5}-01-01`,
      page: 1
    };

    console.log("🚀 Making TMDB API call with params:", params);

    const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params,
      timeout: 5000
    });

    // Filter movies to ensure at least one genre matches
    const filteredMovies = response.data.results.filter(movie => {
      if (!Array.isArray(movie.genre_ids)) return false;
      const movieGenres = movie.genre_ids.map(id => genreMapforMatch[id]?.toLowerCase() || '').filter(Boolean);
      // Check if any movie genre is in input genre list
      return movieGenres.some(genre => normalizedInputGenres.includes(genre.replace(/\s+/g, '')));
    });

    // Map filtered movies to app format 
    const movies = filteredMovies.slice(0, limit).map(movie => {
      // const movieGenres = movie.genre_ids
      //   .map(id => genreMapforMatch[id] || 'Unknown')
      //   .filter(Boolean);
      const movieGenres = movie.genre_ids
            .map(id => genreMap[id] || 'Unknown')
            .filter(Boolean);


      // Calculate match score (optional)
      const matchScore = movieGenres.reduce((score, genre) => {
        return score + (normalizedInputGenres.includes(genre.toLowerCase().replace(/\s+/g, '')) ? 1 : 0);
      }, 0);

      return {
        title: movie.title,
        type: 'Movie',
        genre: movieGenres,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
        posterPath: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/default-movie.jpg',
        id: movie.id.toString(),
        description: movie.overview || 'No description available.',
        rating: movie.vote_average || 0,
        sourceApi: 'tmdb',
        matchScore
      };
    });

    // Sort by matchScore desc, then rating desc
    const sortedMovies = movies.sort((a, b) => {
      if (b.matchScore === a.matchScore) {
        return b.rating - a.rating;
      }
      return b.matchScore - a.matchScore;
    });

    // If not enough movies, fill with trending
    if (sortedMovies.length < 5) {
      console.log(`⚠️ Only ${sortedMovies.length} personalized movies, adding ${limit - sortedMovies.length} trending movies`);
      const fallbackMovies = await getTrendingMovies(limit - sortedMovies.length);
      return [...sortedMovies, ...fallbackMovies].slice(0, limit);
    }

    return sortedMovies.slice(0, limit);

  } catch (error) {
    console.error('❌ Error fetching movies by preferences:', error.message);
    return await getTrendingMovies(limit);
  }
};


module.exports = {
  getTrendingMovies,
  getMoviesByPreferences,
  genreMap
};

// const getTrendingMovies = async (limit = 5) => {
//   console.log("getTrendingMovies called"); 
//   try {
//     const response = await axios.get(
//       `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
//     );

//     const movies = response.data.results.slice(0, limit).map(movie => ({
//       title: movie.title,
//       type: 'Movie',
//       genre: movie.genre_ids.map(id => genreMap[id] || 'Unknown'),
//       year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
//       posterPath: movie.poster_path
//         ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
//         : '/images/default-movie.jpg',
//       externalId: movie.id.toString(),
//       description: movie.overview,
//       sourceApi: 'tmdb'
//     }));

//     console.log("Fetched movies with genres:", movies);
//     return movies;

//   } catch (error) {
//     console.error('❌ Error fetching trending movies:', error.message);
//     return [];
//   }
// };

// module.exports = {
//   getTrendingMovies,
//   genreMap
// };