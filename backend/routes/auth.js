import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, sendTokenResponse, createTokenAndSetCookie } from '../middleware/auth.js';
import { getAuthUrl, getTokensFromCode, getUserProfile } from '../services/gmailService.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      console.log('📝 Registration attempt:', { email: req.body.email, name: req.body.name });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { name, email, password } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('❌ User already exists:', email);
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      console.log('⏳ Creating user...');
      // Create user
      const user = await User.create({
        name,
        email,
        password,
      });

      console.log('✅ User created successfully:', user._id);
      sendTokenResponse(user, 201, res);
    } catch (error) {
      console.error('❌ Register error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      sendTokenResponse(user, 200, res);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, preferences } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/auth/google
// @desc    Get Google OAuth URL
// @access  Public
router.get('/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.status(200).json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Google auth URL',
    });
  }
});

// @route   GET /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    // Get tokens from code
    const tokens = await getTokensFromCode(code);

    // Get user profile
    const profile = await getUserProfile(tokens);

    // Find or create user
    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.id,
        profilePicture: profile.picture,
        gmailConnected: true,
        gmailTokens: tokens,
      });
    } else {
      // Update existing user
      user.googleId = profile.id;
      user.gmailConnected = true;
      user.gmailTokens = tokens;
      if (profile.picture) user.profilePicture = profile.picture;
      await user.save();
    }

    // Generate JWT token and set cookie
    const token = createTokenAndSetCookie(user, res);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// @route   POST /api/auth/gmail/connect
// @desc    Connect Gmail account
// @access  Private
router.post('/gmail/connect', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
      });
    }

    // Get tokens from code
    const tokens = await getTokensFromCode(code);

    // Update user with Gmail tokens
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        gmailConnected: true,
        gmailTokens: tokens,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Gmail connected successfully',
      data: user,
    });
  } catch (error) {
    console.error('Gmail connect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Gmail',
    });
  }
});

// @route   POST /api/auth/gmail/disconnect
// @desc    Disconnect Gmail account
// @access  Private
router.post('/gmail/disconnect', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        gmailConnected: false,
        gmailTokens: {},
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Gmail disconnected successfully',
      data: user,
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
