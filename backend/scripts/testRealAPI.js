import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const testRealAPI = async () => {
  try {
    console.log('🌐 Testing real API endpoint...');
    
    // Import the app
    const app = express();
    
    // Connect to database
    await connectDB();
    
    // Import routes after DB connection
    const transactionsRouter = (await import('../routes/transactions.js')).default;
    app.use('/api/transactions', transactionsRouter);
    
    // Get user token (we'll need to simulate login)
    console.log('\n🔑 Simulating user login...');
    
    // Since we can't easily get JWT token, let's check the route directly
    console.log('\n📡 Checking the route definition...');
    const fs = await import('fs');
    const routeFile = fs.readFileSync('../routes/transactions.js', 'utf8');
    
    // Extract the GET route handler
    const getRouteMatch = routeFile.match(/router\.get\('\/'.*?\n\s*\}\);/s);
    if (getRouteMatch) {
      console.log('✅ Found GET / route');
    }
    
    // Let's check if there's any caching middleware
    console.log('\n🔍 Checking for caching middleware...');
    if (routeFile.includes('cache') || routeFile.includes('etag')) {
      console.log('⚠️ Found caching-related code');
    }
    
    // Let's manually run the query that the endpoint uses
    console.log('\n🔍 Running the exact query from the endpoint...');
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User ID: ${user._id}`);
    
    // Simulate the exact query from GET /api/transactions
    const {
      category,
      accountNumber,
      merchant,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 100,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = {};
    
    // Build query
    const query = { userId: user._id };
    
    // Add filters
    if (category) query.category = category;
    if (accountNumber) query.accountNumber = accountNumber;
    if (merchant) query.merchant = { $regex: merchant, $options: 'i' };
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }
    if (search) {
      query.$or = [
        { merchant: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('📋 Query:', JSON.stringify(query, null, 2));
    
    // Execute query
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('category', 'name icon color')
      .populate('categorySuggestion.suggestedCategory', 'name icon color');
    
    const total = await Transaction.countDocuments(query);
    
    console.log(`\n📊 Results:`);
    console.log(`   Total transactions: ${total}`);
    console.log(`   Returned: ${transactions.length}`);
    
    console.log('\n📊 First 5 transactions:');
    transactions.slice(0, 5).forEach((txn, index) => {
      console.log(`\n   ${index + 1}. ₹${txn.amount} to ${txn.merchant}`);
      console.log(`      Date: ${txn.transactionDate.toLocaleString()}`);
      console.log(`      Category: ${txn.category?.name || 'No Category'}`);
      console.log(`      Email ID: ${txn.emailId || 'No email ID'}`);
    });
    
    // Check if there's a date issue
    console.log('\n🔍 Checking for date issues...');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todaysTxns = transactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate >= today;
    });
    
    console.log(`   Today's transactions: ${todaysTxns.length}`);
    todaysTxns.forEach((txn, index) => {
      console.log(`     ${index + 1}. ₹${txn.amount} to ${txn.merchant} at ${txn.transactionDate.toLocaleTimeString()}`);
    });
    
    // Check if frontend might be using a different endpoint
    console.log('\n💡 Possible frontend issues:');
    console.log('   1. Frontend might be calling a different endpoint');
    console.log('   2. Frontend might have client-side caching');
    console.log('   3. Frontend might be using stale data from state management');
    console.log('   4. Browser might be serving cached responses');
    
    console.log('\n✅ API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

testRealAPI();
