import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';
import { defaultCategories } from '../utils/categorizer.js';

dotenv.config();

const initializeCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if default categories already exist
    const existingCategories = await Category.find({ isDefault: true });

    if (existingCategories.length > 0) {
      console.log('ℹ️  Default categories already exist');
      process.exit(0);
    }

    // Insert default categories
    await Category.insertMany(defaultCategories);
    console.log('✅ Default categories initialized successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initializeCategories();
