import dotenv from 'dotenv';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';
import { categorizeTransaction, analyzeMerchantTransactions } from '../utils/categorizer.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const syncWithCategorization = async () => {
  try {
    console.log('🔄 Running sync with categorization for borgohain9435@gmail.com...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the borgohain9435 user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User borgohain9435@gmail.com not found');
      return;
    }
    
    console.log(`👤 Syncing for user: ${user.email}`);
    
    // Check Gmail tokens
    if (!user.gmailTokens) {
      console.log('❌ No Gmail tokens found');
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
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return;
      }
    }
    
    // Get user's categories (default + user-specific)
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });
    
    console.log(`📂 Found ${categories.length} categories`);
    
    // Fetch emails since last sync
    console.log('📬 Fetching emails since last sync...');
    const emails = await fetchTransactionEmails(tokens, user.lastEmailSync);
    console.log(`✅ Fetched ${emails.length} emails`);
    
    if (emails.length === 0) {
      console.log('ℹ️ No new emails to sync');
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
        console.log(`🚫 Filtering out invalid transaction: ₹${txn.amount} to ${txn.merchant}`);
      }
      
      return isValid;
    });
    
    console.log(`✅ Filtered to ${validTransactions.length} valid transactions`);
    
    if (validTransactions.length === 0) {
      console.log('ℹ️ No valid transactions to sync');
      return;
    }
    
    // Process transactions with categorization
    let newTransactionsCount = 0;
    let updatedTransactionsCount = 0;
    const processedTransactions = [];
    
    for (const txn of validTransactions) {
      // Check if transaction already exists
      const existingTransaction = await Transaction.findOne({
        userId: user._id,
        emailId: txn.emailId,
      });
      
      if (!existingTransaction) {
        // First do basic categorization
        const basicCategory = categorizeTransaction(txn.merchant, categories);
        
        // Create transaction with basic categorization first
        const transactionData = {
          ...txn,
          userId: user._id,
          category: basicCategory._id,
        };

        const newTransaction = await Transaction.create(transactionData);
        processedTransactions.push(newTransaction);
        newTransactionsCount++;
        console.log(`✅ Added: ₹${txn.amount} to ${txn.merchant} -> ${basicCategory.name}`);
      } else {
        // Update existing transaction with new merchant extraction
        existingTransaction.merchant = txn.merchant;
        existingTransaction.amount = txn.amount;
        existingTransaction.description = txn.description;
        existingTransaction.transactionType = txn.transactionType;
        existingTransaction.paymentMethod = txn.paymentMethod;
        existingTransaction.emailSubject = txn.emailSubject;
        existingTransaction.emailSnippet = txn.emailSnippet;
        
        // Update account information
        if (txn.accountNumber) existingTransaction.accountNumber = txn.accountNumber;
        if (txn.accountName) existingTransaction.accountName = txn.accountName;
        if (txn.bankName) existingTransaction.bankName = txn.bankName;
        
        await existingTransaction.save();
        processedTransactions.push(existingTransaction);
        updatedTransactionsCount++;
        console.log(`🔄 Updated: ₹${txn.amount} to ${txn.merchant}`);
      }
    }
    
    // Post-insert: Analyze new transactions for category suggestions
    if (newTransactionsCount > 0) {
      console.log(`\n🔍 Analyzing ${newTransactionsCount} new transactions for suggestions...`);
      
      const newTransactionDocs = processedTransactions.filter(txn => typeof txn === 'object' && txn._id);
      
      for (const newTxn of newTransactionDocs) {
        // Only analyze if categorized as Miscellaneous
        const populatedTxn = await Transaction.findById(newTxn._id).populate('category', 'name');
        console.log(`📝 Transaction: ${populatedTxn.merchant} -> Category: ${populatedTxn.category.name}`);
        
        if (populatedTxn.category.name === 'Miscellaneous') {
          console.log(`🔍 Analyzing merchant: ${populatedTxn.merchant}`);
          const analysis = await analyzeMerchantTransactions(populatedTxn.merchant, user._id, categories, newTxn._id);
          
          console.log(`📊 Analysis result for ${populatedTxn.merchant}:`, {
            hasSuggestion: analysis.hasSuggestion,
            totalTransactions: analysis.totalTransactions,
            confidence: analysis.confidence
          });
          
          if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
            if (analysis.autoCategorize) {
              // Rule 2: Auto-categorize this transaction
              await Transaction.findByIdAndUpdate(newTxn._id, {
                category: analysis.suggestedCategory._id,
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`🚀 AUTO-CATEGORIZED ${populatedTxn.merchant}: ${analysis.suggestedCategory.name} (${analysis.confidence}% confidence)`);
            } else {
              // Rule 1: Add suggestion for manual review
              await Transaction.findByIdAndUpdate(newTxn._id, {
                categorySuggestion: {
                  suggestedCategory: analysis.suggestedCategory,
                  confidence: analysis.confidence,
                  autoCategorize: analysis.autoCategorize,
                  totalTransactions: analysis.totalTransactions,
                  message: analysis.message
                }
              });
              console.log(`💡 Added suggestion for ${populatedTxn.merchant}: ${analysis.suggestedCategory.name} (${analysis.confidence}% confidence)`);
            }
          } else {
            console.log(`❌ No suggestion added for ${populatedTxn.merchant} (hasSuggestion: ${analysis.hasSuggestion}, totalTransactions: ${analysis.totalTransactions})`);
          }
        } else {
          console.log(`⏭️ Skipping non-miscellaneous transaction: ${populatedTxn.merchant} (${populatedTxn.category.name})`);
        }
      }
    }
    
    // Update last sync date
    user.lastEmailSync = new Date();
    await user.save();
    
    console.log('\n📊 Sync Summary:');
    console.log(`  New transactions: ${newTransactionsCount}`);
    console.log(`  Updated transactions: ${updatedTransactionsCount}`);
    console.log(`  Total processed: ${processedTransactions.length}`);
    
    // Show recent transactions with categories
    console.log('\n📊 Recent transactions after sync:');
    const recentTxns = await Transaction.find({ userId: user._id })
      .sort({ transactionDate: -1 })
      .limit(10)
      .populate('category', 'name icon color');
    
    recentTxns.forEach((txn, index) => {
      const categoryName = txn.category ? txn.category.name : 'No Category';
      const hasSuggestion = txn.categorySuggestion ? ' (💡)' : '';
      console.log(`  ${index + 1}. ${txn.transactionDate.toISOString().split('T')[0]} - ₹${txn.amount} to ${txn.merchant} -> ${categoryName}${hasSuggestion}`);
    });
    
    console.log('\n✅ Sync with categorization completed successfully!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

syncWithCategorization();
