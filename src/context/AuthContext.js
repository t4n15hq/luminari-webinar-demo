import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasAccess } from '../config/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('luminari_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('luminari_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // TODO: Replace with actual API call to your backend
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      // const data = await response.json();

      // Simulated response - replace with actual API
      const mockResponse = await mockLogin(email, password);

      if (mockResponse.success) {
        const userData = {
          id: mockResponse.user.id,
          email: mockResponse.user.email,
          name: mockResponse.user.name,
          role: mockResponse.user.role,
          permissions: mockResponse.user.permissions,
          token: mockResponse.token
        };

        setUser(userData);
        localStorage.setItem('luminari_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, error: mockResponse.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('luminari_user');
  };

  const checkAccess = (module) => {
    if (!user) return false;
    return hasAccess(user.role, user.permissions, module);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAccess,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock login function - replace with actual backend API
const mockLogin = async (email, password) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock users for demonstration
  const mockUsers = {
    'admin@luminari.com': {
      id: '1',
      email: 'admin@luminari.com',
      name: 'Admin User',
      role: 'admin',
      permissions: null,
      password: 'admin123'
    },
    'user.query@luminari.com': {
      id: '2',
      email: 'user.query@luminari.com',
      name: 'Query User',
      role: 'query_only',
      permissions: null,
      password: 'query123'
    },
    'user.full@luminari.com': {
      id: '3',
      email: 'user.full@luminari.com',
      name: 'Full Access User',
      role: 'full_access',
      permissions: null,
      password: 'full123'
    },
    'user.custom@luminari.com': {
      id: '4',
      email: 'user.custom@luminari.com',
      name: 'Custom User',
      role: 'custom',
      permissions: ['home', 'query', 'protocol'],
      password: 'custom123'
    }
  };

  const user = mockUsers[email];

  if (!user || user.password !== password) {
    return {
      success: false,
      error: 'Invalid email or password'
    };
  }

  // Remove password from returned data
  const { password: _, ...userWithoutPassword } = user;

  return {
    success: true,
    user: userWithoutPassword,
    token: 'mock-jwt-token-' + Date.now()
  };
};
