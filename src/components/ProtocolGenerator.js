import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import apiService from '../services/api';
import { saveDocument } from '../services/api';
import PreviousDocuments from './common/PreviousDocuments';
import { saveProtocol, saveStudyDesign, getMyDocuments } from '../services/documentService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs'; // NEW IMPORT
import { useAuth } from '../contexts/AuthContext'; // NEW IMPORT for global state
import { useDropzone } from 'react-dropzone'; // NEW IMPORT for document upload
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import DocumentViewer from './common/DocumentViewer';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import RichTextEditor from './common/RichTextEditor';
import './ProtocolGenerator.css';

// Memoized ProgressBar component to prevent unnecessary re-renders
const ProgressBar = memo(({ completion, activeFormSection, setActiveFormSection }) => {
  return (
    <div
      className="form-progress-bar"
      style={{
        marginBottom: '2rem',
        backgroundColor: 'white',
        borderRadius: '0',
        padding: '1.5rem',
        border: '1px solid #000000',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: 0,
          color: '#1e293b'
        }}>
          Form Progress
        </h3>
        <div style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: completion.requiredPercentage === 100 ? '#10b981' : '#683D94'
        }}>
          {completion.completedCount}/{completion.totalSections} sections completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Overall Progress</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
            {completion.percentage}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e2e8f0',
          borderRadius: '0',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${completion.percentage}%`,
            height: '100%',
            backgroundColor: completion.percentage === 100 ? '#10b981' : '#683D94',
            transition: 'width 0.3s ease, background-color 0.3s ease'
          }} />
        </div>
      </div>

      {/* Required Fields Progress Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Required Fields</span>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: completion.requiredPercentage === 100 ? '#10b981' : '#ef4444'
          }}>
            {completion.requiredCompletedCount}/{completion.requiredCount} completed
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#fef2f2',
          borderRadius: '0',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${completion.requiredPercentage}%`,
            height: '100%',
            backgroundColor: completion.requiredPercentage === 100 ? '#10b981' : '#ef4444',
            transition: 'width 0.3s ease, background-color 0.3s ease'
          }} />
        </div>
      </div>

      {/* Section Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.5rem'
      }}>
        {completion.sections.map(section => (
          <div
            key={section.key}
            onClick={() => {
              setActiveFormSection(section.key);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              borderRadius: '0',
              backgroundColor: activeFormSection === section.key ? '#eff6ff' : (section.isCompleted() ? '#f0fdf4' : '#f8fafc'),
              border: `1px solid ${activeFormSection === section.key ? '#683D94' : (section.isCompleted() ? '#10b981' : '#000000')}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeFormSection === section.key ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = section.isCompleted() ? '#ecfdf5' : '#f1f5f9';
              e.currentTarget.style.border = `1px solid ${section.isCompleted() ? '#059669' : '#000000'}`;
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = activeFormSection === section.key ? '#eff6ff' : (section.isCompleted() ? '#f0fdf4' : '#f8fafc');
              e.currentTarget.style.border = `1px solid ${activeFormSection === section.key ? '#683D94' : (section.isCompleted() ? '#10b981' : '#000000')}`;
              e.currentTarget.style.boxShadow = activeFormSection === section.key ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none';
            }}
          >
            <span style={{
              fontSize: '1rem',
              color: section.isCompleted() ? '#10b981' : '#64748b'
            }}>
              {section.isCompleted() ? '✓' : '✕'}
            </span>
            <span style={{
              fontSize: '0.85rem',
              color: section.isCompleted() ? '#059669' : '#64748b',
              fontWeight: section.isCompleted() ? '500' : '400'
            }}>
              {section.title}
              {section.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Memoized FormSection component
const FormSection = memo(({ title, sectionKey, children, isRequired, completion, activeFormSection, setActiveFormSection }) => {
  const isCompleted = completion.sections.find(s => s.key === sectionKey)?.isCompleted() || false;
  const isActive = activeFormSection === sectionKey;
  const sectionRef = React.useRef(null);

  // Scroll to section when it becomes active
  React.useEffect(() => {
    if (isActive && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [isActive]);

  if (!isActive) return null;

  // Find current section index and determine next/previous
  const currentIndex = completion.sections.findIndex(s => s.key === sectionKey);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < completion.sections.length - 1;
  const previousSection = hasPrevious ? completion.sections[currentIndex - 1] : null;
  const nextSection = hasNext ? completion.sections[currentIndex + 1] : null;

  return (
    <div
      ref={sectionRef}
      id={`form-section-${sectionKey}`}
      style={{
        marginBottom: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '0',
        border: `2px solid ${isCompleted ? '#10b981' : '#000000'}`,
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        scrollMarginTop: '100px'
      }}>
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#f8fafc',
        borderBottom: 'px solid #000000'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: 0,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: isCompleted ? '#10b981' : '#64748b' }}>
            {isCompleted ? '✓' : '✕'}
          </span>
          {title}
          {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </h3>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {children}
      </div>

      {/* Navigation Buttons */}
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {hasPrevious ? (
          <button
            onClick={() => setActiveFormSection(previousSection.key)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#683D94',
              border: '1px solid #683D94',
              borderRadius: '0',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#683D94';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#683D94';
            }}
          >
            ← Previous
          </button>
        ) : <div />}

        {hasNext && (
          <button
            onClick={() => setActiveFormSection(nextSection.key)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#683D94',
              color: 'white',
              border: '1px solid #683D94',
              borderRadius: '0',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7c4ba8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#683D94';
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
});

const ProtocolGenerator = () => {
  const [showAskLumina, setShowAskLumina] = useState(false);
  
  // Get global state from AuthContext
  const { 
    globalProtocolResult, 
    globalStudyDesign, 
    globalProtocolFormData,
    setGlobalProtocolResult, 
    setGlobalStudyDesign, 
    setGlobalProtocolFormData,
    saveGlobalProtocolState 
  } = useAuth();

  // Create individual memoized handlers for each field to prevent re-creation
  const handleFieldChange = useMemo(() => {
    const handlers = {};
    const fieldNames = [
      'disease', 'population', 'treatment', 'drugClass', 'mechanism', 'clinicalInfo',
      'studyType', 'trialPhase', 'trialType', 'randomization', 'blinding', 'controlGroupType',
      'sampleSize', 'minAge', 'maxAge', 'gender', 'inclusionCriteria', 'exclusionCriteria',
      'routeOfAdministration', 'dosingFrequency', 'comparatorDrug', 'primaryEndpoints',
      'secondaryEndpoints', 'outcomeMeasurementTool', 'statisticalPower', 'significanceLevel',
      'studyDuration'
    ];

    fieldNames.forEach(field => {
      handlers[field] = (e) => {
        const value = e.target.value;
        setGlobalProtocolFormData(prev => ({ ...prev, [field]: value }));
      };
    });

    return handlers;
  }, [setGlobalProtocolFormData]);

  // Active section state for navigation
  const [activeFormSection, setActiveFormSection] = useState('basicInfo');

  // Clear all form fields
  const handleClearForm = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all fields? This action cannot be undone.')) {
      setGlobalProtocolFormData({});
      setActiveFormSection('basicInfo');
      // Also clear JSON upload
      clearJsonUpload();
    }
  }, [setGlobalProtocolFormData]);


  
  // Use global form data and create setters that update global state
  const {
    disease,
    population,
    treatment,
    drugClass,
    mechanism,
    clinicalInfo,
    studyType,
    trialPhase,
    trialType,
    randomization,
    blinding,
    controlGroupType,
    sampleSize,
    minAge,
    maxAge,
    gender,
    inclusionCriteria,
    exclusionCriteria,
    routeOfAdministration,
    dosingFrequency,
    comparatorDrug,
    primaryEndpoints,
    secondaryEndpoints,
    outcomeMeasurementTool,
    statisticalPower,
    significanceLevel,
    studyDuration
  } = globalProtocolFormData;


  // Preclinical-specific parameters
  const [animalModel, setAnimalModel] = useState('');
  const [animalStrain, setAnimalStrain] = useState('');
  const [animalsPerGroup, setAnimalsPerGroup] = useState('');
  const [studyObjective, setStudyObjective] = useState(''); // Safety, efficacy, toxicology, etc.
  const [doseLevels, setDoseLevels] = useState('');
  const [vehicleControl, setVehicleControl] = useState('');
  const [tissueCollection, setTissueCollection] = useState('');
  const [biomarkerAnalysis, setBiomarkerAnalysis] = useState('');
  const [regulatoryGuideline, setRegulatoryGuideline] = useState(''); // GLP, ICH, etc.

  // UI State
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const progressIntervalRef = React.useRef(null);

  // Use global result and studyDesign state
  const result = globalProtocolResult;
  const studyDesign = globalStudyDesign;
  
  // Create setters that update global state
  const setResult = (value) => {
    setGlobalProtocolResult(value);
    // Save to localStorage immediately
    if (value) {
      saveGlobalProtocolState(value, globalStudyDesign, globalProtocolFormData);
    }
  };
  
  const setStudyDesign = (value) => {
    setGlobalStudyDesign(value);
    // Save to localStorage immediately
    if (value) {
      saveGlobalProtocolState(globalProtocolResult, value, globalProtocolFormData);
    }
  };
  const [activeTab, setActiveTab] = useState('protocol');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showGeneratedInfo, setShowGeneratedInfo] = useState(false);
  const [showPreviousProtocols, setShowPreviousProtocols] = useState(false);
  const [showDocHistory, setShowDocHistory] = useState(false);

  // Compiler section state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [activeSection, setActiveSection] = useState('protocol'); // 'protocol' or 'compiler'
  
  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [compilerLoading, setCompilerLoading] = useState(false);
  const [previousProtocols, setPreviousProtocols] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [protocolsPerPage] = useState(5);
  const [fetchError, setFetchError] = useState('');
  // Add state for previous doc type
  const [previousDocType, setPreviousDocType] = useState('PROTOCOL'); // 'PROTOCOL' or 'STUDY_DESIGN'

  // Individual section editing state
  const [sectionEdits, setSectionEdits] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [aiEnabledSections, setAiEnabledSections] = useState(new Set());
  
  // Reference Protocol Panel State
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [selectedReferenceProtocol, setSelectedReferenceProtocol] = useState(null);
  const [referenceProtocolTOC, setReferenceProtocolTOC] = useState([]);
  const [selectedReferenceSection, setSelectedReferenceSection] = useState(null);
  const [selectedReferenceSectionContent, setSelectedReferenceSectionContent] = useState('');

  // JSON Upload State
  const [uploadedJsonFile, setUploadedJsonFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [jsonAdditionalContext, setJsonAdditionalContext] = useState('');
  const [showJsonUploadSuccess, setShowJsonUploadSuccess] = useState(false);

  // Section Selection and Editing State
  const [selectedProtocolSections, setSelectedProtocolSections] = useState(new Set());
  const [selectedStudyDesignSections, setSelectedStudyDesignSections] = useState(new Set());
  const [editableSelectedContent, setEditableSelectedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Background processing
  const { startJob, getJob } = useBackgroundJobs('protocol');
  const [backgroundJobId, setBackgroundJobId] = useState(null);

  // Country-specific regulatory requirements for compiler section
  const countryRegulatoryData = {
    'US': {
      name: 'United States',
      regulator: 'FDA',
      submissionRoute: 'IND',
      documents: ['Protocol', 'IB', 'ICF', 'FDA Forms 1571/1572', 'CMC', 'Preclinical Data', 'IRB Approval', 'Financial Disclosures', 'Insurance'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'Informed Consent Form', required: true, icon: '', maxFiles: 1 },
        { id: 'fda_forms', name: 'FDA Forms 1571/1572', required: true, icon: '', maxFiles: 2 },
        { id: 'cmc', name: 'CMC (Chemistry, Manufacturing, Controls)', required: true, icon: '', maxFiles: 3 },
        { id: 'preclinical', name: 'Preclinical Data', required: true, icon: '', maxFiles: 5 },
        { id: 'irb', name: 'IRB Approval', required: true, icon: '', maxFiles: 1 },
        { id: 'financial', name: 'Financial Disclosures', required: true, icon: '', maxFiles: 1 },
        { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 }
      ]
    },
    'US-BLA': {
      name: 'United States (BLA)',
      regulator: 'FDA',
      submissionRoute: 'BLA (Biologics License Application)',
      documents: ['BLA Form 356h', 'Clinical Protocol', 'IB', 'ICF', 'CMC/Biologics License Application', 'Preclinical Data', 'Clinical Study Reports', 'IRB Approval', 'Financial Disclosures', 'Insurance', 'Environmental Assessment', 'Labeling'],
      documentCategories: [
        { id: 'bla_form', name: 'BLA Form 356h', required: true, icon: '', maxFiles: 1 },
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'Informed Consent Form', required: true, icon: '', maxFiles: 1 },
        { id: 'cmc_bla', name: 'CMC/Biologics License Application', required: true, icon: '', maxFiles: 5 },
        { id: 'preclinical', name: 'Preclinical Data', required: true, icon: '', maxFiles: 8 },
        { id: 'clinical_reports', name: 'Clinical Study Reports', required: true, icon: '', maxFiles: 10 },
        { id: 'irb', name: 'IRB Approval', required: true, icon: '', maxFiles: 1 },
        { id: 'financial', name: 'Financial Disclosures', required: true, icon: '', maxFiles: 1 },
        { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 },
        { id: 'environmental', name: 'Environmental Assessment', required: true, icon: '', maxFiles: 1 },
        { id: 'labeling', name: 'Labeling', required: true, icon: '', maxFiles: 1 }
      ]
    },
    'EU': {
      name: 'European Union',
      regulator: 'EMA/NCAS',
      submissionRoute: 'IMPD/CTA (CTD/eCTD)',
      documents: ['Protocol', 'IB', 'ICF (translated)', 'IMPD Modules (Quality/Nonclinical/Clinical)', 'GMP', 'EC Opinion', 'Insurance'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'ICF (translated)', required: true, icon: '', maxFiles: 1 },
        { id: 'impd_quality', name: 'IMPD Quality Module', required: true, icon: '', maxFiles: 3 },
        { id: 'impd_nonclinical', name: 'IMPD Non-clinical Module', required: true, icon: '', maxFiles: 5 },
        { id: 'impd_clinical', name: 'IMPD Clinical Module', required: true, icon: '', maxFiles: 3 },
        { id: 'gmp', name: 'GMP Certificate', required: true, icon: '', maxFiles: 1 },
        { id: 'ec_opinion', name: 'EC Opinion', required: true, icon: '', maxFiles: 1 },
        { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 }
      ]
    },
    'JP': {
      name: 'Japan',
      regulator: 'PMDA/MHI',
      submissionRoute: 'CTN',
      documents: ['Protocol', 'IB', 'ICF (Japanese)', 'CTA Form', 'Preclinical', 'CMC', 'IRB Approval', 'HGRAC (if applicable)'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'ICF (Japanese)', required: true, icon: '', maxFiles: 1 },
        { id: 'cta_form', name: 'CTA Form', required: true, icon: '', maxFiles: 1 },
        { id: 'preclinical', name: 'Preclinical Data', required: true, icon: '', maxFiles: 5 },
        { id: 'cmc', name: 'CMC Data', required: true, icon: '', maxFiles: 3 },
        { id: 'irb', name: 'IRB Approval', required: true, icon: '', maxFiles: 1 },
        { id: 'hgrac', name: 'HGRAC (if applicable)', required: false, icon: '', maxFiles: 1 }
      ]
    },
    'CN': {
      name: 'China',
      regulator: 'NMPA',
      submissionRoute: 'IND',
      documents: ['Protocol', 'IB', 'ICF (Mandarin)', 'CTA Form', 'Preclinical', 'CMC', 'IRB Approval', 'HGRAC (if applicable)'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'ICF (Mandarin)', required: true, icon: '', maxFiles: 1 },
        { id: 'cta_form', name: 'CTA Form', required: true, icon: '', maxFiles: 1 },
        { id: 'preclinical', name: 'Preclinical Data', required: true, icon: '', maxFiles: 5 },
        { id: 'cmc', name: 'CMC Data', required: true, icon: '', maxFiles: 3 },
        { id: 'irb', name: 'IRB Approval', required: true, icon: '', maxFiles: 1 },
        { id: 'hgrac', name: 'HGRAC (if applicable)', required: false, icon: '', maxFiles: 1 }
      ]
    },
    'IN': {
      name: 'India',
      regulator: 'CDSCO',
      submissionRoute: 'CTA/IND',
      documents: ['Protocol', 'IB', 'ICF (English + Local)', 'Form 44', 'Schedule Y', 'EC Approval', 'Insurance', 'PI CV'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'ICF (English + Local)', required: true, icon: '', maxFiles: 2 },
        { id: 'form_44', name: 'Form 44', required: true, icon: '', maxFiles: 1 },
        { id: 'schedule_y', name: 'Schedule Y', required: true, icon: '', maxFiles: 1 },
        { id: 'ec_approval', name: 'EC Approval', required: true, icon: '', maxFiles: 1 },
        { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 },
        { id: 'pi_cv', name: 'Principal Investigator CV', required: true, icon: '', maxFiles: 1 }
      ]
    },
    'RU': {
      name: 'Russia',
      regulator: 'Roszdravnadzor',
      submissionRoute: 'Clinical Trial Application (CTA)',
      documents: ['Protocol (Russian)', 'IB (Russian)', 'ICF (Russian)', 'CTA Form', 'Preclinical Data (Russian)', 'CMC (Russian)', 'EC Opinion (Russian)', 'Insurance', 'GMP Certificate', 'Pharmacovigilance Plan'],
      documentCategories: [
        { id: 'protocol', name: 'Clinical Protocol (Russian)', required: true, icon: '🇷🇺', maxFiles: 1 },
        { id: 'ib', name: "Investigator's Brochure (Russian)", required: true, icon: '', maxFiles: 1 },
        { id: 'icf', name: 'ICF (Russian)', required: true, icon: '', maxFiles: 1 },
        { id: 'cta_form', name: 'CTA Application Form', required: true, icon: '', maxFiles: 1 },
        { id: 'preclinical', name: 'Preclinical Data (Russian)', required: true, icon: '', maxFiles: 5 },
        { id: 'cmc', name: 'CMC Data (Russian)', required: true, icon: '', maxFiles: 3 },
        { id: 'ec_opinion', name: 'EC Opinion (Russian)', required: true, icon: '', maxFiles: 1 },
        { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 },
        { id: 'gmp', name: 'GMP Certificate', required: true, icon: '', maxFiles: 1 },
        { id: 'pharmacovigilance', name: 'Pharmacovigilance Plan', required: true, icon: '', maxFiles: 1 }
      ]
    },
    'CA': {
      name: 'Canada',
      regulator: 'Health Canada',
      submissionRoute: 'CTA (CTD/eCTD)',
      documents: ['Protocol', 'IB', 'ICF (English/French)', 'CTA Form', 'Preclinical', 'CMC', 'REB Approval', 'Insurance']
    },
    'GB': {
      name: 'United Kingdom',
      regulator: 'MHRA',
      submissionRoute: 'CTA (CTD/eCTD)',
      documents: ['Protocol', 'IB', 'ICF', 'CTA Form', 'Preclinical', 'CMC', 'REC Approval', 'Insurance']
    },
    'CH': {
      name: 'Switzerland',
      regulator: 'Swissmedic',
      submissionRoute: 'CTA (CTD/eCTD)',
      documents: ['Protocol', 'IB', 'ICF (German/French/Italian)', 'CTA Form', 'Preclinical', 'CMC', 'EC Approval', 'Insurance']
    },
    'AU': {
      name: 'Australia',
      regulator: 'TGA',
      submissionRoute: 'CTN',
      documents: ['Protocol', 'IB', 'ICF', 'CTN Form', 'Preclinical', 'CMC', 'HREC Approval', 'Insurance']
    },
    'BR': {
      name: 'Brazil',
      regulator: 'ANVISA',
      submissionRoute: 'CTA (research protocol author)',
      documents: ['Protocol', 'IB', 'ICF (Portuguese)', 'CTA Form', 'Preclinical', 'CMC', 'CEP Approval', 'Insurance']
    },
    'MX': {
      name: 'Mexico',
      regulator: 'COFEPRIS',
      submissionRoute: 'CTA',
      documents: ['Clinical Study Protocol', "Investigator's Brochure (IB)", 'Informed Consent Form (ICF)', 'Ethics/IRB Approval', 'COFEPRIS Application (CTA)', 'Insurance/C']
    },
    'ZA': {
      name: 'South Africa',
      regulator: 'SAHPRA',
      submissionRoute: 'SAHPRA Clinical Trial Application',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'EC/REC Approval', 'SAHPRA Forms', 'Import of IMP (if unregistered)', 'Safety Reporting Plan', 'Insurance']
    },
    'KE': {
      name: 'Kenya',
      regulator: 'PPB',
      submissionRoute: 'PPB Clinical Trial Application',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'EC Approval', 'PPB Application', 'Investigator CVs', 'Insurance']
    },
    'NG': {
      name: 'Nigeria',
      regulator: 'NAFDAC',
      submissionRoute: 'NAFDAC Clinical Trial Application',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'EC Approval', 'NAFDAC CTA Forms & Fees', 'GCP Certificates', 'Insurance']
    },
    'IL': {
      name: 'Israel',
      regulator: 'Ministry of Health',
      submissionRoute: 'MoH Clinical Trials Dept approval',
      documents: ['Clinical Study Protocol', "Investigator's Brochure", 'IMPD/Quality Info (if applicable)', 'ICF', 'EC/IRB Approval', 'MoH Application Forms']
    },
    'SG': {
      name: 'Singapore',
      regulator: 'HSA',
      submissionRoute: 'CTA/CTN/CTC (risk-based) + IRE',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'IRB Approval', 'CTA/CTN/CTC Application', 'IMP/CMC Info', 'Safety Reporting Plan']
    },
    'MY': {
      name: 'Malaysia',
      regulator: 'NPRA',
      submissionRoute: 'CTIL/CTX (for unregistered IMP)',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'EC Approval', 'CTIL/CTX Application', 'IMP/CMC Info', 'Insurance']
    },
    'PH': {
      name: 'Philippines',
      regulator: 'FDA (CDRR)',
      submissionRoute: 'FDA Authorization (per Circular)',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'ERC Approval', 'FDA Application', 'IMP Import Permit', 'Safety Reporting Plan']
    },
    'ID': {
      name: 'Indonesia',
      regulator: 'BPOM',
      submissionRoute: 'BPOM approval (per BPOM 8/)',
      documents: ['Clinical Study Protocol', 'IB', 'ICF', 'IRB Approval', 'BPOM Application', 'IMP/CMC Info', 'Trial Registration (INA-CRR)']
    }
  };

  // Default document categories for countries without specific requirements
  const defaultDocumentCategories = [
    { id: 'protocol', name: 'Clinical Protocol', required: true, icon: '', maxFiles: 1 },
    { id: 'ib', name: "Investigator's Brochure", required: true, icon: '', maxFiles: 1 },
    { id: 'icf', name: 'Informed Consent Form', required: true, icon: '', maxFiles: 1 },
    { id: 'quality', name: 'Quality Information', required: true, icon: '', maxFiles: 3 },
    { id: 'nonclinical', name: 'Non-clinical Data', required: true, icon: '', maxFiles: 5 },
    { id: 'clinical', name: 'Clinical Data', required: true, icon: '', maxFiles: 10 },
    { id: 'application', name: 'Application Form', required: true, icon: '', maxFiles: 1 },
    { id: 'insurance', name: 'Insurance', required: true, icon: '', maxFiles: 1 },
    { id: 'other', name: 'Other Documents', required: false, icon: '', maxFiles: 5 }
  ];

  // Get document categories for selected country
  const getDocumentCategories = () => {
    if (!selectedCountry) {
      return [];
    }
    
    // Return country-specific categories if available, otherwise use default
    return countryRegulatoryData[selectedCountry]?.documentCategories || defaultDocumentCategories;
  };

  // Document upload functionality
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    },
    onDrop: acceptedFiles => {
      const newDocuments = acceptedFiles.map(file => ({
        file,
        name: file.name,
        size: file.size,
        category: '',
        id: Date.now() + Math.random(),
        uploadedAt: new Date().toISOString()
      }));
      setUploadedDocuments([...uploadedDocuments, ...newDocuments]);
    }
  });

  const handleCategoryChange = (documentId, category) => {
    const documentCategories = getDocumentCategories();
    const categoryCount = uploadedDocuments.filter(doc => doc.category === category).length;
    const maxFiles = documentCategories.find(cat => cat.id === category)?.maxFiles || 10;
    
    if (categoryCount >= maxFiles) {
      alert(`Maximum ${maxFiles} file(s) allowed for ${category}`);
      return;
    }
    
    setUploadedDocuments(docs => 
      docs.map(doc => 
        doc.id === documentId ? { ...doc, category } : doc
      )
    );
  };

  const removeDocument = (documentId) => {
    setUploadedDocuments(docs => docs.filter(doc => doc.id !== documentId));
  };

  // JSON Upload Handlers
  const handleJsonFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Please upload a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target.result);
        setJsonData(jsonContent);
        setUploadedJsonFile(file);
        handleJsonDataMapping(jsonContent);
        setShowJsonUploadSuccess(true);
        setTimeout(() => setShowJsonUploadSuccess(false), 3000);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleJsonDataMapping = (data) => {
    // Field mapping configuration
    const fieldMapping = {
      // Direct mappings
      'disease': 'disease',
      'condition': 'disease',
      'population': 'population',
      'targetPopulation': 'population',
      'target_population': 'population',
      'treatment': 'treatment',
      'drugClass': 'drugClass',
      'drug_class': 'drugClass',
      'mechanism': 'mechanism',
      'mechanismOfAction': 'mechanism',
      'mechanism_of_action': 'mechanism',
      'studyType': 'studyType',
      'study_type': 'studyType',
      'trialPhase': 'trialPhase',
      'trial_phase': 'trialPhase',
      'phase': 'trialPhase',
      'trialType': 'trialType',
      'trial_type': 'trialType',
      'randomization': 'randomization',
      'blinding': 'blinding',
      'controlGroupType': 'controlGroupType',
      'control_group_type': 'controlGroupType',
      'controlGroup': 'controlGroupType',
      'sampleSize': 'sampleSize',
      'sample_size': 'sampleSize',
      'minAge': 'minAge',
      'min_age': 'minAge',
      'minimumAge': 'minAge',
      'maxAge': 'maxAge',
      'max_age': 'maxAge',
      'maximumAge': 'maxAge',
      'gender': 'gender',
      'inclusionCriteria': 'inclusionCriteria',
      'inclusion_criteria': 'inclusionCriteria',
      'inclusion': 'inclusionCriteria',
      'exclusionCriteria': 'exclusionCriteria',
      'exclusion_criteria': 'exclusionCriteria',
      'exclusion': 'exclusionCriteria',
      'routeOfAdministration': 'routeOfAdministration',
      'route_of_administration': 'routeOfAdministration',
      'route': 'routeOfAdministration',
      'dosingFrequency': 'dosingFrequency',
      'dosing_frequency': 'dosingFrequency',
      'dosing': 'dosingFrequency',
      'comparatorDrug': 'comparatorDrug',
      'comparator_drug': 'comparatorDrug',
      'comparator': 'comparatorDrug',
      'primaryEndpoints': 'primaryEndpoints',
      'primary_endpoints': 'primaryEndpoints',
      'primary': 'primaryEndpoints',
      'secondaryEndpoints': 'secondaryEndpoints',
      'secondary_endpoints': 'secondaryEndpoints',
      'secondary': 'secondaryEndpoints',
      'outcomeMeasurementTool': 'outcomeMeasurementTool',
      'outcome_measurement_tool': 'outcomeMeasurementTool',
      'outcomeTools': 'outcomeMeasurementTool',
      'statisticalPower': 'statisticalPower',
      'statistical_power': 'statisticalPower',
      'power': 'statisticalPower',
      'significanceLevel': 'significanceLevel',
      'significance_level': 'significanceLevel',
      'alpha': 'significanceLevel',
      'studyDuration': 'studyDuration',
      'study_duration': 'studyDuration',
      'duration': 'studyDuration'
    };

    const mappedData = {};
    const unmappedData = {};

    // Recursively flatten nested JSON objects
    const flattenObject = (obj, prefix = '') => {
      const flattened = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(flattened, flattenObject(value, newKey));
          } else {
            flattened[newKey] = value;
          }
        }
      }
      return flattened;
    };

    const flatData = flattenObject(data);

    // Map JSON fields to form fields
    Object.keys(flatData).forEach(key => {
      const lowerKey = key.toLowerCase().replace(/[_\s-]/g, '');
      let matched = false;

      // Try direct mapping first
      if (fieldMapping[key]) {
        mappedData[fieldMapping[key]] = String(flatData[key]);
        matched = true;
      } else {
        // Try case-insensitive and normalized matching
        for (const [jsonKey, formKey] of Object.entries(fieldMapping)) {
          const normalizedJsonKey = jsonKey.toLowerCase().replace(/[_\s-]/g, '');
          if (lowerKey === normalizedJsonKey || lowerKey.includes(normalizedJsonKey) || normalizedJsonKey.includes(lowerKey)) {
            mappedData[formKey] = String(flatData[key]);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        unmappedData[key] = flatData[key];
      }
    });

    // Update form fields with mapped data
    setGlobalProtocolFormData(prev => ({
      ...prev,
      ...mappedData
    }));

    // Store unmapped data as additional context
    if (Object.keys(unmappedData).length > 0) {
      const contextText = 'Additional context from JSON file:\n' +
        Object.entries(unmappedData)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
      setJsonAdditionalContext(contextText);

      // Append to clinicalInfo if it exists, otherwise set it
      setGlobalProtocolFormData(prev => ({
        ...prev,
        clinicalInfo: prev.clinicalInfo
          ? `${prev.clinicalInfo}\n\n${contextText}`
          : contextText
      }));
    }

    console.log('Mapped fields:', mappedData);
    console.log('Unmapped data:', unmappedData);
  };

  const clearJsonUpload = () => {
    setUploadedJsonFile(null);
    setJsonData(null);
    setJsonAdditionalContext('');
    setShowJsonUploadSuccess(false);
  };

  const getCategoryStatus = (categoryId) => {
    const documentCategories = getDocumentCategories();
    const uploaded = uploadedDocuments.filter(doc => doc.category === categoryId).length;
    const category = documentCategories.find(cat => cat.id === categoryId);
    const required = category?.required;
    
    if (required && uploaded === 0) return 'missing';
    if (uploaded >= category?.maxFiles) return 'full';
    if (uploaded > 0) return 'partial';
    return 'empty';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'missing': return '✕';
      case 'full': return '✓';
      case 'partial': return '🟡';
      default: return '✕';
    }
  };

  const isReadyToCompile = () => {
    if (!selectedCountry) return false;
    
    const documentCategories = getDocumentCategories();
    const requiredCategories = documentCategories
      .filter(cat => cat.required)
      .map(cat => cat.id);
    
    const uploadedCategories = uploadedDocuments
      .map(doc => doc.category)
      .filter(Boolean);
    
    return requiredCategories.every(req => uploadedCategories.includes(req));
  };

  const compileCountryDossier = async () => {
    setCompilerLoading(true);
    
    try {
      console.log(`Compiling dossier for ${countryRegulatoryData[selectedCountry].name}`);
      console.log('Uploaded documents:', uploadedDocuments);
      
      // Here you would implement the actual compilation logic
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Dossier compiled successfully for ${countryRegulatoryData[selectedCountry].name}!`);
    } catch (error) {
      console.error('Compilation error:', error);
      alert(`Failed to compile dossier: ${error.message}`);
    } finally {
      setCompilerLoading(false);
    }
  };

  // Function to calculate section completion (memoized for performance)
  const getSectionCompletion = useMemo(() => {
    const calculateCompletion = () => {
    const sections = [
      {
        key: 'basicInfo',
        title: 'Basic Information',
        isCompleted: () => (disease || '').trim() !== '',
        isRequired: true
      },
      {
        key: 'studyType',
        title: 'Study Type',
        isCompleted: () => (studyType || '').trim() !== '',
        isRequired: true
      },
      {
        key: 'trialDesign',
        title: studyType === 'preclinical' ? 'Study Design & Basics' : 'Trial Design & Basics',
        isCompleted: () => (trialPhase || '').trim() !== '' || (trialType || '').trim() !== '' || (randomization || '').trim() !== '' || (blinding || '').trim() !== '',
        isRequired: false
      },
      {
        key: 'population',
        title: studyType === 'preclinical' ? 'Animal Model & Study Design' : 'Population & Eligibility',
        isCompleted: () => (sampleSize || '').trim() !== '' || (minAge || '').trim() !== '' || (maxAge || '').trim() !== '' || (inclusionCriteria || '').trim() !== '',
        isRequired: false
      },
      {
        key: 'intervention',
        title: 'Intervention & Drug Details',
        isCompleted: () => (routeOfAdministration || '').trim() !== '' || (dosingFrequency || '').trim() !== '' || (comparatorDrug || '').trim() !== '',
        isRequired: false
      },
      {
        key: 'endpoints',
        title: 'Endpoints & Outcome Measures',
        isCompleted: () => (primaryEndpoints || '').trim() !== '' || (secondaryEndpoints || '').trim() !== '' || (outcomeMeasurementTool || '').trim() !== '',
        isRequired: false
      },
      {
        key: 'statistics',
        title: 'Statistical Considerations',
        isCompleted: () => (statisticalPower || '').trim() !== '' || (studyDuration || '').trim() !== '',
        isRequired: false
      },
      {
        key: 'additionalInfo',
        title: 'Additional Information',
        isCompleted: () => (clinicalInfo || '').trim() !== '',
        isRequired: false
      }
    ];

    const completedSections = sections.filter(section => section.isCompleted());
    const requiredSections = sections.filter(section => section.isRequired && section.isCompleted());
    const totalSections = sections.length;
    const completedCount = completedSections.length;
    const requiredCount = sections.filter(section => section.isRequired).length;
    const requiredCompletedCount = requiredSections.length;

      return {
        sections,
        completedSections,
        totalSections,
        completedCount,
        requiredCount,
        requiredCompletedCount,
        percentage: Math.round((completedCount / totalSections) * 100),
        requiredPercentage: Math.round((requiredCompletedCount / requiredCount) * 100)
      };
    };

    return calculateCompletion;
  }, [disease, studyType, trialPhase, trialType, randomization, blinding, sampleSize, minAge, maxAge, inclusionCriteria, routeOfAdministration, dosingFrequency, comparatorDrug, primaryEndpoints, secondaryEndpoints, outcomeMeasurementTool, statisticalPower, studyDuration, clinicalInfo]);

  // Protocol sections for navigation
  const protocolSections = [
    { id: 'protocol-section-1', title: '1. Protocol Summary / Synopsis' },
    { id: 'protocol-section-2', title: '2. Introduction & Background' },
    { id: 'protocol-section-3', title: '3. Objectives & Endpoints' },
    { id: 'protocol-section-4', title: '4. Study Design & Investigational Plan' },
    { id: 'protocol-section-5', title: '5. Study Population & Eligibility' },
    { id: 'protocol-section-6', title: '6. Interventions / Treatments' },
    { id: 'protocol-section-7', title: '7. Assessments & Procedures' },
    { id: 'protocol-section-8', title: '8. Statistical Considerations & Data Analysis' },
    { id: 'protocol-section-9', title: '9. Outcome Analysis' },
    { id: 'protocol-section-10', title: '10. References & Appendices' }
  ];

  // Function to dynamically extract section titles from content
  const getDynamicStudyDesignSections = () => {
    const sections = [
      { id: 'cmc-section', title: 'CMC Section' }
    ];
    
    if (studyDesign?.clinical_section) {
      const lines = studyDesign.clinical_section.split('\n');
      const foundSections = new Map(); // Use Map to avoid duplicates
      
      const sectionPatterns = [
        /^(\d+)\.\s+(.*)/i,                    // "1. Section Title"
        /^(\d+)\s+(.*)/i,                      // "1 Section Title"
      ];
      
      lines.forEach(line => {
        for (const pattern of sectionPatterns) {
          const match = line.match(pattern);
          if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 20) {
            const sectionNumber = parseInt(match[1]);
            const sectionTitle = match[2] ? match[2].trim() : line.trim();
            
            // Only add if we haven't seen this section number before
            if (!foundSections.has(sectionNumber)) {
              foundSections.set(sectionNumber, {
                id: `clinical-section-${sectionNumber}`,
                title: `${sectionNumber}. ${sectionTitle}`
              });
            }
            break;
          }
        }
      });
      
      // Convert Map to array and sort by section number
      const sortedSections = Array.from(foundSections.values())
        .sort((a, b) => {
          const aNum = parseInt(a.id.replace('clinical-section-', ''));
          const bNum = parseInt(b.id.replace('clinical-section-', ''));
          return aNum - bNum;
        });
      
      sections.push(...sortedSections);
    }
    
    // Fallback to predefined sections if no dynamic sections found
    if (sections.length === 1) {
      const fallbackSections = [
        { id: 'clinical-section-1', title: '1. Intro / Background' },
        { id: 'clinical-section-2', title: '2. Objectives / Hypotheses / Endpoints' },
        { id: 'clinical-section-3', title: '3. Study Design & Sample Size' },
        { id: 'clinical-section-4', title: '4. Populations & Baseline' },
        { id: 'clinical-section-5', title: '5. Statistical Methods & Data Handling' },
        { id: 'clinical-section-6', title: '6. Efficacy Analysis' },
        { id: 'clinical-section-7', title: '7. Safety Analysis' },
        { id: 'clinical-section-8', title: '8. Pharmacokinetic / Exploratory' },
        { id: 'clinical-section-9', title: '9. Interim & Other Special Analyses' },
        { id: 'clinical-section-10', title: '10. References & Appendices' }
      ];
      sections.push(...fallbackSections);
    }
    
    return sections;
  };

  // Study design sections for navigation (now dynamic)
  const studyDesignSections = getDynamicStudyDesignSections();

  // Dropdown options
  const studyTypes = ['clinical', 'preclinical'];
  const trialPhases = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];
  const preclinicalPhases = ['In vitro', 'In vivo - Acute', 'In vivo - Chronic', 'Toxicology', 'ADME', 'PK/PD'];
  const trialTypes = ['Interventional', 'Observational', 'Registry'];
  const preclinicalTypes = ['Safety/Toxicology', 'Efficacy', 'Pharmacokinetics', 'Pharmacodynamics', 'ADME', 'Dose-finding'];
  const blindingOptions = ['Open-label', 'Single-blind', 'Double-blind'];
  const controlGroupTypes = ['Placebo', 'Standard of Care', 'None'];
  const genderOptions = ['All', 'Male', 'Female'];
  const routeOptions = ['Oral', 'Intravenous (IV)', 'Subcutaneous (SC)', 'Intramuscular (IM)', 'Topical', 'Inhalation', 'Transdermal'];
  const dosingFrequencyOptions = ['Once daily', 'Twice daily', 'Three times daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As needed'];
  const outcomeMeasurementTools = [
    'PASI (Psoriasis Area and Severity Index)',
    'DLQI (Dermatology Life Quality Index)',
    'EASI (Eczema Area and Severity Index)',
    'IGA (Investigator Global Assessment)',
    'VAS (Visual Analog Scale)',
    'HAM-D (Hamilton Depression Rating Scale)',
    'MMSE (Mini-Mental State Examination)',
    'FEV1 (Forced Expiratory Volume)',
    'FVC (Forced Vital Capacity)',
    'WOMAC (Western Ontario and McMaster Universities Arthritis Index)',
    'Custom/Other'
  ];

  // Preclinical-specific options
  const animalModels = ['Mouse', 'Rat', 'Rabbit', 'Non-human primate', 'Pig', 'Dog', 'Other'];
  const animalStrains = ['C57BL/6', 'BALB/c', 'Sprague Dawley', 'Wistar', 'New Zealand White', 'Cynomolgus', 'Other'];
  const studyObjectives = ['Safety Assessment', 'Efficacy Evaluation', 'Toxicology', 'Pharmacokinetics', 'Pharmacodynamics', 'ADME', 'Dose-Range Finding'];
  const regulatoryGuidelines = ['GLP (Good Laboratory Practice)', 'ICH Guidelines', 'FDA Guidance', 'EMA Guidelines', 'OECD Guidelines', 'Other'];

  // Removed auto-population from localStorage

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowGeneratedInfo(false);
    
    try {
      // Compile all form data
      const formData = {
        disease_name: disease,
        additional_parameters: {
          // Study Type
          study_type: studyType,
          
          // Basic information
          population: population || undefined,
          treatment_duration: treatment || undefined,
          drug_class: drugClass || undefined,
          mechanism: mechanism || undefined,
          clinical_info: clinicalInfo || undefined,
          
          // Trial Design & Basics
          trial_phase: trialPhase || undefined,
          trial_type: trialType || undefined,
          randomization: randomization || undefined,
          blinding: blinding || undefined,
          control_group_type: controlGroupType || undefined,
          
          // Population & Eligibility (Clinical)
          sample_size: sampleSize || undefined,
          min_age: minAge || undefined,
          max_age: maxAge || undefined,
          gender: gender || undefined,
          inclusion_criteria: inclusionCriteria || undefined,
          exclusion_criteria: exclusionCriteria || undefined,
          
          // Preclinical-specific parameters
          animal_model: animalModel || undefined,
          animal_strain: animalStrain || undefined,
          animals_per_group: animalsPerGroup || undefined,
          study_objective: studyObjective || undefined,
          dose_levels: doseLevels || undefined,
          vehicle_control: vehicleControl || undefined,
          tissue_collection: tissueCollection || undefined,
          biomarker_analysis: biomarkerAnalysis || undefined,
          regulatory_guideline: regulatoryGuideline || undefined,
          
          // Intervention & Drug Details
          route_of_administration: routeOfAdministration || undefined,
          dosing_frequency: dosingFrequency || undefined,
          comparator_drug: comparatorDrug || undefined,
          
          // Endpoints & Outcome Measures
          primary_endpoints: primaryEndpoints || undefined,
          secondary_endpoints: secondaryEndpoints || undefined,
          outcome_measurement_tool: outcomeMeasurementTool || undefined,
          
          // Statistics & Duration
          statistical_power: statisticalPower || undefined,
          significance_level: significanceLevel || undefined,
          study_duration: studyDuration || undefined
        }
      };

      // Start background jobs for both protocol and study design
      const protocolJobId = startJob('protocol', formData, apiService.generateProtocol);
      const studyDesignJobId = startJob('study_design', formData, apiService.generateIndModule);

      setBackgroundJobId(protocolJobId);
      setLoading(true);
      setProgress(0);
      setStartTime(Date.now());

      // Simulate progress updates (since we don't get real progress from backend)
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev; // Cap at 95% until actually complete
          // Slow down as we approach completion
          const increment = prev < 50 ? 15 : prev < 80 ? 8 : 3;
          const newProgress = Math.min(prev + increment, 95);

          // Calculate ETA based on current progress
          const currentStartTime = startTime || Date.now();
          if (newProgress > 0) {
            const elapsed = Date.now() - currentStartTime;
            const estimatedTotal = (elapsed / newProgress) * 100;
            const remaining = estimatedTotal - elapsed;
            setEta(Math.max(0, Math.ceil(remaining / 1000))); // in seconds
          }

          return newProgress;
        });
      }, 2000); // Update every 2 seconds
      
      // Monitor both jobs
      const checkJobsStatus = async () => {
        const protocolJob = getJob(protocolJobId);
        const studyDesignJob = getJob(studyDesignJobId);
        
        if (protocolJob && studyDesignJob) {
          if (protocolJob.status === 'completed' && studyDesignJob.status === 'completed') {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setProgress(100);
            setLoading(false);
            setBackgroundJobId(null);

            setResult(protocolJob.result);
            setStudyDesign(studyDesignJob.result);
            setShowGeneratedInfo(true);

            // Save protocol to backend with error handling
            if (protocolJob.result) {
              try {
                await saveProtocol({
                  title: `Protocol for ${disease}`,
                  description: `${studyType || 'Clinical'} study protocol for ${population || disease}`,
                  disease,
                  content: protocolJob.result.protocol,
                  formData: globalProtocolFormData
                });
                console.log('✅ Protocol saved successfully');
              } catch (saveError) {
                console.error('❌ Failed to save protocol:', saveError.message);
                // Don't block the UI - protocol is still generated and viewable
                // Gracefully handle 413 errors and other save failures
                if (saveError.response?.status === 413) {
                  console.warn('⚠️ Protocol too large for backend storage (413). Document available locally.');
                } else {
                  console.warn('⚠️ Could not save protocol to backend. Document available locally.');
                }
              }
            }
            
            // Save study design to backend with error handling
            if (studyDesignJob.result) {
              try {
                await saveStudyDesign({
                  title: `Study Design for ${disease}`,
                  description: `${trialPhase || 'Clinical'} study design for ${disease}`,
                  disease,
                  cmcSection: studyDesignJob.result.cmc_section,
                  clinicalSection: studyDesignJob.result.clinical_section,
                  content: `CMC SECTION:\n${studyDesignJob.result.cmc_section}\n\nCLINICAL SECTION:\n${studyDesignJob.result.clinical_section}`,
                  formData: globalProtocolFormData
                });
                console.log('✅ Study design saved successfully');
              } catch (saveError) {
                console.error('❌ Failed to save study design:', saveError.message);
                // Don't block the UI - study design is still generated and viewable
                // Gracefully handle 413 errors and other save failures
                if (saveError.response?.status === 413) {
                  console.warn('⚠️ Study design too large for backend storage (413). Document available locally.');
                } else {
                  console.warn('⚠️ Could not save study design to backend. Document available locally.');
                }
              }
            }
            
            // Automatically scroll to results
            setTimeout(() => {
              document.querySelector('.result-container')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }, 100);
            
          } else if (protocolJob.status === 'error' || studyDesignJob.status === 'error') {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setLoading(false);
            setBackgroundJobId(null);
            setProgress(0);
            setError('Failed to generate protocol. Please try again.');
          } else {
            // Jobs still running, check again in 1 second
            setTimeout(checkJobsStatus, 1000);
          }
        } else {
          // Jobs not found, check again in 1 second
          setTimeout(checkJobsStatus, 1000);
        }
      };
      
      // Start monitoring
      checkJobsStatus();
      
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setError('Failed to generate protocol. Please try again.');
      console.error(err);
      setLoading(false);
      setBackgroundJobId(null);
      setProgress(0);
    }
  };

  const handleShowPreviousProtocols = async () => {
    setShowPreviousProtocols(!showPreviousProtocols);
    if (!showPreviousProtocols && previousProtocols.length === 0) {
      setLoadingPrevious(true);
      setFetchError('');
      try {
        const result = await getMyDocuments('PROTOCOL');
        if (result.success) {
          setPreviousProtocols(result.data);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setPreviousProtocols([]);
        setFetchError('Error fetching previous protocols. Please try again later.');
      } finally {
        setLoadingPrevious(false);
      }
    }
  };

  const handleSaveProtocol = async () => {
    if (!result && !studyDesign) {
      alert('No protocol or study design to save');
      return;
    }

    const content = result || studyDesign;
    const type = result ? 'PROTOCOL' : 'STUDY_DESIGN';

    const saveResult = await saveProtocol({
      title: `${disease || 'Untitled'} - ${studyType || 'Protocol'}`,
      description: `${studyType || ''} study for ${population || 'patients'}`,
      disease: disease,
      content: content,
      formData: globalProtocolFormData,
      studyDesign: type === 'STUDY_DESIGN' ? studyDesign : null
    });

    if (saveResult.success) {
      alert('Protocol saved successfully!');
    } else {
      alert('Failed to save protocol: ' + (saveResult.error || 'Unknown error'));
    }
  };

  const downloadDocument = (content, filename) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Generate PDF for selected sections with proper alignment
  const generateSelectedSectionsPDF = async () => {
    try {
      setLoading(true);
      
      // Get all selected sections content
      const selectedSections = [];
      
      // Add protocol sections (sorted)
      Array.from(selectedProtocolSections)
        .sort((a, b) => {
          const aNum = parseInt(a.replace('protocol-section-', ''));
          const bNum = parseInt(b.replace('protocol-section-', ''));
          return aNum - bNum;
        })
        .forEach(sectionId => {
        const sectionNumber = sectionId.replace('protocol-section-', '');
        const sectionTitle = protocolSections.find(s => s.id === sectionId)?.title || `Section ${sectionNumber}`;
        const sectionContent = sectionEdits[sectionId] || '';
        
        if (sectionContent) {
          selectedSections.push({
            title: sectionTitle,
            content: sectionContent
          });
        }
      });
      
      // Add study design sections (sorted)
      Array.from(selectedStudyDesignSections)
        .sort((a, b) => {
          // Handle cmc-section (should come first)
          if (a === 'cmc-section') return -1;
          if (b === 'cmc-section') return 1;
          
          // Handle clinical-section-X
          const aNum = parseInt(a.replace('clinical-section-', ''));
          const bNum = parseInt(b.replace('clinical-section-', ''));
          return aNum - bNum;
        })
        .forEach(sectionId => {
        const sectionTitle = sectionId === 'cmc-section' ? 'CMC Section' : `Clinical Section ${sectionId.replace('clinical-section-', '')}`;
        const sectionContent = sectionEdits[sectionId] || '';
        
        if (sectionContent) {
          selectedSections.push({
            title: sectionTitle,
            content: sectionContent
          });
        }
      });
      
      if (selectedSections.length === 0) {
        setError('No sections selected for export');
        return;
      }
      
      // Create PDF document
      const doc = new jsPDF();
      
      // PDF settings
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      const lineHeight = 7;
      const titleLineHeight = 10;
      const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
      
      // Document header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Selected Protocol Sections', pageWidth / 2, margin, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 10, { align: 'center' });
      doc.text(`Disease: ${disease}`, pageWidth / 2, margin + 17, { align: 'center' });
      
      let currentY = margin + 30;
      let currentPage = 1;
      
      // Add each section
      selectedSections.forEach((section, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - margin - 50) {
          doc.addPage();
          currentPage++;
          currentY = margin + 20;
        }
        
        // Section title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(section.title, margin, currentY);
        currentY += titleLineHeight;
        
        // Section content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        // Convert HTML content to plain text and handle formatting
        const plainText = section.content
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
        
        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(plainText, maxLineWidth);
        
        // Add lines with proper spacing
        lines.forEach(line => {
          // Check if we need a new page
          if (currentY > pageHeight - margin - 20) {
            doc.addPage();
            currentPage++;
            currentY = margin + 20;
          }
          
          doc.text(line, margin, currentY);
          currentY += lineHeight;
        });
        
        // Add spacing between sections
        currentY += 15;
      });
      
      // Save the PDF
      const filename = `Selected_Sections_${disease.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating selected sections PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const generatePDF = async (documentId, filename) => {
    try {
      setLoading(true);
      let content = '';
      let title = '';
      
      if (documentId === 'protocol') {
        content = result?.protocol || '';
        title = `Enhanced Protocol for ${disease}`;
      } else if (documentId === 'studyDesign') {
        content = `CMC SECTION:\n${studyDesign?.cmc_section || ''}\n\nCLINICAL SECTION:\n${studyDesign?.clinical_section || ''}`;
        title = `Study Design for ${disease}`;
      }
      
      if (content) {
        const doc = new jsPDF();
        
        // PDF page settings
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        const lineHeight = 7;
        const titleLineHeight = 10;
        const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
        
        // Document header with proper alignment
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, margin, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 10, { align: 'center' });
        doc.text(`Document ID: ${result?.protocol_id || 'N/A'}`, pageWidth / 2, margin + 17, { align: 'center' });
        
        let currentY = margin + 30;
        let currentPage = 1;
        
        // Convert HTML content to plain text and handle formatting
        const plainText = content
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
        
        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(plainText, maxLineWidth);
        
        // Add content with automatic page breaks and proper alignment
        for (let i = 0; i < lines.length; i++) {
          // Check if we need a new page
          if (currentY > pageHeight - margin - 20) {
            doc.addPage();
            currentPage++;
            currentY = margin + 20;
          }
          
          // Add line to current page with proper alignment
          doc.text(lines[i], margin, currentY);
          currentY += lineHeight;
        }
        
        doc.save(`${filename}.pdf`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Word document for selected sections
  const generateSelectedSectionsWord = async () => {
    try {
      setLoading(true);
      
      // Get all selected sections content
      const selectedSections = [];
      
      // Add protocol sections (sorted)
      Array.from(selectedProtocolSections)
        .sort((a, b) => {
          const aNum = parseInt(a.replace('protocol-section-', ''));
          const bNum = parseInt(b.replace('protocol-section-', ''));
          return aNum - bNum;
        })
        .forEach(sectionId => {
        const sectionNumber = sectionId.replace('protocol-section-', '');
        const sectionTitle = protocolSections.find(s => s.id === sectionId)?.title || `Section ${sectionNumber}`;
        const sectionContent = sectionEdits[sectionId] || '';
        
        if (sectionContent) {
          selectedSections.push({
            title: sectionTitle,
            content: sectionContent
          });
        }
      });
      
      // Add study design sections (sorted)
      Array.from(selectedStudyDesignSections)
        .sort((a, b) => {
          // Handle cmc-section (should come first)
          if (a === 'cmc-section') return -1;
          if (b === 'cmc-section') return 1;
          
          // Handle clinical-section-X
          const aNum = parseInt(a.replace('clinical-section-', ''));
          const bNum = parseInt(b.replace('clinical-section-', ''));
          return aNum - bNum;
        })
        .forEach(sectionId => {
        const sectionTitle = sectionId === 'cmc-section' ? 'CMC Section' : `Clinical Section ${sectionId.replace('clinical-section-', '')}`;
        const sectionContent = sectionEdits[sectionId] || '';
        
        if (sectionContent) {
          selectedSections.push({
            title: sectionTitle,
            content: sectionContent
          });
        }
      });
      
      if (selectedSections.length === 0) {
        setError('No sections selected for export');
        return;
      }
      
      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: `Selected Sections - ${disease} Protocol`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
                before: 400
              }
            }),
            
            // Date
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                  size: 20,
                  color: '666666'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 600
              }
            }),
            
            // Separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '─'.repeat(50),
                  size: 20,
                  color: 'CCCCCC'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400
              }
            }),
            
            // Sections
            ...selectedSections.flatMap((section, index) => [
              // Section title
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: {
                  after: 200,
                  before: index > 0 ? 400 : 200
                }
              }),
              
              // Section content (convert HTML to plain text)
              new Paragraph({
                children: [
                  new TextRun({
                    text: section.content.replace(/<[^>]*>/g, ''), // Remove HTML tags
                    size: 24,
                    spacing: {
                      line: 360 // 1.5 line spacing
                    }
                  })
                ],
                spacing: {
                  after: 400
                }
              }),
              
              // Separator between sections
              ...(index < selectedSections.length - 1 ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '─'.repeat(30),
                      size: 20,
                      color: 'CCCCCC'
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: {
                    after: 400
                  }
                })
              ] : [])
            ])
          ]
        }]
      });
      
      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Selected_Sections_${disease.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Error generating Word document');
    } finally {
      setLoading(false);
    }
  };

  // Generate Word document for full protocol
  const generateFullProtocolWord = async () => {
    try {
      setLoading(true);
      
      if (!result || !result?.protocol) {
        setError('No protocol content available');
        return;
      }
      
      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: `Clinical Protocol - ${disease}`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
                before: 400
              }
            }),
            
            // Date
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                  size: 20,
                  color: '666666'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 600
              }
            }),
            
            // Separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '─'.repeat(50),
                  size: 20,
                  color: 'CCCCCC'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400
              }
            }),
            
            // Protocol content (convert HTML to plain text)
            new Paragraph({
              children: [
                new TextRun({
                  text: (result?.protocol || '').replace(/<[^>]*>/g, ''), // Remove HTML tags
                  size: 24,
                  spacing: {
                    line: 360 // 1.5 line spacing
                  }
                })
              ],
              spacing: {
                after: 400
              }
            })
          ]
        }]
      });
      
      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Full_Protocol_${disease.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Error generating Word document');
    } finally {
      setLoading(false);
    }
  };

  // Generate Word document for full study design
  const generateFullStudyDesignWord = async () => {
    try {
      setLoading(true);
      
      if (!studyDesign) {
        setError('No study design content available');
        return;
      }
      
      const fullContent = `CMC SECTION:\n${studyDesign?.cmc_section || ''}\n\nCLINICAL SECTION:\n${studyDesign?.clinical_section || ''}`;
      
      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: `Study Design - ${disease}`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
                before: 400
              }
            }),
            
            // Date
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                  size: 20,
                  color: '666666'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 600
              }
            }),
            
            // Separator
            new Paragraph({
              children: [
                new TextRun({
                  text: '─'.repeat(50),
                  size: 20,
                  color: 'CCCCCC'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400
              }
            }),
            
            // Study design content (convert HTML to plain text)
            new Paragraph({
              children: [
                new TextRun({
                  text: fullContent.replace(/<[^>]*>/g, ''), // Remove HTML tags
                  size: 24,
                  spacing: {
                    line: 360 // 1.5 line spacing
                  }
                })
              ],
              spacing: {
                after: 400
              }
            })
          ]
        }]
      });
      
      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Full_Study_Design_${disease.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError('Error generating Word document');
    } finally {
      setLoading(false);
    }
  };

  // Function to identify protocol sections and add IDs for navigation
  const renderProtocolSections = (content) => {
    if (!content) {
      // Show a test section when no content is available
      return (
        <div style={{ 
          padding: '1rem', 
          border: '1px solid #000000', 
          borderRadius: '0', 
          backgroundColor: '#f9fafb',
          marginBottom: '1rem'
        }}>
          <h4 style={{ color: '#6b7280', marginBottom: '1rem' }}>Test Section (Generate a protocol to see real sections)</h4>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '10px',
            padding: '8px',
            borderRadius: '0',
            transition: 'background-color 0.2s'
          }}>
            <button
              onClick={() => handleProtocolSectionToggle('protocol-section-1')}
              style={{
                background: selectedProtocolSections.has('protocol-section-1') ? '#683D94' : '#f3f4f6',
                color: selectedProtocolSections.has('protocol-section-1') ? 'white' : '#374151',
                border: 'px solid #000000',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              title={selectedProtocolSections.has('protocol-section-1') ? 'Remove from selection' : 'Add to selection'}
            >
              {selectedProtocolSections.has('protocol-section-1') ? '✓' : '+'}
            </button>
            <h4 style={{ margin: 0, flex: 1 }}>1. Test Section Header</h4>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            This is a test section to demonstrate the "+" button functionality. 
            Generate a protocol to see real sections with "+" buttons.
          </p>
        </div>
      );
    }
    
    const lines = content.split('\n');
    const sectionsMarkup = [];
    
    lines.forEach((line, idx) => {
      // Check if this is a main section header (starts with a number followed by period)
      const sectionMatch = line.match(/^(\d+)\.\s+(.*)/i);
      
      if (sectionMatch && parseInt(sectionMatch[1]) >= 1 && parseInt(sectionMatch[1]) <= 10) {
        const sectionId = `protocol-section-${sectionMatch[1]}`;
        const isSelected = selectedProtocolSections.has(sectionId);
        
        sectionsMarkup.push(
          <div key={`section-${idx}`} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '10px',
            padding: '8px',
            borderRadius: '0',
            transition: 'background-color 0.2s'
          }}>
            <button
              onClick={() => handleProtocolSectionToggle(sectionId)}
              style={{
                background: isSelected ? '#683D94' : '#f3f4f6',
                color: isSelected ? 'white' : '#374151',
                border: 'px solid #000000',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              title={isSelected ? 'Remove from selection' : 'Add to selection'}
            >
              {isSelected ? '✓' : '+'}
            </button>
            <h4 
              id={sectionId} 
              style={{ margin: 0, flex: 1 }}
          >
            {line}
          </h4>
          </div>
        );
      } else if (line.trim()) {
        // For other text content
        // Check for subsection headers (numbered like 1.1, 1.2, etc. or starting with bold text)
        const isSubsection = line.match(/^\d+\.\d+/) ||
                             line.match(/^[A-Z][a-z]+:/) ||
                             line.match(/^\*\*(.*?)\*\*/);

        // Parse bold text (**text**)
        const parseBoldText = (text) => {
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };

        if (isSubsection) {
          // Subsection title
          sectionsMarkup.push(
            <h5 key={`subsection-${idx}`} style={{
              fontWeight: '600',
              marginTop: '1rem',
              marginBottom: '0.5rem',
              color: '#2D2D2D',
              fontFamily: 'Inter, sans-serif'
            }}>
              {parseBoldText(line)}
            </h5>
          );
        } else {
          // Regular paragraph with bold text parsing
          sectionsMarkup.push(
            <p key={`p-${idx}`} style={{
              lineHeight: '1.6',
              marginBottom: '0.75rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              {parseBoldText(line)}
            </p>
          );
        }
      } else {
        // Empty line
        sectionsMarkup.push(<br key={`br-${idx}`} />);
      }
    });
    
    return sectionsMarkup;
  };

  // Function to identify clinical section sections and add IDs for navigation
  const renderClinicalSections = (content) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const sectionsMarkup = [];
    
    lines.forEach((line, idx) => {
      // Check if this is a main section header with multiple patterns
      const sectionPatterns = [
        /^(\d+)\.\s+(.*)/i,                    // "1. Section Title"
        /^(\d+)\s+(.*)/i,                      // "1 Section Title"
      ];
      
      let sectionMatch = null;
      let sectionNumber = null;
      
      for (const pattern of sectionPatterns) {
        const match = line.match(pattern);
        if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 20) {
          sectionMatch = match;
          sectionNumber = parseInt(match[1]);
          break;
        }
      }
      
      if (sectionMatch && sectionNumber) {
        const sectionId = `clinical-section-${sectionNumber}`;
        const isSelected = selectedStudyDesignSections.has(sectionId);
        
        sectionsMarkup.push(
          <div key={`clinical-section-${idx}`} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0',
            border: '1px solid #000000'
          }}>
            <button
              onClick={() => handleStudyDesignSectionToggle(sectionId)}
              style={{
                background: isSelected ? '#683D94' : '#f3f4f6',
                color: isSelected ? 'white' : '#374151',
                border: 'px solid #000000',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              title={isSelected ? 'Remove from selection' : 'Add to selection'}
            >
              {isSelected ? '✓' : '+'}
            </button>
            <h4 
              id={sectionId} 
              className="section-title"
              style={{ margin: 0, flex: 1 }}
            >
              {line}
            </h4>
          </div>
        );
      } else if (line.trim()) {
        // Parse bold text (**text**)
        const parseBoldText = (text) => {
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };

        // For other text content
        if (line.match(/^[A-Z][a-z]/) || line.match(/^\d+\.\d+/)) {
          // Possible subsection title
          sectionsMarkup.push(
            <h5 key={`clinical-subsection-${idx}`} className="subsection-title" style={{
              fontWeight: '600',
              marginTop: '1rem',
              marginBottom: '0.5rem',
              color: '#2D2D2D',
              fontFamily: 'Inter, sans-serif'
            }}>
              {parseBoldText(line)}
            </h5>
          );
        } else if (line.match(/^[•\-*]/)) {
          // List item
          sectionsMarkup.push(
            <li key={`li-${idx}`} className="list-item" style={{
              lineHeight: '1.6',
              marginBottom: '0.5rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              {parseBoldText(line.substring(1).trim())}
            </li>
          );
        } else {
          // Regular paragraph
          sectionsMarkup.push(
            <p key={`p-${idx}`} style={{
              lineHeight: '1.6',
              marginBottom: '0.75rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              {parseBoldText(line)}
            </p>
          );
        }
      } else {
        // Empty line
        sectionsMarkup.push(<br key={`br-${idx}`} />);
      }
    });
    
    return sectionsMarkup;
  };

  const updateSectionContent = (sectionId, content) => {
    setSectionEdits(prev => ({
      ...prev,
      [sectionId]: content
    }));
  };

  // Reference Protocol Panel Functions
  const handleReferenceProtocolSelect = (protocol) => {
    setSelectedReferenceProtocol(protocol);
    setShowReferencePanel(true);

    // Generate TOC for the selected protocol
    const protocolContent = protocol.fullProtocol || protocol.fullDocument || protocol.content || '';
    if (protocolContent) {
      const lines = protocolContent.split('\n');
      const toc = [];
      
      lines.forEach((line, index) => {
        const sectionMatch = line.match(/^(\d+)\.\s+(.*)/i);
        if (sectionMatch && parseInt(sectionMatch[1]) >= 1 && parseInt(sectionMatch[1]) <= 10) {
          toc.push({
            id: `ref-section-${sectionMatch[1]}`,
            title: line,
            number: sectionMatch[1]
          });
        }
      });
      
      setReferenceProtocolTOC(toc);
      setSelectedReferenceSection(null);
      setSelectedReferenceSectionContent('');
    }
  };

  const handleReferenceSectionClick = (section) => {
    setSelectedReferenceSection(section);

    // Extract content for the selected section
    const protocolContent = selectedReferenceProtocol?.fullProtocol || selectedReferenceProtocol?.fullDocument || selectedReferenceProtocol?.content || '';
    if (protocolContent) {
      const lines = protocolContent.split('\n');
      const sectionNumber = section.number;
      let inSection = false;
      let sectionContent = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const sectionMatch = line.match(/^(\d+)\.\s+(.*)/i);
        
        if (sectionMatch && parseInt(sectionMatch[1]) === parseInt(sectionNumber)) {
          inSection = true;
          sectionContent.push(line);
        } else if (inSection && sectionMatch && parseInt(sectionMatch[1]) > parseInt(sectionNumber)) {
          break;
        } else if (inSection) {
          sectionContent.push(line);
        }
      }
      
      setSelectedReferenceSectionContent(sectionContent.join('\n'));
    }
  };

  const closeReferencePanel = () => {
    setShowReferencePanel(false);
    setSelectedReferenceProtocol(null);
    setReferenceProtocolTOC([]);
    setSelectedReferenceSection(null);
    setSelectedReferenceSectionContent('');
  };

  // Section Selection Handlers
  const handleProtocolSectionToggle = (sectionId) => {
    const newSelected = new Set(selectedProtocolSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
      // Remove section content when deselected
      const newSectionEdits = { ...sectionEdits };
      delete newSectionEdits[sectionId];
      setSectionEdits(newSectionEdits);
    } else {
      newSelected.add(sectionId);
      // Initialize section content when selected
      const sectionContent = extractSectionContent(result?.protocol, sectionId);
      setSectionEdits(prev => ({
        ...prev,
        [sectionId]: sectionContent
      }));
    }
    setSelectedProtocolSections(newSelected);
  };

  const handleStudyDesignSectionToggle = (sectionId) => {
    const newSelected = new Set(selectedStudyDesignSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
      // Remove section content when deselected
      const newSectionEdits = { ...sectionEdits };
      delete newSectionEdits[sectionId];
      setSectionEdits(newSectionEdits);
    } else {
      newSelected.add(sectionId);
      // Initialize section content when selected
      const sectionContent = extractStudyDesignSectionContent(studyDesign, sectionId);
      setSectionEdits(prev => ({
        ...prev,
        [sectionId]: sectionContent
      }));
    }
    setSelectedStudyDesignSections(newSelected);
  };

  // Content extraction functions
  const extractSectionContent = (content, sectionId) => {
    if (!content) return '';
    
    const lines = content.split('\n');
    const sectionNumber = sectionId.replace('protocol-section-', '');
    let inSection = false;
    let sectionContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const sectionMatch = line.match(/^(\d+)\.\s+(.*)/i);
      
      if (sectionMatch && parseInt(sectionMatch[1]) === parseInt(sectionNumber)) {
        inSection = true;
        // Format the main section header with HTML
        sectionContent.push(`<h3 style="color: #1e40af; margin-bottom: 1rem; font-size: 1.25rem;">${line}</h3>`);
      } else if (inSection && sectionMatch && parseInt(sectionMatch[1]) > parseInt(sectionNumber)) {
        break;
      } else if (inSection) {
        // Check for subsections (like 2.1, 2.2, etc.)
        const subsectionMatch = line.match(/^(\d+)\.(\d+)\s+(.*)/i);
        if (subsectionMatch) {
          sectionContent.push(`<h4 style="color: #374151; margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">${line}</h4>`);
        } else if (line.trim()) {
          // Regular paragraph content
          sectionContent.push(`<p style="margin: 0.5rem 0; line-height: 1.6;">${line}</p>`);
        } else {
          // Empty line
          sectionContent.push('<br>');
        }
      }
    }
    
    return sectionContent.join('');
  };

  const extractStudyDesignSectionContent = (content, sectionId) => {
    if (!content) return '';
    
    if (sectionId === 'cmc-section') {
      const cmcContent = content.cmc_section || '';
      const lines = cmcContent.split('\n');
      const formattedLines = lines.map(line => {
        if (line.match(/^[A-Z\s]{5,}$/)) {
          return `<h4 style="color: #1e40af; margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">${line}</h4>`;
        } else if (line.trim()) {
          return `<p style="margin: 0.5rem 0; line-height: 1.6;">${line}</p>`;
        } else {
          return '<br>';
        }
      });
      return formattedLines.join('');
    }
    
    const lines = content.clinical_section ? content.clinical_section.split('\n') : [];
    const sectionNumber = parseInt(sectionId.replace('clinical-section-', ''));
    
    // Find all section boundaries first
    const sectionBoundaries = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const sectionPatterns = [
        /^(\d+)\.\s+(.*)/i,                    // "1. Section Title"
        /^(\d+)\s+(.*)/i,                      // "1 Section Title"
      ];
      
      for (const pattern of sectionPatterns) {
        const match = line.match(pattern);
        if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 20) {
          sectionBoundaries.push({
            lineNumber: i,
            sectionNumber: parseInt(match[1]),
            title: match[2] || line,
            fullLine: line
          });
          break;
        }
      }
    }
    
    // Find the current section and next section boundaries
    const currentSection = sectionBoundaries.find(s => s.sectionNumber === sectionNumber);
    const nextSection = sectionBoundaries.find(s => s.sectionNumber === sectionNumber + 1);
    
    if (!currentSection) {
      // Section not found, return placeholder
      const sectionTitle = studyDesignSections.find(s => s.id === sectionId)?.title || `Section ${sectionNumber}`;
      return `<h3 style="color: #1e40af; margin-bottom: 1rem; font-size: 1.25rem;">${sectionTitle}</h3>
              <p style="margin: 0.5rem 0; line-height: 1.6; color: #6b7280; font-style: italic;">Content for this section will be available after Study Design generation.</p>`;
    }
    
    // Extract content between current section and next section
    const startLine = currentSection.lineNumber;
    const endLine = nextSection ? nextSection.lineNumber : lines.length;
    
    const sectionContent = [];
    
    // Add the section header
    sectionContent.push(`<h3 style="color: #1e40af; margin-bottom: 1rem; font-size: 1.25rem;">${currentSection.fullLine}</h3>`);
    
    // Extract content lines
    for (let i = startLine + 1; i < endLine; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line
        sectionContent.push('<br>');
      } else if (line.match(/^(\d+)\.(\d+)\s+(.*)/i)) {
        // Subsection (like 2.1, 2.2, etc.)
        sectionContent.push(`<h4 style="color: #374151; margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">${line}</h4>`);
      } else if (line.match(/^[A-Z\s]{5,}$/) && !line.match(/^(\d+)/)) {
        // All caps heading (not numbered)
        sectionContent.push(`<h4 style="color: #1e40af; margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">${line}</h4>`);
      } else if (line.match(/^(\d+)/) && !line.match(/^(\d+)\./)) {
        // Numbered item but not a section header
        sectionContent.push(`<p style="margin: 0.5rem 0; line-height: 1.6; padding-left: 1rem;"><strong>${line}</strong></p>`);
      } else {
        // Regular paragraph content
        sectionContent.push(`<p style="margin: 0.5rem 0; line-height: 1.6;">${line}</p>`);
      }
    }
    
    return sectionContent.join('');
  };

  // Individual section editing functions
  const startEditingSection = (sectionId) => {
    setEditingSectionId(sectionId);
    // Automatically enable AI when editing starts
    setAiEnabledSections(prev => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });
  };

  const saveSectionEdit = (sectionId, content) => {
    setSectionEdits(prev => ({
      ...prev,
      [sectionId]: content
    }));
    setEditingSectionId(null);
    // Keep AI enabled when saving (user can still toggle it)
  };

  const cancelSectionEdit = () => {
    setEditingSectionId(null);
    // Disable AI when editing is cancelled
    setAiEnabledSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(editingSectionId);
      return newSet;
    });
  };

  // Generate PDF for individual section
  const generateSectionPDF = async (sectionId, sectionTitle, sectionContent) => {
    try {
      setLoading(true);
      
      if (!sectionContent || sectionContent.trim() === '') {
        setError('No content to export');
        return;
      }
      
      // Create PDF document
      const doc = new jsPDF();
      
      // PDF settings
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      const lineHeight = 7;
      const titleLineHeight = 10;
      
      // Document header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Protocol Section', pageWidth / 2, margin, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 10, { align: 'center' });
      doc.text(`Disease: ${disease}`, pageWidth / 2, margin + 17, { align: 'center' });
      
      let currentY = margin + 30;
      let currentPage = 1;
      
      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(sectionTitle, margin, currentY);
      currentY += titleLineHeight;
      
      // Section content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      
      // Convert HTML content to plain text and handle formatting
      const plainText = sectionContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
      
      // Split content into lines that fit the page width
      const lines = doc.splitTextToSize(plainText, maxLineWidth);
      
      // Add lines with proper spacing
      lines.forEach(line => {
        // Check if we need a new page
        if (currentY > pageHeight - margin - 20) {
          doc.addPage();
          currentPage++;
          currentY = margin + 20;
        }
        
        doc.text(line, margin, currentY);
        currentY += lineHeight;
      });
      
      // Save the PDF
      const filename = `${sectionTitle.replace(/\s+/g, '_')}_${disease.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating section PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle AI for a specific section
  const toggleAIForSection = (sectionId) => {
    setAiEnabledSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="protocol-generator" style={{ position: 'relative' }}>
      {/* Add CSS for active/inactive tab states */}
      <style>{`
        .document-content.active-tab {
          display: block !important;
          opacity: 1;
          visibility: visible;
          transition: opacity 0.3s ease, visibility 0.3s ease;
          height: auto;
          overflow: visible;
        }
        
        .document-content.inactive-tab {
          display: block !important;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
          height: 0;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        
        .tab-btn.active {
          background-color: #683D94 !important;
          color: white !important;
          border-color: #683D94 !important;
        }
        
        .tab-btn {
          transition: all 0.2s ease;
        }
        
        .tab-btn:hover {
          background-color: #f1f5f9;
          border-color: #000000;
        }
      `}</style>
      
      {/* Ask Lumina Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Protocol Generation - Clinical Study Design"
      />

      {/* Professional Ask Lumina Floating Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon="AI"
        label="Ask Lumina™"
        variant="primary"
      />

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '0.5rem', color: '#2D2D2D', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>Clinical Study Protocol Generator</h2>
            <p>Generate a complete clinical study protocol with enhanced trial design parameters</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleShowPreviousProtocols} className="btn btn-outline">
              {showPreviousProtocols ? 'Hide Previous Protocols' : 'Previous Protocols'}
            </button>
            <button
              onClick={() => setShowDocHistory(true)}
              className="btn btn-outline"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '14px',
                fontWeight: '600',
                color: '#683D94',
                backgroundColor: 'white',
                border: '2px solid #683D94',
                borderRadius: '0',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Document History
            </button>
            {(result || studyDesign) && (
              <button
                onClick={handleSaveProtocol}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: '#683D94',
                  border: 'none',
                  borderRadius: '0',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
              >
                Save Protocol
              </button>
            )}
          </div>
        </div>
        
        {/* Section Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: 'px solid #000000',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => setActiveSection('protocol')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeSection === 'protocol' ? '#683D94' : 'transparent',
              color: activeSection === 'protocol' ? 'white' : '#64748b',
              border: 'none',
              borderBottom: activeSection === 'protocol' ? '3px solid #683D94' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '0',
              transition: 'all 0.2s ease'
            }}
          >
             Protocol Generator
          </button>
          <button
            onClick={() => setActiveSection('compiler')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeSection === 'compiler' ? '#683D94' : 'transparent',
              color: activeSection === 'compiler' ? 'white' : '#64748b',
              border: 'none',
              borderBottom: activeSection === 'compiler' ? '3px solid #683D94' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '0',
              transition: 'all 0.2s ease'
            }}
          >
             Country Compiler
          </button>
        </div>
      </div>
      {/* Protocol Generator Section */}
      {activeSection === 'protocol' && (
        <>
          {showPreviousProtocols && (
        <div style={{ background: '#f7fafc', border: '1px solid #000000', borderRadius: '0', padding: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Previous Documents</h4>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
            <button
              className={`btn btn-sm ${previousDocType === 'PROTOCOL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPreviousDocType('PROTOCOL')}
            >
              Protocols
            </button>
            <button
              className={`btn btn-sm ${previousDocType === 'STUDY_DESIGN' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPreviousDocType('STUDY_DESIGN')}
            >
              Study Designs
            </button>
          </div>
          <input
            type="text"
            className="form-input"
            placeholder={`Search by title or disease...`}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ marginBottom: '0.75rem' }}
          />
          {loadingPrevious ? <p>Loading...</p> : fetchError ? <p style={{ color: 'red' }}>{fetchError}</p> : (
            (() => {
              const filtered = previousProtocols.filter(doc =>
                doc.type === previousDocType &&
                (doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 doc.disease?.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              const totalPages = Math.ceil(filtered.length / protocolsPerPage);
              const startIdx = (currentPage - 1) * protocolsPerPage;
              const paginated = filtered.slice(startIdx, startIdx + protocolsPerPage);
              return filtered.length === 0 ? <p>No previous documents found.</p> : (
                <>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0 }}>
                    {paginated.map(doc => (
                      <li key={doc.id} style={{ marginBottom: '0.5rem', listStyle: 'none', borderBottom: 'px solid #000000', paddingBottom: '0.5rem' }}>
                        <strong>{doc.title}</strong> <span style={{ color: '#64748b', fontSize: '0.9em' }}>{doc.disease}</span>
                        <button style={{ marginLeft: '1rem', padding: '2px 8px', borderRadius: '0', background: '#64748b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85em' }} onClick={() => { setViewerDoc(doc); setViewerOpen(true); }}>
                          View
                        </button>
                        <button style={{ marginLeft: '0.5rem', padding: '2px 8px', borderRadius: '0', background: '#683D94', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85em' }} onClick={() => handleReferenceProtocolSelect(doc)}>
                          Reference
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ marginRight: 8, padding: '2px 8px', borderRadius: '0', border: '1px solid #000000', background: currentPage === 1 ? '#e2e8f0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
                    <span style={{ alignSelf: 'center' }}>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: '0', border: '1px solid #000000', background: currentPage === totalPages ? '#e2e8f0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                  </div>
                </>
              );
            })()
          )}
          <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} title={viewerDoc?.title} content={viewerDoc?.fullProtocol || viewerDoc?.fullDocument || viewerDoc?.content || ''} metadata={{ disease: viewerDoc?.disease, protocolId: viewerDoc?.protocolId, cmcSection: viewerDoc?.cmcSection, clinicalSection: viewerDoc?.clinicalSection }} />
        </div>
      )}
      
      {/* Reference Protocol Panel */}
      {showReferencePanel && selectedReferenceProtocol && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          width: '400px',
          maxHeight: '80vh',
          background: '#ffffff',
          border: '2px solid #683D94',
          borderRadius: '0',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #000000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f0f9ff'
          }}>
            <h4 style={{ margin: 0, color: '#1e40af', fontSize: '1rem' }}>
               Reference Protocol
            </h4>
            <button
              onClick={closeReferencePanel}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0'
              }}
            >
              ×
            </button>
          </div>
          
          {/* Protocol Info */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #000000' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
              {selectedReferenceProtocol.title}
            </h5>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Disease: {selectedReferenceProtocol.disease}
            </p>
          </div>
          
          {/* Table of Contents */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #000000' }}>
              <h6 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Table of Contents</h6>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {referenceProtocolTOC.map(section => (
                  <button
                    key={section.id}
                    onClick={() => handleReferenceSectionClick(section)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      margin: '0.25rem 0',
                      background: selectedReferenceSection?.id === section.id ? '#eff6ff' : 'transparent',
                      border: '1px solid #000000',
                      borderRadius: '0',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: selectedReferenceSection?.id === section.id ? '#1e40af' : '#374151'
                    }}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Section Content */}
            {selectedReferenceSection && (
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                <h6 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                  {selectedReferenceSection.title}
                </h6>
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #000000',
                  borderRadius: '0',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedReferenceSectionContent}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Progress Bar */}
        <ProgressBar
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        />

        {/* Clear Buttons */}
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the generated protocol? This action cannot be undone.')) {
                setResult(null);
                setStudyDesign(null);
                setSectionEdits({});
                setSelectedProtocolSections(new Set());
                setSelectedStudyDesignSections(new Set());
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
              opacity: result || studyDesign ? 1 : 0.5,
              pointerEvents: result || studyDesign ? 'auto' : 'none'
            }}
            onMouseEnter={(e) => {
              if (result || studyDesign) {
                e.target.style.backgroundColor = '#b91c1c';
                e.target.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
            }}
          >
            Clear Protocol
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.boxShadow = '0 4px 6px rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ef4444';
              e.target.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
            }}
          >
            Clear All Fields
          </button>
        </div>

        {/* JSON Upload Section */}
        <div style={{
          marginBottom: '2rem',
          backgroundColor: 'white',
          borderRadius: '0',
          padding: '1.5rem',
          border: uploadedJsonFile ? '2px solid #10b981' : '2px solid #000000',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0,
              color: '#1e293b'
            }}>
              Upload JSON Data
            </h3>
            {uploadedJsonFile && (
              <button
                onClick={clearJsonUpload}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                Remove JSON
              </button>
            )}
          </div>

          <p style={{
            fontSize: '0.9rem',
            color: '#64748b',
            marginBottom: '1rem'
          }}>
            Upload a JSON file to automatically populate form fields. Unmapped data will be added as additional context.
          </p>

          {!uploadedJsonFile ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2rem',
              border: '2px dashed #cbd5e1',
              borderRadius: '0',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#683D94';
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onClick={() => document.getElementById('json-upload-input').click()}
            >
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem',
                marginTop: 0
              }}>
                Click to upload or drag and drop
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                margin: 0
              }}>
                JSON files only
              </p>
              <input
                id="json-upload-input"
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileUpload}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div>
              {showJsonUploadSuccess && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '0',
                  marginBottom: '1rem'
                }}>
                  <span style={{ color: '#166534', fontWeight: '600', fontSize: '0.875rem' }}>
                    SUCCESS: JSON file processed successfully! Form fields have been populated.
                  </span>
                </div>
              )}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0'
              }}>
                <div style={{
                  fontWeight: '600',
                  color: '#166534',
                  marginBottom: '0.25rem'
                }}>
                  {uploadedJsonFile.name}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#15803d'
                }}>
                  {(uploadedJsonFile.size / 1024).toFixed(2)} KB • Processed
                </div>
              </div>
              {jsonAdditionalContext && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '0'
                }}>
                  <div style={{
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    ADDITIONAL CONTEXT ADDED
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#78350f',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    {jsonAdditionalContext}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Information Section */}
        <FormSection
          title="Basic Information"
          sectionKey="basicInfo"
          isRequired
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="disease" className="form-label">Disease/Condition <span className="required">*</span></label>
              <input
                id="disease"
                type="text"
                className="form-input"
                value={disease || ''}
                onChange={handleFieldChange.disease}
                placeholder="e.g., Psoriasis, Eczema, Atopic Dermatitis"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="population" className="form-label">Target Population</label>
              <input
                id="population"
                type="text"
                className="form-input"
                value={population || ''}
                onChange={handleFieldChange.population}
                placeholder="e.g., Adults, Pediatric, Elderly"
              />
            </div>

            <div className="form-group">
              <label htmlFor="drugClass" className="form-label">Drug Class</label>
              <input
                id="drugClass"
                type="text"
                className="form-input"
                value={drugClass || ''}
                onChange={handleFieldChange.drugClass}
                placeholder="e.g., small molecule JAK inhibitor"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mechanism" className="form-label">Mechanism of Action</label>
              <input
                id="mechanism"
                type="text"
                className="form-input"
                value={mechanism || ''}
                onChange={handleFieldChange.mechanism}
                placeholder="e.g., Selectively inhibits JAK1 and JAK2"
              />
            </div>
          </div>
        </FormSection>

        {/* Study Type Selection */}
        <FormSection
          title="Study Type"
          sectionKey="studyType"
          isRequired
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="studyType" className="form-label">Study Type <span className="required">*</span></label>
              <select
                id="studyType"
                className="form-select"
                value={studyType || ''}
                onChange={handleFieldChange.studyType}
                required
              >
                <option value="clinical">Clinical Study</option>
                <option value="preclinical">Preclinical Study</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* Trial Design & Basics Section */}
        <FormSection
          title={studyType === 'preclinical' ? 'Study Design & Basics' : 'Trial Design & Basics'}
          sectionKey="trialDesign"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="trialPhase" className="form-label">{studyType === 'preclinical' ? 'Study Phase' : 'Trial Phase'}</label>
              <select
                id="trialPhase"
                className="form-select"
                value={trialPhase || ''}
                onChange={handleFieldChange.trialPhase}
              >
                <option value="">Select Phase</option>
                {(studyType === 'preclinical' ? preclinicalPhases : trialPhases).map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="trialType">{studyType === 'preclinical' ? 'Study Type' : 'Trial Type'}</label>
              <select
                id="trialType"
                value={trialType || ''}
                onChange={handleFieldChange.trialType}
              >
                <option value="">Select Type</option>
                {(studyType === 'preclinical' ? preclinicalTypes : trialTypes).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Randomization</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="randomization"
                    value="Yes"
                    checked={(randomization || '') === 'Yes'}
                    onChange={handleFieldChange.randomization}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="randomization"
                    value="No"
                    checked={(randomization || '') === 'No'}
                    onChange={handleFieldChange.randomization}
                    style={{ marginRight: '0.5rem' }}
                  />
                  No
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="blinding">Blinding</label>
              <select
                id="blinding"
                value={blinding || ''}
                onChange={handleFieldChange.blinding}
              >
                <option value="">Select Blinding</option>
                {blindingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="controlGroupType">Control Group Type</label>
              <select
                id="controlGroupType"
                value={controlGroupType || ''}
                onChange={handleFieldChange.controlGroupType}
              >
                <option value="">Select Control</option>
                {controlGroupTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* Population & Eligibility Section */}
        <FormSection
          title={studyType === 'preclinical' ? 'Animal Model & Study Design' : 'Population & Eligibility'}
          sectionKey="population"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          {studyType === 'preclinical' ? (
            // Preclinical Animal Model Fields
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="animalModel">Animal Model</label>
                  <select
                    id="animalModel"
                    className="form-select"
                    value={animalModel}
                    onChange={(e) => setAnimalModel(e.target.value)}
                  >
                    <option value="">Select Animal Model</option>
                    {animalModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="animalStrain">Animal Strain</label>
                  <select
                    id="animalStrain"
                    className="form-select"
                    value={animalStrain}
                    onChange={(e) => setAnimalStrain(e.target.value)}
                  >
                    <option value="">Select Strain</option>
                    {animalStrains.map(strain => (
                      <option key={strain} value={strain}>{strain}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="animalsPerGroup">Animals per Group</label>
                  <input
                    id="animalsPerGroup"
                    type="number"
                    value={animalsPerGroup}
                    onChange={(e) => setAnimalsPerGroup(e.target.value)}
                    placeholder="e.g., 8"
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="studyObjective">Study Objective</label>
                  <select
                    id="studyObjective"
                    className="form-select"
                    value={studyObjective}
                    onChange={(e) => setStudyObjective(e.target.value)}
                  >
                    <option value="">Select Objective</option>
                    {studyObjectives.map(objective => (
                      <option key={objective} value={objective}>{objective}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="doseLevels">Dose Levels</label>
                  <textarea
                    id="doseLevels"
                    value={doseLevels}
                    onChange={(e) => setDoseLevels(e.target.value)}
                    placeholder="e.g., Vehicle control, 10 mg/kg, 30 mg/kg, 100 mg/kg"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="vehicleControl">Vehicle/Control</label>
                  <input
                    id="vehicleControl"
                    type="text"
                    value={vehicleControl}
                    onChange={(e) => setVehicleControl(e.target.value)}
                    placeholder="e.g., 0.5% CMC, PBS, Saline"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="tissueCollection">Tissue Collection & Timepoints</label>
                  <textarea
                    id="tissueCollection"
                    value={tissueCollection}
                    onChange={(e) => setTissueCollection(e.target.value)}
                    placeholder="e.g., Blood samples at 1h, 4h, 24h; Tissue collection at study termination"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="regulatoryGuideline">Regulatory Guideline</label>
                  <select
                    id="regulatoryGuideline"
                    className="form-select"
                    value={regulatoryGuideline}
                    onChange={(e) => setRegulatoryGuideline(e.target.value)}
                  >
                    <option value="">Select Guideline</option>
                    {regulatoryGuidelines.map(guideline => (
                      <option key={guideline} value={guideline}>{guideline}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            // Clinical Population Fields
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="sampleSize">Target Sample Size</label>
                  <input
                    id="sampleSize"
                    type="number"
                    value={sampleSize || ''}
                    onChange={handleFieldChange.sampleSize}
                    placeholder="e.g., 120"
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="minAge">Minimum Age</label>
                  <input
                    id="minAge"
                    type="number"
                    value={minAge || ''}
                    onChange={handleFieldChange.minAge}
                    placeholder="e.g., 18"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="maxAge">Maximum Age</label>
                  <input
                    id="maxAge"
                    type="number"
                    value={maxAge || ''}
                    onChange={handleFieldChange.maxAge}
                    placeholder="e.g., 75"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    value={gender || ''}
                    onChange={handleFieldChange.gender}
                  >
                    <option value="">Select Gender</option>
                    {genderOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="inclusionCriteria">Inclusion Criteria</label>
                  <textarea
                    id="inclusionCriteria"
                    value={inclusionCriteria || ''}
                    onChange={handleFieldChange.inclusionCriteria}
                    placeholder="e.g., Adults aged 18-75 years, Confirmed diagnosis of moderate-to-severe condition..."
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="exclusionCriteria">Exclusion Criteria</label>
                  <textarea
                    id="exclusionCriteria"
                    value={exclusionCriteria || ''}
                    onChange={handleFieldChange.exclusionCriteria}
                    placeholder="e.g., Pregnancy, Active infection, Immunocompromised state..."
                    rows="4"
                  />
                </div>
              </div>
            </>
          )}
        </FormSection>

        {/* Intervention & Drug Details Section */}
        <FormSection
          title="Intervention & Drug Details"
          sectionKey="intervention"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="routeOfAdministration">Route of Administration</label>
              <select
                id="routeOfAdministration"
                value={routeOfAdministration || ''}
                onChange={handleFieldChange.routeOfAdministration}
              >
                <option value="">Select Route</option>
                {routeOptions.map(route => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dosingFrequency">Dosing Frequency</label>
              <select
                id="dosingFrequency"
                value={dosingFrequency || ''}
                onChange={handleFieldChange.dosingFrequency}
              >
                <option value="">Select Frequency</option>
                {dosingFrequencyOptions.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="comparatorDrug">Comparator/Control Drug</label>
              <input
                id="comparatorDrug"
                type="text"
                value={comparatorDrug || ''}
                onChange={handleFieldChange.comparatorDrug}
                placeholder="e.g., Placebo, Standard of care"
              />
            </div>

            <div className="form-group">
              <label htmlFor="treatment">Treatment Duration</label>
              <input
                id="treatment"
                type="text"
                value={treatment || ''}
                onChange={handleFieldChange.treatment}
                placeholder="e.g., 12 weeks, 6 months"
              />
            </div>
          </div>
        </FormSection>

        {/* Endpoints & Outcome Measures Section */}
        <FormSection
          title="Endpoints & Outcome Measures"
          sectionKey="endpoints"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="primaryEndpoints">Primary Endpoint(s)</label>
              <textarea
                id="primaryEndpoints"
                value={primaryEndpoints || ''}
                onChange={handleFieldChange.primaryEndpoints}
                placeholder="e.g., Proportion of patients achieving PASI 75 at Week 16"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="secondaryEndpoints">Secondary Endpoint(s)</label>
              <textarea
                id="secondaryEndpoints"
                value={secondaryEndpoints || ''}
                onChange={handleFieldChange.secondaryEndpoints}
                placeholder="e.g., PASI 90 response, sPGA score, Quality of life measures"
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="outcomeMeasurementTool">Outcome Measurement Tool</label>
              <select
                id="outcomeMeasurementTool"
                value={outcomeMeasurementTool || ''}
                onChange={handleFieldChange.outcomeMeasurementTool}
              >
                <option value="">Select Measurement Tool</option>
                {outcomeMeasurementTools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* Statistics & Duration Section */}
        <FormSection
          title="Statistical Considerations"
          sectionKey="statistics"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="statisticalPower">Statistical Power (%)</label>
              <input
                id="statisticalPower"
                type="number"
                value={statisticalPower || ''}
                onChange={handleFieldChange.statisticalPower}
                placeholder="80"
                min="1"
                max="99"
              />
            </div>

            <div className="form-group">
              <label htmlFor="significanceLevel">Significance Level (α)</label>
              <input
                id="significanceLevel"
                type="number"
                value={significanceLevel || ''}
                onChange={handleFieldChange.significanceLevel}
                placeholder="0.05"
                step="0.01"
                min="0.01"
                max="0.2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="studyDuration">Estimated Study Duration</label>
              <input
                id="studyDuration"
                type="text"
                value={studyDuration || ''}
                onChange={handleFieldChange.studyDuration}
                placeholder="e.g., 18 months total (12 weeks treatment + 6 months follow-up)"
              />
            </div>
          </div>
        </FormSection>

        {/* Clinical Study Information */}
        <FormSection
          title="Additional Information"
          sectionKey="additionalInfo"
          completion={getSectionCompletion()}
          activeFormSection={activeFormSection}
          setActiveFormSection={setActiveFormSection}
        >
          <div className="form-group full-width">
          <label htmlFor="clinicalInfo">Additional Clinical Study Information</label>
          <textarea
            id="clinicalInfo"
            value={clinicalInfo || ''}
            onChange={handleFieldChange.clinicalInfo}
            placeholder="e.g., Previous clinical data, specific assessment methods, biomarker strategies, special populations, regulatory considerations..."
            rows="4"
            className="clinical-info-textarea"
          />
          </div>
        </FormSection>

        <div className="form-actions">
          <button 
            type="submit"
            disabled={loading || !disease}
            className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? 'Generating...' : 'Generate Enhanced Protocol'}
          </button>
          
          {loading && (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <p>Generating comprehensive protocol with all specified parameters...</p>

              {/* Progress Bar */}
              <div style={{
                marginTop: '1.5rem',
                width: '100%',
                maxWidth: '500px',
                margin: '1.5rem auto 0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: '#64748b'
                }}>
                  <span>Progress: {progress}%</span>
                  {eta !== null && eta > 0 && (
                    <span>
                      ETA: {Math.floor(eta / 60) > 0 ? `${Math.floor(eta / 60)}m ` : ''}{eta % 60}s
                    </span>
                  )}
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '0',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: progress === 100 ? '#10b981' : '#683D94',
                    transition: 'width 0.5s ease, background-color 0.3s ease',
                    boxShadow: '0 0 10px rgba(104, 61, 148, 0.5)'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      {showGeneratedInfo && (
        <div className="success-message">
          <i className="icon-success"></i>
          <p>Enhanced protocol documentation successfully generated with all trial design parameters!</p>
        </div>
      )}
      
      <div className="result-container" id="results-section" style={{ display: (result || studyDesign) ? 'block' : 'none' }}>
          <div className="document-tabs">
            <button 
              className={`tab-btn ${activeTab === 'protocol' ? 'active' : ''}`}
              onClick={() => setActiveTab('protocol')}
            >
              Enhanced Protocol
            </button>
            <button 
              className={`tab-btn ${activeTab === 'studyDesign' ? 'active' : ''}`}
              onClick={() => setActiveTab('studyDesign')}
            >
              Study Design
            </button>
          </div>
          
          <div className={`document-content ${activeTab === 'protocol' ? 'active-tab' : 'inactive-tab'}`} id="protocol-document" style={{ display: result ? 'block' : 'none' }}>
              <div className="document-header">
                <h3>Enhanced Protocol</h3>
                <div className="document-meta">
                  <span>Protocol ID: {result?.protocol_id || 'N/A'}</span>
                  <span>Version: 1.0</span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="document-navigation">
                <h5>Table of Contents</h5>
                <ul>
                  {protocolSections.map(section => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(section.id)?.scrollIntoView({behavior: 'smooth'});
                      }}>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="protocol-content">
                {result?.protocol ? renderProtocolSections(result.protocol) : <p>No protocol content available</p>}
              </div>
              
              {/* Selected Sections Display */}
              {(selectedProtocolSections.size > 0 || selectedStudyDesignSections.size > 0) && (
                <div style={{ 
                  marginTop: '2rem', 
                  padding: '1rem', 
                  border: '2px solid #683D94', 
                  borderRadius: '0', 
                  backgroundColor: '#f0f9ff' 
                }}>
                  {/* Header with Reference Protocol Button */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h4 style={{ margin: 0, color: '#1e40af' }}>
                      Individual Editable Sections ({activeTab === 'protocol' ? selectedProtocolSections.size : selectedStudyDesignSections.size})
                    </h4>
                    <button
                      onClick={() => setShowReferencePanel(!showReferencePanel)}
                      style={{
                        background: showReferencePanel ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {showReferencePanel ? '✕' : ''} 
                      {showReferencePanel ? 'Close Reference' : 'Open Reference Protocol'}
                    </button>
                  </div>
                  
                  {/* Main Content Area with Side-by-Side Layout */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem',
                    alignItems: 'flex-start'
                  }}>
                    {/* Editable Sections */}
                    <div style={{ 
                      flex: showReferencePanel ? '1' : '1',
                      minWidth: showReferencePanel ? '50%' : '100%'
                    }}>
                      {activeTab === 'protocol' ? (
                        Array.from(selectedProtocolSections)
                          .sort((a, b) => {
                            const aNum = parseInt(a.replace('protocol-section-', ''));
                            const bNum = parseInt(b.replace('protocol-section-', ''));
                            return aNum - bNum;
                          })
                          .map(sectionId => {
                          const sectionNumber = sectionId.replace('protocol-section-', '');
                          const sectionTitle = protocolSections.find(s => s.id === sectionId)?.title || `Section ${sectionNumber}`;
                          const isEditingThis = editingSectionId === sectionId;
                          const sectionContent = sectionEdits[sectionId] || '';
                          
                          return (
                            <div key={sectionId} style={{ 
                              marginBottom: '1.5rem', 
                              padding: '1rem', 
                              border: 'px solid #000000', 
                              borderRadius: '0', 
                              backgroundColor: '#ffffff' 
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '0.5rem' 
                              }}>
                                <h5 style={{ margin: 0, color: '#374151' }}>{sectionTitle}</h5>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {!isEditingThis ? (
                                    <>
                                      <button
                                        onClick={() => startEditingSection(sectionId)}
                                        style={{
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => generateSectionPDF(sectionId, sectionTitle, sectionContent)}
                                        style={{
                                          background: '#dc2626',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        PDF
                                      </button>
                                      <button
                                        onClick={() => toggleAIForSection(sectionId)}
                                        style={{
                                          background: aiEnabledSections.has(sectionId) ? '#10b981' : '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {aiEnabledSections.has(sectionId) ? '🤖 AI ON' : '🤖 AI OFF'}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => saveSectionEdit(sectionId, sectionContent)}
                                        style={{
                                          background: '#683D94',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelSectionEdit}
                                        style={{
                                          background: '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {isEditingThis ? (
                                <RichTextEditor
                                  value={sectionContent}
                                  onChange={(content) => updateSectionContent(sectionId, content)}
                                  placeholder={`Edit ${sectionTitle} content here...`}
                                  style={{
                                    width: '100%',
                                    minHeight: '150px'
                                  }}
                                  aiEnabled={aiEnabledSections.has(sectionId)}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '0.75rem',
                                    border: '1px solid #000000',
                                    borderRadius: '0',
                                    backgroundColor: '#f9fafb',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: sectionContent }}
                                />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        Array.from(selectedStudyDesignSections)
                          .sort((a, b) => {
                            // Handle cmc-section (should come first)
                            if (a === 'cmc-section') return -1;
                            if (b === 'cmc-section') return 1;
                            
                            // Handle clinical-section-X
                            const aNum = parseInt(a.replace('clinical-section-', ''));
                            const bNum = parseInt(b.replace('clinical-section-', ''));
                            return aNum - bNum;
                          })
                          .map(sectionId => {
                          const sectionNumber = sectionId === 'cmc-section' ? 'CMC' : sectionId.replace('clinical-section-', '');
                          const sectionTitle = studyDesignSections.find(s => s.id === sectionId)?.title || `Study Design Section ${sectionNumber}`;
                          const isEditingThis = editingSectionId === sectionId;
                          const sectionContent = sectionEdits[sectionId] || '';
                          
                          return (
                            <div key={sectionId} style={{ 
                              marginBottom: '1.5rem', 
                              padding: '1rem', 
                              border: 'px solid #000000', 
                              borderRadius: '0', 
                              backgroundColor: '#ffffff' 
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '0.5rem' 
                              }}>
                                <h5 style={{ margin: 0, color: '#374151' }}>{sectionTitle}</h5>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {!isEditingThis ? (
                                    <>
                                      <button
                                        onClick={() => startEditingSection(sectionId)}
                                        style={{
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => generateSectionPDF(sectionId, sectionTitle, sectionContent)}
                                        style={{
                                          background: '#dc2626',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        PDF
                                      </button>
                                      <button
                                        onClick={() => toggleAIForSection(sectionId)}
                                        style={{
                                          background: aiEnabledSections.has(sectionId) ? '#10b981' : '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {aiEnabledSections.has(sectionId) ? '🤖 AI ON' : '🤖 AI OFF'}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => saveSectionEdit(sectionId, sectionContent)}
                                        style={{
                                          background: '#683D94',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelSectionEdit}
                                        style={{
                                          background: '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {isEditingThis ? (
                                <RichTextEditor
                                  value={sectionContent}
                                  onChange={(content) => updateSectionContent(sectionId, content)}
                                  placeholder={`Edit ${sectionTitle} content here...`}
                                  style={{
                                    width: '100%',
                                    minHeight: '150px'
                                  }}
                                  aiEnabled={aiEnabledSections.has(sectionId)}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '0.75rem',
                                    border: '1px solid #000000',
                                    borderRadius: '0',
                                    backgroundColor: '#f9fafb',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: sectionContent }}
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Reference Protocol Panel */}
                    {showReferencePanel && (
                      <div style={{ 
                        width: '400px',
                        background: '#ffffff',
                        border: 'px solid #000000',
                        borderRadius: '0',
                        padding: '1rem'
                      }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Reference Protocol</h5>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Select a reference protocol from the previous protocols list to view it here.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Download All Selected Sections */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        const allContent = Object.values(sectionEdits).join('\n\n---\n\n');
                        downloadDocument(allContent, `All_Selected_Sections_${disease.replace(/\s+/g, '_')}.txt`);
                      }}
                      style={{
                        background: '#683D94',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Download Text
                    </button>
                    <button
                      onClick={generateSelectedSectionsWord}
                      style={{
                        background: '#683D94',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Download Word Document
                    </button>
                    <button
                      onClick={generateSelectedSectionsPDF}
                      style={{
                        background: '#683D94',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Download PDF Document
                    </button>
                    <button
                      onClick={() => {
                        const allContent = Object.values(sectionEdits).join('\n\n---\n\n');
                        navigator.clipboard.writeText(allContent);
                      }}
                      style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                       Copy All to Clipboard
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear the generated protocol? This action cannot be undone.')) {
                          setResult(null);
                          setStudyDesign(null);
                          setSectionEdits({});
                          setSelectedProtocolSections(new Set());
                          setSelectedStudyDesignSections(new Set());
                        }
                      }}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Clear Protocol
                    </button>
                  </div>
                </div>
              )}
              
              <div className="action-buttons">
                <button onClick={() => navigator.clipboard.writeText(result?.protocol || '')}>
                  <i className="icon-copy"></i> Copy to Clipboard
                </button>
                <button onClick={() => downloadDocument(result?.protocol || '', `Enhanced_Protocol_${disease.replace(/\s+/g, '_')}_${result?.protocol_id || 'unknown'}.txt`)}>
                  <i className="icon-download"></i> Download Text
                </button>
                <button onClick={() => generatePDF('protocol', `Enhanced_Protocol_${disease.replace(/\s+/g, '_')}_${result?.protocol_id || 'unknown'}`)}>
                  <i className="icon-pdf"></i> Download PDF
                </button>
                <button onClick={() => generateFullProtocolWord()}>
                  <i className="icon-word"></i> Download Word
                </button>
                <button onClick={() => window.print()}>
                  <i className="icon-print"></i> Print
                </button>
                <button className="btn-secondary" onClick={() => window.open(`mailto:?subject=Enhanced Protocol for ${disease}&body=${encodeURIComponent(result?.protocol || '')}`)}>
                  <i className="icon-email"></i> Email
                </button>
              </div>
              
              <div className="protocol-info">
                Document Generated: {new Date().toLocaleString()} | Protocol ID: {result?.protocol_id || 'N/A'}
              </div>
            </div>
          
          <div className={`document-content ${activeTab === 'studyDesign' ? 'active-tab' : 'inactive-tab'}`} id="studydesign-document" style={{ display: studyDesign ? 'block' : 'none' }}>
              <div className="document-header">
                <h3>Study Design (Main Document)</h3>
                <div className="document-meta">
                  <span>Study ID: SD-{result && result.protocol_id ? result.protocol_id.substring(5) : Date.now()}</span>
                  <span>Version: 1.0</span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="document-navigation">
                <h5>Table of Contents</h5>
                <ul>
                  {studyDesignSections.map(section => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(section.id)?.scrollIntoView({behavior: 'smooth'});
                      }}>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div id="cmc-section" className="study-design-section">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0',
                  border: '1px solid #000000'
                }}>
                  <button
                    onClick={() => handleStudyDesignSectionToggle('cmc-section')}
                    style={{
                      background: selectedStudyDesignSections.has('cmc-section') ? '#683D94' : '#f3f4f6',
                      color: selectedStudyDesignSections.has('cmc-section') ? 'white' : '#374151',
                      border: 'px solid #000000',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                    title={selectedStudyDesignSections.has('cmc-section') ? 'Remove from selection' : 'Add to selection'}
                  >
                    {selectedStudyDesignSections.has('cmc-section') ? '✓' : '+'}
                  </button>
                  <h4 className="main-section-title" style={{ margin: 0, flex: 1 }}>CMC SECTION</h4>
                </div>
                <div className="section-content">
                  {studyDesign?.cmc_section ? studyDesign.cmc_section.split('\n').map((paragraph, idx) => (
                    paragraph.trim() ? 
                      paragraph.match(/^[A-Z\s]{5,}$/) ? 
                        <h4 key={idx} className="section-title">{paragraph}</h4> :
                      paragraph.match(/^[0-9]+\.[0-9]/) || paragraph.match(/^[A-Z][a-z]/) ?
                        <h5 key={idx} className="subsection-title">{paragraph}</h5> :
                      paragraph.match(/^[•\-*]/) ?
                        <li key={idx} className="list-item">{paragraph.substring(1).trim()}</li> :
                        <p key={idx}>{paragraph}</p>
                    : <br key={idx} />
                  )) : <p>No CMC section content available</p>}
                </div>
              </div>
              
              <div className="study-design-section clinical-section">
                <div className="section-content">
                  {studyDesign?.clinical_section ? renderClinicalSections(studyDesign.clinical_section) : <p>No clinical section content available</p>}
                </div>
              </div>
              
              {/* Selected Sections Display for Study Design */}
              {selectedStudyDesignSections.size > 0 && (
                <div style={{ 
                  marginTop: '2rem', 
                  padding: '1rem', 
                  border: '2px solid #683D94', 
                  borderRadius: '0', 
                  backgroundColor: '#f0f9ff' 
                }}>
                  {/* Header with Reference Protocol Button */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h4 style={{ margin: 0, color: '#1e40af' }}>
                      Individual Editable Sections ({selectedStudyDesignSections.size})
                    </h4>
                    <button
                      onClick={() => setShowReferencePanel(!showReferencePanel)}
                      style={{
                        background: showReferencePanel ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      {showReferencePanel ? 'Hide Reference' : 'Show Reference'}
                    </button>
                  </div>
                  
                  {/* Main Content Area */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem',
                    minWidth: showReferencePanel ? '50%' : '100%'
                  }}>
                    {/* Selected Sections List */}
                    <div style={{ 
                      flex: 1,
                      minWidth: showReferencePanel ? '50%' : '100%'
                    }}>
                      {Array.from(selectedStudyDesignSections)
                        .sort((a, b) => {
                          // Handle cmc-section (should come first)
                          if (a === 'cmc-section') return -1;
                          if (b === 'cmc-section') return 1;
                          
                          // Sort clinical sections by number
                          const aNum = parseInt(a.replace('clinical-section-', ''));
                          const bNum = parseInt(b.replace('clinical-section-', ''));
                          return aNum - bNum;
                        })
                        .map(sectionId => {
                          const sectionNumber = sectionId === 'cmc-section' ? 'CMC' : sectionId.replace('clinical-section-', '');
                          const sectionTitle = studyDesignSections.find(s => s.id === sectionId)?.title || `Study Design Section ${sectionNumber}`;
                          const isEditingThis = editingSectionId === sectionId;
                          const sectionContent = sectionEdits[sectionId] || '';
                          
                          return (
                            <div key={sectionId} style={{ 
                              marginBottom: '1.5rem', 
                              padding: '1rem', 
                              backgroundColor: 'white', 
                              borderRadius: '0', 
                              border: '1px solid #000000',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                              {/* Section Header */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '0.5rem' 
                              }}>
                                <h5 style={{ margin: 0, color: '#374151' }}>{sectionTitle}</h5>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {!isEditingThis ? (
                                    <>
                                      <button
                                        onClick={() => startEditingSection(sectionId)}
                                        style={{
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          const newSet = new Set(aiEnabledSections);
                                          if (newSet.has(sectionId)) {
                                            newSet.delete(sectionId);
                                          } else {
                                            newSet.add(sectionId);
                                          }
                                          setAiEnabledSections(newSet);
                                        }}
                                        style={{
                                          background: aiEnabledSections.has(sectionId) ? '#683D94' : '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        AI {aiEnabledSections.has(sectionId) ? 'ON' : 'OFF'}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => saveSectionEdit(sectionId, sectionContent)}
                                        style={{
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelSectionEdit}
                                        style={{
                                          background: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {isEditingThis ? (
                                <RichTextEditor
                                  value={sectionContent}
                                  onChange={(content) => updateSectionContent(sectionId, content)}
                                  placeholder={`Edit ${sectionTitle} content here...`}
                                  style={{
                                    width: '100%',
                                    minHeight: '150px'
                                  }}
                                  aiEnabled={aiEnabledSections.has(sectionId)}
                                  onAIGenerate={(prompt) => {
                                    // Handle AI generation for this section
                                    console.log(`AI generation for ${sectionId}:`, prompt);
                                  }}
                                />
                              ) : (
                                <div style={{ 
                                  padding: '0.75rem', 
                                  backgroundColor: '#f9fafb', 
                                  borderRadius: '0',
                                  border: '1px solid #000000',
                                  minHeight: '100px',
                                  fontSize: '14px',
                                  lineHeight: '1.5',
                                  color: '#374151'
                                }}
                                dangerouslySetInnerHTML={{ __html: sectionContent || 'No content available for this section.' }}
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* Reference Panel */}
                    {showReferencePanel && (
                      <div style={{ 
                        width: '50%', 
                        padding: '1rem', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '0', 
                        border: '1px solid #000000',
                        maxHeight: '600px',
                        overflowY: 'auto'
                      }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Reference Protocols</h5>
                        {previousProtocols.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {previousProtocols.map((protocol, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleReferenceProtocolSelect(protocol)}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: selectedReferenceProtocol === protocol ? '#683D94' : 'white',
                                  color: selectedReferenceProtocol === protocol ? 'white' : '#374151',
                                  border: 'px solid #000000',
                                  borderRadius: '0',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  textAlign: 'left'
                                }}
                              >
                                {protocol.title || `Protocol ${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            No previous protocols available for reference.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Export Options */}
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0', border: '1px solid #bfdbfe' }}>
                    <h5 style={{ margin: '0 0 1rem 0', color: '#1e40af' }}>Export Selected Sections</h5>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                      <button 
                        onClick={() => {
                          const allContent = Object.values(sectionEdits).join('\n\n---\n\n');
                          downloadDocument(allContent, `All_Selected_Study_Design_Sections_${disease.replace(/\s+/g, '_')}.txt`);
                        }}
                        style={{
                          background: '#683D94',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0',
                          padding: '8px 16px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Download All as Text
                      </button>
                      <button 
                        onClick={() => {
                          const allContent = Object.values(sectionEdits).join('\n\n---\n\n');
                          navigator.clipboard.writeText(allContent);
                        }}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0',
                          padding: '8px 16px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                         Copy All to Clipboard
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="action-buttons">
                <button onClick={() => navigator.clipboard.writeText(
                  `CMC SECTION:\n${studyDesign?.cmc_section || ''}\n\nCLINICAL SECTION:\n${studyDesign?.clinical_section || ''}`
                )}>
                  <i className="icon-copy"></i> Copy to Clipboard
                </button>
                <button onClick={() => downloadDocument(
                  `CMC SECTION:\n${studyDesign?.cmc_section || ''}\n\nCLINICAL SECTION:\n${studyDesign?.clinical_section || ''}`,
                  `Enhanced_Study_Design_${disease.replace(/\s+/g, '_')}.txt`
                )}>
                  <i className="icon-download"></i> Download Text
                </button>
                <button onClick={() => generatePDF('studyDesign', `Enhanced_Study_Design_${disease.replace(/\s+/g, '_')}`)}>
                  <i className="icon-pdf"></i> Download PDF
                </button>
                <button onClick={() => generateFullStudyDesignWord()}>
                  <i className="icon-word"></i> Download Word
                </button>
                <button onClick={() => window.print()}>
                  <i className="icon-print"></i> Print
                </button>
                <button className="btn-secondary" onClick={() => window.open(`mailto:?subject=Enhanced Study Design for ${disease}&body=${encodeURIComponent(`CMC SECTION:\n${studyDesign?.cmc_section || ''}\n\nCLINICAL SECTION:\n${studyDesign?.clinical_section || ''}`)}`)}>
                  <i className="icon-email"></i> Email
                </button>
              </div>
              
              <div className="document-footer">
                <p>This enhanced document was generated with comprehensive trial design parameters according to ICH E6(R2) Good Clinical Practice guidelines and meets professional industry standards.</p>
                <p>Document Generated: {new Date().toLocaleString()} | Study ID: SD-{result && result.protocol_id ? result.protocol_id.substring(5) : Date.now()}</p>
              </div>
            </div>
        </div>
        </>
      )}

          {/* Country Compiler Section */}
          {activeSection === 'compiler' && (
            <div style={{
              display: 'flex',
              gap: '2rem',
              minHeight: '600px'
            }}>
              {/* Main Compiler Content */}
              <div style={{ width: '100%' }}>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '2rem',
              border: '1px solid #000000',
              marginBottom: '2rem'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                marginBottom: '1rem', 
                color: '#1e293b' 
              }}>
                 Select Target Country/Region
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                Choose the country/region for which you want to compile regulatory documents and requirements.
              </p>
              
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0',
                  border: 'px solid #000000',
                  fontSize: '1rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select a country/region...</option>
                {Object.entries(countryRegulatoryData).map(([code, data]) => (
                  <option key={code} value={code}>
                    {data.name} ({data.regulator})
                  </option>
                ))}
              </select>
            </div>

            {selectedCountry && (
              <>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0', 
                  padding: '2rem',
                  border: '1px solid #000000',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600', 
                    marginBottom: '1rem', 
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                     {countryRegulatoryData[selectedCountry].name} Requirements
                  </h3>
                
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '0',
                      padding: '1.5rem',
                      border: '1px solid #000000',
                      marginBottom: '2rem'
                    }}>
                      <h4 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        marginBottom: '0.75rem', 
                        color: '#1e293b' 
                      }}>
                        Regulatory Information
                      </h4>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Regulator:</strong> {countryRegulatoryData[selectedCountry].regulator}
                      </div>
                      <div>
                        <strong>Submission Route:</strong> {countryRegulatoryData[selectedCountry].submissionRoute}
                      </div>
                    </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '0',
                  padding: '1.5rem',
                  border: '1px solid #000000'
                }}>
                  <h4 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    marginBottom: '1rem', 
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                     Required Documents
                  </h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '0.75rem' 
                  }}>
                    {countryRegulatoryData[selectedCountry].documents.map((doc, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0',
                        border: '1px solid #000000'
                      }}>
                        <span style={{
                          fontSize: '1rem',
                          color: '#10b981',
                          marginRight: '0.75rem',
                          fontWeight: '500'
                        }}>
                          ✓
                        </span>
                        <span style={{
                          fontSize: '0.9rem',
                          color: '#374151'
                        }}>
                          {doc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                </div>

                {/* Document Upload Section */}
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0', 
                  padding: '2rem',
                  border: '1px solid #000000',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600', 
                    marginBottom: '1rem', 
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                     Upload Documents
                  </h3>
                  
                  <div 
                    {...getRootProps()} 
                    className={`dropzone ${isDragActive ? 'active' : ''}`}
                    style={{
                      border: isDragActive ? '3px dashed #683D94' : '2px dashed #94a3b8',
                      borderRadius: '0',
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      backgroundColor: isDragActive ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '2rem'
                    }}
                  >
                    <input {...getInputProps()} />
                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem', color: '#1e293b' }}>
                      {isDragActive
                        ? 'Drop the files here...'
                        : 'Drag and drop documents here, or click to select files'}
                    </p>
                    <small style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      Accepted formats: PDF, DOC, DOCX, XLS, XLSX, TXT
                    </small>
                  </div>

                  {/* Required Documents Checklist */}
                  <div>
                    <h4 style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '600', 
                      marginBottom: '1rem', 
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                       Required Documents Checklist
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                      gap: '1rem'
                    }}>
                      {getDocumentCategories().map(cat => {
                        const status = getCategoryStatus(cat.id);
                        const uploadedCount = uploadedDocuments.filter(doc => doc.category === cat.id).length;
                        
                        return (
                          <div key={cat.id} className={`checklist-item ${status}`} style={{
                            padding: '1rem',
                            borderRadius: '0',
                            backgroundColor: 'white',
                            border: `2px solid ${status === 'missing' ? '#ef4444' : status === 'full' ? '#10b981' : '#000000'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{cat.icon}</span>
                              <div>
                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                  {cat.name} {cat.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {uploadedCount}/{cat.maxFiles} files
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '1.2rem' }}>{getStatusIcon(status)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Uploaded Documents List */}
                  {uploadedDocuments.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                      <h4 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        marginBottom: '1rem', 
                        color: '#1e293b' 
                      }}>
                         Uploaded Documents ({uploadedDocuments.length})
                      </h4>
                      <div style={{ 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '0', 
                        padding: '1rem',
                        border: '1px solid #000000'
                      }}>
                        {uploadedDocuments.map(doc => (
                          <div key={doc.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            borderBottom: '1px solid #f1f5f9',
                            borderRadius: '0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                              <div style={{ flexGrow: 1 }}>
                                <p style={{ fontWeight: '500', margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>{doc.name}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                                  {(doc.size / 1024).toFixed(2)} KB | Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={doc.category || ''}
                                onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
                                style={{
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '0',
                                  border: 'px solid #000000',
                                  fontSize: '0.8rem',
                                  backgroundColor: 'white'
                                }}
                              >
                                <option value="">Assign Category</option>
                                {getDocumentCategories().map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => removeDocument(doc.id)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compile Button */}
                  <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                      onClick={compileCountryDossier}
                      disabled={!isReadyToCompile() || compilerLoading}
                      style={{
                        padding: '1rem 3rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        borderRadius: '0',
                        border: 'none',
                        backgroundColor: isReadyToCompile() && !compilerLoading ? '#10b981' : '#9ca3af',
                        color: 'white',
                        cursor: isReadyToCompile() && !compilerLoading ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        boxShadow: isReadyToCompile() && !compilerLoading ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    >
                      {compilerLoading ? ' Compiling Dossier...' : ` Compile Dossier for ${countryRegulatoryData[selectedCountry].name}`}
                    </button>
                    {!isReadyToCompile() && !compilerLoading && (
                      <p style={{ 
                        marginTop: '1rem', 
                        color: '#ef4444', 
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}>
                         Please upload all required documents and assign categories before compiling
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
              </div>
            </div>
          )}

      <PreviousDocuments
        isOpen={showDocHistory}
        onClose={() => setShowDocHistory(false)}
        documentType="PROTOCOL"
        onSelectDocument={(doc) => {
          // Extract individual form fields from the protocol document
          if (doc) {
            // Reconstruct formData from individual protocol fields
            const formData = {
              disease: doc.disease,
              indication: doc.indication,
              studyType: doc.studyType,
              studyPhase: doc.studyPhase,
              trialType: doc.trialType,
              blinding: doc.blinding,
              randomization: doc.randomization,
              population: doc.population,
              minAge: doc.minAge,
              maxAge: doc.maxAge,
              gender: doc.gender,
              targetSampleSize: doc.targetSampleSize,
              inclusionCriteria: doc.inclusionCriteria,
              exclusionCriteria: doc.exclusionCriteria,
              treatment: doc.treatment,
              drugClass: doc.drugClass,
              mechanism: doc.mechanism,
              routeOfAdmin: doc.routeOfAdmin,
              dosingRegimen: doc.dosingRegimen,
              comparatorDrug: doc.comparatorDrug,
              controlGroup: doc.controlGroup,
              primaryEndpoints: doc.primaryEndpoints,
              secondaryEndpoints: doc.secondaryEndpoints,
              outcomeMeasures: doc.outcomeMeasures,
              statisticalPower: doc.statisticalPower,
              significanceLevel: doc.significanceLevel,
              studyDuration: doc.studyDuration,
              animalModel: doc.animalModel,
              animalStrain: doc.animalStrain
            };
            setGlobalProtocolFormData(formData);
          }
          // Load the full protocol content
          const protocolContent = doc.fullProtocol || doc.fullDocument || doc.content;
          if (protocolContent) {
            setResult(protocolContent);
          }
          setShowDocHistory(false);
        }}
      />
    </div>
  );
};

export default ProtocolGenerator;