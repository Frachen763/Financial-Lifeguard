import express from 'express';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/budget
// @desc    Get all budgets for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id })
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets',
    });
  }
});

// @route   GET /api/budget/summary
// @desc    Get budget summary with spending
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    // Get current period dates
    const now = new Date();
    let startDate, endDate;

    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }

    // Get active budgets for the period
    const budgets = await Budget.find({
      userId: req.user._id,
      period,
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).populate('category', 'name icon color');

    // Get spending for each budget category
    const budgetSummary = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await Transaction.aggregate([
          {
            $match: {
              userId: req.user._id,
              category: budget.category._id,
              transactionDate: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]);

        const spent = spending[0]?.total || 0;
        const percentage = (spent / budget.amount) * 100;
        const remaining = budget.amount - spent;

        return {
          budget: budget,
          spent,
          remaining,
          percentage: Math.round(percentage * 100) / 100,
          isOverBudget: spent > budget.amount,
          isNearLimit: percentage >= budget.alertThreshold,
          transactionCount: spending[0]?.count || 0,
        };
      })
    );

    // Calculate total budget and spending
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetSummary.reduce((sum, b) => sum + b.spent, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        budgets: budgetSummary,
        totals: {
          budget: totalBudget,
          spent: totalSpent,
          remaining: totalBudget - totalSpent,
          percentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 100) / 100 : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get budget summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget summary',
    });
  }
});

// @route   GET /api/budget/:id
// @desc    Get single budget
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('category', 'name icon color');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget',
    });
  }
});

// @route   POST /api/budget
// @desc    Create or update budget
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { category, amount, period = 'monthly', alertThreshold = 80 } = req.body;

    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Category and amount are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Calculate period dates
    const now = new Date();
    let startDate, endDate;

    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }

    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category,
      period,
      isActive: true,
    });

    let budget;

    if (existingBudget) {
      // Update existing budget
      existingBudget.amount = amount;
      existingBudget.alertThreshold = alertThreshold;
      existingBudget.startDate = startDate;
      existingBudget.endDate = endDate;
      budget = await existingBudget.save();
    } else {
      // Create new budget
      budget = await Budget.create({
        userId: req.user._id,
        category,
        amount,
        period,
        alertThreshold,
        startDate,
        endDate,
      });
    }

    const populatedBudget = await Budget.findById(budget._id)
      .populate('category', 'name icon color');

    res.status(201).json({
      success: true,
      data: populatedBudget,
    });
  } catch (error) {
    console.error('Create/update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update budget',
    });
  }
});

// @route   PUT /api/budget/:id
// @desc    Update budget
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { amount, alertThreshold, isActive } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (isActive !== undefined) updateData.isActive = isActive;

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name icon color');

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
    });
  }
});

// @route   DELETE /api/budget/:id
// @desc    Delete budget
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget',
    });
  }
});

export default router;
