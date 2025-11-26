import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/designSystem.css';
import './HomePage.css';

const HomePage = () => {
  const featureCards = [
    {
      id: 'protocol',
      title: 'Protocol & Study Design Generator',
      description: 'Generate comprehensive clinical protocols for various diseases and conditions',
      path: '/protocol',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/protocol.png'
    },
    {
      id: 'regulatory',
      title: 'Regulatory Document Generator',
      description: 'Create regulatory documents for pharmaceutical development across global markets',
      path: '/unified-regulatory',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/reg-doc-gen.png'
    },
    {
      id: 'diagnosis',
      title: 'Disease Screening',
      description: 'AI-powered tools for diagnosing conditions across multiple medical specialties',
      path: '/diagnosis',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/disease-screening.png'
    },
    {
      id: 'query',
      title: 'Ask Lumina™',
      description: 'get expert answers to complex questions about clinical trials, and protocols',
      path: '/query',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/ask-lumina.png'
    }
  ];

  const secondaryFeatureCards = [
    {
      id: 'enhanced-analysis',
      title: 'Enhanced Medical Analysis',
      description: 'Advanced AI-powered analysis for complex medical data and research insights',
      path: '/enhanced-analysis',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/enhanced-analysis-new.svg'
    },
    {
      id: 'excel-analysis',
      title: 'Excel Biomarker Analysis',
      description: 'Comprehensive analysis of biomarker data from Excel spreadsheets',
      path: '/excel-analysis',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/excel-analysis-new.svg'
    },
    {
      id: 'clinical-dossier',
      title: 'Clinical Dossier Compiler',
      description: 'Compile and organize clinical documentation for regulatory submissions',
      path: '/clinical-dossier',
      backgroundColor: '#FFFFFF',
      icon: '/assets/icons/clinical-dossier-new.svg'
    }
  ];

  return (
    <div className="homepage-new">
      {/* Main Content Area */}
      <div className="homepage-content">
        {/* Hero Image */}
        <div className="hero-image-container">
          <img
            src="/assets/images/lab-hero.png"
            alt="Laboratory Research"
            className="hero-image"
          />
        </div>

        {/* Feature Cards */}
        <div className="feature-cards-grid">
          {featureCards.map(card => (
            <Link
              to={card.path}
              key={card.id}
              className="feature-card-new"
              style={{ backgroundColor: card.backgroundColor }}
            >
              <div className="card-content">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
              </div>
              <div className="card-footer">
                <div className="card-icon">
                  <img src={card.icon} alt={card.title} />
                </div>
                <div className="card-arrow">→</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Secondary Feature Cards */}
        <div className="feature-cards-grid secondary-grid">
          {secondaryFeatureCards.map(card => (
            <Link
              to={card.path}
              key={card.id}
              className="feature-card-new"
              style={{ backgroundColor: card.backgroundColor }}
            >
              <div className="card-content">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
              </div>
              <div className="card-footer">
                <div className="card-icon">
                  <img src={card.icon} alt={card.title} />
                </div>
                <div className="card-arrow">→</div>
              </div>
            </Link>
          ))}
        </div>

        {/* How It Works Section */}
        <div className="how-it-works-section">
          <h2 className="section-heading">How It Works</h2>
          <div className="steps-container">
            <div className="steps-grid">
              <div className="step-item">
                <h3 className="step-heading">Select a Tool</h3>
                <p className="step-text">Choose from our suite of AI-powered clinical tools</p>
                <div className="step-icon">
                  <img src="/assets/icons/select-tool.svg" alt="Select a Tool" />
                </div>
              </div>
              <div className="step-connector">→</div>
              <div className="step-item">
                <h3 className="step-heading">Input Parameters</h3>
                <p className="step-text">Provide disease information, patient data, or research requirements</p>
                <div className="step-icon">
                  <img src="/assets/icons/input-params.svg" alt="Input Parameters" />
                </div>
              </div>
              <div className="step-connector">→</div>
              <div className="step-item">
                <h3 className="step-heading">Generate Results</h3>
                <p className="step-text">Receive AI-generated protocols, documentation, or diagnoses</p>
                <div className="step-icon">
                  <img src="/assets/icons/generate-results.svg" alt="Generate Results" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
