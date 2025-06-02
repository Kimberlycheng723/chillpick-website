const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const Interaction = require('../models/SavedSearch');
const User = require('../models/User'); 

// // Get recommendations for a user
// router.get('/', async (req, res) => {
//   try {
//     // get userId from session or query param
//     const userId = req.session?.user?._id || req.query.userId || null;

//     if (!userId) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }

//     const recommendations = await recommendationService.getRecommendations(userId);
//     res.json(recommendations);
//   } catch (error) {
//     console.error('Error fetching recommendations:', error);
//     res.status(500).json({ error: 'Failed to fetch recommendations' });
//   }
// });


// Get recommendations for dashboard
router.get('/dashboard', async (req, res) => {
  const userId = req.session.userId; // Consistent with server.js
  console.log("🔍 Recommendation request for userId:", userId);
  console.log("🔍 Full session:", req.session);
  
  if (!userId) {
    return res.status(401).json({ message: "❌ Unauthorized: No userId in session" });
  }
  
  try {
    // Find user to verify they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get recommendations using the service
    const recommendations = await recommendationService.getRecommendations(userId);
    
    res.json({ 
      message: "✅ Success", 
      recommendations: recommendations,
      userId: userId,
      count: recommendations.length
    });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// General recommendations endpoint
router.get('/', async (req, res) => {
  try {
    // Get userId from session (consistent approach)
    const userId = req.session?.userId || req.query.userId || null;
    
    console.log('General recommendations - userId:', userId);
    
    if (!userId) {
      console.log('No userId provided, returning default recommendations');
      const recommendations = await recommendationService.getDefaultRecommendations();
      return res.json(recommendations);
    }
    
    const recommendations = await recommendationService.getRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Refresh recommendations (admin/debug endpoint)
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual refresh triggered...');
    const userId = req.body.userId || req.session?.userId || null;
    console.log('Refreshing for userId:', userId);
    
    const result = await recommendationService.refreshRecommendations(userId);
    res.json(result);
  } catch (error) {
    console.error('Error refreshing recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint
router.get('/debug', async (req, res) => {
  try {
    const userId = req.query.userId || req.session?.userId || null;
    let result = {};
    
    console.log('Debug - User ID:', userId);
    console.log('Debug - Session:', req.session);
    
    if (userId) {
      const interactions = await Interaction.find({ userId }).limit(10);
      console.log('Debug - Interactions found:', interactions.length);
      
      let preferences = null;
      if (interactions.length > 0) {
        preferences = recommendationService.analyzeUserPreferences(interactions);
      }
      
      result = {
        userId: userId,
        type: interactions.length ? 'Personalized' : 'Default (no interactions)',
        basedOn: interactions.length ? 'User behavior' : null,
        preferences: preferences,
        interactionCount: interactions.length,
        sampleInteractions: interactions.slice(0, 3).map(i => ({
          type: i.interactionType,
          query: i.query,
          timestamp: i.timestamp
        })),
        session: {
          userId: req.session?.userId,
          user: req.session?.user,
          hasSession: !!req.session
        }
      };
    } else {
      result = {
        userId: null,
        type: 'Default',
        basedOn: 'Trending content (no user session)',
        session: {
          userId: req.session?.userId,
          user: req.session?.user,
          hasSession: !!req.session
        }
      };
    }
    
    res.json(result);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// router.get('/dashboard', async (req, res) => {
//   const userId = req.session.userId;

//   console.log("🔍 Recommendation request for userId:", userId);

//   if (!userId) {
//     return res.status(401).json({ message: "❌ Unauthorized: No userId in session" });
//   }

//   try {
//     // your logic using userId
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // generate and send recommendations...
//     res.json({ message: "✅ Success", recommendations: [] });
//   } catch (err) {
//     console.error("Recommendation error:", err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });



// // Refresh recommendations (admin/debug endpoint)
// router.post('/refresh', async (req, res) => {
//   try {
//     console.log('🔄 Manual refresh triggered...');
//     const userId = req.body.userId || req.session?.user?._id || null;
//     const result = await recommendationService.refreshRecommendations(userId);
//     res.json(result);
//   } catch (error) {
//     console.error('Error refreshing recommendations:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Debug endpoint
// router.get('/debug', async (req, res) => {
//   try {
//     const userId = req.query.userId || req.session?.user?._id || null;
//     let result = {};
    
//     console.log('Debug - User ID:', userId);
    
//     if (userId) {
//       const interactions = await Interaction.find({ userId }).limit(10);
//       console.log('Debug - Interactions found:', interactions.length);
      
//       let preferences = null;
//       if (interactions.length > 0) {
//         preferences = recommendationService.analyzeUserPreferences(interactions);
//       }
      
//       result = {
//         userId: userId,
//         type: interactions.length ? 'Personalized' : 'Default (no interactions)',
//         basedOn: interactions.length ? 'User behavior' : null,
//         preferences: preferences,
//         interactionCount: interactions.length,
//         sampleInteractions: interactions.slice(0, 3).map(i => ({
//           type: i.interactionType,
//           query: i.query,
//           timestamp: i.timestamp
//         }))
//       };
//     } else {
//       result = {
//         userId: null,
//         type: 'Default',
//         basedOn: 'Trending content (no user session)'
//       };
//     }
    
//     res.json(result);
//   } catch (error) {
//     console.error('Debug error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;