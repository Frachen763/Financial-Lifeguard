import express from 'express';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { fetchTransactionEmails, refreshAccessToken } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import { categorizeTransaction } from '../utils/categorizer.js';

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('📥 GET /transactions - User:', req.user._id);
    
    const {
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 50,
      sortBy = 'transactionDate',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (category) {
      query.category = category;
      console.log('🔍 Filtering by category:', category);
    }
    
    console.log('📊 Transaction query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      query.$or = [
        { merchant: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    console.log('⏳ Executing query...');
    const transactions = await Transaction.find(query)
      .populate('category', 'name icon color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    const total = await Transaction.countDocuments(query);
    
    console.log(`✅ Found ${transactions.length} transactions (total: ${total})`);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = { userId: req.user._id }; // Use _id instead of id

    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    console.log('📊 Stats Query:', JSON.stringify(matchQuery, null, 2));
    console.log('📅 Date Range:', { startDate, endDate });

    // Total spending (only debit transactions - expenses)
    const totalSpending = await Transaction.aggregate([
      { $match: { ...matchQuery, transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    console.log('💰 Total Spending Result:', totalSpending);

    // Category-wise spending (only debit transactions - expenses)
    const categorySpending = await Transaction.aggregate([
      { $match: { ...matchQuery, transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          category: '$categoryInfo.name',
          icon: '$categoryInfo.icon',
          color: '$categoryInfo.color',
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Monthly trend (last 6 months) - only expenses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id, // Use _id instead of id
          transactionDate: { $gte: sixMonthsAgo },
          transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top merchants - only expenses
    const topMerchants = await Transaction.aggregate([
      { $match: { ...matchQuery, transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] } } },
      {
        $group: {
          _id: '$merchant',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSpending: totalSpending[0]?.total || 0,
        categorySpending,
        monthlyTrend,
        topMerchants,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('category', 'name icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
    });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { category, merchant, notes, tags } = req.body;

    const updateData = {};
    if (category) updateData.category = category;
    if (merchant) updateData.merchant = merchant;
    if (notes !== undefined) updateData.notes = notes;
    if (tags) updateData.tags = tags;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
    });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
    });
  }
});

// @route   POST /api/transactions/sync
// @desc    Sync emails and create transactions
// @access  Private
router.post('/sync', protect, async (req, res) => {
  try {
    console.log('📧 Starting email sync for user:', req.user._id);
    const user = await User.findById(req.user._id);

    if (!user.gmailConnected || !user.gmailTokens) {
      console.log('❌ Gmail not connected for user');
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect your Gmail account first.',
      });
    }

    console.log('✅ Gmail connected, checking tokens...');
    let tokens = user.gmailTokens;

    // Check if token needs refresh
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Token expired, refreshing...');
      try {
        tokens = await refreshAccessToken(tokens.refresh_token);
        user.gmailTokens = tokens;
        await user.save();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return res.status(401).json({
          success: false,
          message: 'Gmail token expired. Please reconnect your Gmail account.',
        });
      }
    }

    // Fetch emails - fetch ALL emails, not just new ones
    console.log('📬 Fetching transaction emails from Gmail...');
    const emails = await fetchTransactionEmails(tokens, null); // null = fetch all emails (last 90 days)
    console.log(`✅ Fetched ${emails.length} emails`);

    if (emails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No transactions found in emails',
        data: { 
          newTransactions: 0,
          updatedTransactions: 0,
          restoredTransactions: 0
        },
      });
    }

    // Parse emails
    const parsedTransactions = parseMultipleEmails(emails);

    // Get user's categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });

    // Process transactions - create new, update existing, restore deleted
    let newTransactionsCount = 0;
    let updatedTransactionsCount = 0;
    let restoredTransactionsCount = 0;
    const processedTransactions = [];

    for (const txn of parsedTransactions) {
      // Check if transaction already exists (including deleted ones)
      const existingTransaction = await Transaction.findOne({
        userId: user._id,
        emailId: txn.emailId,
      });

      // Categorize transaction
      const matchedCategory = categorizeTransaction(txn.merchant, categories);

      if (!existingTransaction) {
        // Create new transaction
        const transaction = await Transaction.create({
          ...txn,
          userId: user._id,
          category: matchedCategory._id,
        });

        processedTransactions.push(transaction);
        newTransactionsCount++;
        console.log(`✅ Created new transaction: ${txn.merchant}`);
      } else {
        // Update existing transaction with new merchant extraction and category
        existingTransaction.merchant = txn.merchant;
        existingTransaction.amount = txn.amount;
        existingTransaction.description = txn.description;
        existingTransaction.transactionType = txn.transactionType;
        existingTransaction.paymentMethod = txn.paymentMethod;
        existingTransaction.category = matchedCategory._id;
        existingTransaction.emailSubject = txn.emailSubject;
        existingTransaction.emailSnippet = txn.emailSnippet;
        
        await existingTransaction.save();
        processedTransactions.push(existingTransaction);
        updatedTransactionsCount++;
        console.log(`🔄 Updated existing transaction: ${txn.merchant}`);
      }
    }

    // Update last sync date
    user.lastEmailSync = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: `Successfully synced: ${newTransactionsCount} new, ${updatedTransactionsCount} updated`,
      data: {
        newTransactions: newTransactionsCount,
        updatedTransactions: updatedTransactionsCount,
        totalProcessed: processedTransactions.length,
        transactions: processedTransactions,
      },
    });
  } catch (error) {
    console.error('Sync transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync transactions',
    });
  }
});

// @route   POST /api/transactions/manual
// @desc    Create manual transaction
// @access  Private
router.post('/manual', protect, async (req, res) => {
  try {
    const { amount, merchant, category, transactionDate, description, paymentMethod } = req.body;

    if (!amount || !merchant || !category) {
      return res.status(400).json({
        success: false,
        message: 'Amount, merchant, and category are required',
      });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      amount,
      merchant,
      category,
      transactionDate: transactionDate || new Date(),
      description,
      paymentMethod: paymentMethod || 'Other',
      isManual: true,
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('category', 'name icon color');

    res.status(201).json({
      success: true,
      data: populatedTransaction,
    });
  } catch (error) {
    console.error('Create manual transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
    });
  }
});

export default router;
