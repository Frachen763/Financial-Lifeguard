import { extractMerchant } from '../utils/categorizer.js';

console.log('=== Merchant Name Extraction Test ===\n');

// Test cases for various transaction message formats
const testCases = [
  {
    description: 'Credit transaction with quotes',
    text: 'Rs 5000.00 credited to your account by xyz@bank "Salary Payment"',
    expected: 'Salary Payment'
  },
  {
    description: 'Credit transaction without quotes',
    text: 'Amount Rs 2500 credited to your account by paytm@bank from John Doe',
    expected: 'John Doe'
  },
  {
    description: 'UPI debit transaction',
    text: 'Rs 150.00 debited from A/C for UPI payment to Zomato on 05-Nov-24',
    expected: 'Zomato'
  },
  {
    description: 'Card payment',
    text: 'Rs 1200 debited for payment to Amazon India via Credit Card',
    expected: 'Amazon India'
  },
  {
    description: 'Simple debit',
    text: 'Amount Rs 500 paid to Swiggy',
    expected: 'Swiggy'
  },
  {
    description: 'Refund/Credit',
    text: 'Refund of Rs 299 credited from Flipkart',
    expected: 'Flipkart'
  },
  {
    description: 'UPI with VPA',
    text: 'Rs 75 sent to merchant@paytm via UPI',
    expected: 'Merchant'
  },
  {
    description: 'Transaction at merchant',
    text: 'Rs 350 spent at Starbucks Coffee on 05-Nov-24',
    expected: 'Starbucks Coffee'
  },
  {
    description: 'Credit with bank identifier',
    text: 'Rs 10000 credited to your account by salary@hdfc "Monthly Salary"',
    expected: 'Monthly Salary'
  },
  {
    description: 'Debit with reference',
    text: 'Rs 899 debited for Netflix Subscription Ref#123456',
    expected: 'Netflix Subscription'
  },
  {
    description: 'UPI to person with ICICI VPA',
    text: 'Rs 750 sent to prachen.borgohain@okicici via UPI on 05-11-25',
    expected: 'Prachen Borgohain'
  },
  {
    description: 'UPI to person with SBI VPA',
    text: 'Rs 50 paid to suman.kalita@ptsbi via UPI',
    expected: 'Suman Kalita'
  },
  {
    description: 'UPI transaction with date in subject',
    text: 'On 05-11-25. Your Upi Transaction of Rs 928.25 to merchant@paytm',
    expected: 'Merchant'
  },
  {
    description: 'Generic UPI alert with noise words',
    text: 'Report if this transaction is not done by you. Rs 1500 to john@ybl',
    expected: 'John'
  },
  {
    description: 'UPI with full name after VPA',
    text: 'Rs 1000 debited for UPI to abc@okaxis Rahul Kumar',
    expected: 'Rahul Kumar'
  },
  {
    description: 'Merchant in CAPITALS after VPA (Zomato)',
    text: 'Dear Customer, Rs. 475 has been debited from account 5830 to VPA zomato-order@ptybl ZOMATO LIMITED on 6-11-25.',
    expected: 'Zomato Limited'
  },
  {
    description: 'Merchant in CAPITALS after VPA (Swiggy)',
    text: 'Rs 350 debited to VPA swiggy@ybl SWIGGY STORES on 5-11-25',
    expected: 'Swiggy Stores'
  },
  {
    description: 'Merchant in CAPITALS after VPA (Amazon)',
    text: 'Amount debited to amazonpay@icici AMAZON PAY INDIA on 4-11-25',
    expected: 'Amazon Pay India'
  }
];

console.log('Running tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = extractMerchant(testCase.text);
  const success = result.toLowerCase().includes(testCase.expected.toLowerCase()) || 
                  testCase.expected.toLowerCase().includes(result.toLowerCase());
  
  if (success) {
    console.log(`✅ Test ${index + 1}: PASSED`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: "${testCase.text}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got: "${result}"`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: FAILED`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: "${testCase.text}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got: "${result}"`);
    failed++;
  }
  console.log();
});

console.log('=== Test Summary ===');
console.log(`Total: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log();

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed. Review the patterns in categorizer.js');
}

console.log('\n=== Interactive Test ===');
console.log('You can also test with your own transaction messages:');
console.log('Example usage:');
console.log('  import { extractMerchant } from "./utils/categorizer.js";');
console.log('  const merchant = extractMerchant("Your transaction message here");');
console.log('  console.log(merchant);');
