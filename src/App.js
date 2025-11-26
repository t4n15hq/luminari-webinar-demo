// src/App.js - Updated with LumiPath Design System

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import HomePage from './components/HomePage';
import ProtocolGenerator from './components/ProtocolGenerator';
import RegulatoryDocuments from './components/RegulatoryDocuments';
import RegulatoryDocumentGenerator from './components/RegulatoryDocumentGenerator';
import BatchRegulatoryGenerator from './components/BatchRegulatoryGenerator';
import UnifiedRegulatoryGenerator from './components/UnifiedRegulatoryGenerator';
import EnhancedMedicalAnalysis from './components/EnhancedMedicalAnalysis';
import ExcelAnalysis from './components/ExcelAnalysis';
import ClinicalDossierCompiler from './components/ClinicalDossierCompiler';
import QueryAssistant from './components/QueryAssistant';
import SkinDiseaseDetector from './components/SkinDiseaseDetector';
import LungCancerDetector from './components/LungCancerDetector';
import DiseaseDiagnosis from './components/DiseaseDiagnosis';
import Profile from './components/Profile';
import BackgroundJobs from './components/common/BackgroundJobs';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/designSystem.css';
import './styles/components.css';
import './AppLayout.css';
import './App.css';
import './demo-disable.css';

// Layout wrapper with Sidebar and Header
const AppLayout = ({ children }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Add/remove login-page class to body
  React.useEffect(() => {
    if (location.pathname === '/login') {
      document.body.classList.add('login-page');
    } else {
      document.body.classList.remove('login-page');
    }
    return () => {
      document.body.classList.remove('login-page');
    };
  }, [location.pathname]);

  // Don't show layout on login page
  if (location.pathname === '/login') {
    return children;
  }

  return (
    <>
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className={`app-main-wrapper ${isSidebarCollapsed ? 'wrapper-collapsed' : ''}`}>
        <Header isCollapsed={isSidebarCollapsed} />
        <main className="app-main-content">
          {children}
        </main>
        <BackgroundJobs />
        <footer className="app-footer">
          <p><span className="copyright">©</span> {new Date().getFullYear()} Luminari. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

const AppContent = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  {/* Home Page */}
                  <Route path="/" element={<HomePage />} />

                  {/* Main Tools */}
                  <Route path="/protocol" element={<ProtocolGenerator />} />

                  {/* Regulatory Document Routes */}
                  <Route path="/regulatory-documents" element={<RegulatoryDocuments />} />
                  <Route path="/ind-modules" element={<RegulatoryDocumentGenerator />} />
                  <Route path="/batch-regulatory" element={<BatchRegulatoryGenerator />} />
                  <Route path="/unified-regulatory" element={<UnifiedRegulatoryGenerator />} />

                  {/* Enhanced Features */}
                  <Route path="/enhanced-analysis" element={<EnhancedMedicalAnalysis />} />
                  <Route path="/excel-analysis" element={<ExcelAnalysis />} />

                  <Route path="/clinical-dossier" element={<ClinicalDossierCompiler />} />
                  <Route path="/query" element={<QueryAssistant />} />

                  {/* Disease Diagnosis Routes */}
                  <Route path="/diagnosis" element={<DiseaseDiagnosis />} />
                  <Route path="/diagnosis/dermatology" element={<SkinDiseaseDetector />} />
                  <Route path="/diagnosis/pulmonology" element={<LungCancerDetector />} />

                  {/* Profile */}
                  <Route path="/profile" element={<Profile />} />

                  {/* Legacy Redirects */}
                  <Route path="/skin-disease-detector" element={<Navigate to="/diagnosis/dermatology" replace />} />
                  <Route path="/upload" element={<Navigate to="/diagnosis/dermatology" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;