import { google } from 'googleapis';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.error('❌ ERROR: Missing required OAuth environment variables!');
  console.error('Please check your .env file contains:');
  console.error('  - GOOGLE_CLIENT_ID');
  console.error('  - GOOGLE_CLIENT_SECRET');
  console.error('  - GOOGLE_REDIRECT_URI');
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Get authorization URL for Gmail OAuth
 */
export const getAuthUrl = () => {
  // Validate redirect URI before generating auth URL
  if (!process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('GOOGLE_REDIRECT_URI is not set in environment variables');
  }

  console.log('🔐 Generating OAuth URL with redirect_uri:', process.env.GOOGLE_REDIRECT_URI);

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: 'state_parameter_passthrough_value',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI, // Explicitly set redirect_uri
  });

  console.log('✅ OAuth URL generated successfully');
  return authUrl;
};

/**
 * Get tokens from authorization code
 */
export const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw new Error('Failed to get tokens from authorization code');
  }
};

/**
 * Set credentials for OAuth client
 */
export const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

/**
 * Fetch transaction emails from Gmail
 */
export const fetchTransactionEmails = async (tokens, lastSyncDate = null) => {
  try {
    // Validate tokens
    if (!tokens || !tokens.access_token) {
      throw new Error('Invalid or missing Gmail tokens');
    }

    console.log('🔑 Setting credentials for Gmail API...');
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    console.log('✅ Gmail API client initialized');

    // Build query for transaction-related emails
    let query = 'subject:(transaction OR payment OR debited OR credited OR UPI OR spent OR purchase OR order)';
    
    // Add date filter if lastSyncDate is provided
    if (lastSyncDate) {
      const dateStr = Math.floor(new Date(lastSyncDate).getTime() / 1000);
      query += ` after:${dateStr}`;
      console.log(`📅 Searching for emails after: ${new Date(lastSyncDate).toISOString()}`);
    } else {
      // Default: fetch emails from last 90 days
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
      query += ` after:${ninetyDaysAgo}`;
      console.log('📅 Searching for emails from last 90 days');
    }

    console.log('🔍 Gmail query:', query);

    // Get list of messages
    console.log('📨 Requesting message list from Gmail API...');
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    });

    const messages = response.data.messages || [];
    console.log(`📬 Found ${messages.length} matching emails`);
    
    if (messages.length === 0) {
      return [];
    }

    // Fetch full message details
    console.log('📥 Fetching full details for each email...');
    const emailPromises = messages.map(message =>
      gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      })
    );

    const emailDetails = await Promise.all(emailPromises);
    console.log('✅ Successfully fetched all email details');
    
    return emailDetails.map(email => ({
      id: email.data.id,
      threadId: email.data.threadId,
      snippet: email.data.snippet,
      payload: email.data.payload,
      internalDate: email.data.internalDate,
    }));
  } catch (error) {
    console.error('❌ Error fetching emails from Gmail:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    // Handle specific error cases
    if (error.code === 401 || error.code === 403) {
      throw new Error('Gmail token expired or invalid. Please reconnect your Gmail account.');
    }
    
    if (error.code === 400) {
      throw new Error('Invalid Gmail API request. Please check your configuration.');
    }
    
    if (error.code === 429) {
      throw new Error('Gmail API rate limit exceeded. Please try again later.');
    }
    
    // Generic error with more details
    throw new Error(`Failed to fetch emails from Gmail: ${error.message}`);
  }
};

/**
 * Refresh access token if expired
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Get user profile from Google
 */
export const getUserProfile = async (tokens) => {
  try {
    const auth = setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth });
    
    const { data } = await oauth2.userinfo.get();
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
};

export default {
  getAuthUrl,
  getTokensFromCode,
  fetchTransactionEmails,
  refreshAccessToken,
  getUserProfile,
};
