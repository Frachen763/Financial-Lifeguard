import { extractMerchant } from '../utils/categorizer.js';

/**
 * Parse FamPay-specific email format
 * FamPay emails have format: "Hey [Name], You have successfully paid ₹[amount]"
 * Body/snippet contains: "to [MERCHANT NAME]"
 * Note: Merchant name is often in an embedded image, so we try multiple patterns
 */
const parseFamPayEmail = (subject, body, snippet) => {
  const fullText = `${subject} ${body} ${snippet}`;
  
  console.log('🔍 FamPay parsing - Subject:', subject);
  console.log('🔍 FamPay parsing - Body:', body.substring(0, 200));
  console.log('🔍 FamPay parsing - Snippet:', snippet);
  
  // Pattern 1: Extract from subject - "You have successfully paid ₹20.0"
  const subjectAmountMatch = subject.match(/successfully paid\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  
  // Pattern 2: Extract from body/snippet - "₹20.0"
  const bodyAmountMatch = fullText.match(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
  
  let amount = null;
  if (subjectAmountMatch) {
    amount = parseFloat(subjectAmountMatch[1].replace(/,/g, ''));
  } else if (bodyAmountMatch) {
    amount = parseFloat(bodyAmountMatch[1].replace(/,/g, ''));
  }
  
  // Extract merchant - Try multiple patterns
  let merchant = null;
  
  // Pattern 1: "to [MERCHANT NAME]" (all caps or title case)
  const merchantPattern1 = /to\s+([A-Z][A-Z\s&.-]+?)(?:\s*$|\s*\n|\s*\.|,|\s+on\s+)/i;
  const match1 = fullText.match(merchantPattern1);
  if (match1 && match1[1]) {
    merchant = match1[1].trim();
    console.log('✅ Merchant found (pattern 1):', merchant);
  }
  
  // Pattern 2: Look for capitalized words after "to" (more lenient)
  if (!merchant) {
    const merchantPattern2 = /to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/;
    const match2 = fullText.match(merchantPattern2);
    if (match2 && match2[1]) {
      merchant = match2[1].trim();
      console.log('✅ Merchant found (pattern 2):', merchant);
    }
  }
  
  // Pattern 3: Extract any capitalized name-like text (fallback)
  if (!merchant) {
    const merchantPattern3 = /([A-Z][a-z]+\s+[A-Z][a-z]+)/;
    const match3 = fullText.match(merchantPattern3);
    if (match3 && match3[1] && !match3[1].includes('Pritam') && !match3[1].includes('Darabdhara')) {
      merchant = match3[1].trim();
      console.log('✅ Merchant found (pattern 3):', merchant);
    }
  }
  
  // If still no merchant, try to extract from snippet more aggressively
  if (!merchant && snippet) {
    // Look for pattern: "paid [amount] to [name]"
    const snippetPattern = /paid.*?to\s+([A-Za-z\s]+?)(?:\s*$|\s*\.)/i;
    const snippetMatch = snippet.match(snippetPattern);
    if (snippetMatch && snippetMatch[1]) {
      merchant = snippetMatch[1].trim();
      console.log('✅ Merchant found (snippet):', merchant);
    }
  }
  
  if (!merchant) {
    merchant = 'FamPay Transaction';
    console.log('⚠️ Merchant not found, using default');
  }
  
  return { amount, merchant };
};

/**
 * Parse email payload to extract transaction details
 */
export const parseTransactionEmail = (email) => {
  try {
    const headers = email.payload.headers;
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    const date = new Date(parseInt(email.internalDate));

    // Get email body - check both text/plain and text/html
    let body = '';
    if (email.payload.body && email.payload.body.data) {
      body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
    } else if (email.payload.parts) {
      // Try text/plain first
      const textPart = email.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
      
      // If no text/plain, try text/html and strip tags
      if (!body) {
        const htmlPart = email.payload.parts.find(part => part.mimeType === 'text/html');
        if (htmlPart && htmlPart.body.data) {
          const htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
          // Simple HTML tag removal (basic, not perfect)
          body = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        }
      }
    }

    const fullText = `${subject} ${body} ${email.snippet}`;

    // Check if it's a transaction email
    if (!isTransactionEmail(subject, body, from)) {
      return null;
    }

    // Check if it's a FamPay email
    const isFamPay = from.toLowerCase().includes('famapp') || 
                     from.toLowerCase().includes('fampay') ||
                     subject.toLowerCase().includes('famapp');

    let amount, merchant;
    
    if (isFamPay) {
      // Use FamPay-specific parser
      console.log('🎯 Detected FamPay email');
      const famPayData = parseFamPayEmail(subject, body, email.snippet);
      amount = famPayData.amount;
      merchant = famPayData.merchant;
    } else {
      // Use generic parser
      amount = extractAmount(fullText);
      merchant = extractMerchant(fullText);
    }

    const transactionType = determineTransactionType(fullText);
    const paymentMethod = isFamPay ? 'FamPay Card' : extractPaymentMethod(fullText);

    // Validate extracted data
    if (!amount || amount <= 0) {
      return null;
    }

    console.log(`✅ Parsed transaction: ₹${amount} to ${merchant} via ${paymentMethod}`);

    return {
      emailId: email.id,
      amount,
      merchant,
      description: email.snippet,
      transactionDate: date,
      transactionType,
      paymentMethod,
      emailSubject: subject,
      emailSnippet: email.snippet,
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
};

/**
 * Check if email is a transaction notification
 */
const isTransactionEmail = (subject, body, from) => {
  const transactionKeywords = [
    'debited', 'credited', 'transaction', 'payment', 'spent', 'paid',
    'upi', 'purchase', 'order', 'invoice', 'receipt', 'withdrawn',
    'transferred', 'sent', 'received', 'charged'
  ];

  const text = `${subject} ${body} ${from}`.toLowerCase();

  // Check for transaction keywords
  const hasKeyword = transactionKeywords.some(keyword => text.includes(keyword));

  // Check if from known financial institutions
  const financialDomains = [
    'bank', 'paytm', 'phonepe', 'gpay', 'googlepay', 'amazonpay',
    'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'citi', 'hsbc',
    'visa', 'mastercard', 'rupay', 'famapp', 'fampay'
  ];

  const hasFinancialDomain = financialDomains.some(domain => 
    from.toLowerCase().includes(domain)
  );

  return hasKeyword || hasFinancialDomain;
};

/**
 * Extract amount from text
 */
const extractAmount = (text) => {
  // Patterns for Indian currency
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|rupees)/gi,
    /(?:amount|total|paid|debited|credited)[\s:]+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Get the first match
      const amountStr = matches[0][1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
};

/**
 * Determine transaction type (debit/credit)
 */
const determineTransactionType = (text) => {
  const lowerText = text.toLowerCase();

  // Check for credit (money received) first - these are income, not expenses
  const creditKeywords = [
    'credited to your account',
    'credited to a/c',
    'credited to account',
    'received from',
    'refund',
    'cashback',
    'salary credited',
    'amount credited'
  ];

  const isCredit = creditKeywords.some(keyword => lowerText.includes(keyword));
  
  if (isCredit) {
    return 'credit'; // Money received (income)
  }

  // Check for debit (money spent)
  const debitKeywords = [
    'debited from',
    'debited for',
    'amount debited',
    'spent',
    'paid to',
    'payment to',
    'withdrawn'
  ];

  const isDebit = debitKeywords.some(keyword => lowerText.includes(keyword));

  if (isDebit) {
    // Further classify debit type
    if (lowerText.includes('upi') || lowerText.includes('paytm') || 
        lowerText.includes('phonepe') || lowerText.includes('gpay')) {
      return 'upi';
    } else if (lowerText.includes('credit card') || lowerText.includes('cc')) {
      return 'card';
    } else if (lowerText.includes('debit card') || lowerText.includes('dc')) {
      return 'card';
    } else {
      return 'debit';
    }
  }

  // Check for transfer
  if (lowerText.includes('transfer')) {
    return 'bank_transfer';
  }

  // Default to debit for expenses (most transaction emails are about spending)
  return 'debit';
};

/**
 * Extract payment method
 */
const extractPaymentMethod = (text) => {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('upi') || lowerText.includes('paytm') || 
      lowerText.includes('phonepe') || lowerText.includes('gpay') ||
      lowerText.includes('google pay')) {
    return 'UPI';
  } else if (lowerText.includes('credit card') || lowerText.includes('cc')) {
    return 'Credit Card';
  } else if (lowerText.includes('debit card') || lowerText.includes('dc')) {
    return 'Debit Card';
  } else if (lowerText.includes('net banking') || lowerText.includes('netbanking')) {
    return 'Net Banking';
  }

  return 'Other';
};

/**
 * Parse multiple emails
 */
export const parseMultipleEmails = (emails) => {
  const transactions = [];

  for (const email of emails) {
    const transaction = parseTransactionEmail(email);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
};

export default {
  parseTransactionEmail,
  parseMultipleEmails,
};
