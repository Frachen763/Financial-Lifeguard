import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get deleted transactions (soft deleted or archived)
router.get('/deleted', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // For now, we'll simulate deleted transactions
    // In a real implementation, you'd have a deletedAt field or separate collection
    const deletedTransactions = [
      {
        _id: 'deleted_1',
        amount: 772.53,
        merchant: 'Unknown Merchant',
 originalMerchant: 'Helvetica Neue',
        date: new Date('2026-04-25T13:22:26'),
        reason: 'Invalid merchant name (font detected)',
        deletedAt: new Date('2026-04-26T20:00:00'),
        accountNumber: null,
        bankName: null
      },
      {
        _id: 'deleted_2',
        amount: 874.7,
        merchant: 'Helvetica Neue',
        originalMerchant: 'Helvetica Neue',
        date: new Date('2026-03-14T14:15:16'),
        reason: 'Invalid merchant name (font detected)',
        deletedAt: new Date('2026-04-26T20:00:00'),
        accountNumber: null,
        bankName: null
      },
      {
        _id: 'deleted_3',
        amount: 2,
        merchant: 'Get Hands',
        originalMerchant: 'Get Hands',
        date: new Date('2026-03-31T15:28:56'),
        reason: 'Myntra shipping notification (not a payment)',
        deletedAt: new Date('2026-04-26T20:00:00'),
        accountNumber: null,
        bankName: null
      },
      {
        _id: 'deleted_4',
        amount: 2999,
        merchant: 'Myntra',
        originalMerchant: 'Myntra',
        date: new Date('2026-04-06T08:53:54'),
        reason: 'Myntra delivery notification (not a payment)',
        deletedAt: new Date('2026-04-26T20:00:00'),
        accountNumber: null,
        bankName: null
      }
    ];

    res.json({
      success: true,
      data: deletedTransactions,
      count: deletedTransactions.length
    });
  } catch (error) {
    console.error('Error fetching deleted transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted transactions'
    });
  }
});

// Get auto-categorized transactions
router.get('/auto-categorized', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const autoCategorizedTransactions = await Transaction.find({
      userId: user._id,
      categoryId: { $exists: true, $ne: null },
      // Add a flag to identify auto-categorized transactions
      // For now, we'll use a heuristic - transactions with standard category names
      'category.name': { $in: [
        'Food & Dining', 'Groceries', 'Transportation', 'Shopping',
        'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education',
        'Personal Care', 'Travel', 'Taxes', 'Investments', 'Savings'
      ]}
    }).sort({ transactionDate: -1 }).limit(20);

    res.json({
      success: true,
      data: autoCategorizedTransactions,
      count: autoCategorizedTransactions.length
    });
  } catch (error) {
    console.error('Error fetching auto-categorized transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auto-categorized transactions'
    });
  }
});

// Get transactions with suggestions
router.get('/with-suggestions', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const transactionsWithSuggestions = await Transaction.find({
      userId: user._id,
      suggestion: { $exists: true, $ne: null }
    }).sort({ transactionDate: -1 }).limit(20);

    res.json({
      success: true,
      data: transactionsWithSuggestions,
      count: transactionsWithSuggestions.length
    });
  } catch (error) {
    console.error('Error fetching transactions with suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions with suggestions'
    });
  }
});

// Get transaction insights summary
router.get('/summary', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get total transactions
    const totalTransactions = await Transaction.countDocuments({ userId: user._id });
    
    // Get auto-categorized count
    const autoCategorizedCount = await Transaction.countDocuments({
      userId: user._id,
      categoryId: { $exists: true, $ne: null }
    });
    
    // Get transactions with suggestions
    const withSuggestionsCount = await Transaction.countDocuments({
      userId: user._id,
      suggestion: { $exists: true, $ne: null }
    });
    
    // Get uncategorized transactions
    const uncategorizedCount = await Transaction.countDocuments({
      userId: user._id,
      categoryId: { $exists: false }
    });

    res.json({
      success: true,
      data: {
        totalTransactions,
        autoCategorized: autoCategorizedCount,
        withSuggestions: withSuggestionsCount,
        uncategorized: uncategorizedCount,
        deleted: 4 // Simulated count
      }
    });
  } catch (error) {
    console.error('Error fetching insights summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights summary'
    });
  }
});

export default router;
