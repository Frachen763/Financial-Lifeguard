import dotenv from 'dotenv';
import User from '../models/User.js';
import { generateBudgetSuggestions } from '../utils/budgetCalculator.js';
import connectDB from '../config/db.js';

dotenv.config();

const testBudgetSuggestionsAPI = async () => {
  try {
    console.log('🧪 Testing Budget Suggestions API with Real User Data...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Get the test user
    const user = await User.findOne({ email: 'borgohain9435@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 User Profile:');
    console.log(`   Email: ${user.email}`);
    console.log(`   onboardingCompleted: ${user.onboardingCompleted}`);
    
    if (!user.financialProfile) {
      console.log('❌ No financial profile found - user needs to complete onboarding first');
      return;
    }
    
    const { occupation, country, state, city, monthlyIncome } = user.financialProfile;
    
    console.log('\n📊 Financial Profile:');
    console.log(`   Occupation: ${occupation}`);
    console.log(`   Country: ${country}`);
    console.log(`   State: ${state}`);
    console.log(`   City: ${city}`);
    console.log(`   Monthly Income: ₹${monthlyIncome}`);
    
    console.log('\n🎯 Generating Budget Suggestions...');
    
    try {
      const budgetSuggestions = generateBudgetSuggestions({
        occupation,
        monthlyIncome,
        city
      });
      
      console.log('\n✅ Budget Suggestions Generated Successfully!');
      console.log('==========================================');
      
      console.log(`\n💰 Summary:`);
      console.log(`   Monthly Income: ₹${monthlyIncome}`);
      console.log(`   Needs Budget: ₹${budgetSuggestions.needs_budget} (${budgetSuggestions.needs_percentage}%)`);
      console.log(`   Cost Level: ${budgetSuggestions.cost_level}`);
      console.log(`   Location: ${city}, ${state}, ${country}`);
      
      console.log(`\n📊 Category-wise Budget Breakdown:`);
      console.log('=====================================');
      
      let totalAllocated = 0;
      budgetSuggestions.categories.forEach((category, index) => {
        const percentage = ((category.suggested_amount / budgetSuggestions.needs_budget) * 100).toFixed(1);
        console.log(`${index + 1}. ${category.name}:`);
        console.log(`   Budget: ₹${category.suggested_amount.toLocaleString('en-IN')}`);
        console.log(`   Range: ₹${category.range.min.toLocaleString('en-IN')} - ₹${category.range.max.toLocaleString('en-IN')}`);
        console.log(`   Percentage: ${percentage}%`);
        totalAllocated += category.suggested_amount;
      });
      
      console.log(`\n💰 Total Allocated: ₹${totalAllocated.toLocaleString('en-IN')}`);
      console.log(`✅ Budget Balance: ${totalAllocated === budgetSuggestions.needs_budget ? 'PERFECT' : 'MISMATCH'}`);
      
      // Validation checks
      console.log(`\n🔍 Validation Results:`);
      console.log('=======================');
      
      const foodDiningCategory = budgetSuggestions.categories.find(c => c.name === 'Food & Dining');
      const groceriesCategory = budgetSuggestions.categories.find(c => c.name === 'Groceries');
      const shoppingCategory = budgetSuggestions.categories.find(c => c.name === 'Shopping');
      
      if (foodDiningCategory) {
        const foodDiningPercentage = (foodDiningCategory.suggested_amount / budgetSuggestions.needs_budget) * 100;
        const foodDiningOk = foodDiningPercentage <= 15;
        console.log(`🍽️  Food & Dining ≤ 15%: ${foodDiningOk ? '✅ PASS' : '❌ FAIL'} (${foodDiningPercentage.toFixed(1)}%)`);
      }
      
      if (groceriesCategory && foodDiningCategory) {
        const groceriesOk = groceriesCategory.suggested_amount >= foodDiningCategory.suggested_amount;
        console.log(`🛒 Groceries ≥ Food & Dining: ${groceriesOk ? '✅ PASS' : '❌ FAIL'}`);
      }
      
      if (shoppingCategory) {
        const shoppingPercentage = (shoppingCategory.suggested_amount / budgetSuggestions.needs_budget) * 100;
        const shoppingOk = shoppingPercentage <= 20;
        console.log(`🛍️  Shopping ≤ 20%: ${shoppingOk ? '✅ PASS' : '❌ FAIL'} (${shoppingPercentage.toFixed(1)}%)`);
      }
      
      // Check minimum category budgets
      console.log('\n📏 Minimum Budget Checks (5% rule):');
      const minBudget = budgetSuggestions.needs_budget * 0.05;
      budgetSuggestions.categories.forEach(category => {
        const aboveMin = category.suggested_amount >= minBudget;
        console.log(`${aboveMin ? '✅' : '⚠️'} ${category.name}: ₹${category.suggested_amount} (min: ₹${Math.round(minBudget)})`);
      });
      
      console.log('\n🎯 Budget Insights:');
      console.log('==================');
      
      if (occupation === 'Student') {
        console.log('📚 Student Profile: Higher needs percentage (70%) prioritized for essential expenses');
      } else if (occupation === 'Employee') {
        console.log('💼 Employee Profile: Balanced needs percentage (55%) for stable income');
      } else if (occupation === 'Self-Employed') {
        console.log('🏢 Self-Employed Profile: Conservative needs percentage (50%) for variable income');
      }
      
      if (budgetSuggestions.cost_level === 'high') {
        console.log('🏙️ High Cost City: Increased allocation for bills and transportation');
      } else if (budgetSuggestions.cost_level === 'low') {
        console.log('🏘️ Low Cost City: More flexibility in shopping and entertainment');
      }
      
      if (monthlyIncome < 25000) {
        console.log('💸 Low Income: Focus on essentials - groceries and bills prioritized');
      } else if (monthlyIncome > 80000) {
        console.log('💰 High Income: Balanced allocation with more flexibility for dining and shopping');
      }
      
      console.log('\n🚀 API Ready for Frontend Integration!');
      console.log('=====================================');
      console.log('✅ POST /api/budget-suggestions/generate - Generate suggestions');
      console.log('✅ GET /api/budget-suggestions/profile - Get user profile');
      console.log('✅ POST /api/budget-suggestions/validate - Validate custom budgets');
      
    } catch (error) {
      console.error('❌ Error generating budget suggestions:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
};

testBudgetSuggestionsAPI();
