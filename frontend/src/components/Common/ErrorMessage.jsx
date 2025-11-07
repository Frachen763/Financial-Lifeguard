import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <AlertCircle className="w-12 h-12 text-red-600" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary mt-4">
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
