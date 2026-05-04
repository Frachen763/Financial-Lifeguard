import dotenv from 'dotenv';
import Category from '../models/Category.js';
import { categorizeTransaction } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const addKitchenKeyword = async () => {
  try {
    console.log('➕ Adding "kitchen" keyword to Food & Dining category...');
    
    // Connect to database
    await connectDB();
    
    // Find Food & Dining category
    const foodCategory = await Category.findOne({ name: 'Food & Dining' });
    
    if (!foodCategory) {
      console.log('❌ Food & Dining category not found');
      return;
    }
    
    console.log(`\n📝 Current keywords for Food & Dining:`);
    console.log(`  ${foodCategory.keywords.join(', ')}`);
    
    // Add "kitchen" keyword if not already present
    if (!foodCategory.keywords.includes('kitchen')) {
      foodCategory.keywords.push('kitchen');
      await foodCategory.save();
      
      console.log(`\n✅ Added "kitchen" keyword to Food & Dining`);
      console.log(`📝 Updated keywords:`);
      console.log(`  ${foodCategory.keywords.join(', ')}`);
    } else {
      console.log(`\n⚠️ "kitchen" keyword already exists in Food & Dining`);
    }
    
    // Test the categorization
    const categories = await Category.find({ isDefault: true });
    const testMerchant = 'Kitchen Hillside';
    const category = categorizeTransaction(testMerchant, categories);
    
    console.log(`\n🧪 Test categorization after update:`);
    console.log(`  Merchant: ${testMerchant}`);
    console.log(`  Category: ${category.name} (${category.icon})`);
    
    if (category.name === 'Food & Dining') {
      console.log(`\n✅ SUCCESS! Kitchen Hillside will now be categorized as Food & Dining`);
      
      // Update existing transaction
      const User = (await import('../models/User.js')).default;
      const Transaction = (await import('../models/Transaction.js')).default;
      
      const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
      const existingTxn = await Transaction.findOne({
        userId: user._id,
        merchant: { $regex: new RegExp(testMerchant, 'i') },
      });
      
      if (existingTxn && existingTxn.category?.name !== 'Food & Dining') {
        await Transaction.findByIdAndUpdate(existingTxn._id, {
          category: foodCategory._id
        });
        console.log(`✅ Updated existing transaction to Food & Dining`);
      }
    } else {
      console.log(`\n⚠️ Still categorizing as ${category.name}`);
    }
    
    console.log('\n✅ Keyword update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

addKitchenKeyword();
