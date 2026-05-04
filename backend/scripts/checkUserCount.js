import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const checkUserCount = async () => {
  try {
    console.log('🔍 Checking user count in database...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Count all users
    const totalUsers = await User.countDocuments();
    console.log(`\n📊 Total Users: ${totalUsers}`);
    
    if (totalUsers > 0) {
      // Get all users with their details
      const users = await User.find({}).select('-password').lean();
      
      console.log('\n👥 User Details:');
      for (let index = 0; index < users.length; index++) {
        const user = users[index];
        console.log(`\n${index + 1}. ${user.name || 'No Name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Gmail Connected: ${user.gmailConnected ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${user.createdAt ? user.createdAt.toLocaleDateString() : 'N/A'}`);
        console.log(`   Last Login: ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}`);
        
        // Count transactions for each user
        const transactionCount = await Transaction.countDocuments({ userId: user._id });
        console.log(`   Transactions: ${transactionCount}`);
      }
      
      // Gmail connection stats
      const gmailConnected = users.filter(u => u.gmailConnected).length;
      console.log(`\n📧 Gmail Connection Stats:`);
      console.log(`   Connected: ${gmailConnected}/${totalUsers} (${((gmailConnected/totalUsers)*100).toFixed(1)}%)`);
      console.log(`   Not Connected: ${totalUsers - gmailConnected}/${totalUsers}`);
      
      // Transaction distribution
      const totalTransactions = await Transaction.countDocuments();
      console.log(`\n💰 Transaction Distribution:`);
      console.log(`   Total Transactions: ${totalTransactions}`);
      if (totalUsers > 0) {
        console.log(`   Average per User: ${(totalTransactions / totalUsers).toFixed(1)}`);
      }
      
      // User activity
      const activeUsers = users.filter(u => u.lastLogin && 
        (Date.now() - new Date(u.lastLogin).getTime()) < 30 * 24 * 60 * 60 * 1000
      ).length;
      console.log(`\n📈 User Activity:`);
      console.log(`   Active (last 30 days): ${activeUsers}`);
      console.log(`   Inactive: ${totalUsers - activeUsers}`);
    }
    
    // Database capacity per user
    console.log('\n💾 Database Capacity Impact:');
    console.log(`   With ${totalUsers} users, each can store ~${Math.floor(565056 / totalUsers).toLocaleString()} transactions`);
    console.log(`   (Based on 565,056 total transaction capacity on free tier)`);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

checkUserCount();
