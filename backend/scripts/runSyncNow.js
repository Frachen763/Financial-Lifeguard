import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const runSyncNow = async () => {
  try {
    console.log('🔄 Running full sync now...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const Category = (await import('../models/Category.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Import services
    const { fetchTransactionEmails } = await import('../services/gmailService.js');
    const { parseMultipleEmails } = await import('../services/emailParser.js');
    const { categorizeTransaction, analyzeMerchantTransactions } = await import('../utils/categorizer.js');
    
    console.log(`👤 Syncing for user: ${user.email}`);
    
    // Check Gmail tokens
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens');
      return;
    }
    
    let tokens = user.gmailTokens;
    
    // Check if token needs refresh
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Token expired, refreshing...');
      try {
        const { refreshAccessToken } = await import('../services/gmailService.js');
        tokens = await refreshAccessToken(tokens.refresh_token);
        user.gmailTokens = tokens;
        await user.save();
        console.log('✅ Token refreshed');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return;
      }
    }
    
    // Get categories
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    // Fetch emails
    console.log('📬 Fetching emails...');
    const emails = await fetchTransactionEmails(tokens, user.lastEmailSync);
    console.log(`✅ Fetched ${emails.length} emails`);
    
    if (emails.length === 0) {
      console.log('ℹ️ No new emails');
      return;
    }
    
    // Parse emails
    console.log('🔍 Parsing emails...');
    const parsedTransactions = parseMultipleEmails(emails);
    console.log(`✅ Parsed ${parsedTransactions.length} transactions`);
    
    // Filter out invalid transactions
    const validTransactions = parsedTransactions.filter(txn => {
      const invalidMerchants = [
        'view message in html',
        'rs',
        'rs. lacs hello',
        'close to view message in html',
        'special loan card offer',
        'email software can'
      ];
      
      const merchantLower = txn.merchant.toLowerCase();
      const isValid = !invalidMerchants.some(invalid => 
        merchantLower.includes(invalid)
      );
      
      if (!isValid) {
        console.log(`🚫 Filtering out: ₹${txn.amount} to ${txn.merchant}`);
      }
      
      return isValid;
    });
    
    console.log(`✅ Valid transactions: ${validTransactions.length}`);
    
    // Process transactions
    let newTransactionsCount = 0;
    let updatedTransactionsCount = 0;
    
    for (const txn of validTransactions) {
      const existingTransaction = await Transaction.findOne({
        userId: user._id,
        emailId: txn.emailId,
      });
      
      if (!existingTransaction) {
        // Categorize
        const category = categorizeTransaction(txn.merchant, categories);
        
        const newTransaction = await Transaction.create({
          ...txn,
          userId: user._id,
          category: category._id,
        });
        
        newTransactionsCount++;
        console.log(`✅ Added: ₹${txn.amount} to ${txn.merchant} -> ${category.name}`);
        
        // Analyze for suggestions if Miscellaneous
        if (category.name === 'Miscellaneous') {
          const analysis = await analyzeMerchantTransactions(txn.merchant, user._id, categories, newTransaction._id);
          
          if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
            if (analysis.autoCategorize) {
              await Transaction.findByIdAndUpdate(newTransaction._id, {
                category: analysis.suggestedCategory._id,
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`  🚀 Auto-categorized as: ${analysis.suggestedCategory.name}`);
            }
          }
        }
      } else {
        updatedTransactionsCount++;
        console.log(`🔄 Exists: ₹${txn.amount} to ${txn.merchant}`);
      }
    }
    
    // Update last sync date
    user.lastEmailSync = new Date();
    await user.save();
    
    console.log('\n📊 Sync Summary:');
    console.log(`  New: ${newTransactionsCount}`);
    console.log(`  Updated: ${updatedTransactionsCount}`);
    console.log(`  Total processed: ${validTransactions.length}`);
    
    // Show latest transactions
    console.log('\n📊 Latest transactions:');
    const latestTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('category', 'name');
    
    latestTxns.forEach((txn, index) => {
      console.log(`  ${index + 1}. ${txn.transactionDate.toLocaleString()} - ₹${txn.amount} to ${txn.merchant} (${txn.category.name})`);
    });
    
    console.log('\n✅ Sync completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

runSyncNow();
