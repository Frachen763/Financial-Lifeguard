import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const checkGmailStatus = async () => {
  try {
    console.log('🔍 Checking Gmail integration status...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n📊 Gmail Status:');
    console.log(`   User: ${user.email}`);
    
    if (user.gmailTokens) {
      console.log('   ✅ Gmail tokens exist');
      console.log(`   Access Token: ${user.gmailTokens.access_token ? 'Present' : 'Missing'}`);
      console.log(`   Refresh Token: ${user.gmailTokens.refresh_token ? 'Present' : 'Missing'}`);
      console.log(`   Token Type: ${user.gmailTokens.token_type || 'N/A'}`);
      console.log(`   Expires In: ${user.gmailTokens.expires_in || 'N/A'}`);
      
      if (user.gmailTokens.expiry_date) {
        const expiryDate = new Date(user.gmailTokens.expiry_date);
        const now = new Date();
        const isExpired = expiryDate < now;
        console.log(`   Expiry Date: ${expiryDate.toLocaleString()}`);
        console.log(`   Status: ${isExpired ? '⚠️ EXPIRED' : '✅ Valid'}`);
        
        if (isExpired) {
          console.log(`   Time since expiry: ${Math.round((now - expiryDate) / 1000 / 60)} minutes`);
        }
      }
    } else {
      console.log('   ❌ No Gmail tokens found');
    }
    
    // Check last sync
    if (user.lastEmailSync) {
      const lastSync = new Date(user.lastEmailSync);
      const now = new Date();
      const hoursSinceSync = (now - lastSync) / 1000 / 60 / 60;
      console.log(`   Last Sync: ${lastSync.toLocaleString()}`);
      console.log(`   Hours since sync: ${hoursSinceSync.toFixed(1)}`);
    } else {
      console.log('   Last Sync: Never');
    }
    
    console.log('\n💡 Note: Token refresh is normal behavior and happens automatically');
    console.log('   The system will refresh expired tokens to maintain Gmail access');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkGmailStatus();
