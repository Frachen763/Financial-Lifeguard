import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';

// Load environment variables
dotenv.config();

console.log('=== Debug Purchase Email Amount ===\n');

const debugPurchaseAmount = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ gmailConnected: true });
    if (!user) {
      console.log('❌ No user found with Gmail connected');
      process.exit(1);
    }

    const emails = await fetchTransactionEmails(user.gmailTokens, null);
    console.log(`✅ Fetched ${emails.length} emails\n`);

    // Find purchase confirmation emails
    const purchaseEmails = emails.filter(email => {
      const headers = email.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      
      return subject.toLowerCase().includes('purchase confirmation') ||
             from.toLowerCase().includes('confirmation');
    });

    console.log(`Found ${purchaseEmails.length} purchase confirmation emails\n`);

    for (let i = 0; i < purchaseEmails.length; i++) {
      const email = purchaseEmails[i];
      console.log(`\n=== PURCHASE EMAIL ${i + 1} ===`);
      
      const headers = email.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Snippet: ${email.snippet}`);
      
      // Get full email body
      let body = '';
      if (email.payload.body && email.payload.body.data) {
        body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
      } else if (email.payload.parts) {
        const textPart = email.payload.parts.find(part => part.mimeType === 'text/plain');
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
        
        if (!body) {
          const htmlPart = email.payload.parts.find(part => part.mimeType === 'text/html');
          if (htmlPart && htmlPart.body.data) {
            const htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            body = htmlBody;
          }
        }
      }
      
      const fullText = `${subject} ${body} ${email.snippet}`;
      
      // Look for amount patterns
      console.log('\n--- Looking for amounts ---');
      
      // Pattern 1: Currency symbols
      const currencyMatches = [...fullText.matchAll(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/gi)];
      console.log('Currency matches:', currencyMatches.map(m => m[0]));
      
      // Pattern 2: Numbers followed by currency
      const numberCurrencyMatches = [...fullText.matchAll(/([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|rs\.?|inr|rupees)/gi)];
      console.log('Number+currency matches:', numberCurrencyMatches.map(m => m[0]));
      
      // Pattern 3: Price/amount keywords
      const priceMatches = [...fullText.matchAll(/(?:price|cost|amount|total|paid)[\s:]+(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi)];
      console.log('Price keyword matches:', priceMatches.map(m => m[0]));
      
      // Pattern 4: Look for any numbers that could be amounts
      const numberMatches = [...fullText.matchAll(/\b([0-9,]+(?:\.[0-9]{2})?)\b/g)];
      console.log('All numbers found:', numberMatches.slice(0, 10).map(m => m[0]));
      
      // Show a portion of the body for manual inspection
      console.log('\n--- Body content (first 1000 chars) ---');
      console.log(body.substring(0, 1000));
      console.log('---');
    }

    console.log('\n=== Debug Complete ===');

  } catch (error) {
    console.error('\n❌ Debug Failed!');
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

debugPurchaseAmount();
