import { useState, useEffect, useCallback } from 'react';
import { onboardingAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const useOnboarding = () => {
  const { user, setUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check onboarding status when component mounts or user changes
  useEffect(() => {
    const checkOnboardingStatus = () => {
      if (!user) {
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Prevent infinite loops - if already showing onboarding, don't re-check
      if (showOnboarding) {
        console.log('⏸️ Onboarding already showing, skipping check');
        return;
      }

      // Check if onboarding was completed in localStorage for this specific user
      const onboardingCompleted = localStorage.getItem(`onboardingCompleted_${user._id}`);
      const budgetSaved = localStorage.getItem(`budgetSaved_${user._id}`);
      
      console.log('🔍 Checking onboarding status:', {
        userExists: !!user,
        userId: user._id,
        userEmail: user.email,
        onboardingCompleted,
        budgetSaved,
        localStorageKey: `onboardingCompleted_${user._id}`
      });

      // Show onboarding if user exists but hasn't completed onboarding and hasn't saved budget
      if (user && !onboardingCompleted && !budgetSaved) {
        console.log('📋 Showing onboarding survey for user:', user.email);
        setShowOnboarding(true);
      } else {
        console.log('✅ Skipping onboarding - already completed or budget saved for user:', user.email);
        setShowOnboarding(false);
      }
      
      setIsLoading(false);
    };

    // Add small delay to prevent rapid re-checks
    const timeoutId = setTimeout(checkOnboardingStatus, 100);
    return () => clearTimeout(timeoutId);
  }, [user, showOnboarding]);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await onboardingAPI.getStatus();
      const { onboardingCompleted, financialProfile } = response.data.data;
      
      // Update user context if needed
      if (user.onboardingCompleted !== onboardingCompleted) {
        setUser(prev => ({
          ...prev,
          onboardingCompleted,
          financialProfile
        }));
      }
      
      // Show onboarding if not completed
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setError('Failed to load onboarding status');
      // Show onboarding by default if we can't check status
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser]);

  const handleOnboardingComplete = useCallback(async (data) => {
    try {
      console.log('✅ Onboarding data saved:', data);
      
      // Get current user to avoid null reference
      const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!currentUser._id) {
        console.error('❌ No user ID found for onboarding completion');
        return;
      }
      
      // Update user context with financial profile
      setUser(prev => ({
        ...prev,
        financialProfile: data
      }));
      
      // Mark onboarding as completed in localStorage for this user
      localStorage.setItem(`onboardingCompleted_${currentUser._id}`, 'true');
      
      // Close the survey after completion
      setShowOnboarding(false);
      
      // Redirect to budget page after a short delay
      setTimeout(() => {
        window.location.href = '/budget';
      }, 1000);
      
      console.log('✅ Onboarding completed and saved to localStorage. Redirecting to budget page...');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [setUser, user]);

  const resetOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setError(null);
  }, []);

  // Function to mark budget as saved (to be called from Budget component)
  const markBudgetSaved = useCallback(() => {
    if (user) {
      localStorage.setItem(`budgetSaved_${user._id}`, 'true');
      setShowOnboarding(false);
      console.log('💰 Budget saved - survey will not show again for user:', user.email);
    }
  }, [user]);

  return {
    showOnboarding,
    isLoading,
    error,
    handleOnboardingComplete,
    resetOnboarding,
    checkOnboardingStatus,
    markBudgetSaved
  };
};
