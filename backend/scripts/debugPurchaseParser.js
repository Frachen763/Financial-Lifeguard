import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';
import { parseMultipleEmails } from '../services/emailParser.js';

// Load environment variables
dotenv.config();

console.log('=== Debug Purchase Parser ===\n');

const debugPurchaseParser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ gmailConnected: true });
    if (!user) {
      console.log('❌ No user found with Gmail connected');
      process.exit(1);
    }

    const emails = await fetchTransactionEmails(user.gmailTokens, null);
    
    // Find purchase confirmation emails
    const purchaseEmails = emails.filter(email => {
      const headers = email.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      return subject.toLowerCase().includes('purchase confirmation');
    });

    console.log(`Found ${purchaseEmails.length} purchase confirmation emails\n`);

    if (purchaseEmails.length > 0) {
      const email = purchaseEmails[0];
      console.log('=== Testing Purchase Parser ===');
      
      // Manually test the parser logic
      const headers = email.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      
      // Get email body
      let body = '';
      if (email.payload.body && email.payload.body.data) {
        body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
      } else if (email.payload.parts) {
        const htmlPart = email.payload.parts.find(part => part.mimeType === 'text/html');
        if (htmlPart && htmlPart.body.data) {
          body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
      }
      
      const fullText = `${subject} ${body} ${email.snippet}`;
      
      console.log('Subject:', subject);
      console.log('From:', from);
      console.log('FullText length:', fullText.length);
      
      // Test the amount pattern
      console.log('\n--- Testing Amount Patterns ---');
      const amountPaidMatch = fullText.match(/amount\s+paid[\s:]+([0-9,]+(?:\.[0-9]{2})?)/i);
      console.log('Amount Paid match:', amountPaidMatch);
      
      if (amountPaidMatch) {
        console.log('Amount found:', amountPaidMatch[1]);
      } else {
        console.log('Amount Paid pattern not found');
        
        // Look for "Amount Paid:" in the text
        if (fullText.toLowerCase().includes('amount paid')) {
          console.log('Found "Amount Paid" text in email');
          const index = fullText.toLowerCase().indexOf('amount paid');
          const start = Math.max(0, index - 20);
          const end = Math.min(fullText.length, index + 50);
          console.log('Context:', fullText.substring(start, end));
        }
      }
      
      // Test merchant extraction
      console.log('\n--- Testing Merchant Extraction ---');
      const senderMatch = from.match(/^([^<]+)/);
      console.log('Sender match:', senderMatch);
      if (senderMatch) {
        console.log('Merchant from sender:', senderMatch[1].trim());
      }
      
      // Test the full parser
      console.log('\n--- Testing Full Parser ---');
      const transactions = parseMultipleEmails([email]);
      console.log('Parsed transactions:', transactions.length);
      
      if (transactions.length > 0) {
        console.log('Transaction details:', transactions[0]);
      }
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

debugPurchaseParser();
