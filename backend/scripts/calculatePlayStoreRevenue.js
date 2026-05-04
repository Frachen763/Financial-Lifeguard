import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const calculatePlayStoreRevenue = async () => {
  try {
    console.log('📱 Calculating revenue strategies for 100k downloads on Google Play...');
    
    const totalDownloads = 100000;
    
    // Conversion rates (industry averages)
    const installRate = 0.8; // 80% of downloads result in installation
    const activationRate = 0.6; // 60% of installed users activate the app
    const retentionRate = {
      day1: 0.4, // 40% retention after 1 day
      day7: 0.2, // 20% retention after 7 days
      day30: 0.1, // 10% retention after 30 days
      day90: 0.05 // 5% retention after 90 days
    };
    
    const activeUsers = {
      daily: totalDownloads * installRate * activationRate * retentionRate.day1,
      weekly: totalDownloads * installRate * activationRate * retentionRate.day7,
      monthly: totalDownloads * installRate * activationRate * retentionRate.day30,
      quarterly: totalDownloads * installRate * activationRate * retentionRate.day90
    };
    
    console.log('\n📊 User Base Analysis:');
    console.log(`   Total downloads: ${totalDownloads.toLocaleString()}`);
    console.log(`   Installed users: ${(totalDownloads * installRate).toLocaleString()}`);
    console.log(`   Activated users: ${(totalDownloads * installRate * activationRate).toLocaleString()}`);
    console.log(`   Daily active users (DAU): ${activeUsers.daily.toLocaleString()}`);
    console.log(`   Monthly active users (MAU): ${activeUsers.monthly.toLocaleString()}`);
    
    // Revenue strategies
    console.log('\n💰 Revenue Strategies:');
    
    // 1. Freemium Model
    console.log('\n1. FREEMIUM MODEL:');
    const freemiumConversionRate = 0.03; // 3% convert to paid
    const paidUsers = activeUsers.monthly * freemiumConversionRate;
    const pricingTiers = [
      { name: 'Basic', percentage: 0.6, price: 4.99 },
      { name: 'Pro', percentage: 0.3, price: 9.99 },
      { name: 'Premium', percentage: 0.1, price: 19.99 }
    ];
    
    let monthlyFreemiumRevenue = 0;
    pricingTiers.forEach(tier => {
      const tierUsers = paidUsers * tier.percentage;
      const tierRevenue = tierUsers * tier.price;
      monthlyFreemiumRevenue += tierRevenue;
      console.log(`   ${tier.name}: ${tierUsers.toFixed(0)} users × $${tier.price} = $${tierRevenue.toFixed(0)}/mo`);
    });
    
    console.log(`   Total freemium revenue: $${monthlyFreemiumRevenue.toFixed(0)}/mo`);
    
    // 2. In-App Purchases
    console.log('\n2. IN-APP PURCHASES:');
    const iapConversionRate = 0.05; // 5% make purchases
    const avgPurchasePerUser = 3.99; // Average purchase amount
    const purchaseFrequency = 0.3; // 30% purchase monthly
    const iapUsers = activeUsers.monthly * iapConversionRate;
    const monthlyIAPRevenue = iapUsers * avgPurchasePerUser * purchaseFrequency;
    
    console.log(`   Users making purchases: ${iapUsers.toFixed(0)}`);
    console.log(`   Average purchase: $${avgPurchasePerUser}`);
    console.log(`   Purchase frequency: ${(purchaseFrequency * 100).toFixed(0)}% monthly`);
    console.log(`   Monthly IAP revenue: $${monthlyIAPRevenue.toFixed(0)}/mo`);
    
    // 3. Subscription Model
    console.log('\n3. SUBSCRIPTION MODEL:');
    const subscriptionConversionRate = 0.02; // 2% subscribe
    const subscriptionTiers = [
      { name: 'Monthly', percentage: 0.7, price: 2.99 },
      { name: 'Annual', percentage: 0.3, price: 29.99 }
    ];
    
    let monthlySubscriptionRevenue = 0;
    subscriptionTiers.forEach(tier => {
      const tierUsers = activeUsers.monthly * subscriptionConversionRate * tier.percentage;
      const monthlyPrice = tier.name === 'Annual' ? tier.price / 12 : tier.price;
      const tierRevenue = tierUsers * monthlyPrice;
      monthlySubscriptionRevenue += tierRevenue;
      console.log(`   ${tier.name}: ${tierUsers.toFixed(0)} users × $${monthlyPrice.toFixed(2)}/mo = $${tierRevenue.toFixed(0)}/mo`);
    });
    
    console.log(`   Total subscription revenue: $${monthlySubscriptionRevenue.toFixed(0)}/mo`);
    
    // 4. Advertising Revenue
    console.log('\n4. ADVERTISING REVENUE:');
    const adImpressionsPerDay = 5; // Average ads shown per user per day
    const cpm = 1.5; // $1.50 per 1000 impressions (average for finance apps)
    const fillRate = 0.7; // 70% ad fill rate
    
    const dailyImpressions = activeUsers.daily * adImpressionsPerDay * fillRate;
    const dailyAdRevenue = (dailyImpressions / 1000) * cpm;
    const monthlyAdRevenue = dailyAdRevenue * 30;
    
    console.log(`   Daily impressions: ${dailyImpressions.toFixed(0)}`);
    console.log(`   CPM: $${cpm}`);
    console.log(`   Fill rate: ${(fillRate * 100).toFixed(0)}%`);
    console.log(`   Monthly ad revenue: $${monthlyAdRevenue.toFixed(0)}/mo`);
    
    // 5. Data Analytics (Anonymous)
    console.log('\n5. DATA ANALYTICS (Anonymous & Aggregated):');
    const dataBuyers = [
      { name: 'Financial Research', price: 5000 },
      { name: 'Market Trends', price: 3000 },
      { name: 'Consumer Insights', price: 2000 }
    ];
    
    const monthlyDataRevenue = dataBuyers.reduce((sum, buyer) => sum + buyer.price, 0);
    console.log(`   Potential monthly data revenue: $${monthlyDataRevenue.toLocaleString()}/mo`);
    console.log(`   (Note: Must be fully anonymized and compliant with privacy laws)`);
    
    // 6. Partnerships
    console.log('\n6. PARTNERSHIPS & AFFILIATES:');
    const partnershipRevenue = {
      bankingReferral: 2000, // Referrals to banks
      insuranceCommission: 1500, // Insurance partnerships
      investmentPlatform: 1000, // Investment platform referrals
      creditCardOffers: 800 // Credit card affiliate programs
    };
    
    const totalPartnershipRevenue = Object.values(partnershipRevenue).reduce((sum, val) => sum + val, 0);
    Object.entries(partnershipRevenue).forEach(([key, value]) => {
      console.log(`   ${key}: $${value.toLocaleString()}/mo`);
    });
    console.log(`   Total partnership revenue: $${totalPartnershipRevenue.toLocaleString()}/mo`);
    
    // 7. Premium Features
    console.log('\n7. PREMIUM FEATURES (One-time purchases):');
    const premiumFeatures = [
      { name: 'Advanced Analytics', price: 9.99, conversion: 0.01 },
      { name: 'Export Reports', price: 4.99, conversion: 0.02 },
      { name: 'Custom Categories', price: 6.99, conversion: 0.015 },
      { name: 'API Access', price: 19.99, conversion: 0.005 }
    ];
    
    let monthlyPremiumRevenue = 0;
    premiumFeatures.forEach(feature => {
      const featureUsers = activeUsers.monthly * feature.conversion;
      const featureRevenue = featureUsers * feature.price;
      monthlyPremiumRevenue += featureRevenue;
      console.log(`   ${feature.name}: ${featureUsers.toFixed(0)} users × $${feature.price} = $${featureRevenue.toFixed(0)}/mo`);
    });
    
    console.log(`   Total premium features revenue: $${monthlyPremiumRevenue.toFixed(0)}/mo`);
    
    // Total revenue projection
    const totalMonthlyRevenue = monthlyFreemiumRevenue + monthlyIAPRevenue + 
                               monthlySubscriptionRevenue + monthlyAdRevenue + 
                               monthlyDataRevenue + totalPartnershipRevenue + 
                               monthlyPremiumRevenue;
    
    console.log('\n📈 TOTAL REVENUE PROJECTION:');
    console.log('   Revenue Sources:');
    console.log(`   - Freemium: $${monthlyFreemiumRevenue.toFixed(0)}/mo (${(monthlyFreemiumRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - In-App Purchases: $${monthlyIAPRevenue.toFixed(0)}/mo (${(monthlyIAPRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - Subscriptions: $${monthlySubscriptionRevenue.toFixed(0)}/mo (${(monthlySubscriptionRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - Advertising: $${monthlyAdRevenue.toFixed(0)}/mo (${(monthlyAdRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - Data Analytics: $${monthlyDataRevenue.toLocaleString()}/mo (${(monthlyDataRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - Partnerships: $${totalPartnershipRevenue.toLocaleString()}/mo (${(totalPartnershipRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log(`   - Premium Features: $${monthlyPremiumRevenue.toFixed(0)}/mo (${(monthlyPremiumRevenue/totalMonthlyRevenue*100).toFixed(1)}%)`);
    console.log('\n' + '='.repeat(50));
    console.log(`   TOTAL MONTHLY REVENUE: $${totalMonthlyRevenue.toFixed(0)}`);
    console.log(`   TOTAL ANNUAL REVENUE: $${(totalMonthlyRevenue * 12).toLocaleString()}`);
    
    // Cost analysis
    console.log('\n💸 COST ANALYSIS:');
    const costs = {
      googlePlayFee: totalMonthlyRevenue * 0.15, // 15% Google Play fee
      serverCosts: 5000, // Servers, databases
      developmentCosts: 8000, // Developers, maintenance
      marketingCosts: 3000, // User acquisition
      supportCosts: 2000, // Customer support
      otherCosts: 1000 // Legal, admin, etc.
    };
    
    const totalCosts = Object.values(costs).reduce((sum, val) => sum + val, 0);
    const monthlyProfit = totalMonthlyRevenue - totalCosts;
    const profitMargin = (monthlyProfit / totalMonthlyRevenue) * 100;
    
    console.log('   Monthly Costs:');
    Object.entries(costs).forEach(([key, value]) => {
      console.log(`   - ${key}: $${value.toLocaleString()}`);
    });
    console.log(`   Total Costs: $${totalCosts.toLocaleString()}`);
    console.log(`   Monthly Profit: $${monthlyProfit.toLocaleString()}`);
    console.log(`   Profit Margin: ${profitMargin.toFixed(1)}%`);
    
    // ARPU (Average Revenue Per User)
    const arpu = totalMonthlyRevenue / activeUsers.monthly;
    const arpuAnnually = arpu * 12;
    
    console.log('\n📊 KEY METRICS:');
    console.log(`   ARPU (Monthly): $${arpu.toFixed(2)}`);
    console.log(`   ARPU (Annually): $${arpuAnnually.toFixed(2)}`);
    console.log(`   LTV (Lifetime Value): $${(arpuAnnually * 2).toFixed(2)}`); // Assuming 2-year average user lifetime
    
    // Growth scenarios
    console.log('\n🚀 GROWTH SCENARIOS:');
    const growthRates = [0.5, 1.0, 2.0]; // 50%, 100%, 200% growth
    growthRates.forEach(rate => {
      const futureRevenue = totalMonthlyRevenue * (1 + rate);
      console.log(`   ${(rate * 100).toFixed(0)}% growth: $${futureRevenue.toFixed(0)}/mo`);
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Start with advertising + freemium model');
    console.log('   2. Add subscriptions after 6 months');
    console.log('   3. Implement partnerships early');
    console.log('   4. Focus on user retention (critical for revenue)');
    console.log('   5. A/B test pricing strategies');
    console.log('   6. Consider regional pricing differences');
    console.log('   7. Implement referral programs for growth');
    
  } catch (error) {
    console.error('❌ Calculation failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

calculatePlayStoreRevenue();
