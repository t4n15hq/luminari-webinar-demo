import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import './DiseaseDiagnosis.css';

const DiseaseDiagnosis = () => {
  const [showAskLumina, setShowAskLumina] = useState(false);

  // List of medical specialties - Dermatology and Pulmonology are now active
  const specialties = [
    {
      id: 'dermatology',
      name: 'Dermatology',
      isActive: true,
      icon: 'DE',
      description: 'Skin disease detection and analysis using image recognition',
      features: [],
      path: '/diagnosis/dermatology'
    },
    {
      id: 'pulmonology',
      name: 'Pulmonology',
      isActive: true,
      icon: 'PU',
      description: 'Lung cancer risk assessment using clinical data and text analysis',
      features: [],
      path: '/diagnosis/pulmonology'
    },
    {
      id: 'neurology',
      name: 'Neurology',
      isActive: false,
      icon: 'NE',
      description: 'Neurological condition assessment and cognitive analysis',
      features: ['Coming soon'],
      path: '/diagnosis/neurology'
    },
    {
      id: 'oncology',
      name: 'Oncology',
      isActive: false,
      icon: 'ON',
      description: 'Cancer detection and treatment response monitoring',
      features: ['Coming soon'],
      path: '/diagnosis/oncology'
    },
    {
      id: 'raredisease',
      name: 'Rare Disease',
      isActive: false,
      icon: 'RD',
      description: 'Rare disease identification and genetic analysis',
      features: ['Coming soon'],
      path: '/diagnosis/raredisease'
    },
    {
      id: 'cardiology',
      name: 'Cardiology',
      isActive: false,
      icon: 'CA',
      description: 'Cardiovascular risk assessment and ECG analysis',
      features: ['Coming soon'],
      path: '/diagnosis/cardiology'
    },
    {
      id: 'mentalhealth',
      name: 'Mental Health',
      isActive: false,
      icon: 'MH',
      description: 'Mental health screening and cognitive assessment',
      features: ['Coming soon'],
      path: '/diagnosis/mentalhealth'
    },
    {
      id: 'digestive',
      name: 'Gastroenterology',
      isActive: false,
      icon: 'GA',
      description: 'Digestive system disorders and endoscopy analysis',
      features: ['Coming soon'],
      path: '/diagnosis/digestive'
    },
    {
      id: 'infectious',
      name: 'Infectious Diseases',
      isActive: false,
      icon: 'ID',
      description: 'Pathogen identification and outbreak analysis',
      features: ['Coming soon'],
      path: '/diagnosis/infectious'
    },
    {
      id: 'endocrinology',
      name: 'Endocrinology',
      isActive: false,
      icon: 'EN',
      description: 'Hormone disorders and diabetes management',
      features: ['Coming soon'],
      path: '/diagnosis/endocrinology'
    },
    {
      id: 'rheumatology',
      name: 'Rheumatology',
      isActive: false,
      icon: 'RH',
      description: 'Autoimmune and joint disorder assessment',
      features: ['Coming soon'],
      path: '/diagnosis/rheumatology'
    },
    {
      id: 'other',
      name: 'General Medicine',
      isActive: false,
      icon: 'GM',
      description: 'General medical assessment and triage',
      features: ['Coming soon'],
      path: '/diagnosis/other'
    }
  ];

  return (
    <div className="disease-diagnosis-container">
      {/* Ask Lumina Popup */}
      <AskLuminaPopup
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Disease Screening - Medical Specialty Selection"
      />

      {/* Professional Ask Lumina Floating Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon="AI"
        label="Ask Lumina™"
        variant="primary"
      />

      {/* Header */}
      <div className="diagnosis-header">
        <h1>Disease Screening</h1>
        <p>Select a medical specialty to access AI-powered diagnosis tools</p>
      </div>

      {/* Specialty Grid */}
      <div className="specialty-grid">
        {specialties.map(specialty => (
          <div
            key={specialty.id}
            className={`specialty-card ${!specialty.isActive ? 'inactive' : ''}`}
          >
            {/* Card Header */}
            <div className="specialty-card-header">
              <h3>{specialty.name}</h3>
            </div>

            {/* Description */}
            <p className="specialty-description">
              {specialty.description}
            </p>

            {/* Button */}
            {specialty.isActive ? (
              <Link
                to={specialty.path}
                className="btn btn-primary specialty-button"
              >
                Access Tools
              </Link>
            ) : (
              <button
                disabled
                className="btn btn-secondary specialty-button"
                style={{ cursor: 'not-allowed' }}
              >
                Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiseaseDiagnosis;