import express from 'express';
import { protect } from '../middleware/auth.js';
import { generateBudgetSuggestions } from '../utils/budgetCalculator.js';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/budget-suggestions/generate
// @desc    Generate budget suggestions based on user profile
// @access  Private
router.post('/generate', protect, async (req, res) => {
  try {
    console.log('🎯 Generating budget suggestions for user:', req.user._id);
    
    // Get user's financial profile from database
    const user = await User.findById(req.user._id);
    if (!user || !user.financialProfile) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your onboarding profile first to generate budget suggestions',
        error: 'FINANCIAL_PROFILE_REQUIRED'
      });
    }

    const { occupation, country, state, city, monthlyIncome } = user.financialProfile;
    
    console.log('👤 User profile:', {
      occupation,
      country,
      state,
      city,
      monthlyIncome
    });

    // Validate required fields
    if (!occupation || !monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile data: occupation and valid monthly income are required',
        error: 'INVALID_PROFILE_DATA'
      });
    }

    // Generate budget suggestions
    const budgetSuggestions = generateBudgetSuggestions({
      occupation,
      monthlyIncome,
      city
    });

    console.log('✅ Budget suggestions generated successfully');

    res.status(200).json({
      success: true,
      message: 'Budget suggestions generated successfully',
      data: budgetSuggestions
    });

  } catch (error) {
    console.error('❌ Error generating budget suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate budget suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/budget-suggestions/profile
// @desc    Get user's current financial profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || !user.financialProfile) {
      return res.status(404).json({
        success: false,
        message: 'No financial profile found',
        error: 'PROFILE_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        occupation: user.financialProfile.occupation,
        country: user.financialProfile.country,
        state: user.financialProfile.state,
        city: user.financialProfile.city,
        monthlyIncome: user.financialProfile.monthlyIncome
      }
    });

  } catch (error) {
    console.error('❌ Error fetching financial profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/budget-suggestions/validate
// @desc    Validate custom budget allocations
// @access  Private
router.post('/validate', protect, async (req, res) => {
  try {
    const { customBudgets, totalBudget } = req.body;
    
    if (!customBudgets || !totalBudget) {
      return res.status(400).json({
        success: false,
        message: 'Custom budgets and total budget are required',
        error: 'MISSING_REQUIRED_DATA'
      });
    }

    const validationResults = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // Check total budget constraint
    const customTotal = Object.values(customBudgets).reduce((sum, amount) => sum + amount, 0);
    if (customTotal > totalBudget) {
      validationResults.isValid = false;
      validationResults.errors.push('Total budget allocation exceeds available budget');
    }

    // Check individual category constraints
    const maxFoodDining = totalBudget * 0.15;
    if (customBudgets['Food & Dining'] > maxFoodDining) {
      validationResults.warnings.push('Food & Dining budget exceeds recommended 15% of total budget');
    }

    if (customBudgets['Groceries'] < customBudgets['Food & Dining']) {
      validationResults.warnings.push('Groceries budget should typically be greater than or equal to Food & Dining');
    }

    const maxShopping = totalBudget * 0.20;
    if (customBudgets['Shopping'] > maxShopping) {
      validationResults.warnings.push('Shopping budget exceeds recommended 20% of total budget');
    }

    const minCategoryBudget = totalBudget * 0.05;
    for (const [category, amount] of Object.entries(customBudgets)) {
      if (amount > 0 && amount < minCategoryBudget) {
        validationResults.warnings.push(`${category} budget is below recommended 5% minimum`);
      }
    }

    res.status(200).json({
      success: true,
      data: validationResults
    });

  } catch (error) {
    console.error('❌ Error validating custom budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate custom budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
