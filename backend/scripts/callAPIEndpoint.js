import dotenv from 'dotenv';
import express from 'express';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const callAPIEndpoint = async () => {
  try {
    console.log('🌐 Calling API endpoint directly...');
    
    // Connect to database
    await connectDB();
    
    // Create an express app
    const app = express();
    app.use(express.json());
    
    // Import and use the auth middleware (mocked)
    const mockUser = {
      _id: '690b64d5addf2dff604f9659',
      email: 'borgohain9435@gmail.com'
    };
    
    const protect = (req, res, next) => {
      req.user = mockUser;
      next();
    };
    
    // Import the transactions router
    const transactionsRouter = (await import('../routes/transactions.js')).default;
    app.use('/api/transactions', transactionsRouter);
    
    // Mock the protect middleware
    const originalProtect = (await import('../middleware/auth.js')).protect;
    (await import('../middleware/auth.js')).protect = protect;
    
    // Make a request to the endpoint
    const req = {
      user: mockUser,
      query: {
        page: 1,
        limit: 10,
        sortBy: 'transactionDate',
        sortOrder: 'desc'
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`\n📡 API Response (${code}):`);
          console.log(JSON.stringify(data, null, 2));
          
          if (data.success && data.data) {
            console.log(`\n📊 Transactions returned: ${data.data.length}`);
            console.log('\n📋 First 5 transactions:');
            data.data.slice(0, 5).forEach((txn, index) => {
              console.log(`\n  ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
              console.log(`     Date: ${txn.transactionDate}`);
              console.log(`     Category: ${txn.category?.name || 'No Category'}`);
            });
          }
        }
      })
    };
    
    // Import the router function directly
    const router = (await import('../routes/transactions.js')).default;
    
    // Get the GET handler
    const handlers = router.stack.filter(layer => layer.route && layer.route.methods.get);
    if (handlers.length > 0) {
      const handler = handlers[0].route.stack[0].handle;
      await handler(req, res);
    } else {
      console.log('❌ Could not find GET handler');
    }
    
    console.log('\n✅ API call completed!');
    
  } catch (error) {
    console.error('❌ Call failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

callAPIEndpoint();
