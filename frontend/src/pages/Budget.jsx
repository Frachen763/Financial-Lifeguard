import { useState, useEffect } from 'react';
import { budgetAPI, categoryAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Loading from '../components/Common/Loading';
import Modal from '../components/Common/Modal';

const Budget = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category: '', amount: '', period: 'monthly' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetRes, catRes] = await Promise.all([
        budgetAPI.getSummary({ period: 'monthly' }),
        categoryAPI.getAll(),
      ]);
      setBudgets(budgetRes.data.data.budgets || []);
      setCategories(catRes.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await budgetAPI.create(formData);
      setIsModalOpen(false);
      setFormData({ category: '', amount: '', period: 'monthly' });
      fetchData();
    } catch (err) {
      alert('Failed to create budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetAPI.delete(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete budget');
      }
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Budget Management</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mt-4 md:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </button>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((item) => (
          <div key={item.budget._id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-2">{item.budget.category.icon}</span>
                <h3 className="font-semibold text-lg">{item.budget.category.name}</h3>
              </div>
              <button onClick={() => handleDelete(item.budget._id)} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Spent</span>
                <span className="font-semibold">{formatCurrency(item.spent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Budget</span>
                <span className="font-semibold">{formatCurrency(item.budget.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                <span className={`font-semibold ${item.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(item.remaining)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span className={item.percentage >= 100 ? 'text-red-600' : item.percentage >= 80 ? 'text-orange-600' : 'text-green-600'}>
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.percentage >= 100 ? 'bg-red-600' : item.percentage >= 80 ? 'bg-orange-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {item.isOverBudget && (
              <div className="mt-3 text-sm text-red-600 font-medium">
                ⚠️ Over budget by {formatCurrency(Math.abs(item.remaining))}
              </div>
            )}
          </div>
        ))}
      </div>

      {budgets.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">No budgets set yet. Create your first budget to start tracking!</p>
        </div>
      )}

      {/* Add Budget Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Budget">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input"
              placeholder="5000"
              required
            />
          </div>
          <div>
            <label className="label">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="input"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Budget
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Budget;
