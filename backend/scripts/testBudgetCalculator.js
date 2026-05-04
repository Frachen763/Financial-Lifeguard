import dotenv from 'dotenv';
import { 
  generateBudgetSuggestions, 
  getCostLevel, 
  calculateNeedsPercentage,
  getBaseCategoryWeights,
  applyIncomeAdjustments,
  applyLocationAdjustments,
  normalizeWeights,
  applyValidationRules
} from '../utils/budgetCalculator.js';

dotenv.config();

const testBudgetCalculator = async () => {
  try {
    console.log('🧪 Testing Budget Calculator System...');
    
    // Test 1: Cost Level Detection
    console.log('\n📍 Test 1: Cost Level Detection');
    console.log('=====================================');
    
    const testCities = [
      { city: 'Mumbai', expected: 'high' },
      { city: 'Bangalore', expected: 'high' },
      { city: 'Lucknow', expected: 'medium' },
      { city: 'Jorhat', expected: 'low' },
      { city: 'Unknown City', expected: 'low' }
    ];
    
    testCities.forEach(({ city, expected }) => {
      const result = getCostLevel(city);
      const status = result === expected ? '✅' : '❌';
      console.log(`${status} ${city}: ${result} (expected: ${expected})`);
    });
    
    // Test 2: Needs Percentage Calculation
    console.log('\n💰 Test 2: Needs Percentage Calculation');
    console.log('==========================================');
    
    const testProfiles = [
      { occupation: 'Student', costLevel: 'high', expected: 0.80 },
      { occupation: 'Student', costLevel: 'medium', expected: 0.70 },
      { occupation: 'Student', costLevel: 'low', expected: 0.60 },
      { occupation: 'Employee', costLevel: 'high', expected: 0.65 },
      { occupation: 'Employee', costLevel: 'medium', expected: 0.55 },
      { occupation: 'Employee', costLevel: 'low', expected: 0.45 },
      { occupation: 'Self-Employed', costLevel: 'high', expected: 0.60 },
      { occupation: 'Self-Employed', costLevel: 'medium', expected: 0.50 },
      { occupation: 'Self-Employed', costLevel: 'low', expected: 0.40 }
    ];
    
    testProfiles.forEach(({ occupation, costLevel, expected }) => {
      const result = calculateNeedsPercentage(occupation, costLevel);
      const status = Math.abs(result - expected) < 0.01 ? '✅' : '❌';
      console.log(`${status} ${occupation} + ${costLevel}: ${(result * 100).toFixed(1)}% (expected: ${(expected * 100).toFixed(1)}%)`);
    });
    
    // Test 3: Complete Budget Generation
    console.log('\n🎯 Test 3: Complete Budget Generation');
    console.log('=====================================');
    
    const testScenarios = [
      {
        name: 'Student in Low Cost City',
        profile: { occupation: 'Student', monthlyIncome: 10000, city: 'Jorhat' }
      },
      {
        name: 'Employee in Medium Cost City',
        profile: { occupation: 'Employee', monthlyIncome: 50000, city: 'Lucknow' }
      },
      {
        name: 'Self-Employed in High Cost City',
        profile: { occupation: 'Self-Employed', monthlyIncome: 100000, city: 'Mumbai' }
      },
      {
        name: 'Low Income Employee',
        profile: { occupation: 'Employee', monthlyIncome: 20000, city: 'Bangalore' }
      },
      {
        name: 'High Income Student',
        profile: { occupation: 'Student', monthlyIncome: 90000, city: 'Delhi' }
      }
    ];
    
    testScenarios.forEach((scenario, index) => {
      console.log(`\n${index + 1}. ${scenario.name}:`);
      console.log(`   Profile: ${JSON.stringify(scenario.profile)}`);
      
      try {
        const result = generateBudgetSuggestions(scenario.profile);
        
        console.log(`   ✅ Needs Budget: ₹${result.needs_budget} (${result.needs_percentage}%)`);
        console.log(`   📍 Cost Level: ${result.cost_level}`);
        console.log(`   📊 Categories:`);
        
        let totalCategoryBudget = 0;
        result.categories.forEach(category => {
          console.log(`      ${category.name}: ₹${category.suggested_amount} (₹${category.range.min}-₹${category.range.max})`);
          totalCategoryBudget += category.suggested_amount;
        });
        
        console.log(`   💰 Total Allocated: ₹${totalCategoryBudget}`);
        console.log(`   ✅ Validation: ${totalCategoryBudget === result.needs_budget ? 'PASS' : 'FAIL'}`);
        
        // Additional validation checks
        const foodDiningCategory = result.categories.find(c => c.name === 'Food & Dining');
        const groceriesCategory = result.categories.find(c => c.name === 'Groceries');
        const shoppingCategory = result.categories.find(c => c.name === 'Shopping');
        
        if (foodDiningCategory && groceriesCategory) {
          const foodDiningOk = foodDiningCategory.suggested_amount <= result.needs_budget * 0.15;
          const groceriesOk = groceriesCategory.suggested_amount >= foodDiningCategory.suggested_amount;
          console.log(`   🍽️  Food & Dining ≤ 15%: ${foodDiningOk ? 'PASS' : 'FAIL'}`);
          console.log(`   🛒 Groceries ≥ Food & Dining: ${groceriesOk ? 'PASS' : 'FAIL'}`);
        }
        
        if (shoppingCategory) {
          const shoppingOk = shoppingCategory.suggested_amount <= result.needs_budget * 0.20;
          console.log(`   🛍️  Shopping ≤ 20%: ${shoppingOk ? 'PASS' : 'FAIL'}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    });
    
    // Test 4: Edge Cases
    console.log('\n⚠️ Test 4: Edge Cases');
    console.log('======================');
    
    const edgeCases = [
      { name: 'Very Low Income', profile: { occupation: 'Student', monthlyIncome: 5000, city: 'Jorhat' } },
      { name: 'Very High Income', profile: { occupation: 'Self-Employed', monthlyIncome: 500000, city: 'Mumbai' } },
      { name: 'Unknown City', profile: { occupation: 'Employee', monthlyIncome: 30000, city: 'SomeUnknownCity' } }
    ];
    
    edgeCases.forEach((testCase, index) => {
      console.log(`\n${index + 1}. ${testCase.name}:`);
      try {
        const result = generateBudgetSuggestions(testCase.profile);
        console.log(`   ✅ Generated successfully: ₹${result.needs_budget} needs budget`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    });
    
    console.log('\n🎉 Budget Calculator Testing Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
};

testBudgetCalculator();
