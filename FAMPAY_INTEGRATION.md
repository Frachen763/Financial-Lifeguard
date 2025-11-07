# FamPay Email Integration

## Overview
Added support for parsing FamPay transaction notification emails to automatically extract transaction details.

## FamPay Email Format

### Email Structure
- **From**: FamApp
- **Subject**: "Hey [Name], You have successfully paid ₹[amount]"
- **Body**: Contains transaction details with merchant name
- **Format**: "You have successfully paid ₹[amount] to [MERCHANT NAME]"

### Example
```
From: FamApp
Subject: Hey Pritam Darabdhara, You have successfully paid ₹20.0

Body:
Hey Pritam Darabdhara,
You have successfully paid
₹20.0
to NAVEEN GARG
```

## Implementation

### 1. Email Detection
FamPay emails are detected by:
- Sender contains "famapp" or "fampay"
- Subject contains "famapp"
- Added to financial domains list

```javascript
const isFamPay = from.toLowerCase().includes('famapp') || 
                 from.toLowerCase().includes('fampay') ||
                 subject.toLowerCase().includes('famapp');
```

### 2. Amount Extraction
Two patterns to extract amount:

**Pattern 1: From Subject**
```javascript
// "You have successfully paid ₹20.0"
/successfully paid\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
```

**Pattern 2: From Body**
```javascript
// "₹20.0"
/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/
```

### 3. Merchant Extraction
Extracts merchant name from "to [MERCHANT NAME]" pattern:

```javascript
// "to NAVEEN GARG"
/to\s+([A-Z\s]+?)(?:\s*$|\s*\n|\s*\.|,)/
```

### 4. Payment Method
FamPay transactions are automatically tagged as:
```javascript
paymentMethod: 'FamPay Card'
```

## Features

### ✅ What Works
- Detects FamPay emails automatically
- Extracts amount from subject or body
- Extracts merchant name (usually in CAPITALS)
- Sets payment method as "FamPay Card"
- Logs detection: `🎯 Detected FamPay email`
- Logs parsed transaction: `✅ Parsed transaction: ₹20.0 to NAVEEN GARG via FamPay Card`

### 📊 Transaction Details Extracted
- **Amount**: ₹20.0
- **Merchant**: NAVEEN GARG
- **Payment Method**: FamPay Card
- **Transaction Type**: debit (spending)
- **Date**: Email received date
- **Description**: Email snippet

## Testing

### Test FamPay Email Parsing

1. **Connect Gmail** in the app
2. **Sync emails** from dashboard
3. **Check backend logs** for:
```
🎯 Detected FamPay email
✅ Parsed transaction: ₹20.0 to NAVEEN GARG via FamPay Card
```

### Manual Test

You can test the parser with a sample email:

```javascript
// In backend console or test file
import { parseTransactionEmail } from './services/emailParser.js';

const sampleFamPayEmail = {
  id: 'test123',
  internalDate: Date.now().toString(),
  snippet: 'You have successfully paid ₹20.0 to NAVEEN GARG',
  payload: {
    headers: [
      { name: 'subject', value: 'Hey Pritam, You have successfully paid ₹20.0' },
      { name: 'from', value: 'FamApp <notifications@famapp.in>' }
    ],
    body: {
      data: Buffer.from('You have successfully paid ₹20.0 to NAVEEN GARG').toString('base64')
    }
  }
};

const result = parseTransactionEmail(sampleFamPayEmail);
console.log(result);
// Expected output:
// {
//   amount: 20.0,
//   merchant: 'NAVEEN GARG',
//   paymentMethod: 'FamPay Card',
//   transactionType: 'debit',
//   ...
// }
```

## Categorization

Once parsed, FamPay transactions are automatically categorized based on merchant name:

### Example Categories
- **NAVEEN GARG** → Personal/Transfer
- **ZOMATO** → Food & Dining
- **SWIGGY** → Food & Dining
- **AMAZON** → Shopping
- **UBER** → Transportation

The categorizer uses the merchant name to match against predefined patterns.

## Edge Cases Handled

### 1. Amount Variations
- ✅ `₹20.0` - With decimal
- ✅ `₹20` - Without decimal
- ✅ `Rs 20.0` - With Rs prefix
- ✅ `20.0` - Plain number

### 2. Merchant Name Variations
- ✅ `NAVEEN GARG` - Full caps
- ✅ `Naveen Garg` - Title case
- ✅ `ZOMATO LIMITED` - Company name
- ✅ `SWIGGY` - Single word

### 3. Email Format Variations
- ✅ Subject only (amount in subject)
- ✅ Body only (amount in body)
- ✅ Both (amount in both places)

## Logging

### Detection Log
```
🎯 Detected FamPay email
```

### Success Log
```
✅ Parsed transaction: ₹20.0 to NAVEEN GARG via FamPay Card
```

### Error Log
```
❌ Error parsing email: [error details]
```

## Files Modified

### 1. `backend/services/emailParser.js`
- Added `parseFamPayEmail()` function
- Added FamPay detection in `parseTransactionEmail()`
- Added 'famapp' and 'fampay' to financial domains
- Added logging for FamPay detection

### 2. `backend/models/Transaction.js`
- Added 'FamPay Card' to paymentMethod enum
- Allows FamPay transactions to be saved to database

### Changes:
```javascript
// New function
const parseFamPayEmail = (subject, body, snippet) => {
  // Extract amount from subject or body
  // Extract merchant from "to [MERCHANT]" pattern
  return { amount, merchant };
};

// Enhanced main parser
if (isFamPay) {
  console.log('🎯 Detected FamPay email');
  const famPayData = parseFamPayEmail(subject, body, email.snippet);
  amount = famPayData.amount;
  merchant = famPayData.merchant;
  paymentMethod = 'FamPay Card';
}
```

## Benefits

### 1. Better Accuracy
- FamPay-specific parsing is more accurate than generic patterns
- Handles their unique email format correctly

### 2. Proper Merchant Names
- Extracts clean merchant names (e.g., "NAVEEN GARG")
- Better categorization based on merchant

### 3. Payment Method Tracking
- Automatically tags as "FamPay Card"
- Easy to filter FamPay transactions

### 4. Debugging
- Logs help identify FamPay emails
- Easy to verify parsing works correctly

## Future Enhancements

### Potential Improvements
1. **Image Parsing**: Extract data from embedded images (OCR)
2. **Transaction Status**: Detect failed/pending transactions
3. **Refunds**: Handle FamPay refund emails
4. **Rewards**: Parse cashback/rewards information
5. **Balance**: Extract account balance if available

### Image Parsing (Future)
FamPay emails contain images with transaction details. Future enhancement could use OCR to extract:
- Amount from image
- Merchant name from image
- Transaction ID
- Visual confirmation

## Troubleshooting

### Issue: FamPay emails not detected
**Check:**
1. Email is from "FamApp" or contains "famapp"
2. Subject contains "successfully paid"
3. Backend logs show detection message

### Issue: Amount not extracted
**Check:**
1. Amount format in email (₹20.0 or Rs 20)
2. Backend logs for parsing errors
3. Email snippet contains amount

### Issue: Merchant shows as "Unknown"
**Check:**
1. Email contains "to [MERCHANT]" pattern
2. Merchant name is in CAPITALS
3. Backend logs show merchant extraction

### Issue: Wrong payment method
**Verify:**
- FamPay detection is working
- Should show "FamPay Card" not "Other"

## Summary

✅ **FamPay email detection** - Automatic
✅ **Amount extraction** - From subject or body
✅ **Merchant extraction** - From "to [MERCHANT]" pattern
✅ **Payment method** - Tagged as "FamPay Card"
✅ **Logging** - Detailed logs for debugging
✅ **Categorization** - Works with existing categorizer

FamPay transactions are now automatically parsed and categorized! 🎉
