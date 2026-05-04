import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/onboarding/complete
// @desc    Complete user onboarding with financial profile
// @access  Private
router.post('/complete', 
  protect,
  [
    body('occupation')
      .isIn(['Student', 'Employee', 'Self-Employed'])
      .withMessage('Invalid occupation'),
    body('country')
      .notEmpty()
      .withMessage('Country is required'),
    body('state')
      .notEmpty()
      .withMessage('State is required'),
    body('city')
      .notEmpty()
      .withMessage('City is required'),
    body('monthlyIncome')
      .isNumeric()
      .withMessage('Monthly income must be a number')
      .isFloat({ min: 0 })
      .withMessage('Monthly income must be 0 or greater'),
  ],
  async (req, res) => {
    try {
      console.log('📝 Completing onboarding for user:', req.user._id);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { occupation, country, state, city, monthlyIncome } = req.body;

      // TESTING: Always replace onboarding data and keep onboardingCompleted false for testing
      const user = await User.findByIdAndUpdate(
        req.user._id,
        {
          onboardingCompleted: false, // Keep false for testing - always show survey
          financialProfile: {
            occupation,
            country,
            state,
            city,
            monthlyIncome,
          },
        },
        { new: true, runValidators: true }
      );

      console.log('🧪 TESTING MODE: Onboarding data updated for user:', user.email);
      console.log('   New financial profile:', user.financialProfile);
      console.log('   onboardingCompleted kept false for testing');
      
      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          onboardingCompleted: user.onboardingCompleted,
          financialProfile: user.financialProfile,
        },
      });
    } catch (error) {
      console.error('❌ Onboarding completion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete onboarding',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/onboarding/status
// @desc    Check if user has completed onboarding
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        onboardingCompleted: user.onboardingCompleted || false,
        financialProfile: user.financialProfile || null,
      },
    });
  } catch (error) {
    console.error('❌ Onboarding status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check onboarding status',
    });
  }
});

// @route   PUT /api/onboarding/update
// @desc    Update financial profile (for future use)
// @access  Private
router.put('/update', 
  protect,
  [
    body('occupation')
      .optional()
      .isIn(['Student', 'Employee', 'Self-Employed'])
      .withMessage('Invalid occupation'),
    body('country')
      .optional()
      .notEmpty()
      .withMessage('Country cannot be empty'),
    body('state')
      .optional()
      .notEmpty()
      .withMessage('State cannot be empty'),
    body('city')
      .optional()
      .notEmpty()
      .withMessage('City cannot be empty'),
    body('monthlyIncome')
      .optional()
      .isNumeric()
      .withMessage('Monthly income must be a number')
      .isFloat({ min: 0 })
      .withMessage('Monthly income must be 0 or greater'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const updateData = {};
      const allowedFields = ['occupation', 'country', 'state', 'city', 'monthlyIncome'];
      
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[`financialProfile.${key}`] = req.body[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Financial profile updated successfully',
        data: user.financialProfile,
      });
    } catch (error) {
      console.error('❌ Financial profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update financial profile',
      });
    }
  }
);

export default router;
