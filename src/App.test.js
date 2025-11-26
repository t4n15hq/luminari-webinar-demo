import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="browser-router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }) => <div data-testid="route">{element}</div>
}));

// Mock all the page components
jest.mock('./components/HomePage', () => {
  return function MockHomePage() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('./components/DiseaseDiagnosis', () => {
  return function MockDiseaseDiagnosis() {
    return <div data-testid="disease-diagnosis">Disease Diagnosis</div>;
  };
});

jest.mock('./components/SkinDiseaseDetector', () => {
  return function MockSkinDiseaseDetector() {
    return <div data-testid="skin-disease-detector">Skin Disease Detector</div>;
  };
});

jest.mock('./components/LungCancerDetector', () => {
  return function MockLungCancerDetector() {
    return <div data-testid="lung-cancer-detector">Lung Cancer Detector</div>;
  };
});

jest.mock('./components/RegulatoryDocuments', () => {
  return function MockRegulatoryDocuments() {
    return <div data-testid="regulatory-documents">Regulatory Documents</div>;
  };
});

jest.mock('./components/RegulatoryDocumentGenerator', () => {
  return function MockRegulatoryDocumentGenerator() {
    return <div data-testid="regulatory-document-generator">Regulatory Document Generator</div>;
  };
});

jest.mock('./components/BatchRegulatoryGenerator', () => {
  return function MockBatchRegulatoryGenerator() {
    return <div data-testid="batch-regulatory-generator">Batch Regulatory Generator</div>;
  };
});

jest.mock('./components/ProtocolGenerator', () => {
  return function MockProtocolGenerator() {
    return <div data-testid="protocol-generator">Protocol Generator</div>;
  };
});

jest.mock('./components/ClinicalDossierCompiler', () => {
  return function MockClinicalDossierCompiler() {
    return <div data-testid="clinical-dossier-compiler">Clinical Dossier Compiler</div>;
  };
});

jest.mock('./components/QueryAssistant', () => {
  return function MockQueryAssistant() {
    return <div data-testid="query-assistant">Query Assistant</div>;
  };
});

jest.mock('./components/common/BackgroundJobs', () => {
  return function MockBackgroundJobs() {
    return <div data-testid="background-jobs">Background Jobs</div>;
  };
});

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    
    expect(screen.getByTestId('browser-router')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });

  test('includes BackgroundJobs component', () => {
    render(<App />);
    
    expect(screen.getByTestId('background-jobs')).toBeInTheDocument();
  });

  test('wraps content with BrowserRouter for routing', () => {
    render(<App />);
    
    const browserRouter = screen.getByTestId('browser-router');
    expect(browserRouter).toBeInTheDocument();
    
    // Should contain the routes and background jobs
    expect(browserRouter).toContainElement(screen.getByTestId('routes'));
    expect(browserRouter).toContainElement(screen.getByTestId('background-jobs'));
  });

  test('has proper app structure', () => {
    render(<App />);
    
    const appDiv = screen.getByTestId('browser-router').parentElement;
    expect(appDiv).toHaveClass('App');
  });

  test('renders all route components (mocked)', () => {
    render(<App />);
    
    // Since we're mocking the Routes component to render all Route children,
    // we should see all the mocked components
    const routes = screen.getAllByTestId('route');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('includes medical-grade styling classes', () => {
    render(<App />);
    
    const appElement = document.querySelector('.App');
    expect(appElement).toBeInTheDocument();
  });

  test('maintains proper component hierarchy', () => {
    render(<App />);
    
    const app = document.querySelector('.App');
    const browserRouter = screen.getByTestId('browser-router');
    const routes = screen.getByTestId('routes');
    const backgroundJobs = screen.getByTestId('background-jobs');
    
    expect(app).toContainElement(browserRouter);
    expect(browserRouter).toContainElement(routes);
    expect(browserRouter).toContainElement(backgroundJobs);
  });

  test('background jobs component is rendered outside of routes', () => {
    render(<App />);
    
    const browserRouter = screen.getByTestId('browser-router');
    const routes = screen.getByTestId('routes');
    const backgroundJobs = screen.getByTestId('background-jobs');
    
    // Both should be children of BrowserRouter
    expect(browserRouter).toContainElement(routes);
    expect(browserRouter).toContainElement(backgroundJobs);
    
    // But background jobs should not be inside routes
    expect(routes).not.toContainElement(backgroundJobs);
  });
});
