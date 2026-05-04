import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const verifyGetHandsRemoved = async () => {
  try {
    await connectDB();
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    const getHandsTxns = await Transaction.find({ 
      userId: user._id, 
      merchant: { $regex: new RegExp('Get Hands', 'i') } 
    });
    
    console.log('Get Hands transactions remaining:', getHandsTxns.length);
    if (getHandsTxns.length > 0) {
      getHandsTxns.forEach((txn, i) => {
        console.log(`${i+1}. ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
      });
    } else {
      console.log('✅ All Get Hands transactions have been removed!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyGetHandsRemoved();
