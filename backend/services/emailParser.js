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

  // Filter out HTML/XML content that might be parsed as merchant names
  const htmlPatterns = [
    /html|xml|xhtml|doctype|w3c|dtd/i,
    /public|transitional|en|noindex|nofollow|noarchive/i,
    /<[^>]*>/i, // HTML tags
    /\/\/w3c/i, // W3C doctype
    /^["']|["']$/i, // Starting or ending with quotes
  ];

  for (const pattern of htmlPatterns) {
    if (pattern.test(fullText)) {
      console.log('🚫 HTML/XML content detected, using default merchant');
      return { amount: null, merchant: 'FamPay Transaction' };
    }
  }
  
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
 * Parse HDFC UPI transaction emails
 * These emails have generic subject "❗ You have done a UPI txn. Check details!"
 * but contain merchant info in the VPA within the email body
 */
const parseHDFCUPIEmail = (subject, body, snippet) => {
  const fullText = `${subject} ${body} ${snippet}`;
  
  console.log('🔍 HDFC UPI parsing - Subject:', subject);
  console.log('🔍 HDFC UPI parsing - Body snippet:', body.substring(0, 200));
  
  // Extract amount
  const amountPattern = /Rs\.?([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const amountMatch = fullText.match(amountPattern);
  let amount = null;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract merchant from VPA - Pattern 1: "to VPA courseravnm.rzpap@axisbank Coursera"
  const vpaMerchantPattern1 = /to\s+VPA\s+([a-zA-Z0-9._-]+)@[a-zA-Z0-9._-]+\s+([A-Z][A-Za-z\s&.-]+?)(?:\s+on\s+\d{1,2}-\d{1,2}-\d{2,4}|\s+Your|\s+If)/i;
  let match = fullText.match(vpaMerchantPattern1);
  if (match && match[2]) {
    const merchant = match[2].trim();
    
    // Extract account number
    const accountPattern = /account\s+(\d{3,4})/i;
    const accountMatch = fullText.match(accountPattern);
    const accountNumber = accountMatch ? accountMatch[1] : null;
    
    const validAccounts = ['0633', '5830'];
    if (!accountNumber || !validAccounts.includes(accountNumber)) {
      console.log(`🚫 HDFC UPI email has invalid account: ${accountNumber || 'NOT FOUND'}`);
      return null;
    }
    
    console.log(`✅ HDFC merchant found (VPA pattern 1): ${merchant}`);
    return { amount, merchant, accountNumber };
  }
  
  // Extract merchant from VPA - Pattern 2: "to VPA swiggystores@icici Swiggy"
  const vpaMerchantPattern2 = /to\s+VPA\s+([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)\s+([A-Z][A-Za-z\s&.-]+?)(?:\s+on\s+\d{1,2}-\d{1,2}-\d{2,4}|\s+Your|\s+If)/i;
  match = fullText.match(vpaMerchantPattern2);
  if (match && match[3]) {
    const merchant = match[3].trim();
    
    // Extract account number
    const accountPattern = /account\s+(\d{3,4})/i;
    const accountMatch = fullText.match(accountPattern);
    const accountNumber = accountMatch ? accountMatch[1] : null;
    
    const validAccounts = ['0633', '5830'];
    if (!accountNumber || !validAccounts.includes(accountNumber)) {
      console.log(`🚫 HDFC UPI email has invalid account: ${accountNumber || 'NOT FOUND'}`);
      return null;
    }
    
    console.log(`✅ HDFC merchant found (VPA pattern 2): ${merchant}`);
    return { amount, merchant, accountNumber };
  }
  
  // Extract merchant from VPA - Pattern 3: Just get the VPA and convert to merchant name
  const vpaOnlyPattern = /to\s+VPA\s+([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)/i;
  match = fullText.match(vpaOnlyPattern);
  if (match && match[1]) {
    const vpa = match[1];
    // Convert VPA to merchant name
    let merchant = vpa
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
    
    // Clean up common VPA patterns
    merchant = merchant
      .replace(/Rzp Ap/g, 'Razorpay')
      .replace(/Rzpay/g, 'Razorpay')
      .replace(/Icici/g, 'ICICI')
      .replace(/Hdfc/g, 'HDFC')
      .replace(/Sbi/g, 'SBI')
      .replace(/Axis/g, 'Axis')
      .replace(/Jio Pay/g, 'JioPay')
      .replace(/Pay Tm/g, 'PayTM')
      .replace(/Phone Pe/g, 'PhonePe')
      .replace(/Google Pay/g, 'Google Pay')
      .replace(/Airtel Payments/g, 'Airtel')
      .replace(/Blinkit/g, 'Blinkit')
      .replace(/Swiggy Stores/g, 'Swiggy')
      .replace(/Zepto/g, 'Zepto')
      .replace(/Bigbasket/g, 'BigBasket')
      .replace(/Grofers/g, 'Grofers')
      .replace(/Myntra/g, 'Myntra')
      .replace(/Amazon/g, 'Amazon')
      .replace(/Flipkart/g, 'Flipkart')
      .replace(/Meesho/g, 'Meesho')
      .replace(/Ajio/g, 'Ajio');
    
    // If merchant is too generic, try to extract from the VPA domain
    if (merchant.length < 3 || /^(Rzp|Pay|Ok|Pt|Ib|Axl)/.test(merchant)) {
      if (match[2]) {
        const domain = match[2].toLowerCase();
        if (domain.includes('swiggy')) merchant = 'Swiggy';
        else if (domain.includes('blinkit')) merchant = 'Blinkit';
        else if (domain.includes('zepto')) merchant = 'Zepto';
        else if (domain.includes('bigbasket')) merchant = 'BigBasket';
        else if (domain.includes('grofers')) merchant = 'Grofers';
        else if (domain.includes('zomato')) merchant = 'Zomato';
        else if (domain.includes('paytm')) merchant = 'PayTM';
        else if (domain.includes('phonepe')) merchant = 'PhonePe';
        else if (domain.includes('gpay') || domain.includes('google')) merchant = 'Google Pay';
        else if (domain.includes('airtel')) merchant = 'Airtel';
        else if (domain.includes('jio')) merchant = 'Jio';
        else if (domain.includes('myntra')) merchant = 'Myntra';
        else if (domain.includes('amazon')) merchant = 'Amazon';
        else if (domain.includes('flipkart')) merchant = 'Flipkart';
        else if (domain.includes('meesho')) merchant = 'Meesho';
        else if (domain.includes('ajio')) merchant = 'Ajio';
        else if (domain.includes('coursera')) merchant = 'Coursera';
        else merchant = 'UPI Payment';
      } else {
        merchant = 'UPI Payment';
      }
    }
    
    console.log(`✅ HDFC merchant found (VPA conversion): ${merchant}`);
    
    // Validate bank account from the email body
    const accountPattern = /account\s+(\d{3,4})/i;
    const accountMatch = fullText.match(accountPattern);
    const accountNumber = accountMatch ? accountMatch[1] : null;
    
    const validAccounts = ['0633', '5830'];
    if (!accountNumber || !validAccounts.includes(accountNumber)) {
      console.log(`🚫 HDFC UPI email has invalid account: ${accountNumber || 'NOT FOUND'}`);
      return null;
    }
    
    return { amount, merchant, accountNumber };
  }
  
  console.log('⚠️ Could not extract merchant from HDFC UPI email');
  return null; // Don't create transaction without valid account
};

/**
 * Parse Myntra delivery emails
 * These emails have subjects like "Your Myntra order item is out for delivery"
 * but are just delivery notifications, not payment confirmations
 */
const parseMyntraEmail = (subject, body, snippet) => {
  const fullText = `${subject} ${body} ${snippet}`;
  
  console.log('🔍 Myntra parsing - Subject:', subject);
  console.log('🔍 Myntra parsing - Body snippet:', body.substring(0, 200));
  
  // Check if this is a delivery or shipping notification (not a payment)
  const isDeliveryOrShippingNotification = 
    subject.toLowerCase().includes('out for delivery') ||
    subject.toLowerCase().includes('delivered') ||
    subject.toLowerCase().includes('arriving today') ||
    subject.toLowerCase().includes('has been shipped') ||
    subject.toLowerCase().includes('shipping') ||
    fullText.toLowerCase().includes('delivery agent') ||
    fullText.toLowerCase().includes('order item is arriving') ||
    fullText.toLowerCase().includes('has been shipped') ||
    fullText.toLowerCase().includes('track your order');
  
  if (isDeliveryOrShippingNotification) {
    console.log('🚫 Myntra delivery/shipping notification detected - not a payment transaction');
    return null; // Don't create a transaction for delivery/shipping notifications
  }
  
  // Extract amount - look for "Total Payable ₹XXX" or "Payable ₹XXX"
  const amountPatterns = [
    /Total Payable ₹([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /Payable ₹([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /₹([0-9,]+(?:\.[0-9]{1,2})?)/i
  ];
  
  let amount = null;
  for (const pattern of amountPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // For actual payment emails, return "Myntra" as merchant
  const merchant = 'Myntra';
  
  console.log(`✅ Myntra payment identified: ${merchant}, Amount: ₹${amount}`);
  return { amount, merchant };
};

/**
 * Parse purchase confirmation emails (like Funded Friday)
 * These emails typically contain purchase details in HTML format
 */
const parsePurchaseConfirmationEmail = (subject, body, snippet, from) => {
  const fullText = `${subject} ${body} ${snippet}`;
  
  console.log('🔍 Purchase confirmation parsing - Subject:', subject);
  console.log('🔍 Purchase confirmation parsing - From:', from);
  
  // Extract merchant from sender name or subject
  let merchant = null;
  
  // Pattern 1: Extract from sender name (e.g., "Funded Friday <no-reply@fundedfriday.com>")
  const senderMatch = from.match(/^([^<]+)/);
  if (senderMatch) {
    merchant = senderMatch[1].trim();
    console.log('✅ Merchant found from sender:', merchant);
  }
  
  // Pattern 2: Extract from subject if sender doesn't work
  if (!merchant) {
    const subjectMerchantMatch = subject.match(/^([^:]+)/);
    if (subjectMerchantMatch) {
      merchant = subjectMerchantMatch[1].trim();
      console.log('✅ Merchant found from subject:', merchant);
    }
  }
  
  // Extract amount - look for price patterns
  let amount = null;
  
  // Pattern 1: Specific "Amount Paid:" pattern (found in Funded Friday emails)
  // Handle both plain text and HTML formats
  const amountPaidMatch = fullText.match(/amount\s+paid[\s:]*<\/?[^>]*>\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                           fullText.match(/amount\s+paid[\s:]+([0-9,]+(?:\.[0-9]{2})?)/i);
  if (amountPaidMatch) {
    amount = parseFloat(amountPaidMatch[1].replace(/,/g, ''));
    console.log('✅ Amount found from "Amount Paid" pattern:', amount);
  }
  
  // Pattern 2: Look for currency symbols followed by numbers
  if (!amount) {
    const amountPatterns = [
      /(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|rs\.?|inr|rupees)/gi,
      /(?:price|cost|amount|total)[\s:]+(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    ];
    
    for (const pattern of amountPatterns) {
      const matches = [...fullText.matchAll(pattern)];
      if (matches.length > 0) {
        const amountStr = matches[0][1].replace(/,/g, '');
        const parsedAmount = parseFloat(amountStr);
        
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amount = parsedAmount;
          console.log('✅ Amount found:', amount);
          break;
        }
      }
    }
  }
  
  // If no amount found, try to extract from common purchase confirmation patterns
  if (!amount) {
    // Look for patterns like "purchase of X for ₹Y"
    const purchaseAmountMatch = fullText.match(/purchase[^₹]*₹\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (purchaseAmountMatch) {
      amount = parseFloat(purchaseAmountMatch[1].replace(/,/g, ''));
      console.log('✅ Amount found from purchase pattern:', amount);
    }
  }
  
  // Default merchant if still not found
  if (!merchant) {
    merchant = 'Purchase Transaction';
    console.log('⚠️ Merchant not found, using default');
  }
  
  return { amount, merchant };
};

/**
 * Parse email payload to extract transaction details
 */
export const parseTransactionEmail = (email) => {
  try {
    if (!email.payload || !email.payload.headers) {
      console.log('⚠️ Email missing payload or headers');
      return null;
    }
    
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

    // Check if it's a purchase confirmation email
    const isPurchaseConfirmation = subject.toLowerCase().includes('purchase confirmation') ||
                                   from.toLowerCase().includes('confirmation') ||
                                   subject.toLowerCase().includes('challenge purchase') ||
                                   subject.toLowerCase().includes('order confirmation');
    
    // Check if it's an HDFC UPI transaction email
    const isHDFCUPI = (from.toLowerCase().includes('hdfc') || 
                       subject.toLowerCase().includes('hdfc bank')) &&
                      (subject.toLowerCase().includes('upi') || 
                       subject.toLowerCase().includes('transaction'));

    // Check if it's a Myntra email
    const isMyntra = from.toLowerCase().includes('myntra') && 
                     !subject.toLowerCase().includes('refund');

    let amount, merchant;
    let accountNumber = null;
    
    if (isFamPay) {
      // Use FamPay-specific parser
      console.log('🎯 Detected FamPay email');
      const famPayData = parseFamPayEmail(subject, body, email.snippet);
      amount = famPayData.amount;
      merchant = famPayData.merchant;
    } else if (isHDFCUPI) {
      // Use HDFC UPI-specific parser
      console.log('🎯 Detected HDFC UPI email');
      const hdfcData = parseHDFCUPIEmail(subject, body, email.snippet);
      if (!hdfcData) {
        console.log('🚫 HDFC UPI email does not have valid account, skipping');
        return null;
      }
      amount = hdfcData.amount;
      merchant = hdfcData.merchant;
      // Use account number from HDFC parser
      if (hdfcData.accountNumber) {
        accountNumber = hdfcData.accountNumber;
      }
    } else if (isMyntra) {
      // Use Myntra-specific parser
      console.log('🎯 Detected Myntra email');
      const myntraData = parseMyntraEmail(subject, body, email.snippet);
      if (!myntraData) {
        console.log('🚫 Myntra email is not a payment transaction, skipping');
        return null;
      }
      amount = myntraData.amount;
      merchant = myntraData.merchant;
    } else if (isPurchaseConfirmation) {
      // Use purchase confirmation parser
      console.log('🎯 Detected purchase confirmation email');
      const purchaseData = parsePurchaseConfirmationEmail(subject, body, email.snippet, from);
      amount = purchaseData.amount;
      merchant = purchaseData.merchant;
    } else {
      // Use generic parser - but filter out obvious HTML/XML content
      // Be less aggressive to avoid skipping legitimate transaction emails
      const htmlPatterns = [
        /^\s*<[^>]+>/i, // Starts with HTML tag
        /<!DOCTYPE[^>]*>/i, // DOCTYPE declaration
        /\/\/w3c\/\/dtd/i, // W3C doctype (the actual problematic pattern)
        /^["']\s*(?:html|xml|public|transitional)/i, // Starts with quotes and HTML keywords
      ];

      const isHtmlContent = htmlPatterns.some(pattern => pattern.test(fullText));
      if (isHtmlContent) {
        console.log('🚫 HTML/XML content detected in generic parser, skipping email');
        return null;
      }
      
      amount = extractAmount(fullText);
      merchant = extractMerchant(fullText);
    }

    const transactionType = determineTransactionType(fullText);
    const paymentMethod = isFamPay ? 'FamPay Card' : 
                         isPurchaseConfirmation ? 'Other' : 
                         extractPaymentMethod(fullText);
    
    // Extract account information
    accountNumber = accountNumber || extractAccountNumber(fullText);
    const bankName = extractBankName(from, fullText);

    // Validate extracted data
    if (!amount || amount <= 0) {
      return null;
    }
    
    // Validate bank account - must be one of the user's accounts
    const validAccounts = ['0633', '5830']; // User's valid bank accounts
    if (!accountNumber || !validAccounts.includes(accountNumber)) {
      console.log(`🚫 Invalid or missing bank account: ${accountNumber || 'NOT FOUND'}`);
      console.log(`   Expected accounts: ${validAccounts.join(', ')}`);
      console.log('   This is not a valid payment transaction for this user');
      return null;
    }

    console.log(`✅ Parsed transaction: ₹${amount} to ${merchant} via ${paymentMethod}${accountNumber ? ` (A/c: ${accountNumber})` : ''}${bankName ? ` [${bankName}]` : ''}`);

    return {
      emailId: email.id,
      amount,
      merchant,
      accountNumber,
      bankName,
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
    'transferred', 'sent', 'received', 'charged', 'rs', 'rs.', '₹',
    'amount', 'debit', 'credit', 'balance', 'account'
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

  // Also check if the email contains currency symbols or amounts
  const hasAmount = /(?:₹|rs\.?|inr)\s*[0-9,]+/i.test(text) || 
                    /[0-9,]+\s*(?:₹|rs\.?|inr|rupees)/i.test(text);

  return hasKeyword || hasFinancialDomain || hasAmount;
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
 * Extract account number (last 3-4 digits) from transaction email
 * Patterns:
 * - "A/c XX0633"
 * - "A/c No. XXXXX0633"
 * - "Account ending 5830"
 * - "A/c **0633"
 * - "Account No. XXXXXX5830"
 * - "Card ending 1234"
 */
const extractAccountNumber = (text) => {
  const patterns = [
    // Pattern 1: "from account 0633" or "to account 0633" (direct number)
    /(?:from|to)\s+account\s+(\d{3,4})(?:\s|$|\.)/i,
    
    // Pattern 2: A/c XX0633, A/c **0633
    /a\/c\s*(?:no\.?|number)?\s*[*xX]{2,}(\d{3,4})/i,
    
    // Pattern 3: Account ending 5830
    /account\s+ending\s+(?:in\s+)?(\d{3,4})/i,
    
    // Pattern 4: A/c No. XXXXX0633
    /a\/c\s*no\.?\s*[*xX]{4,}(\d{3,4})/i,
    
    // Pattern 5: Account No. XXXXXX5830
    /account\s+no\.?\s*[*xX]{4,}(\d{3,4})/i,
    
    // Pattern 6: Card ending 1234
    /card\s+ending\s+(?:in\s+)?(\d{3,4})/i,
    
    // Pattern 7: A/c 0633 (direct 4 digits after A/c)
    /a\/c\s+(\d{3,4})(?:\s|$|\.)/i,
    
    // Pattern 8: Account number with masked digits: XX-XXXX-0633
    /[*xX]{2}-[*xX]{4}-(\d{3,4})/i,
    
    // Pattern 9: Generic masked account: ****0633
    /\*{4,}(\d{3,4})(?:\s|$|\.)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const accountNumber = match[1];
      console.log(`✅ Account number extracted: ${accountNumber}`);
      return accountNumber;
    }
  }

  console.log('⚠️ No account number found in text');
  return null;
};

/**
 * Extract bank name from email sender or text
 */
const extractBankName = (from, text) => {
  const lowerFrom = from.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Common bank patterns
  const bankPatterns = [
    { pattern: /hdfc|hdfcbank/i, name: 'HDFC Bank' },
    { pattern: /icici|icicibank/i, name: 'ICICI Bank' },
    { pattern: /sbi|statebank/i, name: 'State Bank of India' },
    { pattern: /axis|axisbank/i, name: 'Axis Bank' },
    { pattern: /kotak|kotakbank/i, name: 'Kotak Mahindra Bank' },
    { pattern: /idfc|idfcbank/i, name: 'IDFC First Bank' },
    { pattern: /yes\s*bank|yesbank/i, name: 'Yes Bank' },
    { pattern: /indusind/i, name: 'IndusInd Bank' },
    { pattern: /paytm\s*payments\s*bank/i, name: 'Paytm Payments Bank' },
    { pattern: /citi|citibank/i, name: 'Citi Bank' },
    { pattern: /hsbc/i, name: 'HSBC Bank' },
    { pattern: /standard\s*chartered/i, name: 'Standard Chartered' },
    { pattern: /pnb|punjab\s*national/i, name: 'Punjab National Bank' },
    { pattern: /bob|bank\s*of\s*baroda/i, name: 'Bank of Baroda' },
    { pattern: /canara\s*bank/i, name: 'Canara Bank' },
    { pattern: /union\s*bank/i, name: 'Union Bank' },
    { pattern: /fampay|famapp/i, name: 'FamPay' },
  ];

  // Check from email address first
  for (const { pattern, name } of bankPatterns) {
    if (pattern.test(lowerFrom)) {
      console.log(`✅ Bank identified from sender: ${name}`);
      return name;
    }
  }

  // Check email text
  for (const { pattern, name } of bankPatterns) {
    if (pattern.test(lowerText)) {
      console.log(`✅ Bank identified from text: ${name}`);
      return name;
    }
  }

  console.log('⚠️ Bank name not identified');
  return null;
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

export { parseHDFCUPIEmail, parseMyntraEmail };

export default {
  parseTransactionEmail,
  parseMultipleEmails,
  parseHDFCUPIEmail,
  parseMyntraEmail,
};
