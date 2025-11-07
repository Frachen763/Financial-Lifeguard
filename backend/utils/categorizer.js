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
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mall', 'store', 'retail', 'fashion', 'clothing'],
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
  if (!merchant) {
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
  return categories.find(cat => cat.name === 'Miscellaneous') || categories[categories.length - 1];
};

/**
 * Extract merchant name from transaction description
 * @param {string} text - Transaction text/description
 * @returns {string} - Extracted merchant name
 */
export const extractMerchant = (text) => {
  if (!text) return 'Unknown';

  const lowerText = text.toLowerCase();

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
  const capitalizedWords = words.filter(word => 
    /^[A-Z]/.test(word) && 
    word.length > 2 && 
    !['UPI', 'INR', 'VIA', 'REF', 'A/C', 'ACC', 'RS', 'ON', 'YOUR', 'TRANSACTION', 'REPORT', 'IF', 'THIS'].includes(word.toUpperCase()) &&
    !/^\d/.test(word) // Not starting with number
  );
  
  if (capitalizedWords.length > 0) {
    // Take first 2-3 meaningful words
    return capitalizedWords.slice(0, Math.min(3, capitalizedWords.length)).join(' ');
  }

  return 'Unknown Merchant';
};

/**
 * Clean merchant name by removing common prefixes/suffixes
 * @param {string} merchant - Raw merchant name
 * @returns {string} - Cleaned merchant name
 */
const cleanMerchantName = (merchant) => {
  if (!merchant) return 'Unknown';

  let cleaned = merchant.trim();

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
