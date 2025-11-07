import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { transactionAPI, categoryAPI } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Search, Filter, Edit2, Trash2 } from 'lucide-react';
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
        
        console.log('Fetching transactions with category:', selectedCategory);
        
        const [txnRes, catRes] = await Promise.all([
          transactionAPI.getAll({ search, category: selectedCategory }),
          categoryAPI.getAll(),
        ]);
        
        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          console.log('Transactions fetched:', txnRes.data.data?.length || 0);
          setTransactions(txnRes.data.data || []);
          setCategories(catRes.data.data || []);
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
  }, [search, selectedCategory, refreshCounter]); // Re-fetch when these change

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
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

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
      </div>

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
                      <p className="font-medium">{txn.merchant || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{txn.paymentMethod || 'N/A'}</p>
                    </div>
                </td>
                <td className="py-3 px-4">
                  {txn.category ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm" style={{ backgroundColor: txn.category.color + '20', color: txn.category.color }}>
                      {txn.category.icon} {txn.category.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">Uncategorized</span>
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
                <td colSpan="5" className="text-center text-gray-500 py-12">
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
