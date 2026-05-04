/**
 * Rule-based Monthly Budget Suggestion System
 * Generates realistic budget suggestions based on user profile data
 */

// Cost level mapping for Indian locations
const COST_LEVEL_MAPPING = {
  // High cost metro cities
  high: [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
    'Hyderabad', 'Pune', 'Gurgaon', 'Noida', 'Jaipur'
  ],
  // Medium cost cities
  medium: [
    'Ahmedabad', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur',
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad'
  ],
  // Low cost (everything else)
  low: []
};

/**
 * Determine cost level based on location
 * @param {string} city - City name
 * @returns {string} - 'high', 'medium', or 'low'
 */
const getCostLevel = (city) => {
  if (!city) return 'medium';
  
  const normalizedCity = city.toLowerCase().trim();
  
  if (COST_LEVEL_MAPPING.high.some(highCity => 
    highCity.toLowerCase() === normalizedCity)) {
    return 'high';
  }
  
  if (COST_LEVEL_MAPPING.medium.some(mediumCity => 
    mediumCity.toLowerCase() === normalizedCity)) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Calculate needs percentage based on occupation and location
 * @param {string} occupation - User's occupation
 * @param {string} costLevel - Location cost level
 * @returns {number} - Needs percentage (0-1)
 */
const calculateNeedsPercentage = (occupation, costLevel) => {
  // Base percentages
  const basePercentages = {
    'Student': 0.70,
    'Employee': 0.55,
    'Self-Employed': 0.50
  };
  
  let percentage = basePercentages[occupation] || 0.55;
  
  // Location adjustments
  const locationAdjustments = {
    'high': 0.10,
    'medium': 0,
    'low': -0.10
  };
  
  percentage += locationAdjustments[costLevel] || 0;
  
  // Clamp between 40% and 80%
  return Math.max(0.40, Math.min(0.80, percentage));
};

/**
 * Get base category weights
 * @returns {Object} - Category weights
 */
const getBaseCategoryWeights = () => {
  return {
    'Groceries': 0.35,
    'Bills & Utilities': 0.25,
    'Transportation': 0.15,
    'Food & Dining': 0.10,
    'Shopping': 0.15
  };
};

/**
 * Apply income-based adjustments to category weights
 * @param {Object} weights - Base weights
 * @param {number} monthlyIncome - Monthly income
 * @returns {Object} - Adjusted weights
 */
const applyIncomeAdjustments = (weights, monthlyIncome) => {
  const adjustedWeights = { ...weights };
  
  if (monthlyIncome < 25000) {
    // Low income adjustments
    adjustedWeights['Groceries'] = 0.40;
    adjustedWeights['Bills & Utilities'] = 0.30;
    adjustedWeights['Transportation'] = 0.15;
    adjustedWeights['Food & Dining'] = 0.05;
    adjustedWeights['Shopping'] = 0.10;
  } else if (monthlyIncome > 80000) {
    // High income adjustments
    adjustedWeights['Groceries'] = 0.30;
    adjustedWeights['Bills & Utilities'] = 0.25;
    adjustedWeights['Transportation'] = 0.15;
    adjustedWeights['Food & Dining'] = 0.15;
    adjustedWeights['Shopping'] = 0.15;
  }
  
  return adjustedWeights;
};

/**
 * Apply location-based adjustments to category weights
 * @param {Object} weights - Current weights
 * @param {string} costLevel - Location cost level
 * @returns {Object} - Adjusted weights
 */
const applyLocationAdjustments = (weights, costLevel) => {
  const adjustedWeights = { ...weights };
  
  if (costLevel === 'high') {
    // High cost location adjustments
    adjustedWeights['Bills & Utilities'] += 0.05;
    adjustedWeights['Transportation'] += 0.05;
    
    // Reduce Shopping and Groceries proportionally
    const totalReduction = 0.10; // Total to reduce
    const shoppingRatio = adjustedWeights['Shopping'] / (adjustedWeights['Shopping'] + adjustedWeights['Groceries']);
    
    adjustedWeights['Shopping'] -= totalReduction * shoppingRatio;
    adjustedWeights['Groceries'] -= totalReduction * (1 - shoppingRatio);
    
  } else if (costLevel === 'low') {
    // Low cost location adjustments
    adjustedWeights['Bills & Utilities'] -= 0.05;
    adjustedWeights['Transportation'] -= 0.05;
    
    // Increase Shopping proportionally
    const totalIncrease = 0.10; // Total to increase
    adjustedWeights['Shopping'] += totalIncrease;
  }
  
  return adjustedWeights;
};

/**
 * Normalize category weights to sum to 100%
 * @param {Object} weights - Unnormalized weights
 * @returns {Object} - Normalized weights
 */
const normalizeWeights = (weights) => {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
  if (total === 0) return weights;
  
  const normalized = {};
  for (const [category, weight] of Object.entries(weights)) {
    normalized[category] = weight / total;
  }
  
  return normalized;
};

/**
 * Apply validation rules to category budgets
 * @param {Object} categoryBudgets - Category budgets
 * @param {number} needsBudget - Total needs budget
 * @returns {Object} - Validated budgets
 */
const applyValidationRules = (categoryBudgets, needsBudget) => {
  const validated = { ...categoryBudgets };
  const totalBudget = Object.values(validated).reduce((sum, amount) => sum + amount, 0);
  
  // Ensure total doesn't exceed needs budget
  if (totalBudget > needsBudget) {
    const scaleFactor = needsBudget / totalBudget;
    for (const category of Object.keys(validated)) {
      validated[category] = Math.round(validated[category] * scaleFactor);
    }
  }
  
  // Food & Dining should not exceed 15% of needs budget
  const maxFoodDining = needsBudget * 0.15;
  if (validated['Food & Dining'] > maxFoodDining) {
    const excess = validated['Food & Dining'] - maxFoodDining;
    validated['Food & Dining'] = Math.round(maxFoodDining);
    // Redistribute excess to Groceries
    validated['Groceries'] += excess;
  }
  
  // Groceries should be >= Food & Dining
  if (validated['Groceries'] < validated['Food & Dining']) {
    const diff = validated['Food & Dining'] - validated['Groceries'];
    validated['Groceries'] = validated['Food & Dining'];
    // Take difference from Shopping
    validated['Shopping'] = Math.max(0, validated['Shopping'] - diff);
  }
  
  // Shopping should not exceed 20% of needs budget
  const maxShopping = needsBudget * 0.20;
  if (validated['Shopping'] > maxShopping) {
    const excess = validated['Shopping'] - maxShopping;
    validated['Shopping'] = Math.round(maxShopping);
    // Redistribute excess to Groceries
    validated['Groceries'] += excess;
  }
  
  // No category should be less than 5% of needs budget
  const minCategoryBudget = needsBudget * 0.05;
  for (const category of Object.keys(validated)) {
    if (validated[category] < minCategoryBudget && validated[category] > 0) {
      const deficit = minCategoryBudget - validated[category];
      validated[category] = Math.round(minCategoryBudget);
      // Take deficit from Shopping (most flexible)
      validated['Shopping'] = Math.max(0, validated['Shopping'] - deficit);
    }
  }
  
  // Final normalization to ensure total equals needs budget
  const finalTotal = Object.values(validated).reduce((sum, amount) => sum + amount, 0);
  if (finalTotal !== needsBudget) {
    const difference = needsBudget - finalTotal;
    validated['Groceries'] += difference; // Adjust Groceries for final balance
  }
  
  return validated;
};

/**
 * Generate budget suggestions based on user profile
 * @param {Object} userProfile - User profile data
 * @param {string} userProfile.occupation - User's occupation
 * @param {number} userProfile.monthlyIncome - Monthly income
 * @param {string} userProfile.city - User's city
 * @returns {Object} - Budget suggestions
 */
const generateBudgetSuggestions = (userProfile) => {
  const { occupation, monthlyIncome, city } = userProfile;
  
  if (!occupation || !monthlyIncome || monthlyIncome <= 0) {
    throw new Error('Invalid user profile: occupation and valid monthly income are required');
  }
  
  // Step 1: Determine cost level
  const costLevel = getCostLevel(city);
  console.log(`📍 Cost level for ${city}: ${costLevel}`);
  
  // Step 2: Calculate needs percentage
  const needsPercentage = calculateNeedsPercentage(occupation, costLevel);
  console.log(`💰 Needs percentage: ${(needsPercentage * 100).toFixed(1)}%`);
  
  // Step 3: Calculate needs budget
  const needsBudget = Math.round(monthlyIncome * needsPercentage);
  console.log(`💵 Needs budget: ₹${needsBudget}`);
  
  // Step 4: Get base category weights
  let categoryWeights = getBaseCategoryWeights();
  console.log('📊 Base weights:', categoryWeights);
  
  // Step 5: Apply income-based adjustments
  categoryWeights = applyIncomeAdjustments(categoryWeights, monthlyIncome);
  console.log('💸 After income adjustments:', categoryWeights);
  
  // Step 6: Apply location-based adjustments
  categoryWeights = applyLocationAdjustments(categoryWeights, costLevel);
  console.log('🏙️ After location adjustments:', categoryWeights);
  
  // Step 7: Normalize weights
  categoryWeights = normalizeWeights(categoryWeights);
  console.log('⚖️ Normalized weights:', categoryWeights);
  
  // Step 8: Calculate category budgets
  let categoryBudgets = {};
  for (const [category, weight] of Object.entries(categoryWeights)) {
    categoryBudgets[category] = Math.round(needsBudget * weight);
  }
  console.log('💰 Category budgets:', categoryBudgets);
  
  // Step 9: Apply validation rules
  categoryBudgets = applyValidationRules(categoryBudgets, needsBudget);
  console.log('✅ Validated budgets:', categoryBudgets);
  
  // Step 10: Format output
  const categories = [];
  for (const [name, amount] of Object.entries(categoryBudgets)) {
    categories.push({
      name,
      suggested_amount: amount,
      range: {
        min: Math.round(amount * 0.9),
        max: Math.round(amount * 1.1)
      }
    });
  }
  
  const result = {
    needs_budget: needsBudget,
    needs_percentage: Math.round(needsPercentage * 100),
    cost_level: costLevel,
    categories,
    metadata: {
      occupation,
      monthly_income: monthlyIncome,
      city: city || 'Unknown',
      total_allocated: Object.values(categoryBudgets).reduce((sum, amount) => sum + amount, 0)
    }
  };
  
  console.log('🎯 Final result:', result);
  return result;
};

export {
  generateBudgetSuggestions,
  getCostLevel,
  calculateNeedsPercentage,
  getBaseCategoryWeights,
  applyIncomeAdjustments,
  applyLocationAdjustments,
  normalizeWeights,
  applyValidationRules
};
