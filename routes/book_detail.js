const express = require('express');
const axios = require('axios');
const router = express.Router();
const Review = require('../models/BookReview');
const User = require('../models/User');
const mongoose = require('mongoose');
require('dotenv').config();

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || 'your_api_key_here';

router.get('/check-session', (req, res) => {
  console.log('=== SESSION CHECK ===');
  console.log('Session data:', req.session);
  const isLoggedIn = !!(req.session?.user?.id);
  const user = req.session?.user || null;

  res.json({
    success: true,
    isLoggedIn,
    user,
    sessionId: req.sessionID,
    debug: {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      hasUserId: !!req.session?.user?.id,
      cookies: req.cookies
    }
  });
});

const requireAuth = (req, res, next) => {
  if (req.session?.user?.id) {
    req.user = req.session.user;
    return next();
  }
  res.status(401).json({ success: false, message: 'Not logged in' });
};

//Recommendation
// Improved recommendation function - replace your existing getBookRecommendations function with this
async function getBookRecommendations(book) {
  try {
    const MAX_RECOMMENDATIONS = 8; // Get more to have better filtering options
    const FINAL_RECOMMENDATIONS = 4; // Final number to display
    
    // 1. Extract and normalize genres from the current book
    const rawCategories = book.volumeInfo?.categories || ['Fiction'];
    const genres = rawCategories
      .flatMap(category => {
        // Split on common delimiters and normalize
        return category.split(/[\/,&\-\|]/)
          .map(g => g.trim())
          .filter(g => g.length > 2) // Remove very short words
          .map(g => g.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());
      })
      .filter((genre, index, self) => 
        genre.length > 0 && self.indexOf(genre) === index // Remove duplicates and empty
      );

    console.log('📚 Processing book:', book.volumeInfo.title);
    console.log('📋 Original categories:', rawCategories);
    console.log('🏷️ Extracted genres:', genres);

    let recommendations = [];
    const seenIds = new Set([book.id]);
    
    // 2. Search by primary genres first (most relevant)
    const primaryGenres = genres.slice(0, 3); // Use top 3 genres
    
    for (const genre of primaryGenres) {
      if (recommendations.length >= MAX_RECOMMENDATIONS) break;
      
      try {
        // Try multiple search strategies for better results
        const searchQueries = [
          `subject:"${genre}"`,
          `category:"${genre}"`,
          `"${genre}" books`
        ];
        
        for (const query of searchQueries) {
          if (recommendations.length >= MAX_RECOMMENDATIONS) break;
          
          const { data } = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
              q: query,
              maxResults: 15,
              orderBy: 'relevance',
              key: GOOGLE_BOOKS_API_KEY,
              printType: 'books',
              filter: 'ebooks' // This often gives better quality results
            },
            timeout: 5000
          });

          if (data.items) {
            for (const item of data.items) {
              if (recommendations.length >= MAX_RECOMMENDATIONS) break;
              
              // Better filtering criteria
              if (!item.id || seenIds.has(item.id)) continue;
              if (!item.volumeInfo?.title) continue;
              
              // Check if book has valid image or use default
              const thumbnail = item.volumeInfo.imageLinks?.thumbnail || 
                             item.volumeInfo.imageLinks?.smallThumbnail || 
                             '/images/default-book.jpg';
              
              // Ensure the book has some genre information
              const bookGenres = item.volumeInfo.categories || [genre];
              
              seenIds.add(item.id);
              recommendations.push({
                id: item.id,
                title: item.volumeInfo.title,
                authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
                year: item.volumeInfo.publishedDate?.substring(0, 4) || 'N/A',
                genres: bookGenres,
                image: thumbnail,
                relevanceScore: calculateRelevanceScore(bookGenres, genres),
                searchGenre: genre // Track which genre found this book
              });
            }
          }
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (err) {
        console.error(`❌ Error searching genre "${genre}":`, err.message);
        continue;
      }
    }

    // 3. If still need more, search by author
    if (recommendations.length < MAX_RECOMMENDATIONS && book.volumeInfo?.authors?.length > 0) {
      const author = book.volumeInfo.authors[0];
      try {
        const { data } = await axios.get('https://www.googleapis.com/books/v1/volumes', {
          params: {
            q: `inauthor:"${author}"`,
            maxResults: 8,
            key: GOOGLE_BOOKS_API_KEY,
            printType: 'books'
          },
          timeout: 5000
        });

        if (data.items) {
          for (const item of data.items) {
            if (recommendations.length >= MAX_RECOMMENDATIONS) break;
            if (!item.id || seenIds.has(item.id)) continue;
            if (!item.volumeInfo?.title) continue;

            const thumbnail = item.volumeInfo.imageLinks?.thumbnail || 
                             item.volumeInfo.imageLinks?.smallThumbnail || 
                             '/images/default-book.jpg';

            seenIds.add(item.id);
            recommendations.push({
              id: item.id,
              title: item.volumeInfo.title,
              authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
              year: item.volumeInfo.publishedDate?.substring(0, 4) || 'N/A',
              genres: item.volumeInfo.categories || ['Same Author'],
              image: thumbnail,
              relevanceScore: 0.5, // Lower score for author matches
              searchGenre: 'author'
            });
          }
        }
      } catch (err) {
        console.error('❌ Error searching by author:', err.message);
      }
    }

    // 4. Sort by relevance and return top results
    const sortedRecommendations = recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, FINAL_RECOMMENDATIONS);

    console.log(`✅ Found ${sortedRecommendations.length} recommendations`);
    console.log('📊 Recommendations:', sortedRecommendations.map(r => ({
      title: r.title,
      genres: r.genres,
      relevance: r.relevanceScore,
      foundBy: r.searchGenre
    })));

    return sortedRecommendations;

  } catch (err) {
    console.error('💥 Recommendation system error:', err);
    return [];
  }
}

// Helper function to calculate relevance score
function calculateRelevanceScore(bookGenres, targetGenres) {
  if (!bookGenres || !targetGenres) return 0;
  
  const normalizedBookGenres = bookGenres.map(g => 
    g.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  );
  
  let score = 0;
  let matches = 0;
  
  for (const targetGenre of targetGenres) {
    for (const bookGenre of normalizedBookGenres) {
      // Exact match
      if (bookGenre === targetGenre) {
        score += 2;
        matches++;
      }
      // Partial match (one contains the other)
      else if (bookGenre.includes(targetGenre) || targetGenre.includes(bookGenre)) {
        score += 1;
        matches++;
      }
    }
  }
  
  // Bonus for multiple matches
  if (matches > 1) score += matches * 0.5;
  
  return score;
}

// Book detail route with improved error handling
router.get('/:id', async (req, res) => {
    if (!req.session?.userId) {
    return res.redirect(`/account/login?redirect=/book_detail/${req.params.id}`);
  }

  try {
    console.log(`🔍 Fetching book details for ID: ${req.params.id}`);
    
    // 1. Get the main book details
    const { data: book } = await axios.get(
      `https://www.googleapis.com/books/v1/volumes/${req.params.id}`,
      { 
        params: { key: GOOGLE_BOOKS_API_KEY },
        timeout: 10000 
      }
    );

    console.log(`📖 Book found: ${book.volumeInfo?.title}`);

    // 2. Get recommendations with better error handling
    let recommendations = [];
    try {
      console.log('🔄 Fetching recommendations...');
      recommendations = await getBookRecommendations(book);
      console.log(`✅ Got ${recommendations.length} recommendations`);
    } catch (err) {
      console.error('❌ Recommendation error:', err.message);
      recommendations = []; // Ensure it's always an array
    }

    // 3. Render the page with all data
    res.render('detail_page/book_detail', {
      book,
      recommendations: recommendations || [],
      isLoggedIn: !!req.session?.user,
      currentUser: req.session?.user || null
    });

  } catch (error) {
    console.error('💥 Book detail error:', error.message);
    
    // Better error handling - try to still show something useful
    res.render('detail_page/book_detail', {
      book: { 
        id: req.params.id,
        volumeInfo: { 
          title: 'Book Not Found',
          description: 'Sorry, we could not load the details for this book.'
        } 
      },
      recommendations: [],
      isLoggedIn: !!req.session?.user,
      currentUser: req.session?.user || null,
      error: 'Failed to load book details. Please try again later.'
    });
  }
});

//Submit review route with better debugging
router.post('/reviews', requireAuth, async (req, res) => {
  const { bookId, rating, comment, spoiler } = req.body;

  console.log('=== REVIEW SUBMISSION ===');
  console.log('Request body:', req.body);
  console.log('User session:', req.session.user);

  if (!bookId || !rating || !comment) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  // Normalize bookId - remove any extra characters and trim
  const normalizedBookId = bookId.toString().trim();
  console.log('📚 Normalized bookId:', normalizedBookId);

  const review = new Review({
    bookId: normalizedBookId,
    userId: req.session.user.id,
    username: req.session.user.username,
    rating: parseInt(rating),
    comment: comment.trim(),
    spoiler: Boolean(spoiler),
    likes: [], // Initialize empty likes array
    replies: [], // Initialize empty replies array
    likeCount: 0 // Initialize like count
  });

  try {
    const saved = await review.save();
    console.log('✅ Review saved successfully:', saved._id);
    
    // Return the review with proper ID formatting
    const reviewResponse = {
      id: saved._id.toString(), // Convert ObjectId to string
      _id: saved._id.toString(),
      bookId: saved.bookId,
      userId: saved.userId,
      username: saved.username,
      rating: saved.rating,
      comment: saved.comment,
      spoiler: saved.spoiler,
      likes: saved.likes || [],
      replies: saved.replies || [],
      likeCount: saved.likeCount || 0,
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
router.get('/reviews/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const page = parseInt(req.query.page) || 1;
  const limit = 2;
  const skip = (page - 1) * limit;

  console.log('=== FETCHING REVIEWS ===');
  console.log('Requested bookId:', bookId);
  console.log('Page:', page, 'Limit:', limit, 'Skip:', skip);

  try {
    // First, let's see what bookIds exist in the database
    const allBookIds = await Review.distinct('bookId');
    console.log('📚 All bookIds in database:', allBookIds);

    // Try exact match first
    let reviews = await Review.find({ 
      bookId: bookId
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    let total = await Review.countDocuments({ 
      bookId: bookId
    });

    console.log(`🔍 Exact match - Found ${reviews.length} reviews (total: ${total})`);

    // If no exact match, try to find similar bookIds
    if (reviews.length === 0 && total === 0) {
      console.log('🔄 No exact match, trying partial matches...');
      
      // Look for bookIds that contain the requested ID or vice versa
      const partialMatches = allBookIds.filter(id => 
        id.includes(bookId) || bookId.includes(id)
      );
      
      console.log('🎯 Partial matches found:', partialMatches);
      
      if (partialMatches.length > 0) {
        const matchingBookId = partialMatches[0];
        console.log(`📖 Using matching bookId: ${matchingBookId}`);
        
        reviews = await Review.find({ 
          bookId: matchingBookId
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        total = await Review.countDocuments({ 
          bookId: matchingBookId
        });
        
        console.log(`✅ Partial match - Found ${reviews.length} reviews (total: ${total})`);
      }
    }

    // Format the response properly
    let formattedReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      
      // Ensure proper ID formatting
      const formattedReview = {
        id: reviewObj._id.toString(), // Convert ObjectId to string for frontend
        _id: reviewObj._id.toString(),
        bookId: reviewObj.bookId,
        userId: reviewObj.userId,
        username: reviewObj.username,
        rating: reviewObj.rating || 0,
        comment: reviewObj.comment || '',
        spoiler: reviewObj.spoiler || false,
        likes: reviewObj.likes || [],
        replies: reviewObj.replies || [],
        likeCount: reviewObj.likeCount || 0,
        createdAt: reviewObj.createdAt,
        updatedAt: reviewObj.updatedAt,
        isLiked: false // We don't track individual likes anymore
      };
      
      return formattedReview;
    });

    console.log(`📊 Final result: ${formattedReviews.length} reviews returned`);
    console.log('Sample review IDs:', formattedReviews.map(r => r.id));

    res.json({
      success: true,
      reviews: formattedReviews,
      page,
      hasMore: page * limit < total,
      debug: {
        requestedBookId: bookId,
        totalInDb: total,
        allBookIds: allBookIds.slice(0, 5) // Show first 5 for debugging
      }
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

// SIMPLIFIED: Like review functionality - only increment/decrement likeCount
router.post('/reviews/:id/like', async (req, res) => {
  const { id: reviewId } = req.params;

  console.log('=== LIKE REVIEW REQUEST ===');
  console.log('Review ID:', reviewId);

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      console.log('❌ Invalid review ID format');
      return res.status(400).json({ success: false, message: 'Invalid review ID' });
    }

    // Find and update the review - increment likeCount by 1
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { likeCount: 1 } }, // Simply increment the count
      { new: true } // Return the updated document
    );

    if (!review) {
      console.log('❌ Review not found');
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    console.log('✅ Like count updated:', review.likeCount);

    // Return simple response with new count
    res.json({
      success: true,
      liked: true, // Always true since we only increment
      likeCount: review.likeCount,
      message: 'Like added'
    });

  } catch (err) {
    console.error('❌ Error updating like count:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update like count',
      error: err.message 
    });
  }
});

// Reply to review functionality with proper validation and error handling
router.post('/reviews/reply', requireAuth, async (req, res) => {
  const { reviewId, content } = req.body;

  console.log('=== REPLY TO REVIEW REQUEST ===');
  console.log('Review ID:', reviewId);
  console.log('Reply content:', content);
  console.log('User:', req.session.user);

  // Validate input
  if (!reviewId) {
    console.log('❌ Missing review ID');
    return res.status(400).json({ success: false, message: 'Review ID is required' });
  }

  if (!content?.trim()) {
    console.log('❌ Missing reply content');
    return res.status(400).json({ success: false, message: 'Reply content is required' });
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    console.log('❌ Invalid review ID format:', reviewId);
    return res.status(400).json({ success: false, message: 'Invalid review ID format' });
  }

  try {
    // Find the review by ID
    const review = await Review.findById(reviewId);
    if (!review) {
      console.log('❌ Review not found:', reviewId);
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    console.log('✅ Review found:', review._id);
    console.log('Current replies count:', review.replies?.length || 0);

    // Create reply object
    const reply = {
      userId: req.session.user.id,
      username: req.session.user.username,
      content: content.trim(),
      createdAt: new Date()
    };

    console.log('Creating reply:', reply);

    // Initialize replies array if it doesn't exist
    if (!review.replies) {
      review.replies = [];
    }

    // Add the reply
    review.replies.push(reply);

    console.log('New replies count:', review.replies.length);

    // Save changes
    await review.save();

    console.log('✅ Reply added successfully');

    // Return the new reply (get the last added reply)
    const newReply = review.replies[review.replies.length - 1];

    res.json({
      success: true,
      reply: {
        id: newReply._id ? newReply._id.toString() : Date.now().toString(), // Ensure ID is present
        userId: newReply.userId,
        username: newReply.username,
        content: newReply.content,
        createdAt: newReply.createdAt
      },
      debug: {
        reviewId: reviewId,
        repliesCount: review.replies.length,
        replyId: newReply._id
      }
    });

  } catch (err) {
    console.error('❌ Error adding reply:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add reply',
      error: err.message
    });
  }
});

module.exports = router;