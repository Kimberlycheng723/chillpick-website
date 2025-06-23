// const express = require("express");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const router = express.Router();
// const User = require("../models/User"); // Import the User model

// // Middleware to check if the user is authenticated
// const authenticate = (req, res, next) => {
//   const token = req.header("Authorization")?.replace("Bearer ", "");
//   if (!token) {
//     return res.status(401).json({ message: "❌ Not authenticated" });
//   }

//   try {
//     const decoded = jwt.verify(token, "your_jwt_secret"); 
//     req.user = decoded;
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "❌ Invalid or expired token" });
//   }
// };

// // Register a new user
// router.post("/register", async (req, res) => {
//   const { username, email, password, gender, phone, bio } = req.body;

//   // Basic validation
//   if (!username || !email || !password) {
//     return res
//       .status(400)
//       .json({ message: "❌ Username, email, and password are required" });
//   }

//   try {
//     // Check for existing user
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(409).json({ message: "❌ Email already in use" });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create and save new user
//     const newUser = new User({
//       username,
//       email,
//       password: hashedPassword,
//       gender,
//       phone,
//       bio,
//     });

//     await newUser.save();
//     res.status(201).json({ message: "✅ User registered successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "❌ Error registering user" });
//   }
// });

// // Login route
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res
//       .status(400)
//       .json({ message: "❌ Email and password are required" });
//   }

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "❌ User not found" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "❌ Incorrect password" });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user._id, email: user.email },
//       "your_jwt_secret",
//       { expiresIn: "1h" }
//     );
//     res.json({ token });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "❌ Error logging in" });
//   }
// });

// // Get user profile
// router.get("/profile", authenticate, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.userId); // Use the decoded userId
//     if (!user) return res.status(404).json({ message: "❌ User not found" });

//     const { password, ...safeUser } = user._doc; // Omit password
//     res.status(200).json(safeUser);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "❌ Error fetching user profile" });
//   }
// });

// // Update user profile
// router.put("/profile", authenticate, async (req, res) => {
//   const { phone, gender, bio } = req.body;
//   const updates = { phone, gender, bio };

//   try {
//     const user = await User.findByIdAndUpdate(req.user.userId, updates, {
//       new: true,
//       runValidators: true,
//     });
//     if (!user) return res.status(404).json({ message: "❌ User not found" });

//     const { password, ...safeUser } = user._doc;
//     res.status(200).json({ message: "✅ Profile updated", user: safeUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "❌ Error updating profile" });
//   }
// });

// module.exports = router;
