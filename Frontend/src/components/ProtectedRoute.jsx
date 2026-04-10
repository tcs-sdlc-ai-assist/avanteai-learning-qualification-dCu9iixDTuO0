import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Spinner';

export function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="blue" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = user.role || '';
    const hasRequiredRole = roles.some(
      (role) => role.toLowerCase() === userRole.toLowerCase()
    );

    if (!hasRequiredRole) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-red-900">Access Denied</h2>
            <p className="mb-6 text-sm text-red-700">
              You do not have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <a
              href="/"
              className="inline-flex items-center rounded-lg bg-avante-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-avante-700 focus:outline-none focus:ring-2 focus:ring-avante-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
};

ProtectedRoute.defaultProps = {
  roles: null,
};

export default ProtectedRoute;