import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI } from '../utils/api';
import { Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import Loading from '../components/Common/Loading';
import Modal from '../components/Common/Modal';

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', icon: '📁', color: '#6366f1' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getAll();
      setCategories(response.data.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    // Navigate to transactions page with category filter
    navigate(`/transactions?category=${categoryId}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await categoryAPI.create(formData);
      setIsModalOpen(false);
      setFormData({ name: '', icon: '📁', color: '#6366f1' });
      fetchCategories();
    } catch (err) {
      alert('Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryAPI.delete(id);
        fetchCategories();
      } catch (err) {
        alert('Failed to delete category. It may be in use.');
      }
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mt-4 md:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div 
            key={category._id} 
            className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
            onClick={() => handleCategoryClick(category._id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-indigo-600 transition-colors">
                    {category.name}
                  </h3>
                  {category.isDefault && (
                    <span className="text-xs text-gray-500">Default</span>
                  )}
                </div>
              </div>
              {!category.isDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when deleting
                    handleDelete(category._id);
                  }}
                  className="text-red-600 hover:text-red-700 z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <div
                className="w-full h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              ></div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span className="group-hover:text-indigo-600 transition-colors">
                View transactions
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Entertainment"
              required
            />
          </div>
          <div>
            <label className="label">Icon (Emoji)</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="input"
              placeholder="🎬"
              required
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="input h-12"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
