import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTE_MODULE_MAP } from '../config/permissions';

const ProtectedRoute = ({ children }) => {
  const { user, loading, checkAccess } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#683D94'
      }}>
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has access to this route
  const module = ROUTE_MODULE_MAP[location.pathname];

  // Always allow access to home page
  if (location.pathname === '/' || location.pathname === '/profile') {
    return children;
  }

  // Check module access
  if (module && !checkAccess(module)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '48px', color: '#683D94', marginBottom: '1rem' }}>403</h1>
        <h2 style={{ fontSize: '24px', color: '#2D2D2D', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ fontSize: '16px', color: '#666666', marginBottom: '2rem' }}>
          You don't have permission to access this module.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#683D94',
            border: 'none',
            borderRadius: '0',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
