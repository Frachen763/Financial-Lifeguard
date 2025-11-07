import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-3">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
              Oops! Something went wrong
            </h2>
            
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              The page encountered an error and couldn't load properly.
            </p>

            {this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 overflow-auto max-h-40">
                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 btn btn-secondary"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 btn btn-primary"
              >
                Go to Dashboard
              </button>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
