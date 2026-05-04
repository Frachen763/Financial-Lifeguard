import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetSuggestionsAPI, budgetAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { useOnboarding } from '../hooks/useOnboarding';
import { 
  Wallet, 
  TrendingUp, 
  ShoppingCart, 
  Home, 
  Utensils, 
  Car,
  Zap,
  Plus,
  Edit3,
  Check,
  X,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import Loading from '../components/Common/Loading';
import ErrorMessage from '../components/Common/ErrorMessage';

const categoryIcons = {
  'Groceries': ShoppingCart,
  'Bills & Utilities': Zap,
  'Transportation': Car,
  'Food & Dining': Utensils,
  'Shopping': Wallet
};

const categoryColors = {
  'Groceries': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Bills & Utilities': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Transportation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Food & Dining': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Shopping': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
};

const Budget = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [customAmounts, setCustomAmounts] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationResults, setValidationResults] = useState(null);

  // Fetch user profile and budget suggestions
  const fetchBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, suggestionsRes, budgetRes] = await Promise.all([
        budgetSuggestionsAPI.getProfile(),
        budgetSuggestionsAPI.generate(),
        budgetAPI.getBudget().catch(() => ({ data: { data: null } })) // Budget might not exist yet
      ]);

      setUserProfile(profileRes.data.data);
      setSuggestions(suggestionsRes.data.data);
      setCurrentBudget(budgetRes.data.data);

      // Initialize custom amounts with suggestions
      if (suggestionsRes.data.data) {
        const initialAmounts = {};
        suggestionsRes.data.data.categories.forEach(category => {
          initialAmounts[category.name] = category.suggested_amount;
        });
        setCustomAmounts(initialAmounts);
      }

    } catch (err) {
      console.error('Error fetching budget data:', err);
      if (err.response?.status === 400 && err.response?.data?.error === 'FINANCIAL_PROFILE_REQUIRED') {
        setError('Please complete your onboarding profile first to create a budget.');
      } else {
        setError('Failed to load budget data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleAcceptSuggestion = (categoryName) => {
    if (!suggestions) return;
    
    const category = suggestions.categories.find(c => c.name === categoryName);
    if (category) {
      setCustomAmounts(prev => ({
        ...prev,
        [categoryName]: category.suggested_amount
      }));
      setEditingCategory(null);
    }
  };

  const handleCustomAmountChange = (categoryName, amount) => {
    setCustomAmounts(prev => ({
      ...prev,
      [categoryName]: parseInt(amount) || 0
    }));
  };

  const validateBudget = async () => {
    if (!suggestions) return;

    try {
      const validation = await budgetSuggestionsAPI.validate(
        customAmounts,
        suggestions.needs_budget
      );
      setValidationResults(validation.data.data);
      return validation.data.data.isValid;
    } catch (error) {
      console.error('Error validating budget:', error);
      return false;
    }
  };

  const handleSaveBudget = async () => {
    if (!suggestions) return;

    try {
      setSaving(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('🔑 Authentication token:', token ? `${token.substring(0, 20)}...` : 'None');
      if (!token) {
        console.error('No authentication token found');
        setError('Please log in to save your budget.');
        return;
      }
      
      // Validate first
      const isValid = await validateBudget();
      if (!isValid) {
        return;
      }

      // Prepare budget data
      const budgetData = {
        categories: Object.entries(customAmounts).map(([name, amount]) => ({
          name,
          allocated_amount: amount,
          spent_amount: 0 // Will be updated from transactions
        })),
        total_budget: suggestions.needs_budget,
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        is_active: true
      };

      console.log('Saving budget data:', budgetData);
      
      // Test backend connectivity first
      try {
        const healthResponse = await fetch('http://localhost:5000/api/health');
        console.log('Backend health check:', healthResponse.status);
      } catch (healthError) {
        console.error('Backend not reachable:', healthError);
        setError('Cannot connect to backend server. Please ensure it is running.');
        return;
      }
      
      const response = await budgetAPI.createBudget(budgetData);
      console.log('Budget save response:', response);
      
      // Hide suggestions after saving
      setShowSuggestions(false);
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error saving budget:', error);
      console.error('Error response:', error.response);
      setError(`Failed to save budget: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipBudget = () => {
    setShowSuggestions(false);
    navigate('/dashboard');
  };

  const getTotalAllocated = () => {
    return Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const getRemainingBudget = () => {
    if (!suggestions) return 0;
    return suggestions.needs_budget - getTotalAllocated();
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!suggestions || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please complete your onboarding profile first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Monthly Budget
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Based on your profile, here is your recommended monthly budget
          </p>
        </div>

        {/* Profile Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Profile
            </h2>
            <button
              onClick={() => navigate('/onboarding')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Occupation</p>
              <p className="font-medium text-gray-900 dark:text-white">{userProfile.occupation}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(userProfile.monthlyIncome)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {userProfile.city}, {userProfile.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cost Level</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {suggestions.cost_level}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Budget Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(userProfile.monthlyIncome)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Needs Budget</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(suggestions.needs_budget)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ({suggestions.needs_percentage}% of income)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Allocated</p>
              <p className={`text-2xl font-bold ${
                getTotalAllocated() > suggestions.needs_budget 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formatCurrency(getTotalAllocated())}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(getRemainingBudget())} remaining
              </p>
            </div>
          </div>
        </div>

        {/* Budget Suggestions */}
        {showSuggestions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Budget Suggestions Available
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  We've analyzed your profile to suggest optimal budget allocations. You can accept these suggestions or customize them according to your needs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category Budgets */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Budgets
          </h2>
          <div className="space-y-4">
            {suggestions.categories.map((category) => {
              const Icon = categoryIcons[category.name];
              const isEditing = editingCategory === category.name;
              const customAmount = customAmounts[category.name] || 0;
              const isUsingSuggestion = customAmount === category.suggested_amount;
              
              return (
                <div key={category.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColors[category.name]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Suggested: {formatCurrency(category.suggested_amount)} 
                          <span className="text-xs ml-1">
                            ({formatCurrency(category.range.min)}-{formatCurrency(category.range.max)})
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">₹</span>
                          <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => handleCustomAmountChange(category.name, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            min="0"
                            max={userProfile.monthlyIncome}
                          />
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              handleAcceptSuggestion(category.name);
                              setEditingCategory(null);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            title="Use Suggestion"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            isUsingSuggestion 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {formatCurrency(customAmount)}
                          </span>
                          {!isUsingSuggestion && (
                            <span className="text-xs text-orange-600 dark:text-orange-400">
                              Custom
                            </span>
                          )}
                          <button
                            onClick={() => setEditingCategory(category.name)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {showSuggestions && isUsingSuggestion && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      ✓ Using suggested amount
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Results */}
        {validationResults && !validationResults.isValid && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Budget Validation Issues
                </h3>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                {validationResults.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Warnings:</p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {validationResults.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handleSkipBudget}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Skip for Now
          </button>
          <div className="flex gap-3">
            {showSuggestions && (
              <button
                onClick={() => {
                  // Accept all suggestions
                  const allSuggestions = {};
                  suggestions.categories.forEach(category => {
                    allSuggestions[category.name] = category.suggested_amount;
                  });
                  setCustomAmounts(allSuggestions);
                  setShowSuggestions(false);
                }}
                className="px-6 py-3 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors"
              >
                Accept All Suggestions
              </button>
            )}
            <button
              onClick={handleSaveBudget}
              disabled={saving || getTotalAllocated() === 0}
              className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Budget
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget;
