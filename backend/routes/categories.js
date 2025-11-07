import express from 'express';
import Category from '../models/Category.js';
import { protect } from '../middleware/auth.js';
import { defaultCategories } from '../utils/categorizer.js';

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories (default + user's custom)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }],
    }).sort({ isDefault: -1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user._id }, { isDefault: true }],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
    });
  }
});

// @route   POST /api/categories
// @desc    Create new category
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, icon, color, keywords } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check if category with same name exists for user
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      userId: req.user._id,
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
      });
    }

    const category = await Category.create({
      name,
      icon: icon || '📁',
      color: color || '#6366f1',
      keywords: keywords || [],
      userId: req.user._id,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, icon, color, keywords } = req.body;

    // Check if category belongs to user
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or you do not have permission to edit it',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (icon) updateData.icon = icon;
    if (color) updateData.color = color;
    if (keywords) updateData.keywords = keywords;

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedCategory,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
    });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDefault: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be deleted',
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
    });
  }
});

// @route   POST /api/categories/init-defaults
// @desc    Initialize default categories for user
// @access  Private
router.post('/init-defaults', protect, async (req, res) => {
  try {
    // Check if default categories already exist
    const existingDefaults = await Category.find({ isDefault: true });

    if (existingDefaults.length === 0) {
      // Create default categories
      await Category.insertMany(defaultCategories);
    }

    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }],
    });

    res.status(200).json({
      success: true,
      message: 'Default categories initialized',
      data: categories,
    });
  } catch (error) {
    console.error('Init defaults error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default categories',
    });
  }
});

export default router;
