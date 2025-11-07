import dotenv from 'dotenv';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

console.log('=== OAuth Configuration Test ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
console.log(`   GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || '✗ Missing'}`);
console.log();

// Validate redirect URI format
if (process.env.GOOGLE_REDIRECT_URI) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  console.log('2. Redirect URI Validation:');
  
  if (redirectUri.includes(' ')) {
    console.log('   ✗ ERROR: Redirect URI contains spaces!');
  } else {
    console.log('   ✓ No spaces detected');
  }
  
  if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    console.log('   ✗ ERROR: Redirect URI must start with http:// or https://');
  } else {
    console.log('   ✓ Valid protocol');
  }
  
  if (redirectUri.includes('localhost') && redirectUri.includes('5000')) {
    console.log('   ✓ Correct localhost port (5000)');
  } else if (redirectUri.includes('localhost')) {
    console.log('   ⚠ WARNING: Using localhost but not port 5000');
  }
  
  if (redirectUri.endsWith('/api/auth/google/callback')) {
    console.log('   ✓ Correct callback path');
  } else {
    console.log('   ✗ ERROR: Callback path should end with /api/auth/google/callback');
  }
  console.log();
}

// Test OAuth client creation
console.log('3. OAuth Client Test:');
try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  console.log('   ✓ OAuth2 client created successfully');
  
  // Generate auth URL
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
  });
  
  console.log('   ✓ Auth URL generated successfully');
  console.log();
  console.log('4. Generated Auth URL:');
  console.log(`   ${authUrl}`);
  console.log();
  console.log('5. Next Steps:');
  console.log('   - Copy the auth URL above and paste it in your browser');
  console.log('   - If you get a 400 error, check Google Cloud Console:');
  console.log('     1. Go to https://console.cloud.google.com/');
  console.log('     2. Select your project');
  console.log('     3. Go to "APIs & Services" > "Credentials"');
  console.log('     4. Click on your OAuth 2.0 Client ID');
  console.log('     5. Verify "Authorized redirect URIs" includes:');
  console.log(`        ${process.env.GOOGLE_REDIRECT_URI}`);
  console.log('     6. Go to "OAuth consent screen" and ensure it\'s configured');
  console.log('     7. Add yourself as a test user if using External user type');
  
} catch (error) {
  console.log('   ✗ ERROR creating OAuth client:');
  console.log(`   ${error.message}`);
}

console.log();
console.log('=== Test Complete ===');
