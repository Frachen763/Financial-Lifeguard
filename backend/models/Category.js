import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  icon: {
    type: String,
    default: '📁',
  },
  color: {
    type: String,
    default: '#6366f1',
  },
  keywords: [{
    type: String,
    lowercase: true,
  }],
  isDefault: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // null for default categories
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for faster queries
categorySchema.index({ userId: 1 });
categorySchema.index({ isDefault: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
