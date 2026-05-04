import dotenv from 'dotenv';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { categorizeTransaction, analyzeMerchantTransactions } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkKitchenHillside = async () => {
  try {
    console.log('🔍 Checking Kitchen Hillside categorization...');
    
    // Connect to database
    await connectDB();
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    const merchantName = 'Kitchen Hillside';
    console.log(`\n📊 Analyzing merchant: ${merchantName}`);
    
    // 1. Check Food & Dining keywords
    const foodCategory = categories.find(cat => cat.name === 'Food & Dining');
    console.log('\n1️⃣ Food & Dining keywords:');
    console.log(`   ${foodCategory.keywords.join(', ')}`);
    console.log(`   Has "kitchen": ${foodCategory.keywords.some(k => k.toLowerCase().includes('kitchen'))}`);
    
    // 2. Test basic categorization
    const basicCategory = categorizeTransaction(merchantName, categories);
    console.log(`\n2️⃣ Basic categorization result: ${basicCategory.name} (${basicCategory.icon})`);
    
    // 3. Check all transactions for this merchant
    const merchantTransactions = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp(merchantName, 'i') },
    }).populate('category', 'name').sort({ transactionDate: -1 });
    
    console.log(`\n3️⃣ Transaction history: ${merchantTransactions.length} transactions`);
    
    merchantTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount}`);
      console.log(`       Category: ${txn.category?.name || 'No Category'}`);
      console.log(`       Email ID: ${txn.emailId || 'Manual entry'}`);
    });
    
    // 4. Count by category
    const categoryCounts = {};
    merchantTransactions.forEach(txn => {
      const catName = txn.category?.name || 'No Category';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    console.log('\n4️⃣ Category breakdown:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count}`);
    });
    
    // 5. Check if it should be Food & Dining based on keywords
    const merchantLower = merchantName.toLowerCase();
    const hasKitchenKeyword = foodCategory.keywords.some(keyword => 
      merchantLower.includes(keyword.toLowerCase())
    );
    
    console.log(`\n5️⃣ Keyword matching:`);
    console.log(`   Merchant name: "${merchantName}"`);
    console.log(`   Contains "kitchen": ${merchantLower.includes('kitchen')}`);
    console.log(`   Matches Food & Dining keywords: ${hasKitchenKeyword}`);
    
    if (hasKitchenKeyword && basicCategory.name !== 'Food & Dining') {
      console.log(`\n⚠️ ISSUE: Merchant has "kitchen" keyword but not categorized as Food & Dining!`);
      
      // Let's debug the categorization logic
      console.log('\n🔍 Debugging categorization logic:');
      for (const category of categories) {
        if (category.keywords && category.keywords.length > 0) {
          const hasMatch = category.keywords.some(keyword => 
            merchantLower.includes(keyword.toLowerCase())
          );
          if (hasMatch) {
            console.log(`   - Matches "${category.name}" keywords: ${category.keywords.filter(k => merchantLower.includes(k.toLowerCase())).join(', ')}`);
          }
        }
      }
    }
    
    // 6. Update the transaction if it's wrongly categorized
    if (hasKitchenKeyword && basicCategory.name !== 'Food & Dining') {
      console.log(`\n🔧 Updating transactions to Food & Dining...`);
      
      let updatedCount = 0;
      for (const txn of merchantTransactions) {
        if (txn.category?.name !== 'Food & Dining') {
          await Transaction.findByIdAndUpdate(txn._id, {
            category: foodCategory._id
          });
          updatedCount++;
          console.log(`   ✅ Updated ${txn.transactionDate.toISOString().split('T')[0]} transaction to Food & Dining`);
        }
      }
      
      console.log(`\n✅ Updated ${updatedCount} transactions to Food & Dining`);
      
      // Test categorization again
      const newCategory = categorizeTransaction(merchantName, categories);
      console.log(`\n🧪 New categorization: ${newCategory.name} (${newCategory.icon})`);
    }
    
    // 7. Check if Rule 2 applies after update
    if (merchantTransactions.length >= 5) {
      console.log('\n7️⃣ Checking Rule 2 for auto-categorization...');
      
      // Re-fetch transactions after update
      const updatedTransactions = await Transaction.find({
        userId: user._id,
        merchant: { $regex: new RegExp(merchantName, 'i') },
      }).populate('category', 'name');
      
      const newCategoryCounts = {};
      updatedTransactions.forEach(txn => {
        const catName = txn.category?.name || 'No Category';
        newCategoryCounts[catName] = (newCategoryCounts[catName] || 0) + 1;
      });
      
      const totalTxns = updatedTransactions.length;
      const topCategory = Object.entries(newCategoryCounts).sort(([,a], [,b]) => b - a)[0];
      
      console.log(`   Total transactions: ${totalTxns}`);
      console.log(`   Top category: ${topCategory[0]} with ${topCategory[1]} transactions`);
      console.log(`   All in same category: ${topCategory[1] === totalTxns}`);
      console.log(`   Has 5+ transactions: ${totalTxns >= 5}`);
      console.log(`   Not Miscellaneous: ${topCategory[0] !== 'Miscellaneous'}`);
      
      if (totalTxns >= 5 && topCategory[1] === totalTxns && topCategory[0] !== 'Miscellaneous') {
        console.log(`\n✅ RULE 2 MET! Future transactions will be AUTO-CATEGORIZED as ${topCategory[0]}`);
      }
    }
    
    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkKitchenHillside();
