import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { hasAccess } from '../config/permissions';
import backgroundService from '../services/backgroundService';

const AuthContext = createContext();

// Use your deployed backend server
const API_BASE_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'https://luminari-be.onrender.com';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Global protocol state that persists across all pages
  const [globalProtocolResult, setGlobalProtocolResult] = useState(null);
  const [globalStudyDesign, setGlobalStudyDesign] = useState(null);
  const [globalProtocolFormData, setGlobalProtocolFormData] = useState({
    disease: '',
    population: '',
    treatment: '',
    drugClass: '',
    mechanism: '',
    clinicalInfo: '',
    studyType: 'clinical',
    trialPhase: '',
    trialType: '',
    randomization: '',
    blinding: '',
    controlGroupType: '',
    sampleSize: '',
    minAge: '',
    maxAge: '',
    gender: '',
    inclusionCriteria: '',
    exclusionCriteria: '',
    routeOfAdministration: '',
    dosingFrequency: '',
    comparatorDrug: '',
    primaryEndpoints: '',
    secondaryEndpoints: '',
    outcomeMeasurementTool: '',
    statisticalPower: '80',
    significanceLevel: '0.05',
    studyDuration: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    // Load user from localStorage as fallback
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        backgroundService.setCurrentUser(userData.id);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user');
      }
    }

    // Verify token with backend if available
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }

    // Load global protocol state from localStorage
    loadGlobalProtocolState();
  }, []);

  const loadGlobalProtocolState = () => {
    try {
      const savedProtocolResult = localStorage.getItem('globalProtocolResult');
      const savedStudyDesign = localStorage.getItem('globalStudyDesign');
      const savedFormData = localStorage.getItem('globalProtocolFormData');
      
      if (savedProtocolResult) {
        setGlobalProtocolResult(JSON.parse(savedProtocolResult));
      }
      if (savedStudyDesign) {
        setGlobalStudyDesign(JSON.parse(savedStudyDesign));
      }
      if (savedFormData) {
        setGlobalProtocolFormData(JSON.parse(savedFormData));
      }
    } catch (error) {
      console.error('Error loading global protocol state:', error);
    }
  };

  const saveGlobalProtocolState = (protocolResult, studyDesign, formData) => {
    try {
      if (protocolResult) {
        localStorage.setItem('globalProtocolResult', JSON.stringify(protocolResult));
        setGlobalProtocolResult(protocolResult);
      }
      if (studyDesign) {
        localStorage.setItem('globalStudyDesign', JSON.stringify(studyDesign));
        setGlobalStudyDesign(studyDesign);
      }
      if (formData) {
        localStorage.setItem('globalProtocolFormData', JSON.stringify(formData));
        setGlobalProtocolFormData(formData);
      }
    } catch (error) {
      console.error('Error saving global protocol state:', error);
    }
  };

  const clearGlobalProtocolState = () => {
    localStorage.removeItem('globalProtocolResult');
    localStorage.removeItem('globalStudyDesign');
    localStorage.removeItem('globalProtocolFormData');
    setGlobalProtocolResult(null);
    setGlobalStudyDesign(null);
    setGlobalProtocolFormData({
      disease: '',
      population: '',
      treatment: '',
      drugClass: '',
      mechanism: '',
      clinicalInfo: '',
      studyType: 'clinical',
      trialPhase: '',
      trialType: '',
      randomization: '',
      blinding: '',
      controlGroupType: '',
      sampleSize: '',
      minAge: '',
      maxAge: '',
      gender: '',
      inclusionCriteria: '',
      exclusionCriteria: '',
      routeOfAdministration: '',
      dosingFrequency: '',
      comparatorDrug: '',
      primaryEndpoints: '',
      secondaryEndpoints: '',
      outcomeMeasurementTool: '',
      statisticalPower: '80',
      significanceLevel: '0.05',
      studyDuration: ''
    });
  };

  const verifyToken = async (token) => {
    try {
      const response = await apiClient.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.valid) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        // Set user in background service for job scoping
        backgroundService.setCurrentUser(response.data.user.id);
      } else {
        // Token is invalid, clear everything
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed (backend may be unavailable):', error);
      // Don't clear localStorage on network errors - allow fallback to saved user data
      // The user was already loaded from localStorage in useEffect
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login to:', API_BASE_URL);

      // Try backend login first
      try {
        const response = await apiClient.post('/auth/login', {
          username,
          password
        });

        const { token, user: userData } = response.data;

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));

        setIsAuthenticated(true);
        setUser(userData);
        // Set user in background service for job scoping
        backgroundService.setCurrentUser(userData.id);

        return { success: true };
      } catch (backendError) {
        console.log('Backend login failed, trying mock login:', backendError.message);

        // Fallback to mock login for demo/testing
        const mockResult = await mockLogin(username, password);
        if (mockResult.success) {
          const userData = mockResult.user;
          localStorage.setItem('authToken', mockResult.token);
          localStorage.setItem('user', JSON.stringify(userData));

          setIsAuthenticated(true);
          setUser(userData);
          // Set user in background service for job scoping
          backgroundService.setCurrentUser(userData.id);

          return { success: true };
        }

        return mockResult;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  // Mock login for testing - remove in production
  const mockLogin = async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUsers = {
      'admin@luminari.com': {
        id: '1',
        email: 'admin@luminari.com',
        name: 'Dr. Sarah Mitchell',
        role: 'admin',
        profession: 'System Administrator',
        department: 'IT & Operations',
        organization: 'Luminari Research',
        joinDate: '2023-01-15',
        permissions: null,
        password: 'admin123'
      },
      'user.query@luminari.com': {
        id: '2',
        email: 'user.query@luminari.com',
        name: 'Dr. James Wilson',
        role: 'query_only',
        profession: 'Medical Researcher',
        department: 'Clinical Research',
        organization: 'Luminari Research',
        joinDate: '2023-06-20',
        permissions: null,
        password: 'query123'
      },
      'user.full@luminari.com': {
        id: '3',
        email: 'user.full@luminari.com',
        name: 'Dr. Emily Chen',
        role: 'full_access',
        profession: 'Clinical Trial Manager',
        department: 'Regulatory Affairs',
        organization: 'Luminari Research',
        joinDate: '2023-03-10',
        permissions: null,
        password: 'full123'
      },
      'user.custom@luminari.com': {
        id: '4',
        email: 'user.custom@luminari.com',
        name: 'Dr. Michael Rodriguez',
        role: 'custom',
        profession: 'Protocol Specialist',
        department: 'Clinical Development',
        organization: 'Luminari Research',
        joinDate: '2023-09-05',
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

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + Date.now()
    };
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    clearGlobalProtocolState(); // Clear protocol data on logout
    backgroundService.clearCurrentUser(); // Clear user's jobs from memory
    setIsAuthenticated(false);
    setUser(null);
  };

  const checkAccess = (module) => {
    if (!user) return false;
    return hasAccess(user.role, user.permissions, module);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    loading: isLoading, // Alias for compatibility
    checkAccess,
    // Global protocol state and functions
    globalProtocolResult,
    globalStudyDesign,
    globalProtocolFormData,
    setGlobalProtocolResult,
    setGlobalStudyDesign,
    setGlobalProtocolFormData,
    saveGlobalProtocolState,
    clearGlobalProtocolState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};