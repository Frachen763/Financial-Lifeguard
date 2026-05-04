import dotenv from 'dotenv';
import { google } from 'googleapis';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const checkGmailPermissions = async () => {
  try {
    console.log('🔍 Checking Gmail API permissions...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get a test user
    const testUser = await User.findOne({ gmailConnected: true });
    if (!testUser) {
      console.log('❌ No user with Gmail connected found');
      return;
    }
    
    console.log(`👤 User: ${testUser.email}`);
    console.log(`📅 Gmail connected: ${testUser.gmailConnected}`);
    console.log(`🔑 Has tokens: ${!!testUser.gmailTokens}`);
    
    if (!testUser.gmailTokens) {
      console.log('❌ No Gmail tokens found');
      return;
    }
    
    // Check token details
    const tokens = testUser.gmailTokens;
    console.log(`🔑 Token expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not set'}`);
    console.log(`🔑 Current time: ${new Date().toISOString()}`);
    console.log(`🔑 Token expired: ${tokens.expiry_date && tokens.expiry_date < Date.now() ? 'YES' : 'NO'}`);
    
    // Refresh token if needed
    let currentTokens = tokens;
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('🔄 Refreshing token...');
      try {
        const { refreshAccessToken } = await import('../services/gmailService.js');
        currentTokens = await refreshAccessToken(tokens.refresh_token);
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        return;
      }
    }
    
    // Set up OAuth2 client
    const { getAuthUrl, setCredentials } = await import('../services/gmailService.js');
    const auth = setCredentials(currentTokens);
    
    // Test basic Gmail API access
    console.log('\n🔍 Testing basic Gmail API access...');
    const gmail = google.gmail({ version: 'v1', auth });
    
    try {
      // Get user profile
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Gmail profile: ${profile.data.emailAddress}`);
      console.log(`📧 Messages total: ${profile.data.messagesTotal}`);
      console.log(`📧 Threads total: ${profile.data.threadsTotal}`);
      console.log(`📅 History ID: ${profile.data.historyId}`);
    } catch (error) {
      console.error('❌ Failed to get profile:', error.message);
      if (error.code === 403) {
        console.log('⚠️ Permission denied - check OAuth scopes');
      }
      return;
    }
    
    // Test list messages with minimal format
    console.log('\n🔍 Testing message list with metadata format...');
    try {
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
      });
      
      const messages = listResponse.data.messages || [];
      console.log(`📬 Found ${messages.length} recent messages`);
      
      if (messages.length > 0) {
        // Try to fetch one message with metadata format
        console.log('\n🔍 Testing single message fetch with metadata...');
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messages[0].id,
          format: 'metadata',
          metadataHeaders: ['subject', 'from', 'date'],
        });
        
        console.log('✅ Successfully fetched message with metadata');
        console.log(`📧 Subject: ${msgResponse.data.payload?.headers?.find(h => h.name === 'subject')?.value || 'No subject'}`);
        console.log(`📧 From: ${msgResponse.data.payload?.headers?.find(h => h.name === 'from')?.value || 'No sender'}`);
        console.log(`📧 Date: ${msgResponse.data.internalDate ? new Date(parseInt(msgResponse.data.internalDate)).toLocaleString() : 'No date'}`);
        
        // Now try with full format
        console.log('\n🔍 Testing same message with full format...');
        const fullResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messages[0].id,
          format: 'full',
        });
        
        console.log('✅ Successfully fetched message with full format');
        console.log(`📧 Payload exists: ${!!fullResponse.data.payload}`);
        console.log(`📧 Headers exist: ${!!fullResponse.data.payload?.headers}`);
        console.log(`📧 Body exists: ${!!fullResponse.data.payload?.body}`);
        
        if (fullResponse.data.payload?.parts) {
          console.log(`📧 Parts count: ${fullResponse.data.payload.parts.length}`);
          console.log(`📧 Has text/plain: ${fullResponse.data.payload.parts.some(p => p.mimeType === 'text/plain')}`);
          console.log(`📧 Has text/html: ${fullResponse.data.payload.parts.some(p => p.mimeType === 'text/html')}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to list/fetch messages:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.response?.data);
    }
    
    // Check OAuth scopes
    console.log('\n🔍 Checking OAuth scopes...');
    const oauth2 = google.oauth2({ version: 'v2', auth });
    try {
      const tokenInfo = await oauth2.tokeninfo({
        access_token: currentTokens.access_token
      });
      console.log('✅ Token info retrieved');
      console.log(`🔧 Scopes: ${tokenInfo.data.scope}`);
      console.log(`👤 Audience: ${tokenInfo.data.audience}`);
      console.log(`⏰ Expires in: ${tokenInfo.data.expires_in}`);
    } catch (error) {
      console.error('❌ Failed to get token info:', error.message);
    }
    
    console.log('\n✅ Permission check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkGmailPermissions();
