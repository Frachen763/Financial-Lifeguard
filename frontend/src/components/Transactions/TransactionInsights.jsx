import { useState, useEffect } from 'react';
import { insightsAPI } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { 
  Trash2, 
  Bot, 
  Lightbulb, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import Loading from '../Common/Loading';

const TransactionInsights = () => {
  const [activeTab, setActiveTab] = useState('deleted');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    {
      id: 'deleted',
      label: 'Deleted Transactions',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'auto-categorized',
      label: 'Auto-Categorized',
      icon: Bot,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'suggestions',
      label: 'With Suggestions',
      icon: Lightbulb,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  useEffect(() => {
    fetchSummary();
    fetchData();
  }, [activeTab]);

  const fetchSummary = async () => {
    try {
      const response = await insightsAPI.getSummary();
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      switch (activeTab) {
        case 'deleted':
          response = await insightsAPI.getDeleted();
          break;
        case 'auto-categorized':
          response = await insightsAPI.getAutoCategorized();
          break;
        case 'suggestions':
          response = await insightsAPI.getWithSuggestions();
          break;
        default:
          return;
      }

      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch data');
      console.error('Error fetching insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionCard = (transaction, type) => {
    const isDeleted = type === 'deleted';
    const isAutoCategorized = type === 'auto-categorized';
    const hasSuggestion = type === 'suggestions';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                {transaction.merchant || 'Unknown'}
              </h3>
              {isDeleted && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Deleted
                </span>
              )}
              {isAutoCategorized && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Auto-categorized
                </span>
              )}
              {hasSuggestion && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Has Suggestion
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">
                  {formatCurrency(transaction.amount)}
                </span>
                <span>{formatDate(transaction.date || transaction.transactionDate)}</span>
                {transaction.accountNumber && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    A/c: {transaction.accountNumber}
                  </span>
                )}
              </div>
              
              {transaction.category && (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {transaction.category.name}
                  </span>
                  {transaction.category.icon && (
                    <span>{transaction.category.icon}</span>
                  )}
                </div>
              )}
              
              {transaction.suggestion && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded text-sm">
                  <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-yellow-800">Suggestion:</span>
                    <span className="text-yellow-700 ml-1">{transaction.suggestion}</span>
                  </div>
                </div>
              )}
              
              {isDeleted && transaction.reason && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-red-800">Reason:</span>
                    <span className="text-red-700 ml-1">{transaction.reason}</span>
                  </div>
                </div>
              )}
              
              {isDeleted && transaction.deletedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Deleted on {formatDate(transaction.deletedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transaction Insights
        </h1>
        <p className="text-gray-600">
          Review deleted transactions, auto-categorized items, and category suggestions
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Auto-Categorized</p>
                <p className="text-2xl font-bold text-blue-600">{summary.autoCategorized}</p>
              </div>
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Suggestions</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.withSuggestions}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deleted</p>
                <p className="text-2xl font-bold text-red-600">{summary.deleted}</p>
              </div>
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? `border-blue-500 ${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 mr-2 ${activeTab === tab.id ? tab.color : 'text-gray-400 group-hover:text-gray-500'}`} />
                {tab.label}
                {summary && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                    activeTab === tab.id ? tab.bgColor : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.id === 'deleted' && summary.deleted}
                    {tab.id === 'auto-categorized' && summary.autoCategorized}
                    {tab.id === 'suggestions' && summary.withSuggestions}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'deleted' && 'No deleted transactions to show.'}
              {activeTab === 'auto-categorized' && 'No auto-categorized transactions found.'}
              {activeTab === 'suggestions' && 'No transactions with category suggestions.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((transaction) => (
              <div key={transaction._id}>
                {renderTransactionCard(transaction, activeTab)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionInsights;
