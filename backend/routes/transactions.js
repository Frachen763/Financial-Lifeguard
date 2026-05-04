import express from 'express';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import gmailService from '../services/gmailService.js';
import { categorizeTransaction, categorizeWithMerchantAnalysis, analyzeMerchantTransactions } from '../utils/categorizer.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('📥 GET /transactions - User:', req.user._id);
    
    const {
      category,
      accountNumber,
      merchant,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 100,
      sortBy = 'transactionDate',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (category) {
      query.category = category;
      console.log('🔍 Filtering by category:', category);
    }

    if (accountNumber) {
      query.accountNumber = accountNumber;
      console.log('🔍 Filtering by account:', accountNumber);
    }

    if (merchant) {
      query.merchant = { $regex: merchant, $options: 'i' };
      console.log('🔍 Filtering by merchant:', merchant);
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
      .populate('categorySuggestion.suggestedCategory', 'name icon color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

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

// @route   GET /api/transactions/accounts
// @desc    Get all unique accounts for the user
// @access  Private
router.get('/accounts', protect, async (req, res) => {
  try {
    console.log('📊 Getting accounts for user:', req.user._id);

    // Get unique account numbers with their details
    const accounts = await Transaction.aggregate([
      { $match: { userId: req.user._id, accountNumber: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$accountNumber',
          bankName: { $first: '$bankName' },
          accountName: { $first: '$accountName' },
          transactionCount: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['debit', 'upi', 'card', 'bank_transfer']] },
                '$amount',
                0
              ]
            }
          },
          lastTransaction: { $max: '$transactionDate' },
        },
      },
      { $sort: { lastTransaction: -1 } },
      {
        $project: {
          _id: 0,
          accountNumber: '$_id',
          bankName: 1,
          accountName: 1,
          transactionCount: 1,
          totalSpent: 1,
          lastTransaction: 1,
        },
      },
    ]);

    console.log(`✅ Found ${accounts.length} unique accounts`);

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
    });
  }
});

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate, accountNumber } = req.query;

    const matchQuery = { userId: req.user._id }; // Use _id instead of id

    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    // Filter by account number if provided
    if (accountNumber) {
      matchQuery.accountNumber = accountNumber;
      console.log('📊 Filtering stats by account:', accountNumber);
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

    // Build monthly trend match query with account filter
    const monthlyMatchQuery = {
      ...matchQuery,
      transactionDate: { $gte: sixMonthsAgo },
      transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] },
    };

    const monthlyTrend = await Transaction.aggregate([
      {
        $match: monthlyMatchQuery,
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

    // Daily trend (last 30 days) - only expenses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build daily trend match query with account filter
    const dailyMatchQuery = {
      ...matchQuery,
      transactionDate: { $gte: thirtyDaysAgo },
      transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] },
    };

    const dailyTrend = await Transaction.aggregate([
      {
        $match: dailyMatchQuery,
      },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
            day: { $dayOfMonth: '$transactionDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
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

    // Account-wise spending breakdown
    const accountSpending = await Transaction.aggregate([
      { 
        $match: { 
          ...matchQuery, 
          transactionType: { $in: ['debit', 'upi', 'card', 'bank_transfer'] },
          accountNumber: { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$accountNumber',
          bankName: { $first: '$bankName' },
          accountName: { $first: '$accountName' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          accountNumber: '$_id',
          bankName: 1,
          accountName: 1,
          total: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSpending: totalSpending[0]?.total || 0,
        categorySpending,
        monthlyTrend,
        dailyTrend,
        topMerchants,
        accountSpending,
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
    const { category, merchant, notes, tags, categorySuggestion } = req.body;

    const updateData = {};
    if (category) updateData.category = category;
    if (merchant) updateData.merchant = merchant;
    if (notes !== undefined) updateData.notes = notes;
    if (tags) updateData.tags = tags;
    if (categorySuggestion !== undefined) updateData.categorySuggestion = categorySuggestion;

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

    // If category was changed, recalculate suggestions for this merchant
    if (category && transaction.merchant) {
      console.log(`🔄 Category changed for ${transaction.merchant}, recalculating suggestions...`);
      
      try {
        // Import here to avoid circular dependencies
        const { analyzeMerchantTransactions } = await import('../utils/categorizer.js');
        const Category = (await import('../models/Category.js')).default;
        
        // Get categories
        const categories = await Category.find({
          $or: [{ userId: req.user._id }, { isDefault: true }],
        });
        
        // Set date range for analysis (March 1st to today)
        const marchFirst = new Date(new Date().getFullYear(), 2, 1);
        const today = new Date();
        
        // Analyze merchant for new suggestions
        const analysis = await analyzeMerchantTransactions(
          transaction.merchant, 
          req.user._id, 
          categories, 
          null,
          marchFirst.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
        
        console.log(`📊 Analysis result for ${transaction.merchant}:`, {
          hasSuggestion: analysis.hasSuggestion,
          totalTransactions: analysis.totalTransactions,
          confidence: analysis.confidence,
          suggestedCategory: analysis.suggestedCategory?.name
        });
        
        if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
          // Find all miscellaneous transactions for this merchant within date range
          const miscellaneousTransactions = await Transaction.find({
            userId: req.user._id,
            merchant: { $regex: new RegExp(transaction.merchant, 'i') },
            transactionDate: {
              $gte: marchFirst,
              $lte: today
            },
            category: '690a1e00fde4d7593e4550be'  // Miscellaneous category ID
          }).populate('category', 'name');
          
          console.log(`🎯 Found ${miscellaneousTransactions.length} miscellaneous transactions to update`);
          
          // Update suggestions for all miscellaneous transactions
          for (const miscTxn of miscellaneousTransactions) {
            await Transaction.findByIdAndUpdate(miscTxn._id, {
              categorySuggestion: {
                suggestedCategory: analysis.suggestedCategory,
                confidence: analysis.confidence,
                autoCategorize: analysis.autoCategorize,
                totalTransactions: analysis.totalTransactions,
                message: analysis.message
              }
            });
            console.log(`✅ Updated suggestion for transaction: ${miscTxn.transactionDate.toISOString().split('T')[0]}`);
          }
        } else {
          // Clear suggestions if no longer eligible
          await Transaction.updateMany(
            {
              userId: req.user._id,
              merchant: { $regex: new RegExp(transaction.merchant, 'i') },
              transactionDate: {
                $gte: marchFirst,
                $lte: today
              }
            },
            { $unset: { categorySuggestion: 1 } }
          );
          console.log(`🗑️ Cleared suggestions for ${transaction.merchant} (no longer eligible)`);
        }
      } catch (suggestionError) {
        console.error('❌ Error recalculating suggestions:', suggestionError);
        // Don't fail the whole update if suggestion recalculation fails
      }
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
  // Set timeout to prevent hanging
  const timeout = setTimeout(() => {
    console.log('⏰ Sync timeout reached, sending response...');
    res.status(200).json({
      success: true,
      message: 'Sync is processing in background. Transactions will appear shortly.',
      data: {
        newTransactions: 0,
        updatedTransactions: 0,
        totalProcessed: 0,
        transactions: [],
        backgroundProcessing: true
      },
    });
  }, 30000); // 30 second timeout

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
        tokens = await gmailService.refreshAccessToken(tokens.refresh_token);
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

      if (!existingTransaction) {
        // First do basic categorization
        const basicCategory = categorizeTransaction(txn.merchant, categories);
        
        // Create transaction with basic categorization first
        const transactionData = {
          ...txn,
          userId: user._id,
          category: basicCategory._id,
        };

        // Use bulk insert for better performance
        processedTransactions.push(transactionData);
        newTransactionsCount++;
        console.log(`✅ Prepared new transaction: ${txn.merchant} -> ${basicCategory.name}`);
      } else {
        // Update existing transaction with new merchant extraction
        existingTransaction.merchant = txn.merchant;
        existingTransaction.amount = txn.amount;
        existingTransaction.description = txn.description;
        existingTransaction.transactionType = txn.transactionType;
        existingTransaction.paymentMethod = txn.paymentMethod;
        existingTransaction.emailSubject = txn.emailSubject;
        existingTransaction.emailSnippet = txn.emailSnippet;
        
        // Update account information
        if (txn.accountNumber) existingTransaction.accountNumber = txn.accountNumber;
        if (txn.accountName) existingTransaction.accountName = txn.accountName;
        if (txn.bankName) existingTransaction.bankName = txn.bankName;
        
        await existingTransaction.save();
        processedTransactions.push(existingTransaction);
        updatedTransactionsCount++;
        console.log(`🔄 Updated existing transaction: ${txn.merchant}`);
      }
    }

    // Bulk insert new transactions for better performance
    let newTransactionDocs = [];
    let insertedTransactions = [];
    if (newTransactionsCount > 0) {
      newTransactionDocs = processedTransactions.filter(txn => typeof txn === 'object' && !txn._id);
      if (newTransactionDocs.length > 0) {
        console.log(`💾 Bulk inserting ${newTransactionDocs.length} new transactions...`);
        insertedTransactions = await Transaction.insertMany(newTransactionDocs, { ordered: false });
        
        // Replace the prepared data with actual documents
        let insertedIndex = 0;
        for (let i = 0; i < processedTransactions.length; i++) {
          if (typeof processedTransactions[i] === 'object' && !processedTransactions[i]._id) {
            processedTransactions[i] = insertedTransactions[insertedIndex];
            insertedIndex++;
          }
        }
        console.log(`✅ Bulk inserted ${insertedTransactions.length} transactions`);
      }
    }

    // Post-insert: Analyze new transactions for category suggestions
    if (insertedTransactions.length > 0) {
      console.log(`🔍 Analyzing ${insertedTransactions.length} new transactions for suggestions...`);
      
      for (const newTxn of insertedTransactions) {
        // Only analyze if categorized as Miscellaneous
        const populatedTxn = await Transaction.findById(newTxn._id).populate('category', 'name');
        console.log(`📝 Transaction: ${populatedTxn.merchant} -> Category: ${populatedTxn.category.name}`);
        
        if (populatedTxn.category.name === 'Miscellaneous') {
          console.log(`🔍 Analyzing merchant: ${populatedTxn.merchant}`);
          const analysis = await analyzeMerchantTransactions(populatedTxn.merchant, user._id, categories, newTxn._id);
          
          console.log(`📊 Analysis result for ${populatedTxn.merchant}:`, {
            hasSuggestion: analysis.hasSuggestion,
            totalTransactions: analysis.totalTransactions,
            confidence: analysis.confidence
          });
          
          if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
            if (analysis.autoCategorize) {
              // Rule 2: Auto-categorize this transaction
              await Transaction.findByIdAndUpdate(newTxn._id, {
                category: analysis.suggestedCategory._id,
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`🚀 AUTO-CATEGORIZED ${populatedTxn.merchant}: ${analysis.suggestedCategory.name} (${analysis.confidence}% confidence)`);
            } else {
              // Rule 1: Add suggestion for manual review
              await Transaction.findByIdAndUpdate(newTxn._id, {
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`💡 Added suggestion for ${populatedTxn.merchant}: ${analysis.suggestedCategory.name} (${analysis.confidence}% confidence)`);
            }
          } else {
            console.log(`❌ No suggestion added for ${populatedTxn.merchant} (hasSuggestion: ${analysis.hasSuggestion}, totalTransactions: ${analysis.totalTransactions})`);
          }
        } else {
          console.log(`⏭️ Skipping non-miscellaneous transaction: ${populatedTxn.merchant} (${populatedTxn.category.name})`);
        }
      }
    }

    // Update last sync date
    user.lastEmailSync = new Date();
    await user.save();

    // Clear timeout since we completed successfully
    clearTimeout(timeout);

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
    clearTimeout(timeout);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync transactions',
    });
  }
});

// @route   GET /api/transactions/suggestions/:merchant
// @desc    Get category suggestions for a merchant
// @access  Private
router.get('/suggestions/:merchant', protect, async (req, res) => {
  try {
    const { merchant } = req.params;
    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }],
    });

    const analysis = await analyzeMerchantTransactions(merchant, req.user._id, categories);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
    });
  }
});

// @route   PUT /api/transactions/:id/accept-suggestion
// @desc    Accept category suggestion for a transaction
// @access  Private
router.put('/:id/accept-suggestion', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (!transaction.categorySuggestion) {
      return res.status(400).json({
        success: false,
        message: 'No category suggestion available for this transaction',
      });
    }

    // Update transaction with suggested category
    transaction.category = transaction.categorySuggestion.suggestedCategory;
    transaction.categorySuggestion = null; // Clear suggestion after acceptance
    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('category', 'name icon color');

    res.status(200).json({
      success: true,
      data: populatedTransaction,
      message: 'Category suggestion accepted successfully',
    });
  } catch (error) {
    console.error('Accept suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept suggestion',
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
