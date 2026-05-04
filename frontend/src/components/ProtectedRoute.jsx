import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Common/Loading';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  // Check if there's an OAuth token in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.has('token');

  // If not authenticated but has OAuth token, allow access to let Dashboard handle the token
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
