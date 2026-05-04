import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';

// Load environment variables
dotenv.config();

console.log('=== Debug Full Email Content ===\n');

const debugFullEmail = async () => {
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

    if (purchaseEmails.length === 0) {
      console.log('No purchase confirmation emails found');
      process.exit(0);
    }

    const email = purchaseEmails[0]; // Get first purchase email
    console.log('=== FULL EMAIL CONTENT ===');
    
    const headers = email.payload.headers;
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    
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
    
    console.log('\n--- FULL BODY ---');
    console.log(body);
    
    // Look for specific patterns in the full body
    console.log('\n--- SEARCHING FOR PRICE INFO ---');
    
    // Look for "333" which might be the price
    if (body.includes('333')) {
      console.log('Found "333" in email - this might be the price');
      
      // Get context around the number
      const index = body.indexOf('333');
      const start = Math.max(0, index - 100);
      const end = Math.min(body.length, index + 100);
      console.log('Context around "333":');
      console.log(body.substring(start, end));
    }
    
    // Look for price-related words
    const priceKeywords = ['price', 'cost', 'amount', 'total', 'payment', 'charge', 'fee', '₹', 'rs', 'inr'];
    for (const keyword of priceKeywords) {
      if (body.toLowerCase().includes(keyword)) {
        console.log(`Found keyword "${keyword}" in email`);
        const index = body.toLowerCase().indexOf(keyword);
        const start = Math.max(0, index - 50);
        const end = Math.min(body.length, index + 100);
        console.log(`Context around "${keyword}":`);
        console.log(body.substring(start, end));
        console.log('---');
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

debugFullEmail();
