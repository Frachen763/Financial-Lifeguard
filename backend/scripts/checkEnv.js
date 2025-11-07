import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Environment Variables Check ===\n');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
console.log(`Looking for .env file at: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.log('❌ ERROR: .env file not found!');
  console.log('\nPlease create a .env file in the backend directory.');
  console.log('You can copy from .env.example:');
  console.log('  cd backend');
  console.log('  cp .env.example .env');
  process.exit(1);
}

console.log('✅ .env file found\n');

// Load environment variables
dotenv.config();

// Check required variables
const requiredVars = {
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI,
  'MONGODB_URI': process.env.MONGODB_URI,
  'JWT_SECRET': process.env.JWT_SECRET,
  'FRONTEND_URL': process.env.FRONTEND_URL,
};

console.log('Checking required environment variables:\n');

let allValid = true;

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`);
    allValid = false;
  } else if (value.includes(' ') && key.includes('URI')) {
    console.log(`⚠️  ${key}: Contains spaces (this will cause errors!)`);
    console.log(`   Value: "${value}"`);
    allValid = false;
  } else if (value.startsWith('"') || value.startsWith("'")) {
    console.log(`⚠️  ${key}: Contains quotes (remove them!)`);
    console.log(`   Value: ${value}`);
    allValid = false;
  } else {
    // Mask sensitive values
    const displayValue = key.includes('SECRET') || key.includes('JWT') 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
}

console.log('\n=== Validation Results ===\n');

if (allValid) {
  console.log('✅ All required environment variables are set correctly!\n');
  console.log('Next steps:');
  console.log('1. Make sure your backend server is running: npm run dev');
  console.log('2. Check Google Cloud Console configuration');
  console.log('3. Run OAuth test: npm run test:oauth');
} else {
  console.log('❌ Some environment variables are missing or invalid!\n');
  console.log('Please fix the issues above and try again.');
  console.log('\nCommon fixes:');
  console.log('- Remove quotes around values');
  console.log('- Remove spaces from URIs');
  console.log('- Copy values exactly from Google Cloud Console');
  console.log('- Ensure no trailing spaces');
}

console.log('\n=== Check Complete ===');
