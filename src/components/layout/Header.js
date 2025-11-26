import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/designSystem.css';
import './Header.css';

const Header = ({ isCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Map routes to page titles
  const getPageTitle = () => {
    const pathMap = {
      '/': 'LumiPath™',
      '/protocol': 'Protocol & Study Design Generator',
      '/unified-regulatory': 'Regulatory Document Generator',
      '/regulatory-documents': 'Regulatory Documents',
      '/ind-modules': 'IND Modules',
      '/batch-regulatory': 'Batch Regulatory Generator',
      '/diagnosis': 'Disease Screening',
      '/diagnosis/dermatology': 'Dermatology Screening',
      '/diagnosis/pulmonology': 'Pulmonology Screening',
      '/query': 'Ask Lumina™',
      '/enhanced-analysis': 'Enhanced Medical Analysis',
      '/excel-analysis': 'Excel Biomarker Analysis',
      '/clinical-dossier': 'Clinical Dossier Compiler',
      '/profile': 'Profile'
    };

    return pathMap[location.pathname] || 'LumiPath';
  };

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);

    if (pathParts.length === 0) return null;

    const breadcrumbs = [{ label: 'Home', path: '/' }];

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const label = part
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label,
        path: currentPath,
        isLast: index === pathParts.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const isHomePage = location.pathname === '/';

  return (
    <header className={`header ${isCollapsed ? 'header-collapsed' : ''}`}>
      <div className="header-content">
        {/* Left Side - Page Title or Breadcrumbs */}
        <div className="header-left">
          {breadcrumbs && breadcrumbs.length > 1 ? (
            <nav className="breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="breadcrumb-item">
                  {index > 0 && <span className="breadcrumb-separator">/</span>}
                  {crumb.isLast ? (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  ) : (
                    <a href={crumb.path} className="breadcrumb-link">
                      {crumb.label}
                    </a>
                  )}
                </div>
              ))}
            </nav>
          ) : (
            isHomePage ? (
              <div className="header-logo-container">
                <img
                  src="/assets/icons/luminari-logo/luminari-logo-300px.png"
                  alt="LUMINARI Logo"
                  className="header-logo"
                />
              </div>
            ) : (
              <div className="header-title-container">
                <h1 className="header-title">{getPageTitle()}</h1>
              </div>
            )
          )}
        </div>

        {/* Right Side - User Info & Logout */}
        <div className="header-right">
          {user && (
            <div className="header-user-section">
              <span className="header-user-email">{user.email || user.name}</span>
              <button onClick={handleLogout} className="header-logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
