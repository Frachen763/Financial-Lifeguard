import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Mail, BarChart3, Wallet } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <span className="text-8xl">🏊</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Financial Lifeguard
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Your personal finance companion that automatically tracks and categorizes expenses from your email
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link to="/login" className="btn btn-secondary text-lg px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Mail className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Email Integration</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your Gmail to automatically fetch and parse transaction emails
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Zap className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Categorization</h3>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered auto-categorization of expenses (Food, Travel, Shopping, etc.)
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <BarChart3 className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Visual Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Beautiful charts and insights to understand your spending patterns
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Wallet className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Budget Management</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Set monthly budgets and get alerts when you're close to limits
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <TrendingUp className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Spending Trends</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Track your spending over time and identify areas to save
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your data is encrypted and we only read transaction emails
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to take control of your finances?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users who are already managing their expenses smarter
          </p>
          <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
            Start Your Journey
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2024 Financial Lifeguard. All rights reserved.</p>
            <div className="mt-4 space-x-4">
              <Link to="/help" className="hover:text-primary-600">Help</Link>
              <Link to="/privacy" className="hover:text-primary-600">Privacy</Link>
              <Link to="/terms" className="hover:text-primary-600">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
