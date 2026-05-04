import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, transactionAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const autoSyncTransactions = async () => {
    try {
      setAutoSyncing(true);
      console.log('🔄 Auto-syncing transactions...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Auto-sync timeout, stopping request...');
      }, 45000); // 45 second timeout
      
      const response = await transactionAPI.sync({ signal: controller.signal });
      clearTimeout(timeoutId);
      
      const { newTransactions, updatedTransactions, totalProcessed, backgroundProcessing } = response.data.data;
      
      if (backgroundProcessing) {
        console.log('🔄 Auto-sync is processing in background...');
        return { success: true, backgroundProcessing: true };
      }
      
      if (newTransactions > 0 || updatedTransactions > 0) {
        console.log(`✅ Auto-sync completed: ${newTransactions} new, ${updatedTransactions} updated transactions`);
      } else {
        console.log('📊 Auto-sync completed: No new transactions found');
      }
      
      return { success: true, newTransactions, updatedTransactions, totalProcessed };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Auto-sync timed out, will continue in background');
        return { success: true, backgroundProcessing: true };
      }
      
      console.error('❌ Auto-sync failed:', error);
      // Don't throw error, just log it - auto-sync should not block user experience
      return { success: false, error: error.message };
    } finally {
      setAutoSyncing(false);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Checking auth, token exists:', !!token);
      
      if (token) {
        console.log('📡 Calling authAPI.getMe()...');
        const response = await authAPI.getMe();
        console.log('✅ Auth check successful, user:', response.data.data.email);
        
        // Clear any existing user state to prevent data mixing
        setUser(null);
        setIsAuthenticated(false);
        
        // Set fresh user data
        setUser(response.data.data);
        setIsAuthenticated(true);
        
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Note: Syncing on page load removed to prevent infinite reload loop
        // Transactions will sync on login only
      } else {
        console.log('❌ No token found in localStorage');
        // Clear any stale data
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      console.error('Error response:', error.response?.status, error.response?.data);
      // Clear all auth data on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Clear any existing auth data first
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      
      // Sync transactions after login if Gmail is connected and user has existing transactions
      if (user.gmailConnected && user.hasTransactions) {
        console.log('🔄 Login successful, syncing transactions...');
        setTimeout(() => {
          autoSyncTransactions().catch(err => {
            console.warn('Auto-sync failed, continuing anyway:', err);
          });
        }, 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      // Clear any existing auth data first
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const response = await authAPI.register({ name, email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      
      // Sync transactions after registration if Gmail is connected and user has existing transactions
      if (user.gmailConnected && user.hasTransactions) {
        console.log('🔄 Registration successful, syncing transactions...');
        setTimeout(() => {
          autoSyncTransactions().catch(err => {
            console.warn('Auto-sync failed, continuing anyway:', err);
          });
        }, 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword({ email });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send reset email',
      };
    }
  };

  const googleLogin = async (tokenId) => {
    try {
      // Clear any existing auth data first
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const response = await authAPI.googleLogin({ tokenId });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      
      // Sync transactions after Google login if Gmail is connected and user has existing transactions
      if (user.gmailConnected && user.hasTransactions) {
        console.log('🔄 Google login successful, syncing transactions...');
        setTimeout(() => {
          autoSyncTransactions().catch(err => {
            console.warn('Auto-sync failed, continuing anyway:', err);
          });
        }, 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Google login failed',
      };
    }
  };

  const changeGmail = async () => {
    try {
      const response = await authAPI.changeGmail();
      if (response.data.success && response.data.authUrl) {
        // Redirect to Google OAuth for new account
        window.location.href = response.data.authUrl;
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change Gmail account',
      };
    }
  };

  const disconnectGmail = async () => {
    try {
      const response = await authAPI.disconnectGmail();
      if (response.data.success) {
        // Update user state with disconnected Gmail
        setUser(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to disconnect Gmail',
      };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    setIsAuthenticated,
    autoSyncing,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
    forgotPassword,
    googleLogin,
    autoSyncTransactions,
    changeGmail,
    disconnectGmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
