import express from 'express';
import { protect } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { analyzeMerchantTransactions } from '../utils/categorizer.js';

const router = express.Router();

// @route   POST /api/merchants/:merchantName/apply-rules
// @desc    Apply categorization rules to all transactions for a merchant after manual category change
// @access  Private
router.post('/:merchantName/apply-rules', protect, async (req, res) => {
  try {
    const { merchantName } = req.params;
    const userId = req.user._id;
    
    console.log(`🔄 Applying categorization rules for merchant: "${merchantName}"`);
    
    // Get user's categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Analyze the merchant's transactions
    const analysis = await analyzeMerchantTransactions(merchantName, userId, categories);
    
    if (!analysis.hasSuggestion) {
      return res.status(200).json({
        success: true,
        message: 'No categorization rules apply to this merchant',
        data: {
          rulesApplied: false,
          analysis
        }
      });
    }
    
    let updatedTransactions = [];
    let autoCategorizedCount = 0;
    let suggestionsAddedCount = 0;
    
    // Get all transactions for this merchant
    const allTransactions = await Transaction.find({
      userId,
      merchant: { $regex: new RegExp(merchantName, 'i') }
    }).populate('category', 'name');
    
    // Apply rules based on analysis
    for (const transaction of allTransactions) {
      const updateData = {};
      let shouldUpdate = false;
      
      // Rule 2: Auto-categorize if 100% consistency and 5+ transactions
      if (analysis.autoCategorize && analysis.totalTransactions >= 5) {
        if (transaction.category?.name !== analysis.suggestedCategory.name) {
          updateData.category = analysis.suggestedCategory._id;
          updateData.categorySuggestion = null; // Clear any existing suggestions
          shouldUpdate = true;
          autoCategorizedCount++;
        }
      }
      // Rule 1: Add suggestions for Miscellaneous transactions
      else if (transaction.category?.name === 'Miscellaneous' && 
               analysis.totalTransactions >= 3) {
        updateData.categorySuggestion = {
          suggestedCategory: analysis.suggestedCategory,
          confidence: analysis.confidence,
          autoCategorize: analysis.autoCategorize,
          totalTransactions: analysis.totalTransactions,
          message: analysis.message || `Suggested based on ${analysis.totalTransactions} previous transactions`
        };
        shouldUpdate = true;
        suggestionsAddedCount++;
      }
      
      if (shouldUpdate) {
        await Transaction.findByIdAndUpdate(transaction._id, updateData);
        updatedTransactions.push({
          _id: transaction._id,
          date: transaction.transactionDate,
          amount: transaction.amount,
          oldCategory: transaction.category?.name,
          newCategory: analysis.suggestedCategory.name,
          action: analysis.autoCategorize ? 'Auto-categorized' : 'Suggestion added'
        });
      }
    }
    
    console.log(`✅ Rules applied for "${merchantName}":`);
    console.log(`   Auto-categorized: ${autoCategorizedCount} transactions`);
    console.log(`   Suggestions added: ${suggestionsAddedCount} transactions`);
    console.log(`   Total updated: ${updatedTransactions.length} transactions`);
    
    res.status(200).json({
      success: true,
      message: `Categorization rules applied successfully`,
      data: {
        rulesApplied: true,
        analysis,
        updatedTransactions,
        autoCategorizedCount,
        suggestionsAddedCount,
        totalUpdated: updatedTransactions.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error applying merchant rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply categorization rules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/merchants/:merchantName/analysis
// @desc    Get current categorization analysis for a merchant
// @access  Private
router.get('/:merchantName/analysis', protect, async (req, res) => {
  try {
    const { merchantName } = req.params;
    const userId = req.user._id;
    
    // Get user's categories
    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });
    
    // Analyze the merchant's transactions
    const analysis = await analyzeMerchantTransactions(merchantName, userId, categories);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    console.error('❌ Error analyzing merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze merchant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/merchants/counts
// @desc    Get total transaction counts for all merchants
// @access  Private
router.get('/counts', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all transactions grouped by merchant (case-insensitive)
    const merchantCounts = await Transaction.aggregate([
      { $match: { userId } },
      { $group: { 
          _id: { $toLower: '$merchant' }, // Group by lowercase merchant name
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          latestDate: { $max: '$transactionDate' },
          originalNames: { $addToSet: '$merchant' }, // Keep track of original name variations
          firstSeenName: { $first: '$merchant' } // Use the first encountered name as display name
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Convert to object for easy lookup
    const countsObject = {};
    merchantCounts.forEach(merchant => {
      countsObject[merchant._id] = merchant.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        counts: countsObject,
        merchants: merchantCounts
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting merchant counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get merchant counts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
