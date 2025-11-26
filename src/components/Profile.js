import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MODULES, ROLE_PERMISSIONS } from '../config/permissions';
import UserManagement from './UserManagement';
import './Profile.css';

const Profile = () => {
  const { user, checkAccess } = useAuth();

  if (!user) {
    return <div className="profile-loading">Loading...</div>;
  }

  // Get user's accessible modules
  const getUserModules = () => {
    if (user.role === 'admin') {
      return Object.values(MODULES);
    }

    if (user.role === 'custom' && user.permissions) {
      return user.permissions;
    }

    return ROLE_PERMISSIONS[user.role] || [];
  };

  const accessibleModules = getUserModules();

  // Module display names
  const moduleNames = {
    'home': 'Home',
    'protocol': 'Protocol & Study Design',
    'regulatory': 'Regulatory Documents',
    'diagnosis': 'Disease Screening',
    'query': 'Ask Lumina',
    'enhanced_analysis': 'Enhanced Medical Analysis',
    'excel_analysis': 'Excel Biomarker Analysis',
    'clinical_dossier': 'Clinical Dossier Compiler'
  };

  // Role display names
  const roleDisplayNames = {
    'admin': 'Administrator',
    'full_access': 'Full Access',
    'protocol_only': 'Protocol Only',
    'regulatory_only': 'Regulatory Only',
    'query_only': 'Query Only',
    'diagnosis_only': 'Diagnosis Only',
    'custom': 'Custom Access'
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate days since join
  const getDaysSinceJoin = () => {
    if (!user.joinDate) return 0;
    const joinDate = new Date(user.joinDate);
    const today = new Date();
    const diffTime = Math.abs(today - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name?.charAt(0) || 'U'}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-name">{user.name || 'User'}</h1>
          <p className="profile-role-badge">{roleDisplayNames[user.role] || user.role}</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Personal Information */}
        <div className="profile-card">
          <h2 className="profile-card-title">Personal Information</h2>
          <div className="profile-info-group">
            <div className="profile-info-item">
              <span className="profile-info-label">Full Name</span>
              <span className="profile-info-value">{user.name || 'N/A'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Email Address</span>
              <span className="profile-info-value">{user.email || 'N/A'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Profession</span>
              <span className="profile-info-value">{user.profession || 'N/A'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Department</span>
              <span className="profile-info-value">{user.department || 'N/A'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Organization</span>
              <span className="profile-info-value">{user.organization || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="profile-card">
          <h2 className="profile-card-title">Account Information</h2>
          <div className="profile-info-group">
            <div className="profile-info-item">
              <span className="profile-info-label">User ID</span>
              <span className="profile-info-value">{user.id || 'N/A'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Role</span>
              <span className="profile-info-value">{roleDisplayNames[user.role] || user.role}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Join Date</span>
              <span className="profile-info-value">{formatDate(user.joinDate)}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Days Active</span>
              <span className="profile-info-value">{getDaysSinceJoin()} days</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Account Status</span>
              <span className="profile-status-badge profile-status-active">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Access Permissions */}
      <div className="profile-card profile-permissions-card">
        <h2 className="profile-card-title">Module Access Permissions</h2>
        <p className="profile-permissions-subtitle">
          {user.role === 'admin'
            ? 'You have full administrative access to all modules.'
            : `You have access to ${accessibleModules.length} of ${Object.keys(MODULES).length} available modules.`}
        </p>
        <div className="profile-modules-grid">
          {Object.values(MODULES).map((module) => {
            const hasModuleAccess = checkAccess(module);
            return (
              <div
                key={module}
                className={`profile-module-item ${hasModuleAccess ? 'profile-module-accessible' : 'profile-module-restricted'}`}
              >
                <div className="profile-module-indicator">
                  {hasModuleAccess ? '✓' : '✕'}
                </div>
                <span className="profile-module-name">{moduleNames[module]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="profile-card profile-stats-card">
        <h2 className="profile-card-title">Platform Statistics</h2>
        <div className="profile-stats-grid">
          <div className="profile-stat-item">
            <div className="profile-stat-value">{accessibleModules.length}</div>
            <div className="profile-stat-label">Accessible Modules</div>
          </div>
          <div className="profile-stat-item">
            <div className="profile-stat-value">{getDaysSinceJoin()}</div>
            <div className="profile-stat-label">Days Active</div>
          </div>
          <div className="profile-stat-item">
            <div className="profile-stat-value">{user.role === 'admin' ? 'Full' : 'Limited'}</div>
            <div className="profile-stat-label">Access Level</div>
          </div>
        </div>
      </div>

      {/* User Management Section - Admin Only */}
      {user.role === 'admin' && (
        <UserManagement />
      )}
    </div>
  );
};

export default Profile;
