import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const calculate500kUsers = async () => {
  try {
    console.log('🚀 Calculating infrastructure for 500,000 users...');
    
    // Connect to database
    await connectDB();
    
    // Import models
    const User = (await import('../models/User.js')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    
    // Get your current transaction data
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    const yourTransactions = await Transaction.countDocuments({ userId: user._id });
    
    // Calculate your transaction rate
    const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const yourDailyRate = yourTransactions / daysSinceCreation;
    const doubledYearlyRate = yourDailyRate * 2 * 365;
    
    // Scale to 500k users
    const totalUsers = 500000;
    const totalTransactionsPerYear = totalUsers * doubledYearlyRate;
    const totalTransactions10Years = totalTransactionsPerYear * 10;
    
    console.log('\n📊 Scale Analysis for 500,000 Users:');
    console.log(`   Users: ${totalUsers.toLocaleString()}`);
    console.log(`   Transactions per user per year: ${doubledYearlyRate.toFixed(0)}`);
    console.log(`   Total transactions per year: ${totalTransactionsPerYear.toLocaleString()}`);
    console.log(`   Total transactions (10 years): ${totalTransactions10Years.toLocaleString()}`);
    
    // Storage requirements
    const avgTransactionSize = 0.93; // KB
    const storagePerYearKB = totalTransactionsPerYear * avgTransactionSize;
    const storage10YearsKB = totalTransactions10Years * avgTransactionSize;
    
    console.log('\n💾 Storage Requirements:');
    console.log(`   Storage per year: ${(storagePerYearKB / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Storage (10 years): ${(storage10YearsKB / 1024 / 1024).toFixed(2)} GB`);
    
    // MongoDB Atlas tiers needed
    console.log('\n🗄️ MongoDB Atlas Requirements:');
    
    // M0 (Free) - 512 MB
    const m0Capacity = 512 * 1024 * 1024 / avgTransactionSize; // transactions
    const m0Users = Math.floor(m0Capacity / (doubledYearlyRate * 10));
    console.log(`   M0 Free (512 MB): ${m0Users} users - INSUFFICIENT`);
    
    // M2 ($25/mo) - 10 GB
    const m2Capacity = 10 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m2Users = Math.floor(m2Capacity / (doubledYearlyRate * 10));
    console.log(`   M2 Standard ($25/mo, 10 GB): ${m2Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M10 ($57/mo) - 80 GB
    const m10Capacity = 80 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m10Users = Math.floor(m10Capacity / (doubledYearlyRate * 10));
    console.log(`   M10 ($57/mo, 80 GB): ${m10Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M20 ($149/mo) - 160 GB
    const m20Capacity = 160 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m20Users = Math.floor(m20Capacity / (doubledYearlyRate * 10));
    console.log(`   M20 ($149/mo, 160 GB): ${m20Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M30 ($464/mo) - 350 GB
    const m30Capacity = 350 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m30Users = Math.floor(m30Capacity / (doubledYearlyRate * 10));
    console.log(`   M30 ($464/mo, 350 GB): ${m30Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M40 ($771/mo) - 750 GB
    const m40Capacity = 750 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m40Users = Math.floor(m40Capacity / (doubledYearlyRate * 10));
    console.log(`   M40 ($771/mo, 750 GB): ${m40Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M80 ($2,084/mo) - 1.5 TB
    const m80Capacity = 1.5 * 1024 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m80Users = Math.floor(m80Capacity / (doubledYearlyRate * 10));
    console.log(`   M80 ($2,084/mo, 1.5 TB): ${m80Users.toLocaleString()} users - INSUFFICIENT`);
    
    // M200 ($5,426/mo) - 3 TB
    const m200Capacity = 3 * 1024 * 1024 * 1024 * 1024 / avgTransactionSize;
    const m200Users = Math.floor(m200Capacity / (doubledYearlyRate * 10));
    console.log(`   M200 ($5,426/mo, 3 TB): ${m200Users.toLocaleString()} users - INSUFFICIENT`);
    
    // Calculate clusters needed
    const clustersNeeded = Math.ceil(totalUsers / m200Users);
    const monthlyCost = clustersNeeded * 5426;
    
    console.log(`\n🔧 Cluster Configuration for 500k Users:`);
    console.log(`   Clusters needed: ${clustersNeeded} x M200`);
    console.log(`   Monthly database cost: $${monthlyCost.toLocaleString()}`);
    console.log(`   Annual database cost: $${(monthlyCost * 12).toLocaleString()}`);
    
    // API requirements
    console.log('\n🌐 API Infrastructure Requirements:');
    
    // Requests per day
    const requestsPerUserPerDay = 10; // Average API calls
    const totalRequestsPerDay = totalUsers * requestsPerUserPerDay;
    const requestsPerSecond = totalRequestsPerDay / 86400;
    const peakRequestsPerSecond = requestsPerSecond * 5; // 5x peak multiplier
    
    console.log(`   Daily API requests: ${totalRequestsPerDay.toLocaleString()}`);
    console.log(`   Average RPS: ${requestsPerSecond.toFixed(1)}`);
    console.log(`   Peak RPS: ${peakRequestsPerSecond.toFixed(1)}`);
    
    // Server requirements
    console.log('\n🖥️ Server Infrastructure:');
    
    // Each server can handle ~1000 RPS
    const serversNeeded = Math.ceil(peakRequestsPerSecond / 1000);
    const serverCostPerMonth = serversNeeded * 50; // $50/server avg
    
    console.log(`   Servers needed: ${serversNeeded}`);
    console.log(`   Monthly server cost: $${serverCostPerMonth.toLocaleString()}`);
    
    // Load balancer
    console.log(`   Load balancer: $100/month`);
    
    // CDN for static assets
    console.log(`   CDN: $50/month`);
    
    // Total infrastructure cost
    const totalMonthlyCost = monthlyCost + serverCostPerMonth + 100 + 50;
    const totalAnnualCost = totalMonthlyCost * 12;
    
    console.log('\n💰 Total Infrastructure Cost:');
    console.log(`   Monthly: $${totalMonthlyCost.toLocaleString()}`);
    console.log(`   Annual: $${totalAnnualCost.toLocaleString()}`);
    
    // Revenue projections
    console.log('\n💵 Revenue Projections:');
    
    // Pricing tiers
    const pricingTiers = [
      { name: 'Free', users: 0.1, price: 0 }, // 10% free users
      { name: 'Basic', users: 0.3, price: 5 }, // 30% at $5/mo
      { name: 'Pro', users: 0.4, price: 15 }, // 40% at $15/mo
      { name: 'Business', users: 0.2, price: 50 }, // 20% at $50/mo
    ];
    
    let monthlyRevenue = 0;
    pricingTiers.forEach(tier => {
      const tierUsers = totalUsers * tier.users;
      const tierRevenue = tierUsers * tier.price;
      monthlyRevenue += tierRevenue;
      console.log(`   ${tier.name}: ${Math.round(tierUsers).toLocaleString()} users × $${tier.price} = $${tierRevenue.toLocaleString()}/mo`);
    });
    
    const annualRevenue = monthlyRevenue * 12;
    const profit = monthlyRevenue - totalMonthlyCost;
    const profitMargin = (profit / monthlyRevenue) * 100;
    
    console.log(`\n📈 Financial Projections:`);
    console.log(`   Monthly revenue: $${monthlyRevenue.toLocaleString()}`);
    console.log(`   Annual revenue: $${annualRevenue.toLocaleString()}`);
    console.log(`   Monthly profit: $${profit.toLocaleString()}`);
    console.log(`   Profit margin: ${profitMargin.toFixed(1)}%`);
    
    // Optimization strategies
    console.log('\n🔧 Critical Optimization Strategies:');
    console.log('   1. Data Archiving:');
    console.log('      - Archive transactions > 2 years to cold storage');
    console.log('      - Reduce active storage by 70%');
    console.log('      - Use AWS S3 Glacier for archived data');
    
    console.log('\n   2. Database Sharding:');
    console.log('      - Shard by user ID');
    console.log('      - Distribute across multiple clusters');
    console.log('      - Improve query performance');
    
    console.log('\n   3. Caching Strategy:');
    console.log('      - Redis for session data');
    console.log('      - CloudFlare for API responses');
    console.log('      - Reduce database load by 60%');
    
    console.log('\n   4. Microservices Architecture:');
    console.log('      - Separate email processing service');
    console.log('      - Dedicated analytics service');
    console.log('      - Independent scaling');
    
    console.log('\n   5. Cost Optimization:');
    console.log('      - Use reserved instances for 30% savings');
    console.log('      - Implement auto-scaling');
    console.log('      - Optimize query indexes');
    
    // Break-even analysis
    const breakEvenUsers = totalMonthlyCost / 10; // Assuming $10 ARPU
    console.log('\n🎯 Break-even Analysis:');
    console.log(`   Break-even at ${breakEvenUsers.toLocaleString()} users (assuming $10 ARPU)`);
    console.log(`   Current projection: ${totalUsers.toLocaleString()} users`);
    console.log(`   Safety margin: ${((totalUsers - breakEvenUsers) / totalUsers * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Calculation failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

calculate500kUsers();
