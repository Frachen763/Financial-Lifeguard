import dotenv from 'dotenv';
import axios from 'axios';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const testMerchantRules = async (merchantName) => {
  try {
    console.log(`🧪 Testing merchant rules API for: "${merchantName}"`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get test user token (simulate login)
    const userEmail = 'borgohain9435@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 Testing with user: ${userEmail}`);
    
    // Get auth token (you'll need to provide actual password or use existing token)
    let token = 'test-token'; // Replace with actual token if needed
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: Get merchant analysis
    console.log('\n📊 Test 1: Getting merchant analysis...');
    try {
      const analysisResponse = await axios.get(`http://localhost:5000/api/merchants/${encodeURIComponent(merchantName)}/analysis`, {
        headers: authHeaders
      });
      
      console.log('✅ Analysis response:', analysisResponse.data.data);
    } catch (error) {
      console.log('❌ Analysis failed:', error.response?.data || error.message);
    }
    
    // Test 2: Apply merchant rules
    console.log('\n🔄 Test 2: Applying merchant rules...');
    try {
      const rulesResponse = await axios.post(`http://localhost:5000/api/merchants/${encodeURIComponent(merchantName)}/apply-rules`, {}, {
        headers: authHeaders
      });
      
      const { autoCategorizedCount, suggestionsAddedCount, totalUpdated, updatedTransactions } = rulesResponse.data.data;
      
      console.log('✅ Rules applied successfully:');
      console.log(`   Auto-categorized: ${autoCategorizedCount} transactions`);
      console.log(`   Suggestions added: ${suggestionsAddedCount} transactions`);
      console.log(`   Total updated: ${totalUpdated} transactions`);
      
      if (updatedTransactions && updatedTransactions.length > 0) {
        console.log('\n📋 Updated transactions:');
        updatedTransactions.slice(0, 5).forEach((txn, index) => {
          console.log(`   ${index + 1}. ${txn.date} - ₹${txn.amount}: ${txn.oldCategory} → ${txn.newCategory} (${txn.action})`);
        });
        
        if (updatedTransactions.length > 5) {
          console.log(`   ... and ${updatedTransactions.length - 5} more`);
        }
      }
      
    } catch (error) {
      console.log('❌ Rules application failed:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Merchant rules API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
};

// Get merchant name from command line argument
const merchantName = process.argv[2];
if (!merchantName) {
  console.log('❌ Please provide a merchant name as argument');
  console.log('Usage: node testMerchantRules.js "Merchant Name"');
  process.exit(1);
}

testMerchantRules(merchantName);
