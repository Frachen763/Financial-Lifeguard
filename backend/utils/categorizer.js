// Default category mappings with keywords
export const defaultCategories = [
  {
    name: 'Food & Dining',
    icon: '🍔',
    color: '#ef4444',
    keywords: ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'dominos', 'mcdonald', 'kfc', 'subway', 'starbucks', 'dunkin'],
    isDefault: true,
  },
  {
    name: 'Groceries',
    icon: '🛒',
    color: '#10b981',
    keywords: ['bigbasket', 'grofers', 'blinkit', 'zepto', 'dunzo', 'grocery', 'supermarket', 'dmart', 'reliance fresh', 'more', 'spencer'],
    isDefault: true,
  },
  {
    name: 'Transportation',
    icon: '🚗',
    color: '#f59e0b',
    keywords: ['uber', 'ola', 'rapido', 'metro', 'taxi', 'cab', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'transport'],
    isDefault: true,
  },
  {
    name: 'Shopping',
    icon: '🛍️',
    color: '#8b5cf6',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mall', 'store', 'retail', 'fashion', 'clothing', 'ekart', 'bluedart', 'blue dart', 'delhivery', 'dtdc', 'xpressbees', 'ecom express', 'fedex', 'dhl', 'ups', 'courier', 'delivery', 'shipping', 'logistics'],
    isDefault: true,
  },
  {
    name: 'Entertainment',
    icon: '🎬',
    color: '#ec4899',
    keywords: ['netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube', 'movie', 'cinema', 'pvr', 'inox', 'entertainment', 'gaming', 'steam'],
    isDefault: true,
  },
  {
    name: 'Bills & Utilities',
    icon: '💡',
    color: '#06b6d4',
    keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'mobile', 'recharge', 'bill', 'utility', 'airtel', 'jio', 'vodafone'],
    isDefault: true,
  },
  {
    name: 'Healthcare',
    icon: '🏥',
    color: '#14b8a6',
    keywords: ['pharmacy', 'hospital', 'doctor', 'medical', 'medicine', 'health', 'clinic', 'apollo', '1mg', 'pharmeasy', 'netmeds'],
    isDefault: true,
  },
  {
    name: 'Education',
    icon: '📚',
    color: '#3b82f6',
    keywords: ['course', 'udemy', 'coursera', 'school', 'college', 'university', 'education', 'training', 'books', 'tuition'],
    isDefault: true,
  },
  {
    name: 'Travel',
    icon: '✈️',
    color: '#f97316',
    keywords: ['flight', 'hotel', 'booking', 'makemytrip', 'goibibo', 'cleartrip', 'airbnb', 'oyo', 'travel', 'vacation', 'trip'],
    isDefault: true,
  },
  {
    name: 'Miscellaneous',
    icon: '📦',
    color: '#64748b',
    keywords: ['other', 'misc', 'miscellaneous'],
    isDefault: true,
  },
];

/**
 * Categorize transaction based on merchant name
 * @param {string} merchant - Merchant name from transaction
 * @param {Array} categories - Available categories with keywords
 * @returns {Object} - Matched category or default miscellaneous category
 */
export const categorizeTransaction = (merchant, categories) => {
  // If no merchant or merchant is "Unknown", return Miscellaneous
  if (!merchant || merchant.toLowerCase() === 'unknown' || merchant.toLowerCase().includes('unknown merchant')) {
    console.log('⚠️ No merchant or unknown merchant, categorizing as Miscellaneous');
    return categories.find(cat => cat.name === 'Miscellaneous') || categories[categories.length - 1];
  }

  const merchantLower = merchant.toLowerCase();

  // Find matching category based on keywords
  for (const category of categories) {
    if (category.keywords && category.keywords.length > 0) {
      const hasMatch = category.keywords.some(keyword => 
        merchantLower.includes(keyword.toLowerCase())
      );
      
      if (hasMatch) {
        return category;
      }
    }
  }

  // Return miscellaneous if no match found
  console.log(`⚠️ No category match for merchant "${merchant}", categorizing as Miscellaneous`);
  return categories.find(cat => cat.name === 'Miscellaneous') || categories[categories.length - 1];
};

/**
 * Analyze merchant transactions and provide category suggestions for miscellaneous transactions
 * @param {string} merchant - Merchant name to analyze
 * @param {string} userId - User ID to fetch user-specific transactions
 * @param {Array} categories - Available categories
 * @param {string} excludeTransactionId - Optional transaction ID to exclude from analysis
 * @returns {Object} - Analysis result with suggestion, confidence, and autoCategorization flag
 */
export const analyzeMerchantTransactions = async (merchant, userId, categories, excludeTransactionId = null, startDate = null, endDate = null) => {
  try {
    // Import here to avoid circular dependencies
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Build query to find transactions for this merchant
    const query = {
      userId,
      merchant: { $regex: new RegExp(merchant, 'i') },
      isManual: { $ne: true } // Exclude manual transactions from pattern analysis
    };
    
    // Add date range filtering if provided
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }
    
    // Exclude specific transaction ID if provided (useful for new transaction analysis)
    if (excludeTransactionId) {
      query._id = { $ne: excludeTransactionId };
    }
    
    const merchantTransactions = await Transaction.find(query).populate('category', 'name');

    console.log(`🔍 Analyzing ${merchantTransactions.length} transactions for merchant: ${merchant}`);

    // If less than 3 previous transactions, no suggestion (as per requirement)
    if (merchantTransactions.length < 3) {
      console.log(`❌ No suggestion: ${merchant} has only ${merchantTransactions.length} transactions (need 3+)`);
      return {
        hasSuggestion: false,
        confidence: 0,
        suggestedCategory: null,
        autoCategorize: false,
        totalTransactions: merchantTransactions.length
      };
    }

    // Count transactions by category
    const categoryCounts = {};
    merchantTransactions.forEach(transaction => {
      const categoryName = transaction.category?.name || 'Miscellaneous';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    });

    const totalTransactions = merchantTransactions.length;
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({ category, count }));

    const topCategory = sortedCategories[0];
    const topCategoryCount = topCategory.count;
    const topCategoryName = topCategory.category;

    // Rule 2: 5+ transactions with ALL in same category = auto-categorize next transaction
    // This rule takes precedence over Rule 1
    if (totalTransactions >= 5 && topCategoryCount === totalTransactions && topCategoryName !== 'Miscellaneous') {
      const suggestedCategory = categories.find(cat => cat.name === topCategoryName);
      
      // Convert to plain object to avoid serialization issues
      const categoryObject = suggestedCategory ? {
        _id: suggestedCategory._id.toString(),
        name: suggestedCategory.name,
        icon: suggestedCategory.icon,
        color: suggestedCategory.color
      } : null;
      
      console.log(`🚀 AUTO-CATEGORIZE: ${topCategoryName} appears ${topCategoryCount}/${totalTransactions} times (100% consistency)`);
      
      return {
        hasSuggestion: true,
        confidence: 100,
        suggestedCategory: categoryObject,
        autoCategorize: true, // Auto-categorize next transaction
        totalTransactions,
        categoryBreakdown: sortedCategories,
        message: `Auto-categorizing as ${topCategoryName} based on ${totalTransactions} previous transactions (100% consistency)`
      };
    }

    // Rule 1: 3+ transactions with more than half in same category
    // BUT don't suggest "Miscellaneous" - that defeats the purpose!
    if (totalTransactions >= 3 && topCategoryCount > totalTransactions / 2 && topCategoryName !== 'Miscellaneous') {
      const confidence = Math.round((topCategoryCount / totalTransactions) * 100);
      const suggestedCategory = categories.find(cat => cat.name === topCategoryName);
      
      // Convert to plain object to avoid serialization issues
      const categoryObject = suggestedCategory ? {
        _id: suggestedCategory._id.toString(),
        name: suggestedCategory.name,
        icon: suggestedCategory.icon,
        color: suggestedCategory.color
      } : null;
      
      console.log(`✅ Suggestion found: ${topCategoryName} appears ${topCategoryCount}/${totalTransactions} times (${confidence}%)`);
      
      return {
        hasSuggestion: true,
        confidence: confidence,
        suggestedCategory: categoryObject,
        autoCategorize: false,
        totalTransactions,
        categoryBreakdown: sortedCategories
      };
    }

    // No strong pattern found
    return {
      hasSuggestion: false,
      confidence: 0,
      suggestedCategory: null,
      autoCategorize: false,
      totalTransactions,
      categoryBreakdown: sortedCategories
    };

  } catch (error) {
    console.error('❌ Error analyzing merchant transactions:', error);
    return {
      hasSuggestion: false,
      confidence: 0,
      suggestedCategory: null,
      autoCategorize: false,
      totalTransactions: 0,
      error: error.message
    };
  }
};

/**
 * Enhanced categorization with merchant analysis for miscellaneous transactions
 * @param {string} merchant - Merchant name
 * @param {string} userId - User ID
 * @param {Array} categories - Available categories
 * @returns {Object} - Category result with potential suggestion
 */
export const categorizeWithMerchantAnalysis = async (merchant, userId, categories) => {
  // First, do basic categorization
  const basicCategory = categorizeTransaction(merchant, categories);
  
  // If it's not miscellaneous, return basic result
  if (basicCategory.name !== 'Miscellaneous') {
    return {
      category: basicCategory,
      suggestion: null
    };
  }

  // If it's miscellaneous, analyze merchant history
  const analysis = await analyzeMerchantTransactions(merchant, userId, categories);
  
  return {
    category: basicCategory,
    suggestion: analysis.hasSuggestion ? {
      category: analysis.suggestedCategory,
      confidence: analysis.confidence,
      autoCategorize: analysis.autoCategorize,
      totalTransactions: analysis.totalTransactions,
      message: analysis.message
    } : null
  };
};

/**
 * Extract merchant name from transaction description
 * @param {string} text - Transaction text/description
 * @returns {string} - Extracted merchant name
 */
export const extractMerchant = (text) => {
  if (!text) return 'Unknown';

  const lowerText = text.toLowerCase();

  // Check if this is an account-to-account transfer (no merchant info)
  // Pattern: "to account *******" or "to account XXXXXXX"
  if (/to\s+account\s+[\*X]{4,}/i.test(text)) {
    console.log('⚠️ Account-to-account transfer detected, no merchant info');
    return 'Unknown';
  }

  // Pattern 1: Merchant name in CAPITALS after VPA
  // Example: "to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25"
  // Captures: "ZOMATO LIMITED"
  const vpaWithMerchantPattern = /(?:to|from)\s+(?:vpa\s+)?[\w.-]+@[\w]+\s+([A-Z][A-Z\s&.-]+?)(?:\s+on\s+\d{1,2}-\d{1,2}-\d{2,4}|\s+ref|\s+upi|$)/i;
  const vpaWithMerchantMatch = text.match(vpaWithMerchantPattern);
  if (vpaWithMerchantMatch && vpaWithMerchantMatch[1]) {
    const merchant = vpaWithMerchantMatch[1].trim();
    // Verify it's actually in capitals (at least 2 capital letters)
    if ((merchant.match(/[A-Z]/g) || []).length >= 2) {
      return cleanMerchantName(merchant);
    }
  }

  // Pattern 2: UPI VPA format - extract from VPA handle
  // Example: "zomato-order@ptybl" -> "Zomato Order"
  const vpaPattern = /(?:to|from|vpa)\s+([a-zA-Z0-9._-]+)@(?:paytm|ptybl|ybl|oksbi|okicici|okaxis|okhdfcbank|okbizaxis|ibl|axl)/i;
  const vpaMatch = text.match(vpaPattern);
  if (vpaMatch && vpaMatch[1]) {
    return cleanMerchantName(vpaMatch[1]);
  }

  // Pattern 2: Credit transactions - "credited to your account by xyz@bank 'Merchant Name'"
  if (lowerText.includes('credited')) {
    const creditPatterns = [
      /credited.*?by\s+[\w@.-]+\s+['""]([^'""]+)['"]/i,  // by xyz@bank "Merchant"
      /credited.*?by\s+[\w@.-]+\s+(.+?)(?:\s+on|\s+for|\s+via|\s+ref|\s+rs|\s+inr|$)/i,  // by xyz@bank Merchant
      /credited.*?from\s+([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+via|\s+ref|\s+rs|\s+inr|$)/i,  // from Merchant
      /received from\s+([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+via|\s+ref|\s+rs|\s+inr|$)/i,  // received from Merchant
      /credited.*?a\/c\s+(.+?)(?:\s+on|\s+ref|\s+rs|\s+inr|$)/i,  // credited to a/c Merchant
    ];

    for (const pattern of creditPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const merchant = match[1].trim();
        return cleanMerchantName(merchant);
      }
    }
  }

  // Pattern 3: Debit/UPI transactions - "debited for", "paid to", "sent to"
  const debitPatterns = [
    /(?:debited|paid|sent).*?(?:to|for)\s+([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+via|\s+ref|\s+rs|\s+inr|$)/i,
    /(?:to|at)\s+([A-Z][A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+via|\s+upi|\s+rs|\s+inr|$)/i,
    /merchant[:\s]+([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+ref|\s+rs|\s+inr|$)/i,
    /upi.*?(?:to|from)\s+([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+for|\s+via|\s+ref|\s+@|\s+rs|\s+inr|$)/i,
    /(?:vpa|id)[:\s]+([A-Za-z0-9\s&.-]+?)(?:@|\s+on|\s+ref|\s+rs|\s+inr|$)/i,
  ];

  for (const pattern of debitPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const merchant = match[1].trim();
      // Skip if it's just a date or transaction reference
      if (!/^\d{2}-\d{2}-\d{2}/.test(merchant) && !/^(on|your|upi|transaction|report|if|this)$/i.test(merchant)) {
        return cleanMerchantName(merchant);
      }
    }
  }

  // Pattern 4: Extract from quotes (common in bank SMS)
  const quoteMatch = text.match(/['""]([^'""]+)['"]/);
  if (quoteMatch && quoteMatch[1]) {
    return cleanMerchantName(quoteMatch[1]);
  }

  // Pattern 5: Look for person names in UPI (usually after VPA)
  const namePattern = /(?:@\w+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/;
  const nameMatch = text.match(namePattern);
  if (nameMatch && nameMatch[1]) {
    return cleanMerchantName(nameMatch[1]);
  }

  // Pattern 6: Fallback - extract meaningful capitalized words
  const words = text.split(/\s+/);
  const excludedWords = [
    'UPI', 'INR', 'VIA', 'REF', 'A/C', 'ACC', 'RS', 'ON', 'YOUR', 'TRANSACTION', 
    'REPORT', 'IF', 'THIS', 'MORE', 'DETAILS', 'ACCOUNT', 'BANK', 'HDFC', 'ICICI',
    'SBI', 'AXIS', 'KOTAK', 'CUSTOMER', 'DEAR', 'PLEASE', 'CALL', 'WARM', 'REGARDS',
    'HAS', 'BEEN', 'DEBITED', 'CREDITED', 'FROM', 'TO', 'THE', 'AND', 'FOR',
    // Add font names to excluded words
    'HELVETICA', 'ARIAL', 'TIMES', 'CALIBRI', 'VERDANA', 'GEORGIA', 'PALATINO',
    'GARAMOND', 'BOOKMAN', 'COMIC', 'TREBUCHET', 'IMPACT', 'LUCIDA', 'TAHOMA',
    'COURIER', 'OPTIMA', 'FUTURA', 'BASKERVILLE', 'ROCKWELL'
  ];
  
  const capitalizedWords = words.filter(word => 
    /^[A-Z]/.test(word) && 
    word.length > 2 && 
    !excludedWords.includes(word.toUpperCase()) &&
    !/^\d/.test(word) && // Not starting with number
    !/^[\*X]{2,}/.test(word) && // Not masked account numbers
    !/^(font|typeface|style|size|color|weight)$/i.test(word) // Not typography terms
  );
  
  if (capitalizedWords.length > 0) {
    // Take first 2-3 meaningful words
    const extracted = capitalizedWords.slice(0, Math.min(3, capitalizedWords.length)).join(' ');
    // Verify it's not just common phrases
    if (!/(more details|transaction reference|upi reference)/i.test(extracted)) {
      return extracted;
    }
  }

  console.log('⚠️ No merchant name found in text, returning Unknown');
  return 'Unknown';
};

/**
 * Clean merchant name by removing common prefixes/suffixes
 * @param {string} merchant - Raw merchant name
 * @returns {string} - Cleaned merchant name
 */
const cleanMerchantName = (merchant) => {
  if (!merchant) return 'Unknown';

  let cleaned = merchant.trim();

  // Filter out font names and typography terms
  const fontNames = [
    'helvetica', 'arial', 'times new roman', 'calibri', 'verdana', 'georgia', 
    'palatino', 'garamond', 'bookman', 'comic sans ms', 'trebuchet ms', 
    'arial black', 'impact', 'lucida console', 'tahoma', 'courier new',
    'optima', 'futura', 'baskerville', 'rockwell', 'courier'
  ];
  
  const lowerCleaned = cleaned.toLowerCase();
  for (const font of fontNames) {
    if (lowerCleaned.includes(font)) {
      console.log(`🚫 Filtering out font name: ${cleaned}`);
      return 'Unknown Merchant';
    }
  }

  // Remove common noise words and phrases
  cleaned = cleaned.replace(/\b(report|if|this|your|transaction|on)\b/gi, '');
  
  // Remove date patterns (05-11-25, 05/11/25, etc.)
  cleaned = cleaned.replace(/\b\d{2}[-/]\d{2}[-/]\d{2,4}\b/g, '');
  
  // Remove common bank/UPI identifiers
  cleaned = cleaned.replace(/[@][\w.-]+/gi, ''); // Remove @bank, @paytm, etc.
  cleaned = cleaned.replace(/^(upi|vpa|id|pt|ok)[:\s-]+/i, ''); // Remove UPI/VPA/ID/PT/OK prefixes
  cleaned = cleaned.replace(/\s+(upi|vpa|id)$/i, ''); // Remove UPI/VPA/ID suffixes
  
  // Remove bank codes (ptsbi, okicici, etc.)
  cleaned = cleaned.replace(/\b(pt|ok)(sbi|icici|hdfc|axis|kotak|bank)\b/gi, '');
  
  // Remove reference numbers and transaction IDs
  cleaned = cleaned.replace(/\s+ref[:\s#]*\d+/i, '');
  cleaned = cleaned.replace(/\s+\d{6,}$/, ''); // Remove trailing long numbers
  cleaned = cleaned.replace(/\b(ref|txn|trans|id)[:\s#]*\w+/gi, '');
  
  // Remove extra whitespace and punctuation
  cleaned = cleaned.replace(/[._-]+/g, ' '); // Replace dots, underscores, hyphens with space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove single letters or very short words
  cleaned = cleaned.split(' ')
    .filter(word => word.length > 1)
    .join(' ');

  // Capitalize first letter of each word
  cleaned = cleaned.split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // If nothing meaningful left, return Unknown
  if (!cleaned || cleaned.length < 2) {
    return 'Unknown Merchant';
  }

  return cleaned;
};
