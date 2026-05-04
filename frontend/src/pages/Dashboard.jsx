import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { transactionAPI, budgetAPI, authAPI } from '../utils/api';
import { formatCurrency, getGreeting, formatDate } from '../utils/helpers';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import Loading from '../components/Common/Loading';
import ErrorMessage from '../components/Common/ErrorMessage';
import OnboardingModal from '../components/Onboarding/OnboardingModal';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSearchParams } from 'react-router-dom';

const Dashboard = () => {
  const { user, setUser, setIsAuthenticated, autoSyncTransactions, autoSyncing, changeGmail, disconnectGmail, isAuthenticated } = useAuth();
  const { showOnboarding, handleOnboardingComplete } = useOnboarding();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [oauthProcessed, setOauthProcessed] = useState(false);

  const fetchDashboardData = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Build stats params with current month filtering
      const statsParams = {
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      };
      
      if (selectedAccount) {
        statsParams.accountNumber = selectedAccount;
      }

      console.log('📅 Dashboard stats params (current month):', {
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
        selectedAccount
      });

      // Sequential API calls to prevent backend overload
      let statsData = null;
      let budgetData = null;
      let accountsData = [];

      try {
        const statsRes = await transactionAPI.getStats(statsParams);
        statsData = statsRes.data.data;
        
        if (!statsData || Object.keys(statsData).length === 0) {
          console.warn('⚠️ Stats API returned empty data');
        }
      } catch (err) {
        console.warn('Stats API failed, using empty data:', err.message);
        statsData = { 
          categorySpending: [], 
          dailyTrend: [], 
          monthlyTrend: [], 
          accountSpending: [], 
          topMerchants: [],
          totalSpending: 0
        };
      }

      try {
        const budgetRes = await budgetAPI.getSummary({ period: 'monthly' });
        budgetData = budgetRes.data.data;
      } catch (err) {
        console.warn('Budget API failed, using empty data:', err.message);
        budgetData = { budgets: [], totals: { remaining: 0, percentage: 0 } };
      }

      try {
        const accountsRes = await transactionAPI.getAccounts();
        accountsData = accountsRes.data.data || [];
      } catch (err) {
        console.warn('Accounts API failed, using empty data:', err.message);
        accountsData = [];
      }

      if (!signal?.aborted) {
        setStats(statsData);
        setBudgetSummary(budgetData);
        setAccounts(accountsData);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Error fetching dashboard data:', err);
        // Don't set error for empty data - just show empty state
        if (err.code !== 'ERR_NETWORK' && err.code !== 'ERR_INSUFFICIENT_RESOURCES') {
          setError('Failed to load dashboard data');
        } else {
          // For network errors, set empty data instead of error and limit retries
          setRetryCount(prev => prev + 1);
          if (retryCount >= 2) {
            setError('Network issues detected. Please refresh the page.');
          } else {
            setStats({ categorySpending: [], dailyTrend: [], monthlyTrend: [], accountSpending: [], topMerchants: [] });
            setBudgetSummary({ budgets: [], totals: { remaining: 0, percentage: 0 } });
            setAccounts([]);
          }
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [selectedAccount, retryCount]);

  useEffect(() => {
    const abortController = new AbortController();
    
    // Only fetch data if authenticated
    if (isAuthenticated) {
      console.log('🔍 Dashboard: User is authenticated, fetching data...');
      fetchDashboardData(abortController.signal);
    } else {
      console.log('⏳ Dashboard: User not authenticated yet, waiting...');
      setLoading(false);
    }
    
    // Handle OAuth callback token - prevent multiple processing
    const token = searchParams.get('token');
    if (token && !oauthProcessed) {
      console.log('🔐 OAuth token detected, logging in...');
      setOauthProcessed(true); // Mark as processed immediately
      
      // Clear any existing auth data first to prevent contamination
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      
      localStorage.setItem('token', token);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Get user info with the token
      const handleOAuthLogin = async () => {
        try {
          const response = await authAPI.getMe();
          console.log('🔐 User data received:', response.data);
          
          if (response.data.success && response.data.data) {
            setUser(response.data.data);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(response.data.data));
            console.log('✅ OAuth login successful');
            
            // Sync transactions after OAuth login if Gmail is connected
            // Only auto-sync for existing users, not new users to prevent infinite loops
            if (response.data.data.gmailConnected && response.data.data.hasTransactions) {
              setTimeout(() => {
                autoSyncTransactions().then(() => {
                  // Refresh dashboard data after sync
                  const abortController = new AbortController();
                  fetchDashboardData(abortController.signal);
                }).catch(err => {
                  console.warn('Auto-sync failed, continuing with empty data:', err);
                  const abortController = new AbortController();
                  fetchDashboardData(abortController.signal);
                });
              }, 1000);
            }
          } else {
            console.error('❌ Invalid response structure:', response.data);
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setOauthProcessed(false); // Reset on failure
          }
        } catch (error) {
          console.error('❌ Error fetching user with OAuth token:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setOauthProcessed(false); // Reset on failure
        }
      };
      
      handleOAuthLogin();
    }
    
    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, fetchDashboardData, setUser, setIsAuthenticated, autoSyncTransactions, searchParams, oauthProcessed]);

  // Note: Removed redundant authentication effect - main effect already handles data fetching

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await transactionAPI.sync();
      const { newTransactions, updatedTransactions, totalProcessed } = response.data.data;
      
      let message = `Sync completed!\n`;
      if (newTransactions > 0) message += `✅ ${newTransactions} new transactions\n`;
      if (updatedTransactions > 0) message += `🔄 ${updatedTransactions} updated transactions\n`;
      message += `📊 Total: ${totalProcessed} transactions processed`;
      
      alert(message);
      // Refresh dashboard data after sync
      const abortController = new AbortController();
      fetchDashboardData(abortController.signal);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      window.location.href = response.data.authUrl;
    } catch (err) {
      if (err.response?.status === 429) {
        alert('Too many requests to Google. Please wait a moment and try again.');
      } else {
        alert('Failed to connect to Google. Please try again.');
      }
    }
  };

  const handleRetry = () => {
    const abortController = new AbortController();
    fetchDashboardData(abortController.signal);
  };

  const handleChangeEmail = async () => {
    const result = await changeGmail();
    if (!result.success) {
      alert(result.message);
    }
  };

  const handleDisconnectEmail = async () => {
    if (window.confirm('Are you sure you want to disconnect this Gmail account? You will need to reconnect to fetch transactions.')) {
      const result = await disconnectGmail();
      if (result.success) {
        alert('Gmail account disconnected successfully');
        // Refresh dashboard data
        const abortController = new AbortController();
        fetchDashboardData(abortController.signal);
      } else {
        alert(result.message);
      }
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#64748b'];

  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here's your financial overview for {formatDate(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Account Filter Dropdown */}
          {accounts.length > 0 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="input min-w-[200px]"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.accountNumber} value={account.accountNumber}>
                  {account.bankName || 'Unknown Bank'} •••• {account.accountNumber}
                </option>
              ))}
            </select>
          )}
          
          {/* Gmail Account Information */}
          {!user?.gmailConnected ? (
            <button onClick={handleConnectGmail} className="btn btn-primary flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                  {user.gmailEmail || 'Connected'}
                </span>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn btn-secondary flex items-center text-sm"
                title="Change Gmail account"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gmail Connection Alert */}
      {!user?.gmailConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">
              Connect your Gmail account
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Connect Gmail to automatically track your transactions from email notifications
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats?.totalSpending || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Budget Remaining</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(budgetSummary?.totals?.remaining || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats?.categorySpending?.reduce((sum, cat) => sum + cat.count, 0) || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Budget Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {budgetSummary?.totals?.percentage || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Category Spending Pie Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Spending by Category</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This Month
            </div>
          </div>
          {stats?.categorySpending && stats.categorySpending.length > 0 ? (
            <div className="space-y-6">
              {/* Pie Chart */}
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.categorySpending}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={98}
                      paddingAngle={2}
                      labelLine={true}
                      label={({ category, percent }) => {
                        const percentage = (percent * 100).toFixed(0);
                        return `${percentage}%`;
                      }}
                      labelStyle={{
                        fontSize: '13px',
                        fontWeight: '600',
                        fill: '#1f2937',
                        textAnchor: 'middle',
                        dominantBaseline: 'middle'
                      }}
                    >
                      {stats.categorySpending.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="white"
                          strokeWidth={3}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Category List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.categorySpending.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {category.category}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {((category.total / stats.categorySpending.reduce((sum, cat) => sum + cat.total, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {formatCurrency(category.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No spending data available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start tracking your expenses to see insights</p>
            </div>
          )}
        </div>

        {/* Daily Spending Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Spending (Last 30 Days)</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Daily Overview
            </div>
          </div>
          {stats?.dailyTrend && stats.dailyTrend.length > 0 ? (
            <div className="w-full" style={{ height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%" debounce={1}>
                <BarChart 
                  data={stats.dailyTrend.map(item => ({
                    ...item,
                    dateLabel: `${item._id.day}/${item._id.month}`,
                    fullDateLabel: (() => {
                      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[item._id.month - 1]} ${item._id.day}, ${item._id.year}`;
                    })()
                  }))}
                  margin={{ top: 20, right: 25, left: 20, bottom: 20 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#e5e7eb" 
                    vertical={false} 
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    angle={-45}
                    textAnchor="end"
                    height={45}
                    tick={{ fill: '#6b7280', fontSize: 14, fontWeight: '500' }}
                    stroke="#9ca3af"
                    interval="preserveStartEnd"
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `₹${(value / 1000).toFixed(0)}k`;
                      }
                      return `₹${value}`;
                    }}
                    tick={{ fill: '#6b7280', fontSize: 15, fontWeight: '500' }}
                    stroke="#9ca3af"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Spending']}
                    labelFormatter={(label, payload) => {
                      return payload && payload[0] ? payload[0].payload.fullDateLabel : label;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '500',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No daily spending data available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Track your expenses to see daily trends</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart - Full Width */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Monthly Spending Trend</h2>
        {stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={stats.monthlyTrend.map(item => ({
                ...item,
                monthLabel: (() => {
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${monthNames[item._id.month - 1]} ${item._id.year}`;
                })(),
                fullMonthLabel: (() => {
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                     'July', 'August', 'September', 'October', 'November', 'December'];
                  return `${monthNames[item._id.month - 1]} ${item._id.year}`;
                })()
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fill: '#6b7280', fontSize: 14 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                tick={{ fill: '#6b7280', fontSize: 14 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Spending']}
                labelFormatter={(label, payload) => {
                  return payload && payload[0] ? payload[0].payload.fullMonthLabel : label;
                }}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
              />
              <Bar 
                dataKey="total" 
                fill="#6366f1" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-12">No trend data available</p>
        )}
      </div>

      {/* Account-wise Spending & Top Merchants */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Account-wise Spending */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Spending by Account</h2>
          {stats?.accountSpending && stats.accountSpending.length > 0 ? (
            <div className="space-y-3">
              {stats.accountSpending.map((account, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-medium mr-3">
                      {account.accountNumber}
                    </div>
                    <div>
                      <p className="font-medium">{account.bankName || 'Unknown Bank'}</p>
                      <p className="text-sm text-gray-500">
                        {account.accountName || `A/c ${account.accountNumber}`} • {account.count} transactions
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(account.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">No account data available</p>
          )}
        </div>

        {/* Top Merchants */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Top Merchants</h2>
          {stats?.topMerchants && stats.topMerchants.length > 0 ? (
            <div className="space-y-3">
              {stats.topMerchants.slice(0, 5).map((merchant, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{merchant._id}</p>
                      <p className="text-sm text-gray-500">{merchant.count} transactions</p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(merchant.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">No merchant data available</p>
          )}
        </div>

        {/* Budget Progress */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Budget Progress</h2>
          {budgetSummary?.budgets && budgetSummary.budgets.length > 0 ? (
            <div className="space-y-4">
              {budgetSummary.budgets.slice(0, 5).map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{item.budget.category.icon}</span>
                      <span className="font-medium">{item.budget.category.name}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.percentage >= 100
                          ? 'bg-red-600'
                          : item.percentage >= 80
                          ? 'bg-orange-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}% used</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">No budgets set</p>
          )}
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Gmail Account Settings
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Currently connected to:
              </p>
              <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.gmailEmail || 'Connected Gmail Account'}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose an option:
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleChangeEmail}
                  className="w-full btn btn-primary flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Change Gmail Account
                </button>
                <button
                  onClick={handleDisconnectEmail}
                  className="w-full btn btn-secondary flex items-center justify-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Disconnect Gmail
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default Dashboard;
