import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/designSystem.css';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const navigationItems = [
    {
      path: '/',
      label: 'Home',
      icon: '/assets/icons/nav-home.svg',
    },
    {
      path: '/protocol',
      label: 'Protocol & Study Design',
      icon: '/assets/icons/nav-protocol.svg',
    },
    {
      path: '/unified-regulatory',
      label: 'Regulatory Documents',
      icon: '/assets/icons/nav-regulatory.svg',
    },
    {
      path: '/diagnosis',
      label: 'Disease Screening',
      icon: '/assets/icons/nav-diagnosis.svg',
    },
    {
      path: '/query',
      label: 'Ask Lumina™',
      icon: '/assets/icons/nav-query.svg',
    },
    {
      path: '/enhanced-analysis',
      label: 'Enhanced Medical Analysis',
      icon: '/assets/icons/nav-analysis.svg',
    },
    {
      path: '/excel-analysis',
      label: 'Excel Biomarker Analysis',
      icon: '/assets/icons/nav-excel.svg',
    },
    {
      path: '/clinical-dossier',
      label: 'Clinical Dossier Compiler',
      icon: '/assets/icons/nav-dossier.svg',
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: '/assets/icons/nav-profile.svg',
    }
  ];

  // Demo mode: show all navigation items
  const accessibleItems = navigationItems;

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleSidebar = () => {
    setIsCollapsed(prevState => !prevState);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <span className="sidebar-brand-text">LumiPath</span>
        </div>

        {/* Navigation Items */}
        <ul className="sidebar-nav">
          {accessibleItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`sidebar-nav-item ${isActive(item.path) ? 'sidebar-nav-item-active' : ''}`}
                title={item.label}
              >
                <span className="sidebar-nav-icon">
                  <img src={item.icon} alt={item.label} />
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Collapse Toggle (Desktop only) */}
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        ☰
      </button>
    </>
  );
};

export default Sidebar;
