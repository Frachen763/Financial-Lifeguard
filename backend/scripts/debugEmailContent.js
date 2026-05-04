import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { fetchTransactionEmails } from '../services/gmailService.js';

// Load environment variables
dotenv.config();

console.log('=== Debug Email Content ===\n');

const debugEmailContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user with Gmail connected
    const user = await User.findOne({ gmailConnected: true });
    if (!user) {
      console.log('❌ No user found with Gmail connected');
      process.exit(1);
    }

    // Fetch emails
    const emails = await fetchTransactionEmails(user.gmailTokens, null);
    console.log(`✅ Fetched ${emails.length} emails\n`);

    if (emails.length === 0) {
      console.log('No emails to analyze');
      process.exit(0);
    }

    // Analyze first few emails in detail
    for (let i = 0; i < Math.min(2, emails.length); i++) {
      const email = emails[i];
      console.log(`\n=== EMAIL ${i + 1} ===`);
      
      const headers = email.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const date = new Date(parseInt(email.internalDate));
      
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Date: ${date.toISOString()}`);
      console.log(`Snippet: ${email.snippet}`);
      
      // Get email body
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
            // Simple HTML tag removal for display
            body = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      }
      
      console.log(`Body (first 500 chars): ${body.substring(0, 500)}...`);
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

debugEmailContent();
