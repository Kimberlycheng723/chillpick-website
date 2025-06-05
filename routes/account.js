const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const SessionModel = require('../models/Session'); // Adjust path if needed
const nodemailer = require("nodemailer");
const crypto = require("crypto");

require('dotenv').config();

// ---Middleware to protect routes---
async function enforceSingleSession(req, res, next) {
  if (!req.session.userId) {
    return next(); // No session = allow
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.sessionId && user.sessionId !== req.session.id) {
    console.log("Session mismatch detected. Logging out.");
    req.session.destroy(() => {
      return res.status(401).json({ message: "Session expired. Logged in from another location." });
    });
    return;
  }

  next(); // Session is valid
}


// ---Register with error handling
// router.post("/register", async (req, res) => {
//   try {
//     const { username, email, phone, password } = req.body;

//     const newUser = new User({ username, email, phone, password });
//     await newUser.save();

//     res.status(201).json({ message: "User registered successfully." });

//   } catch (err) {
//     if (err.code === 11000) {
//       if (err.keyPattern.username) {
//         return res.status(400).json({ message: "Username already exists." });
//       }
//       if (err.keyPattern.email) {
//         return res.status(400).json({ message: "Email already exists." });
//       }
//     }
//     console.error("Registration failed:", err);
//     res.status(500).json({ message: "Internal server error." });
//   }
// });

// POST /account/register

// POST /account/check-username
router.post("/check-username", async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username: new RegExp(`^${username}$`, "i") });
  res.json({ exists: !!user });
});

// POST /account/check-email
router.post("/check-email", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
  res.json({ exists: !!user });
});

// POST /account/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // Check if username or email already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Generate token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create new user
    const newUser = new User({
      username,
      email,
      phone,
      password,
      verified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await newUser.save();

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/account/verify?token=${verificationToken}`;
    const mailOptions = {
      from: `"ChillPick" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ChillPick Account Verification",
      html: `
        <h2>Welcome to ChillPick, ${username}!</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${verifyUrl}">Verify My Account</a>
        <p>This link expires in 24 hours.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Registration successful. Verification email sent." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /account/verify
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Missing verification token.");

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Verification link is invalid or has expired.");
    }

    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.send(`
      <h1>Account Verified!</h1>
      <h4>Your account has been successfully activated. You can now <a href="/account/login">log in</a>.</h4>
    `);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).send("Server error during verification.");
  }
});

// POST /account/resend-verification
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.verified) return res.status(400).json({ message: "User already verified." });

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = token;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/account/verify?token=${token}`;
    console.log("New verification link sent to user:", verifyUrl);

    const mailOptions = {
      from: `"ChillPick" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Account - ChillPick",
      html: `
        <p>Hello ${user.username},</p>
        <p>Here is your new verification link. Click to activate your account:</p>
        <a href="${verifyUrl}">Verify My Account</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Verification email resent." });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});





// ---Login with session management---
router.post("/login", async (req, res) => {
  const { username, password, force } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ type: "username", message: "Username does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ type: "password", message: "Wrong password" });
    }

    const existingSession = await SessionModel.findOne({ userId: user._id });

    if (existingSession && existingSession.sessionId !== req.sessionID && !force) {
      return res.status(409).json({ activeSessionDetected: true });
    }

    req.session.regenerate(async (err) => {
      if (err) {
        console.error("❌ Session regeneration failed:", err);
        return res.status(500).json({ message: "Failed to regenerate session" });
      }

     req.session.userId = user._id;
req.session.user = {
  id: user._id,
  username: user.username,
  email: user.email
};
      req.session.save(async (err) => {
        if (err) {
          console.error("❌ Failed to save new session:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }

        try {
          // Destroy old session in MongoStore if applicable
          if (existingSession && req.sessionStore?.destroy) {
            req.sessionStore.destroy(existingSession.sessionId, (err) => {
              if (err) console.error("❌ Failed to destroy old session in store:", err);
              else console.log("✅ Old session destroyed from store");
            });
          }

          // Clean up existing session in your custom SessionModel
          await SessionModel.deleteMany({ userId: user._id });
          await SessionModel.create({ userId: user._id, sessionId: req.sessionID });

          // Update user's sessionId
          await User.updateOne({ _id: user._id }, { sessionId: req.sessionID });

          console.log("✅ Login successful. Session ID:", req.sessionID);
          return res.status(200).json({ message: "Login successful" });

        } catch (dbErr) {
          console.error("❌ Error during DB session update:", dbErr);
          return res.status(500).json({ message: "Login failed during session update" });
        }
      });
    });

  } catch (err) {
    console.error("❌ Login route error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ---Return session user info---
router.get('/me', (req, res) => {
  if (req.session?.user) {
    res.json({
      id: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});
//check session-status
router.get("/session-status", async (req, res) => {
  if (!req.session.userId || !req.session.token) {
    return res.status(401).json({ message: "Session invalid or expired." });
  }

  const user = await User.findById(req.session.userId);
  if (!user || user.sessionToken !== req.session.token) {
    return res.status(401).json({ message: "Session invalidated by another login." });
  }

  return res.status(200).json({ message: "Session is valid." });
});

// Helper function to clean up user session data
async function cleanUpUserSession(userId, sessionIdToDestroy) {
  try {
    if (userId) {
      await User.updateOne({ _id: userId }, { $unset: { sessionId: "" } });
      await SessionModel.deleteOne({ sessionId: sessionIdToDestroy }); // Optional: if you're storing sessions here
      console.log("✅ sessionId cleared in User collection and session removed.");
    }
  } catch (err) {
    console.error("❌ Cleanup error:", err);
  }
}

//---extend session---
router.post("/extend-session", async (req, res) => {
  try {
    // Ensure session exists
    if (!req.session) {
      return res.status(401).json({ message: "Session not found" });
    }

    // 1. Touch session (update expiration)
    req.session.touch(); // marks session as active for store

    // 2. Also update in MongoStore (important for connect-mongo)
    // You may use req.sessionID to find it in SessionModel
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    // Optional: update timestamp or expiration in your custom SessionModel
    if (sessionId) {
      await SessionModel.updateOne(
        { sessionId },
        { $set: { lastExtended: new Date() } } // or expiry if you track it
      );
    }

    // 3. Optional: make sure user's sessionId is consistent
    if (userId) {
      const user = await User.findById(userId);
      if (!user.sessionId || user.sessionId !== sessionId) {
        await User.updateOne({ _id: userId }, { $set: { sessionId } });
      }
    }
    console.log("✅ Session extended successfully:", sessionId);
    return res.status(200).json({ message: "Session extended" });
  } catch (error) {
    console.error("❌ Extend session error:", error);
    return res.status(500).json({ message: "Failed to extend session" });
  }
});


//---force logout---
router.post('/force-logout', async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const userId = req.session?.userId;

    if (!sessionId || !userId) {
      return res.status(400).json({ message: "No session to destroy." });
    }

    // Destroy the session from the store
    req.session.destroy(async (err) => {
      if (err) {
        console.error("❌ Error destroying session:", err);
        // Still proceed to delete session manually
      } else {
        console.log("✅ Session destroyed from store:", sessionId);
      }

      // Delete from SessionModel (if manually tracked)
      await SessionModel.deleteOne({ sessionId });

      // Clear sessionId from User document
      await User.updateOne({ _id: userId }, { $set: { sessionId: null } });

      // Clear the browser session cookie
      res.clearCookie("connect.sid");

      return res.status(200).json({ message: "✅ User forcefully logged out and session cleared." });
    });
  } catch (err) {
    console.error("❌ Force logout error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

//logout for logout now button
// In routes/account.js
router.post('/logout-now', async (req, res) => {
  const sessionId = req.sessionID;
  const userId = req.session?.userId;

  console.log("🟡 /logout-now triggered");
  console.log("➡️ Session ID:", sessionId || "(none)");
  console.log("➡️ User ID:", userId || "(none)");

  try {
    if (!sessionId) {
      console.warn("⚠️ No session ID found in request.");
      return res.status(400).json({ message: "No active session" });
    }

    // Destroy session (in-memory + cookie)
    req.session.destroy(async (err) => {
      if (err) {
        console.error("❌ Error destroying session:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      console.log("✅ Session destroyed");

      // Delete session from SessionModel (MongoDB)
      try {
        await SessionModel.deleteOne({ sessionId: sessionId });
        console.log("🗑️ SessionModel delete result:", deleteResult);
      } catch (dbErr) {
      }

      // Clear sessionId in User document (optional)
      if (userId) {
        try {
          const updateResult = await User.updateOne(
            { _id: userId },
            { $set: { sessionId: null } }
          );
        } catch (userErr) {
          console.error("❌ Failed to update user:", userErr);
        }
      }

      // Clear session cookie
      res.clearCookie("connect.sid");
      console.log("✅ Cookie cleared");

      return res.status(200).json({ message: "Logout successful" });
    });
  } catch (error) {
    console.error("❌ Logout-now error:", error);
    return res.status(500).json({ message: "Internal error during logout" });
  }
});


router.get('/check-session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.status(200).json({ message: "Session active" });
  }
  return res.status(401).json({ message: "Session expired" });
});

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email not found." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    const resetLink = `http://localhost:3000/account/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"ChillPick" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}">Reset Password</a>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET Reset Password Page
router.get("/reset-password", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Missing token.");
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Reset token is invalid or has expired.");
    }

    res.render("account/reset-password", { token }); 
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

// POST Reset Password Logic
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
});

// ---Get user profile for fetching user data---
router.get('/profile-data', async (req, res) => {


  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" }); // Return 401 if no session
  }

  try {
    const user = await User.findById(req.session.userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" }); // Return 404 if user not found
    }

    res.status(200).json(user); // Send user data as JSON
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//---rendering profile page---
router.get('/profile', enforceSingleSession, async (req, res) => {
  console.log("Session Data:", req.session); // Debugging: Log session data

  if (!req.session.userId) {
    console.log("No userId in session. Redirecting to login.");
    return res.redirect('/account/login'); // Redirect to login if no session
  }

  try {
    const user = await User.findById(req.session.userId).select('-password'); // Exclude password
    if (!user) {
      console.log("User not found in database. Redirecting to login.");
      return res.redirect('/account/login'); // Redirect if user not found
    }

    res.render('account/profile', { user }); // Render the profile page with user data
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ---Update profile details---
router.put('/profile', async (req, res) => {
  try {
    const { bio, phone, gender } = req.body;

    const updatedFields = {};
    if (bio !== undefined) updatedFields.bio = bio;
    if (phone !== undefined) updatedFields.phone = phone;
    if (gender !== undefined) updatedFields.gender = gender;

    const updatedUser = await User.findByIdAndUpdate(
      req.session.userId,
      updatedFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


//---upload profile picture---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../images/profilePicUpload'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage
});

// ---Route to handle profile image upload---
router.post('/upload-profile-picture', upload.single('profileImage'), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).send("User not found");

    const imagePath = '/images/profilePicUpload/' + req.file.filename;

    user.profilePicture = imagePath;
    await user.save();

    res.json({ imagePath });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});





// ---Change password---
router.put('/change-password', async (req, res) => {

  const { currentPassword, newPassword } = req.body;

  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required.' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least 1 uppercase letter.' });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least 1 lowercase letter.' });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least 1 digit.' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    user.password = newPassword;
    await user.save();


    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ---Logout Route---
const destroySession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

router.post('/logout', async (req, res) => {
  const sessionId = req.sessionID;
  const userId = req.session?.userId;

  console.log("🔁 Logout requested");
  console.log("➡️ Session ID:", sessionId);
  console.log("➡️ User ID:", userId);

  try {
    // 1. Destroy session
    await destroySession(req);
    console.log("✅ Session destroyed");

    // 2. Delete session from SessionModel
    if (sessionId) {
      await SessionModel.deleteOne({ sessionId });
      console.log("✅ SessionModel entry deleted");
    }

    // 3. Set sessionId to null in user document
    if (userId) {
      await User.updateOne({ _id: userId }, { $set: { sessionId: null } });
      console.log("✅ sessionId cleared in User document");
    }

    // 4. Clear cookie
    res.clearCookie("connect.sid");
    console.log("✅logged out successfully");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("❌ Logout error:", error);
    return res.status(500).json({ message: "Logout failed" });
  }
});



// ---Verify Password Route---
router.post('/verify-password', async (req, res) => {
  const { userId } = req.session;
  const { password } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    res.status(200).json({ message: "Password verified" });
  } catch (err) {
    console.error("Password verification error:", err);
    res.status(500).json({ error: "Server error during password verification" });
  }
});

// ---Delete Account Route---
router.post('/delete', async (req, res) => {
  const { userId } = req.session;
  const { password } = req.body;
  const sessionId = req.sessionID;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Destroy the session
    req.session.destroy(async (err) => {
      if (err) {
        console.error("❌ Error destroying session:", err);
        return res.status(500).json({ error: "Failed to destroy session" });
      }

      try {
        // Remove session record from SessionModel
        await SessionModel.deleteOne({ sessionId });
        console.log("✅ SessionModel entry deleted during account deletion");
      } catch (sessionErr) {
        console.error("❌ Error deleting session from SessionModel:", sessionErr);
      }

      // Clear cookie
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Account deleted successfully" });
    });
  } catch (err) {
    console.error("❌ Delete account error:", err);
    res.status(500).json({ error: "Server error during account deletion" });
  }
});

module.exports = router;
