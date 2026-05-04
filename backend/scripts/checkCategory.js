import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

dotenv.config();

const checkCategory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-lifeguard');
    
    const userId = '690b64d5addf2dff604f9659';
    
    // Find Bills & Utilities category
    const billsCategory = await Category.findOne({ 
      name: 'Bills & Utilities',
      $or: [{ userId }, { isDefault: true }]
    });
    
    console.log('🔍 Bills & Utilities Category:');
    if (billsCategory) {
      console.log('   ID:', billsCategory._id);
      console.log('   Name:', billsCategory.name);
      console.log('   Icon:', billsCategory.icon);
      console.log('   Color:', billsCategory.color);
      console.log('   Is Default:', billsCategory.isDefault);
      console.log('   User ID:', billsCategory.userId);
    } else {
      console.log('   ❌ Bills & Utilities category not found!');
    }
    
    // List all categories
    const allCategories = await Category.find({
      $or: [{ userId }, { isDefault: true }]
    });
    
    console.log('\n📂 All Categories:');
    allCategories.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat._id})`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

checkCategory();
