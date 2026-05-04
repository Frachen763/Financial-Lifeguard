import { fetchTransactionEmails } from './gmailService.js';
import { parseMultipleEmails } from './emailParser.js';
import { categorizeTransaction, analyzeMerchantTransactions } from '../utils/categorizer.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

/**
 * Automatic transaction sync service
 * This function handles the complete sync process including categorization
 */
export const autoSyncTransactions = async (userId) => {
  try {
    console.log('🔄 Starting automatic transaction sync for user:', userId);
    
    // Get user with Gmail tokens
    const user = await User.findById(userId);
    
    if (!user || !user.gmailConnected || !user.gmailTokens) {
      console.log('❌ Gmail not connected for user, skipping auto-sync');
      return {
        success: false,
        message: 'Gmail not connected',
        newTransactions: 0,
        updatedTransactions: 0
      };
    }

    console.log('✅ Gmail connected, checking tokens...');
    let tokens = user.gmailTokens;

    // Check if token needs refresh
    const gmailService = await import('./gmailService.js');
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Token expired, refreshing...');
      try {
        tokens = await gmailService.refreshAccessToken(tokens.refresh_token);
        user.gmailTokens = tokens;
        await user.save();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return {
          success: false,
          message: 'Gmail token expired. Please reconnect your Gmail account.',
          newTransactions: 0,
          updatedTransactions: 0
        };
      }
    }

    // Fetch emails since last sync
    console.log('📬 Fetching emails since last sync...');
    const emails = await fetchTransactionEmails(tokens, user.lastEmailSync);
    console.log(`✅ Fetched ${emails.length} emails`);

    if (emails.length === 0) {
      console.log('ℹ️ No new emails to sync');
      return {
        success: true,
        message: 'No new transactions found',
        newTransactions: 0,
        updatedTransactions: 0
      };
    }

    // Parse emails
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
      return !invalidMerchants.some(invalid => merchantLower.includes(invalid));
    });

    console.log(`✅ Filtered to ${validTransactions.length} valid transactions`);

    if (validTransactions.length === 0) {
      console.log('ℹ️ No valid transactions to sync');
      return {
        success: true,
        message: 'No valid transactions found',
        newTransactions: 0,
        updatedTransactions: 0
      };
    }

    // Get user's categories for categorization
    const categories = await Category.find({
      $or: [{ userId: user._id }, { isDefault: true }],
    });

    // Process transactions
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
        // Categorize the transaction
        const basicCategory = categorizeTransaction(txn.merchant, categories);
        
        // Create new transaction with category
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
        // Update existing transaction
        existingTransaction.merchant = txn.merchant;
        existingTransaction.amount = txn.amount;
        existingTransaction.description = txn.description;
        existingTransaction.transactionType = txn.transactionType;
        existingTransaction.paymentMethod = txn.paymentMethod;
        existingTransaction.emailSubject = txn.emailSubject;
        existingTransaction.emailSnippet = txn.emailSnippet;
        
        await existingTransaction.save();
        processedTransactions.push(existingTransaction);
        updatedTransactionsCount++;
        console.log(`🔄 Updated: ₹${txn.amount} to ${txn.merchant}`);
      }
    }

    // Post-insert: Analyze new transactions for category suggestions
    if (newTransactionsCount > 0) {
      console.log(`🔍 Analyzing ${newTransactionsCount} new transactions for suggestions...`);
      
      for (const newTxn of processedTransactions.slice(-newTransactionsCount)) {
        // Only analyze if categorized as Miscellaneous
        const populatedTxn = await Transaction.findById(newTxn._id).populate('category', 'name');
        
        if (populatedTxn.category.name === 'Miscellaneous') {
          console.log(`🔍 Analyzing merchant: ${populatedTxn.merchant}`);
          const analysis = await analyzeMerchantTransactions(populatedTxn.merchant, user._id, categories, newTxn._id);
          
          if (analysis.hasSuggestion && analysis.totalTransactions >= 3) {
            if (analysis.autoCategorize) {
              // Auto-categorize this transaction
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
              // Add suggestion for manual review
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
          }
        }
      }
    }

    // Update last sync date
    user.lastEmailSync = new Date();
    await user.save();

    console.log(`✅ Auto-sync completed: ${newTransactionsCount} new, ${updatedTransactionsCount} updated`);
    
    return {
      success: true,
      message: `Successfully synced: ${newTransactionsCount} new, ${updatedTransactionsCount} updated`,
      newTransactions: newTransactionsCount,
      updatedTransactions: updatedTransactionsCount,
      totalProcessed: processedTransactions.length
    };

  } catch (error) {
    console.error('❌ Auto-sync error:', error);
    return {
      success: false,
      message: error.message || 'Auto-sync failed',
      newTransactions: 0,
      updatedTransactions: 0
    };
  }
};
