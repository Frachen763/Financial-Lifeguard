import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const updateAllMoreDetails = async () => {
  try {
    console.log('🔄 Updating ALL "More Details" transactions...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const emailParser = await import('../services/emailParser.js');
    const parseHDFCUPIEmail = emailParser.default.parseHDFCUPIEmail || emailParser.parseHDFCUPIEmail;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    // Find ALL "More Details" transactions
    const moreDetailsTxns = await Transaction.find({
      userId: user._id,
      merchant: { $regex: new RegExp('More Details', 'i') },
    }).sort({ transactionDate: -1 });
    
    console.log(`\n📊 Found ${moreDetailsTxns.length} "More Details" transactions to update\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const txn of moreDetailsTxns) {
      console.log(`\n${'-'.repeat(60)}`);
      console.log(`Processing: ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      
      // Test the new parser
      const result = parseHDFCUPIEmail(
        txn.emailSubject || '',
        txn.emailBody || txn.description || '',
        txn.emailSnippet || ''
      );
      
      console.log(`   Current: ${txn.merchant}`);
      console.log(`   Parsed:  ${result.merchant}`);
      
      if (result.merchant !== 'UPI Payment' && result.merchant !== 'More Details' && result.merchant !== txn.merchant) {
        // Update the transaction
        await Transaction.findByIdAndUpdate(txn._id, {
          merchant: result.merchant
        });
        
        console.log(`   ✅ Updated to: ${result.merchant}`);
        updatedCount++;
      } else {
        console.log(`   ⚠️ No update needed`);
        skippedCount++;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 Update Summary:');
    console.log(`   Total transactions: ${moreDetailsTxns.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    
    // Show updated transactions
    if (updatedCount > 0) {
      console.log('\n📊 Updated transactions:');
      const updatedTxns = await Transaction.find({
        userId: user._id,
        merchant: { $ne: 'More Details' },
      }).sort({ transactionDate: -1 }).limit(10);
      
      updatedTxns.slice(0, 10).forEach((txn, index) => {
        console.log(`   ${index + 1}. ₹${txn.amount} to ${txn.merchant} on ${txn.transactionDate.toLocaleDateString()}`);
      });
    }
    
    console.log('\n✅ Update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

updateAllMoreDetails();
