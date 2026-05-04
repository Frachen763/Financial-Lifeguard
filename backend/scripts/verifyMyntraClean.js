import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const verifyMyntraClean = async () => {
  try {
    await connectDB();
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    const myntraTxns = await Transaction.find({ 
      userId: user._id, 
      merchant: 'Myntra' 
    }).sort({ transactionDate: -1 });
    
    console.log('Myntra transactions remaining:', myntraTxns.length);
    myntraTxns.forEach((txn, i) => {
      console.log(`${i+1}. ₹${txn.amount} on ${txn.transactionDate.toLocaleString()}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyMyntraClean();
