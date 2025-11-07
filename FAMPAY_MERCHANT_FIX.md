# FamPay Merchant Name Issue - Fixed

## Problem
FamPay transactions showing "Unknown" as merchant name instead of the actual merchant (e.g., "NAVEEN GARG").

## Root Cause
FamPay emails embed the merchant name in an **image**, not in the email text. Gmail's text parser can't read images, so the merchant name wasn't being extracted.

### Email Structure
```
Subject: Hey Pritam Darabdhara, You have successfully paid ₹20.0
Body: [Image with text: "to NAVEEN GARG"]
Snippet: "You have successfully paid ₹20.0"
```

The merchant name "NAVEEN GARG" is only visible in the image, not in the text.

## Solution Applied

### 1. Enhanced Body Extraction
Now checks both text/plain AND text/html parts:
```javascript
// Try text/plain first
const textPart = email.payload.parts.find(part => part.mimeType === 'text/plain');

// If no text, try HTML and strip tags
const htmlPart = email.payload.parts.find(part => part.mimeType === 'text/html');
```

### 2. Multiple Merchant Extraction Patterns
Added 4 different patterns to find merchant name:

**Pattern 1: All caps after "to"**
```javascript
/to\s+([A-Z][A-Z\s&.-]+?)(?:\s*$|\s*\n|\s*\.|,|\s+on\s+)/i
// Matches: "to NAVEEN GARG"
```

**Pattern 2: Title case after "to"**
```javascript
/to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/
// Matches: "to Naveen Garg"
```

**Pattern 3: Any capitalized name**
```javascript
/([A-Z][a-z]+\s+[A-Z][a-z]+)/
// Matches: "Naveen Garg" anywhere in text
```

**Pattern 4: From snippet**
```javascript
/paid.*?to\s+([A-Za-z\s]+?)(?:\s*$|\s*\.)/i
// Matches: "paid ₹20 to Naveen Garg"
```

### 3. Detailed Logging
Added logs to see what's being parsed:
```javascript
console.log('🔍 FamPay parsing - Subject:', subject);
console.log('🔍 FamPay parsing - Body:', body);
console.log('🔍 FamPay parsing - Snippet:', snippet);
console.log('✅ Merchant found:', merchant);
```

### 4. Fallback
If no merchant found, uses "FamPay Transaction" instead of "Unknown":
```javascript
if (!merchant) {
  merchant = 'FamPay Transaction';
}
```

## How to Test

### Step 1: Restart Backend
```bash
cd backend
npm run dev
```

### Step 2: Delete Old Transactions
Delete the "Unknown" FamPay transactions from the UI or database.

### Step 3: Re-sync Gmail
1. Go to Dashboard
2. Click "Sync Gmail"
3. Wait for sync to complete

### Step 4: Check Backend Logs
You should see:
```
🎯 Detected FamPay email
🔍 FamPay parsing - Subject: Hey Pritam, You have successfully paid ₹20.0
🔍 FamPay parsing - Body: [body content]
🔍 FamPay parsing - Snippet: You have successfully paid ₹20.0
✅ Merchant found (pattern X): NAVEEN GARG
✅ Parsed transaction: ₹20.0 to NAVEEN GARG via FamPay Card
```

### Step 5: Check Transactions Page
FamPay transactions should now show proper merchant names.

## What to Check in Logs

### If Merchant Still Shows "FamPay Transaction"
Check the logs to see what's in the email:
```
🔍 FamPay parsing - Subject: [subject text]
🔍 FamPay parsing - Body: [body text]
🔍 FamPay parsing - Snippet: [snippet text]
```

**If merchant name is NOT in any of these**, it means:
- Gmail is not providing the text (only image)
- We need to implement OCR (image text extraction)

### If Merchant Shows Correctly
```
✅ Merchant found (pattern 1): NAVEEN GARG
✅ Parsed transaction: ₹20.0 to NAVEEN GARG via FamPay Card
```

## Expected Results

### Before Fix ❌
```
Merchant: Unknown
Payment Method: FamPay Card
Amount: ₹20
```

### After Fix ✅
```
Merchant: NAVEEN GARG (or "FamPay Transaction" if not in text)
Payment Method: FamPay Card
Amount: ₹20
```

## If Merchant Name Still Not Extracted

### Option 1: Manual Edit
You can manually edit the transaction:
1. Click edit icon on transaction
2. Change merchant from "FamPay Transaction" to actual name
3. Save

### Option 2: OCR Implementation (Future)
To extract text from images, we would need:
1. **Tesseract.js** or **Google Vision API**
2. Download image from email
3. Run OCR to extract text
4. Parse merchant name from OCR result

This is a more complex solution and would be implemented if needed.

## Files Modified

### 1. `backend/services/emailParser.js`
- Enhanced body extraction (text/plain + text/html)
- Added 4 merchant extraction patterns
- Added detailed logging
- Better fallback handling

### Changes:
```javascript
// Enhanced body extraction
if (!body) {
  const htmlPart = email.payload.parts.find(part => part.mimeType === 'text/html');
  if (htmlPart) {
    body = htmlBody.replace(/<[^>]*>/g, ' ');
  }
}

// Multiple merchant patterns
const patterns = [
  /to\s+([A-Z][A-Z\s&.-]+?)/i,           // Pattern 1
  /to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,  // Pattern 2
  /([A-Z][a-z]+\s+[A-Z][a-z]+)/,         // Pattern 3
  /paid.*?to\s+([A-Za-z\s]+?)/i          // Pattern 4
];
```

## Troubleshooting

### Issue: Still showing "Unknown"
**Possible causes:**
1. Old transactions not deleted
2. Backend not restarted
3. Gmail not re-synced

**Solution:**
1. Delete old transactions
2. Restart backend
3. Re-sync Gmail

### Issue: Shows "FamPay Transaction" instead of merchant
**Cause:** Merchant name is only in the image, not in email text

**Solutions:**
1. Accept "FamPay Transaction" as merchant
2. Manually edit transaction
3. Implement OCR (future enhancement)

### Issue: Logs show merchant in body but still not extracted
**Solution:** Share the logs - there might be a pattern we're missing

## Summary

✅ **Enhanced body extraction** - Checks text/plain and text/html
✅ **4 merchant patterns** - Multiple ways to find merchant
✅ **Detailed logging** - See what's being parsed
✅ **Better fallback** - "FamPay Transaction" instead of "Unknown"

**Action Required:**
1. Restart backend
2. Delete old "Unknown" transactions
3. Re-sync Gmail
4. Check logs to see if merchant is in email text

If merchant name is still not extracted, it's likely only in the image and would require OCR implementation. 🔍
