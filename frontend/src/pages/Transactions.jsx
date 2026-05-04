import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { transactionAPI, categoryAPI, merchantAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Search, Filter, Edit2, Trash2, Lightbulb, Check, X, Eye } from 'lucide-react';
import Loading from '../components/Common/Loading';
import Modal from '../components/Common/Modal';

const Transactions = () => {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [merchantCounts, setMerchantCounts] = useState({});
  const [totalMerchantCounts, setTotalMerchantCounts] = useState({});
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Function to count transactions per merchant (from March 1st onwards)
  const calculateMerchantCounts = (transactions) => {
    const counts = {};
    transactions.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      counts[merchant] = (counts[merchant] || 0) + 1;
    });
    return counts;
  };

  // Function to fetch total merchant counts from backend
  const fetchTotalMerchantCounts = async () => {
    try {
      const response = await merchantAPI.getMerchantCounts();
      setTotalMerchantCounts(response.data.data.counts);
    } catch (error) {
      console.error('Failed to fetch total merchant counts:', error);
    }
  };

  // Initialize category from URL on mount only
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, []); // Empty deps - only run once on mount

  // Fetch data function with abort controller
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, sync emails to get latest transactions
        setIsSyncing(true);
        setSyncStatus('Syncing emails...');
        console.log('Syncing emails...');
        try {
          // Add timeout to sync call
          const syncPromise = transactionAPI.sync();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout after 30 seconds')), 30000)
          );
          
          const syncResponse = await Promise.race([syncPromise, timeoutPromise]);
          console.log('Email sync completed:', syncResponse.data);
          if (syncResponse.data.success) {
            const message = syncResponse.data.message || 'Sync completed';
            const newCount = syncResponse.data.data?.newTransactions || 0;
            setSyncStatus(`${message} (${newCount} new transactions)`);
          } else {
            setSyncStatus('Sync completed but no new transactions');
          }
        } catch (syncError) {
          console.error('Email sync failed:', syncError);
          const errorMessage = syncError.response?.data?.message || syncError.message || 'Unknown error';
          console.error('Sync error details:', syncError.response?.data);
          
          if (syncError.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
            setSyncStatus('Sync timed out. Taking too long to process emails. Showing existing transactions.');
          } else if (syncError.response?.status === 429) {
            setSyncStatus('Sync failed: Rate limit exceeded. Please wait a moment and refresh.');
          } else if (syncError.response?.status === 401) {
            setSyncStatus('Sync failed: Gmail authorization expired. Please reconnect Gmail.');
          } else {
            setSyncStatus(`Sync failed: ${errorMessage}. Showing existing transactions.`);
          }
        }
        setIsSyncing(false);
        
        // Clear sync status after 5 seconds
        setTimeout(() => {
          setSyncStatus('');
        }, 5000);
        
        // Don't filter by date to show all transactions including latest ones
        const params = { 
          search, 
          category: selectedCategory,
          merchant: selectedMerchant,
          limit: 500 // Increase limit to show more transactions
        };
        
        console.log('Fetching transactions with params:', params);
        
        const [txnRes, catRes, merchantRes] = await Promise.all([
          transactionAPI.getAll(params),
          categoryAPI.getAll(),
          merchantAPI.getMerchantCounts(),
        ]);
        
        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          const transactionsData = txnRes.data.data || [];
          setTransactions(transactionsData);
          setCategories(catRes.data.data || []);
          setMerchantCounts(calculateMerchantCounts(transactionsData));
          setTotalMerchantCounts(merchantRes.data.data.counts || {});
          setError(null);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching transactions:', err);
          setError(err.response?.data?.message || 'Failed to load transactions');
          setTransactions([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    // Cleanup function to abort on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [search, selectedCategory, selectedMerchant, refreshCounter]); // Re-fetch when these change

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleMerchantClick = (merchant) => {
    if (selectedMerchant === merchant) {
      // If clicking the same merchant, clear the filter
      setSelectedMerchant('');
    } else {
      // Select the merchant
      setSelectedMerchant(merchant);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionAPI.delete(id);
        // Trigger re-fetch
        setRefreshCounter(prev => prev + 1);
      } catch (err) {
        alert('Failed to delete transaction');
      }
    }
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    try {
      await transactionAPI.update(editingTransaction._id, {
        category: editingTransaction.category._id || editingTransaction.category,
        notes: editingTransaction.notes,
      });
      setIsModalOpen(false);
      // Trigger re-fetch
      setRefreshCounter(prev => prev + 1);
    } catch (err) {
      alert('Failed to update transaction');
    }
  };

  const handleCategoryChange = async (transactionId, newCategoryId) => {
    try {
      // First update the specific transaction
      await transactionAPI.update(transactionId, {
        category: newCategoryId,
      });
      
      // Find the merchant name for this transaction
      const transaction = transactions.find(t => t._id === transactionId);
      if (transaction && transaction.merchant) {
        console.log(`🔄 Applying categorization rules for merchant: "${transaction.merchant}"`);
        
        try {
          // Apply merchant-wide categorization rules
          const rulesResponse = await merchantAPI.applyRules(transaction.merchant);
          const { autoCategorizedCount, suggestionsAddedCount, totalUpdated } = rulesResponse.data.data;
          
          // Rules applied silently - user will see suggestions in the UI
          if (totalUpdated > 0) {
            console.log(`✅ Rules applied for "${transaction.merchant}": ${autoCategorizedCount} auto-categorized, ${suggestionsAddedCount} suggestions added`);
          } else {
            console.log(`ℹ️ No rules applied for "${transaction.merchant}"`);
          }
        } catch (rulesError) {
          console.error('Failed to apply merchant rules:', rulesError);
          // Still continue with refresh even if rules fail
        }
      }
      
      // Trigger re-fetch to show updated categories and suggestions
      setRefreshCounter(prev => prev + 1);
    } catch (err) {
      alert('Failed to update category');
      // Re-fetch to restore original state
      setRefreshCounter(prev => prev + 1);
    }
  };

  const handleAcceptSuggestion = async (transactionId) => {
    try {
      // Find the transaction to get the suggested category ID
      const transaction = transactions.find(t => t._id === transactionId);
      if (transaction && transaction.categorySuggestion) {
        // Directly update the category to the suggested one
        await transactionAPI.update(transactionId, {
          category: transaction.categorySuggestion.suggestedCategory._id,
          categorySuggestion: null // Clear the suggestion after accepting
        });
        
        // Apply merchant-wide rules after accepting suggestion
        if (transaction.merchant) {
          console.log(`🔄 Applying categorization rules after accepting suggestion for: "${transaction.merchant}"`);
          
          try {
            const rulesResponse = await merchantAPI.applyRules(transaction.merchant);
            const { autoCategorizedCount, suggestionsAddedCount, totalUpdated } = rulesResponse.data.data;
            
            if (totalUpdated > 0) {
              console.log(`✅ Applied rules after suggestion: ${autoCategorizedCount} auto-categorized, ${suggestionsAddedCount} suggestions added`);
            }
          } catch (rulesError) {
            console.error('Failed to apply merchant rules after suggestion:', rulesError);
          }
        }
        
        // Trigger re-fetch to show updated category and any rule changes
        setRefreshCounter(prev => prev + 1);
      }
    } catch (err) {
      alert('Failed to accept suggestion');
    }
  };

  const handleRejectSuggestion = async (transactionId) => {
    try {
      await transactionAPI.update(transactionId, {
        categorySuggestion: null, // Clear the suggestion
      });
      // Trigger re-fetch to show updated state
      setRefreshCounter(prev => prev + 1);
    } catch (err) {
      alert('Failed to reject suggestion');
    }
  };

  
  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Transactions
            {selectedMerchant && (
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                - {selectedMerchant}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Showing all transactions
            {selectedMerchant && (
              <span className="ml-1">
                for <span className="font-medium">{selectedMerchant}</span>
                <span className="ml-1">
                  ({transactions?.length || 0} transactions)
                </span>
                <button
                  onClick={() => setSelectedMerchant('')}
                  className="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  (clear filter)
                </button>
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <a
            href="/transactions/insights"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
          >
            <Eye className="w-4 h-4 mr-2" />
            Transaction Insights
          </a>
        </div>
      </div>

      {/* Sync Status Display */}
      {isSyncing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <p className="text-blue-800 dark:text-blue-200">{syncStatus}</p>
          </div>
        </div>
      )}

      {/* Sync Success/Error Status */}
      {!isSyncing && syncStatus && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 dark:text-green-200">{syncStatus}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      
      {/* Transactions Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Merchant</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Account</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions && transactions.length > 0 ? (
              transactions.map((txn) => (
                <tr key={txn._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">{formatDate(txn.transactionDate)}</td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMerchantClick(txn.merchant || 'Unknown')}
                          className={`font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                            selectedMerchant === (txn.merchant || 'Unknown') 
                              ? 'text-blue-600 dark:text-blue-400 underline' 
                              : ''
                          }`}
                          title="Click to filter by this merchant"
                        >
                          {txn.merchant || 'Unknown'}
                        </button>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                          {totalMerchantCounts[(txn.merchant || 'Unknown').toLowerCase()] || 0}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{txn.paymentMethod || 'N/A'}</p>
                    </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-2">
                    <select
                      value={txn.category?._id || txn.category || ''}
                      onChange={(e) => handleCategoryChange(txn._id, e.target.value)}
                      className="text-sm border-2 border-blue-300 rounded-md px-3 py-2 pr-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[140px]"
                      style={{
                        backgroundColor: txn.category?.color ? txn.category.color + '15' : undefined,
                        borderColor: txn.category?.color || undefined
                      }}
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Category Suggestion Display */}
                    {txn.categorySuggestion && 
                     txn.category?.name === 'Miscellaneous' && 
                     txn.categorySuggestion.totalTransactions >= 3 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                              Suggested Category: {txn.categorySuggestion.suggestedCategory?.icon} {txn.categorySuggestion.suggestedCategory?.name}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAcceptSuggestion(txn._id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleRejectSuggestion(txn._id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        </div>
                        {txn.categorySuggestion.message && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {txn.categorySuggestion.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {txn.accountNumber ? (
                    <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        •••• {txn.accountNumber}
                      </span>
                      {txn.bankName && (
                        <p className="text-xs text-gray-500 mt-1">{txn.bankName}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(txn.amount)}</td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => handleEdit(txn)} className="text-blue-600 hover:text-blue-700 mr-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(txn._id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 py-12">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Transaction">
        {editingTransaction && (
          <form onSubmit={handleUpdateTransaction} className="space-y-4">
            <div>
              <label className="label">Category</label>
              <select
                value={editingTransaction.category._id || editingTransaction.category}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                className="input"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={editingTransaction.notes || ''}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, notes: e.target.value })}
                className="input"
                rows="3"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Transactions;
