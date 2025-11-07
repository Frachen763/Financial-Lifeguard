# Merchant Name Extraction - VPA Pattern Update

## New Pattern Identified

Transaction messages have merchant names in **CAPITAL LETTERS** immediately after the VPA, before the date.

### Example Format:
```
"Dear Customer, Rs. 475 has been debited from account 5830 to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25."
```

**Pattern Breakdown**:
- Amount: `Rs. 475`
- VPA: `zomato-order@ptybl`
- **Merchant Name**: `ZOMATO LIMITED` ← In CAPITALS
- Date: `on 6-11-25`

## What Was Updated

### Priority Pattern Added

The merchant extraction now **prioritizes** extracting the capitalized merchant name that appears after the VPA:

```javascript
// Pattern: "to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25"
// Extracts: "ZOMATO LIMITED"
const vpaWithMerchantPattern = /(?:to|from)\s+(?:vpa\s+)?[\w.-]+@[\w]+\s+([A-Z][A-Z\s&.-]+?)(?:\s+on\s+\d{1,2}-\d{1,2}-\d{2,4}|\s+ref|\s+upi|$)/i;
```

### How It Works

1. **Looks for VPA**: `zomato-order@ptybl`
2. **Captures CAPITALS after VPA**: `ZOMATO LIMITED`
3. **Stops at date**: `on 6-11-25`
4. **Cleans and formats**: `Zomato Limited`

## Test Results

All 18 tests passed! ✅

### New Test Cases Added:

**Test 16**: Zomato
```
Input:  "Dear Customer, Rs. 475 has been debited from account 5830 to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25."
Output: "Zomato Limited" ✅
```

**Test 17**: Swiggy
```
Input:  "Rs 350 debited to VPA swiggy@ybl SWIGGY STORES on 5-11-25"
Output: "Swiggy Stores" ✅
```

**Test 18**: Amazon Pay
```
Input:  "Amount debited to amazonpay@icici AMAZON PAY INDIA on 4-11-25"
Output: "Amazon Pay India" ✅
```

## Supported Formats

### Format 1: With "VPA" keyword
```
"to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25"
→ Extracts: "Zomato Limited"
```

### Format 2: Without "VPA" keyword
```
"to swiggy@ybl SWIGGY STORES on 5-11-25"
→ Extracts: "Swiggy Stores"
```

### Format 3: Different date formats
```
"to merchant@paytm MERCHANT NAME on 06-11-2025"
→ Extracts: "Merchant Name"
```

### Format 4: With reference numbers
```
"to merchant@ybl MERCHANT NAME ref#123456"
→ Extracts: "Merchant Name"
```

## Pattern Priority

The extraction now follows this priority:

1. **✅ CAPITALS after VPA** (NEW - Highest Priority)
   - `"to VPA zomato@ptybl ZOMATO LIMITED on date"`
   - Extracts: `"Zomato Limited"`

2. **VPA handle extraction** (Fallback)
   - `"to zomato-order@ptybl"`
   - Extracts: `"Zomato Order"`

3. **Credit transactions**
   - `"credited by xyz@bank Merchant Name"`
   - Extracts: `"Merchant Name"`

4. **Debit patterns**
   - `"debited for payment to Merchant"`
   - Extracts: `"Merchant"`

5. **Quoted text**
   - `"payment to 'Merchant Name'"`
   - Extracts: `"Merchant Name"`

6. **Capitalized words** (Last resort)
   - Extracts meaningful capitalized words

## Examples from Your Transactions

### Before Update ❌
```
"to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25"
→ Extracted: "Zomato Order" (from VPA handle)
```

### After Update ✅
```
"to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25"
→ Extracted: "Zomato Limited" (from CAPITALS after VPA)
```

## Common Merchant Patterns

### Food Delivery
```
✅ "to VPA zomato-order@ptybl ZOMATO LIMITED on date"
   → "Zomato Limited"

✅ "to VPA swiggy@ybl SWIGGY STORES on date"
   → "Swiggy Stores"
```

### E-commerce
```
✅ "to amazonpay@icici AMAZON PAY INDIA on date"
   → "Amazon Pay India"

✅ "to flipkart@axis FLIPKART INTERNET PVT LTD on date"
   → "Flipkart Internet Pvt Ltd"
```

### Payment Apps
```
✅ "to paytm@paytm PAYTM PAYMENTS BANK on date"
   → "Paytm Payments Bank"

✅ "to phonepe@ybl PHONEPE PRIVATE LIMITED on date"
   → "Phonepe Private Limited"
```

### Person-to-Person
```
✅ "to prachen.borgohain@okicici on date"
   → "Prachen Borgohain"

✅ "to john@ybl on date"
   → "John"
```

## How to Apply

### Step 1: Backend Already Updated
The code is already updated in `backend/utils/categorizer.js`

### Step 2: Restart Backend (if running)
```bash
# In backend terminal
# Press Ctrl+C to stop
# Then restart:
npm run dev
```

### Step 3: Sync Emails
1. Go to **Dashboard**
2. Click **"Sync Emails"**
3. All transactions will be updated with correct merchant names

### Step 4: Verify
1. Go to **Transactions page**
2. Check merchant names:
   - Should show "Zomato Limited" instead of "Zomato Order"
   - Should show "Swiggy Stores" instead of "Swiggy"
   - Should show "Amazon Pay India" instead of "Amazonpay"

## Testing

Run the test to verify all patterns work:

```bash
cd backend
npm run test:merchant
```

**Expected Result**: 18/18 tests passing ✅

## Files Modified

- ✅ `backend/utils/categorizer.js` - Added VPA + CAPITALS pattern
- ✅ `backend/scripts/testMerchantExtraction.js` - Added 3 new test cases
- ✅ `MERCHANT_PATTERN_UPDATE.md` - This documentation

## What Gets Extracted Now

### Bank SMS Format:
```
"Dear Customer, Rs. 475 has been debited from account 5830 to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25."
```

**Extracted Parts**:
- ✅ Amount: `475`
- ✅ VPA: `zomato-order@ptybl`
- ✅ **Merchant**: `Zomato Limited` ← From CAPITALS
- ✅ Date: `6-11-25`

### Cleaning Applied:
- `ZOMATO LIMITED` → `Zomato Limited` (Proper capitalization)
- `SWIGGY STORES` → `Swiggy Stores` (Proper capitalization)
- `AMAZON PAY INDIA` → `Amazon Pay India` (Proper capitalization)

## Summary

✅ **Pattern Identified**: Merchant name in CAPITALS after VPA before date
✅ **Priority Added**: This pattern is now checked first
✅ **Tests Passing**: 18/18 tests pass
✅ **Examples Work**: Zomato, Swiggy, Amazon Pay all extract correctly

**Next Steps**:
1. Restart backend (if running)
2. Sync emails in Dashboard
3. Check Transactions page for correct merchant names

---

**Pattern**: `to VPA {vpa}@{bank} {MERCHANT NAME} on {date}`
**Extracts**: `{Merchant Name}` (properly formatted)
