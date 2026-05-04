import dotenv from 'dotenv';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const addGoogleKeyword = async () => {
  try {
    console.log('➕ Adding "google" keyword to Bills & Utilities category...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Find Bills & Utilities category
    const billsCategory = await Category.findOne({ name: 'Bills & Utilities' });
    
    if (!billsCategory) {
      console.log('❌ Bills & Utilities category not found');
      return;
    }
    
    console.log(`\n📝 Current keywords for Bills & Utilities:`);
    console.log(`  ${billsCategory.keywords.join(', ')}`);
    
    // Add "google" keyword if not already present
    if (!billsCategory.keywords.includes('google')) {
      billsCategory.keywords.push('google');
      await billsCategory.save();
      
      console.log(`\n✅ Added "google" keyword to Bills & Utilities`);
      console.log(`📝 Updated keywords:`);
      console.log(`  ${billsCategory.keywords.join(', ')}`);
    } else {
      console.log(`\n⚠️ "google" keyword already exists in Bills & Utilities`);
    }
    
    // Test the categorization
    const { categorizeTransaction } = await import('../utils/categorizer.js');
    const categories = await Category.find({ isDefault: true });
    
    const testMerchant = 'Google India Digital Services Pvt Ltd';
    const category = categorizeTransaction(testMerchant, categories);
    
    console.log(`\n🧪 Test categorization after update:`);
    console.log(`  Merchant: ${testMerchant}`);
    console.log(`  Category: ${category.name} (${category.icon})`);
    
    if (category.name === 'Bills & Utilities') {
      console.log(`\n✅ SUCCESS! Future Google transactions will be auto-categorized as Bills & Utilities`);
    } else {
      console.log(`\n⚠️ Still categorizing as ${category.name}. Need to check keyword matching.`);
    }
    
    console.log('\n✅ Keyword update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

addGoogleKeyword();
