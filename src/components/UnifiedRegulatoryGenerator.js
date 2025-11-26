// src/components/UnifiedRegulatoryGenerator.js
// NEW UNIFIED REGULATORY DOCUMENT GENERATOR - TEST VERSION

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import apiService from '../services/api';
import { saveDocument } from '../services/api';
import PreviousDocuments from './common/PreviousDocuments';
import { saveRegulatoryDocument, getMyDocuments } from '../services/documentService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import RichTextEditor from './common/RichTextEditor';
import countryIntelligenceService from '../services/countryIntelligenceService';
import './UnifiedRegulatoryGenerator.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const UnifiedRegulatoryGenerator = () => {
  // Mode Management
  const [mode, setMode] = useState('single'); // 'single' or 'batch'

  // Interactive Map Data and State
  const regionCountryMap = {
    'north-america': ["United States", "Canada", "Mexico"],
    'europe': ["United Kingdom", "France", "Germany", "Italy", "Spain", "Switzerland", "Russia", "European Union"],
    'asia-pacific': ["Japan", "China", "South Korea", "Australia", "Singapore", "India", "Taiwan"],
    'latin-america': ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Mexico"],
    'africa-middle-east': ["South Africa", "Israel", "Saudi Arabia", "United Arab Emirates", "Egypt", "Nigeria"]
  };

  const regionColors = {
    'north-america': '#4299e1',
    'europe': '#48bb78',
    'asia-pacific': '#ed8936',
    'latin-america': '#9f7aea',
    'africa-middle-east': '#e53e3e'
  };

  const regionNameMap = {
    'north-america': 'North America',
    'europe': 'Europe',
    'asia-pacific': 'Asia Pacific',
    'latin-america': 'Latin America',
    'africa-middle-east': 'Africa & Middle East'
  };

  const regionCentroids = {
    'north-america': [-100, 45],
    'europe': [15, 50],
    'asia-pacific': [110, 20],
    'latin-america': [-60, -15],
    'africa-middle-east': [30, 10]
  };

  // Comprehensive regulatory regions data
  const regions = {
    "north-america": {
      name: "North America",
      countries: [
        { 
          id: "usa", 
          name: "United States", 
          documents: [
            { id: "ind", name: "IND (Investigational New Drug)", purpose: "To begin clinical trials (Phases I-III)" },
            { id: "nda", name: "NDA (New Drug Application)", purpose: "To request approval for marketing a new drug" },
            { id: "bla", name: "BLA (Biologics License Application)", purpose: "For biologics approval under the Public Health Service Act" }
          ], 
          coords: { x: 150, y: 100 } 
        },
        { 
          id: "canada", 
          name: "Canada", 
          documents: [
            { id: "cta_ca", name: "Clinical Trial Application (Health Canada)", purpose: "To authorize clinical trials in Canada" },
            { id: "nds", name: "New Drug Submission (NDS)", purpose: "For drug approval in Canada" },
            { id: "noc", name: "Notice of Compliance (NOC)", purpose: "Canadian marketing authorization" }
          ], 
          coords: { x: 200, y: 80 } 
        },
        { 
          id: "mexico", 
          name: "Mexico", 
          documents: [
            { id: "cofepris_cta", name: "COFEPRIS Clinical Trial Authorization", purpose: "Mexican clinical trial approval" },
            { id: "cofepris_nda", name: "COFEPRIS New Drug Registration", purpose: "Mexican marketing authorization" }
          ], 
          coords: { x: 120, y: 140 } 
        }
      ],
      color: "#4299e1",
      coords: { x: 180, y: 120 }
    },
    "europe": {
      name: "Europe", 
      countries: [
        { 
          id: "eu", 
          name: "European Union", 
          documents: [
            { id: "cta_eu", name: "CTA (Clinical Trial Application)", purpose: "To authorize clinical trials via CTIS" },
            { id: "maa", name: "MAA (Marketing Authorization Application)", purpose: "To request EU-wide marketing approval" },
            { id: "impd", name: "IMPD (Investigational Medicinal Product Dossier)", purpose: "Quality, manufacturing and control information" }
          ], 
          coords: { x: 480, y: 110 } 
        },
        { 
          id: "uk", 
          name: "United Kingdom", 
          documents: [
            { id: "cta_uk", name: "Clinical Trial Authorisation (UK)", purpose: "MHRA clinical trial approval post-Brexit" },
            { id: "ma_uk", name: "Marketing Authorisation (UK)", purpose: "MHRA marketing approval" },
            { id: "vie", name: "Voluntary Scheme for Branded Medicines Pricing", purpose: "UK pricing and access" }
          ], 
          coords: { x: 440, y: 95 } 
        },
        { 
          id: "switzerland", 
          name: "Switzerland", 
          documents: [
            { id: "cta_ch", name: "Clinical Trial Authorisation (Swissmedic)", purpose: "Swiss clinical trial approval" },
            { id: "ma_ch", name: "Marketing Authorisation (Switzerland)", purpose: "Swissmedic drug approval" }
          ], 
          coords: { x: 485, y: 105 } 
        },
        { 
          id: "russia", 
          name: "Russia", 
          documents: [
            { id: "cta_ru", name: "Clinical Trial Permit (Roszdravnadzor)", purpose: "Russian clinical trial authorization" },
            { id: "rd_ru", name: "Registration Dossier (Russia)", purpose: "Russian drug registration with Roszdravnadzor" },
            { id: "gmp_ru", name: "Russian GMP Certificate", purpose: "Manufacturing authorization in Russia" }
          ], 
          coords: { x: 580, y: 90 } 
        }
      ],
      color: "#48bb78",
      coords: { x: 500, y: 110 }
    },
    "asia-pacific": {
      name: "Asia Pacific",
      countries: [
        { 
          id: "japan", 
          name: "Japan", 
          documents: [
            { id: "ctn_jp", name: "Clinical Trial Notification (CTN)", purpose: "Submitted to PMDA before clinical trials" },
            { id: "jnda", name: "J-NDA (New Drug Application)", purpose: "Submitted to PMDA/MHLW for approval" },
            { id: "pmda_consultation", name: "PMDA Scientific Advice", purpose: "Regulatory guidance consultation" }
          ], 
          coords: { x: 720, y: 110 } 
        },
        { 
          id: "china", 
          name: "China", 
          documents: [
            { id: "ind_ch", name: "IND (China)", purpose: "Required before clinical trials (submitted to NMPA)" },
            { id: "nda_ch", name: "NDA (China)", purpose: "New Drug Application submitted to NMPA" },
            { id: "drug_license_ch", name: "Drug Registration Certificate", purpose: "Chinese marketing authorization" }
          ], 
          coords: { x: 650, y: 120 } 
        },
        { 
          id: "south-korea", 
          name: "South Korea", 
          documents: [
            { id: "ind_kr", name: "IND (Korea)", purpose: "Korean clinical trial application to MFDS" },
            { id: "nda_kr", name: "NDA (Korea)", purpose: "Korean marketing authorization application" },
            { id: "kgmp", name: "Korean GMP Certificate", purpose: "Manufacturing authorization in Korea" }
          ], 
          coords: { x: 700, y: 115 } 
        },
        { 
          id: "australia", 
          name: "Australia", 
          documents: [
            { id: "ctn_au", name: "CTN (Clinical Trial Notification)", purpose: "Australian clinical trial notification to TGA" },
            { id: "aus", name: "AUS (Australian Submission)", purpose: "TGA marketing authorization" },
            { id: "tga_gmp", name: "TGA GMP Certificate", purpose: "Australian manufacturing authorization" }
          ], 
          coords: { x: 750, y: 200 } 
        },
        { 
          id: "singapore", 
          name: "Singapore", 
          documents: [
            { id: "cta_sg", name: "Clinical Trial Certificate (HSA)", purpose: "Singapore clinical trial approval" },
            { id: "product_license_sg", name: "Product License (Singapore)", purpose: "HSA marketing authorization" }
          ], 
          coords: { x: 680, y: 160 } 
        },
        { 
          id: "india", 
          name: "India", 
          documents: [
            { id: "cta_in", name: "Clinical Trial Permission (CDSCO)", purpose: "Indian clinical trial approval" },
            { id: "nda_in", name: "New Drug Application (India)", purpose: "CDSCO marketing authorization" },
            { id: "import_license_in", name: "Import License", purpose: "Import authorization for clinical trials" }
          ], 
          coords: { x: 620, y: 140 } 
        },
        { 
          id: "taiwan", 
          name: "Taiwan", 
          documents: [
            { id: "ind_tw", name: "IND (Taiwan)", purpose: "Taiwan clinical trial application to TFDA" },
            { id: "nda_tw", name: "NDA (Taiwan)", purpose: "Taiwan marketing authorization" }
          ], 
          coords: { x: 705, y: 130 } 
        }
      ],
      color: "#ed8936",
      coords: { x: 680, y: 150 }
    },
    "latin-america": {
      name: "Latin America",
      countries: [
        { 
          id: "brazil", 
          name: "Brazil", 
          documents: [
            { id: "anvisa_cta", name: "ANVISA Clinical Trial Authorization", purpose: "Brazilian clinical trial approval" },
            { id: "anvisa_nda", name: "ANVISA Registration Dossier", purpose: "Brazilian drug registration" },
            { id: "anvisa_gmp", name: "ANVISA GMP Certificate", purpose: "Brazilian manufacturing authorization" }
          ], 
          coords: { x: 280, y: 190 } 
        },
        { 
          id: "argentina", 
          name: "Argentina", 
          documents: [
            { id: "anmat_cta", name: "ANMAT Clinical Trial Authorization", purpose: "Argentine clinical trial approval" },
            { id: "anmat_nda", name: "ANMAT Drug Registration", purpose: "Argentine marketing authorization" }
          ], 
          coords: { x: 260, y: 240 } 
        },
        { 
          id: "colombia", 
          name: "Colombia", 
          documents: [
            { id: "invima_cta", name: "INVIMA Clinical Trial Permit", purpose: "Colombian clinical trial authorization" },
            { id: "invima_nda", name: "INVIMA Drug Registration", purpose: "Colombian marketing approval" }
          ], 
          coords: { x: 220, y: 170 } 
        },
        { 
          id: "chile", 
          name: "Chile", 
          documents: [
            { id: "isp_cta", name: "ISP Clinical Trial Authorization", purpose: "Chilean clinical trial approval" },
            { id: "isp_nda", name: "ISP Drug Registration", purpose: "Chilean marketing authorization" }
          ], 
          coords: { x: 240, y: 250 } 
        }
      ],
      color: "#9f7aea",
      coords: { x: 250, y: 200 }
    },
    "africa-middle-east": {
      name: "Africa & Middle East",
      countries: [
        { 
          id: "south-africa", 
          name: "South Africa", 
          documents: [
            { id: "sahpra_cta", name: "SAHPRA Clinical Trial Authorization", purpose: "South African clinical trial approval" },
            { id: "sahpra_nda", name: "SAHPRA Medicine Registration", purpose: "South African marketing authorization" }
          ], 
          coords: { x: 520, y: 230 } 
        },
        { 
          id: "israel", 
          name: "Israel", 
          documents: [
            { id: "moh_israel_cta", name: "Israeli MOH Clinical Trial Permit", purpose: "Israeli clinical trial approval" },
            { id: "moh_israel_nda", name: "Israeli Drug Registration", purpose: "Israeli marketing authorization" }
          ], 
          coords: { x: 510, y: 140 } 
        },
        { 
          id: "saudi-arabia", 
          name: "Saudi Arabia", 
          documents: [
            { id: "sfda_cta", name: "SFDA Clinical Trial Authorization", purpose: "Saudi clinical trial approval" },
            { id: "sfda_nda", name: "SFDA Drug Registration", purpose: "Saudi marketing authorization" }
          ], 
          coords: { x: 540, y: 150 } 
        },
        { 
          id: "uae", 
          name: "United Arab Emirates", 
          documents: [
            { id: "dha_cta", name: "DHA Clinical Trial Permit", purpose: "UAE clinical trial approval" },
            { id: "moh_uae_nda", name: "UAE Drug Registration", purpose: "UAE marketing authorization" }
          ], 
          coords: { x: 560, y: 155 } 
        }
      ],
      color: "#e53e3e",
      coords: { x: 530, y: 170 }
    }
  };

  // Interactive Map State
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  
  // Dropdown region/country state
  const [selectedDropdownRegion, setSelectedDropdownRegion] = useState('');
  
  // Single Document State - Comprehensive Form Fields
  const [disease, setDisease] = useState('');
  const [drugClass, setDrugClass] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [country, setCountry] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [studyName, setStudyName] = useState('');
  const [compoundName, setCompoundName] = useState('');
  
  // Trial Characteristics
  const [trialPhase, setTrialPhase] = useState('');
  const [trialType, setTrialType] = useState('');
  const [blinding, setBlinding] = useState('');
  const [randomization, setRandomization] = useState('');
  
  // Population Details
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [gender, setGender] = useState('');
  const [targetSampleSize, setTargetSampleSize] = useState('');
  const [inclusionCriteria, setInclusionCriteria] = useState('');
  const [exclusionCriteria, setExclusionCriteria] = useState('');
  
  // Treatment & Control
  const [drugFormulation, setDrugFormulation] = useState('');
  const [routeOfAdministration, setRouteOfAdministration] = useState('');
  const [dosingRegimen, setDosingRegimen] = useState('');
  const [controlGroup, setControlGroup] = useState('');
  
  // Endpoints & Outcomes
  const [primaryEndpoints, setPrimaryEndpoints] = useState('');
  const [secondaryEndpoints, setSecondaryEndpoints] = useState('');
  const [outcomeMeasureTool, setOutcomeMeasureTool] = useState('');
  
  // Statistical Considerations
  const [statisticalPower, setStatisticalPower] = useState('80');
  const [significanceLevel, setSignificanceLevel] = useState('0.05');
  
  // Batch Processing State
  const [csvData, setCsvData] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [batchProgress, setBatchProgress] = useState({});
  const [batchResults, setBatchResults] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cmc');
  const [selectedCountryData, setSelectedCountryData] = useState(null);
  const [showAskLumina, setShowAskLumina] = useState(false);
  
  // Enhanced Editing State
  const [sectionEdits, setSectionEdits] = useState({});
  const [aiEnabledSections, setAiEnabledSections] = useState(new Set());
  
  // Country Intelligence State
  const [countryRecommendations, setCountryRecommendations] = useState({});
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  
  // Interactive Map State
  const [showMap, setShowMap] = useState(false);
  
  // Background processing
  const { startJob, getJob } = useBackgroundJobs('regulatory_document');
  const [backgroundJobId, setBackgroundJobId] = useState(null);
  
  // Navigation
  const location = useLocation();
  
  // File input ref
  const fileInputRef = useRef(null);
  
  // Previous Documents State
  const [showPreviousDocs, setShowPreviousDocs] = useState(false);
  const [previousDocs, setPreviousDocs] = useState([]);
  const [loadingPreviousDocs, setLoadingPreviousDocs] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showDocHistory, setShowDocHistory] = useState(false);

  // Country Reference State
  const [showCountryReference, setShowCountryReference] = useState(false);

  // Dropdown Options
  const trialPhases = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];
  const trialTypes = ['Interventional', 'Observational', 'Expanded Access'];
  const blindingOptions = ['Open-label', 'Single-blind', 'Double-blind'];
  const randomizationOptions = ['Yes', 'No'];
  const genderOptions = ['All', 'Male', 'Female'];
  const formulationOptions = ['Tablet', 'Capsule', 'Injection', 'Topical', 'Oral Solution', 'IV Infusion', 'Subcutaneous'];
  const routeOptions = ['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Inhalation'];
  const controlOptions = ['Placebo', 'Active Comparator', 'Historical Control', 'No Control'];
  const measurementTools = ['PASI', 'EASI', 'sPGA', 'DLQI', 'HAM-D', 'MADRS', 'ACR20/50/70', 'DAS28', 'CDAI'];

  // Country and Document-Specific Section Structures
  const getSectionsForDocument = (documentType, country) => {
    const docType = documentType?.toLowerCase() || '';
    const countryCode = country?.toLowerCase() || '';
    
    // US Documents
    if (docType.includes('ind') && (countryCode === 'united states' || countryCode === 'usa' || !country)) {
      return [
        { id: 'regulatory-section-1', title: '1. Chemistry, Manufacturing, and Controls (CMC)' },
        { id: 'regulatory-section-2', title: '2. Nonclinical Pharmacology and Toxicology' },
        { id: 'regulatory-section-3', title: '3. Clinical Pharmacology' },
        { id: 'regulatory-section-4', title: '4. Clinical Study Reports' },
        { id: 'regulatory-section-5', title: '5. Statistical Analysis' },
        { id: 'regulatory-section-6', title: '6. Integrated Summary of Efficacy' },
        { id: 'regulatory-section-7', title: '7. Integrated Summary of Safety' },
        { id: 'regulatory-section-8', title: '8. Risk Assessment and Risk Management' },
        { id: 'regulatory-section-9', title: '9. Labeling' },
        { id: 'regulatory-section-10', title: '10. Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('nda') && (countryCode === 'united states' || countryCode === 'usa' || !country)) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Information' },
        { id: 'regulatory-section-3', title: '3. Nonclinical Information' },
        { id: 'regulatory-section-4', title: '4. Clinical Information' },
        { id: 'regulatory-section-5', title: '5. Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('bla') && (countryCode === 'united states' || countryCode === 'usa' || !country)) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Product Characterization' },
        { id: 'regulatory-section-3', title: '3. Nonclinical Assessment' },
        { id: 'regulatory-section-4', title: '4. Clinical Information' },
        { id: 'regulatory-section-5', title: '5. Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('protocol')) {
      return [
        { id: 'regulatory-section-1', title: '1. Study Overview and Objectives' },
        { id: 'regulatory-section-2', title: '2. Study Design and Methodology' },
        { id: 'regulatory-section-3', title: '3. Study Population' },
        { id: 'regulatory-section-4', title: '4. Treatment and Interventions' },
        { id: 'regulatory-section-5', title: '5. Assessments and Procedures' },
        { id: 'regulatory-section-6', title: '6. Statistical Analysis Plan' },
        { id: 'regulatory-section-7', title: '7. Safety Monitoring' },
        { id: 'regulatory-section-8', title: '8. Data Management' },
        { id: 'regulatory-section-9', title: '9. Quality Assurance' },
        { id: 'regulatory-section-10', title: '10. Regulatory and Ethical Considerations' }
      ];
    }
    
    // UK Documents
    if (docType.includes('marketing authorisation') || (docType.includes('ma') && countryCode === 'united kingdom')) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Assessment' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Evaluation' },
        { id: 'regulatory-section-4', title: '4. Clinical Development' },
        { id: 'regulatory-section-5', title: '5. Benefit-Risk Analysis' },
        { id: 'regulatory-section-6', title: '6. Risk Management' },
        { id: 'regulatory-section-7', title: '7. Product Information' }
      ];
    }
    
    if (docType.includes('clinical trial authorisation') || (docType.includes('cta') && countryCode === 'united kingdom')) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Study Design' },
        { id: 'regulatory-section-3', title: '3. Investigational Medicinal Product' },
        { id: 'regulatory-section-4', title: '4. Safety Information' },
        { id: 'regulatory-section-5', title: '5. Ethics and Participant Protection' },
        { id: 'regulatory-section-6', title: '6. Trial Management' },
        { id: 'regulatory-section-7', title: '7. UK Regulatory Compliance' }
      ];
    }
    
    // EU Documents
    if (docType.includes('maa') || (countryCode === 'european union' || countryCode === 'eu')) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Module (M3)' },
        { id: 'regulatory-section-3', title: '3. Nonclinical Module (M4)' },
        { id: 'regulatory-section-4', title: '4. Clinical Overview (M5.2)' },
        { id: 'regulatory-section-5', title: '5. Clinical Summary (M5.3)' },
        { id: 'regulatory-section-6', title: '6. Risk Management Plan' },
        { id: 'regulatory-section-7', title: '7. Pediatric Investigation Plan' },
        { id: 'regulatory-section-8', title: '8. Product Information' }
      ];
    }
    
    if (docType.includes('impd')) {
      return [
        { id: 'regulatory-section-1', title: '1. Introduction and Regulatory Framework' },
        { id: 'regulatory-section-2', title: '2. Drug Substance Characterization' },
        { id: 'regulatory-section-3', title: '3. Drug Product Formulation' },
        { id: 'regulatory-section-4', title: '4. Manufacturing and Controls' },
        { id: 'regulatory-section-5', title: '5. Placebo and Comparators' },
        { id: 'regulatory-section-6', title: '6. Non-Clinical Safety Summary' },
        { id: 'regulatory-section-7', title: '7. Clinical Rationale' }
      ];
    }
    
    // Canadian Documents
    if (docType.includes('nds') || (countryCode === 'canada' && docType.includes('nda'))) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality (Chemistry and Manufacturing)' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Evaluation' },
        { id: 'regulatory-section-4', title: '4. Clinical Evaluation' },
        { id: 'regulatory-section-5', title: '5. Clinical Trial Information' },
        { id: 'regulatory-section-6', title: '6. Risk Management' },
        { id: 'regulatory-section-7', title: '7. Product Monograph' },
        { id: 'regulatory-section-8', title: '8. Health Canada Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('clinical trial application') && countryCode === 'canada') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Clinical Protocol Summary' },
        { id: 'regulatory-section-3', title: '3. Investigational Product Information' },
        { id: 'regulatory-section-4', title: '4. Safety and Risk Assessment' },
        { id: 'regulatory-section-5', title: '5. Investigator and Site Information' },
        { id: 'regulatory-section-6', title: '6. Regulatory and Ethical Compliance' }
      ];
    }
    
    // Japanese Documents
    if (docType.includes('j-nda') || docType.includes('jnda') || (countryCode === 'japan' && docType.includes('nda'))) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality and Manufacturing' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Safety Assessment' },
        { id: 'regulatory-section-4', title: '4. Clinical Data Package' },
        { id: 'regulatory-section-5', title: '5. Japanese Population Data' },
        { id: 'regulatory-section-6', title: '6. Benefit-Risk Assessment' },
        { id: 'regulatory-section-7', title: '7. Post-Marketing Surveillance Plan' },
        { id: 'regulatory-section-8', title: '8. PMDA Regulatory Compliance' }
      ];
    }
    
    // Chinese Documents
    if ((docType.includes('nda') && countryCode === 'china') || docType.includes('china')) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Research Data' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Research Data' },
        { id: 'regulatory-section-4', title: '4. Clinical Trial Data' },
        { id: 'regulatory-section-5', title: '5. Chinese Population Analysis' },
        { id: 'regulatory-section-6', title: '6. Benefit-Risk Evaluation' },
        { id: 'regulatory-section-7', title: '7. NMPA Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('ind') && countryCode === 'china') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Drug Substance Information' },
        { id: 'regulatory-section-3', title: '3. Nonclinical Safety Summary' },
        { id: 'regulatory-section-4', title: '4. Clinical Development Plan' },
        { id: 'regulatory-section-5', title: '5. Manufacturing and Quality' },
        { id: 'regulatory-section-6', title: '6. Chinese Regulatory Compliance' }
      ];
    }
    
    // Korean Documents
    if ((docType.includes('nda') && countryCode === 'south korea') || (countryCode === 'south korea' && docType.includes('korea'))) {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Information' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Assessment' },
        { id: 'regulatory-section-4', title: '4. Clinical Evaluation' },
        { id: 'regulatory-section-5', title: '5. Safety Analysis' },
        { id: 'regulatory-section-6', title: '6. K-FDA Regulatory Compliance' }
      ];
    }
    
    if (docType.includes('ind') && countryCode === 'south korea') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Drug Substance Characterization' },
        { id: 'regulatory-section-3', title: '3. Nonclinical Safety Data' },
        { id: 'regulatory-section-4', title: '4. Clinical Study Plan' },
        { id: 'regulatory-section-5', title: '5. Quality and Manufacturing' },
        { id: 'regulatory-section-6', title: '6. Korean Regulatory Compliance' }
      ];
    }
    
    // Swiss Documents
    if (docType.includes('marketing authorisation') && countryCode === 'switzerland') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Evaluation' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Assessment' },
        { id: 'regulatory-section-4', title: '4. Clinical Evaluation' },
        { id: 'regulatory-section-5', title: '5. Benefit-Risk Analysis' },
        { id: 'regulatory-section-6', title: '6. Swissmedic Regulatory Compliance' }
      ];
    }
    
    // Australian Documents
    if (docType.includes('aus') || countryCode === 'australia') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Quality Assessment' },
        { id: 'regulatory-section-3', title: '3. Non-Clinical Evaluation' },
        { id: 'regulatory-section-4', title: '4. Clinical Development' },
        { id: 'regulatory-section-5', title: '5. Benefit-Risk Analysis' },
        { id: 'regulatory-section-6', title: '6. TGA Regulatory Strategy' }
      ];
    }
    
    // Indian Documents
    if (docType.includes('nda') && countryCode === 'india') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Drug Substance and Product' },
        { id: 'regulatory-section-3', title: '3. Manufacturing and Quality Control' },
        { id: 'regulatory-section-4', title: '4. Nonclinical Evaluation' },
        { id: 'regulatory-section-5', title: '5. Clinical Data Summary' },
        { id: 'regulatory-section-6', title: '6. Benefit-Risk Assessment' },
        { id: 'regulatory-section-7', title: '7. CDSCO Regulatory Compliance' }
      ];
    }
    
    // Russian Documents
    if (docType.includes('clinical trial permit') && countryCode === 'russia') {
      return [
        { id: 'regulatory-section-1', title: '1. Administrative Information' },
        { id: 'regulatory-section-2', title: '2. Clinical Study Overview' },
        { id: 'regulatory-section-3', title: '3. Investigational Medicinal Product' },
        { id: 'regulatory-section-4', title: '4. Safety Assessment' },
        { id: 'regulatory-section-5', title: '5. Russian Site and Investigator Information' },
        { id: 'regulatory-section-6', title: '6. Roszdravnadzor Regulatory Compliance' }
      ];
    }
    
    // Default fallback (US IND structure)
    return [
      { id: 'regulatory-section-1', title: '1. Chemistry, Manufacturing, and Controls (CMC)' },
      { id: 'regulatory-section-2', title: '2. Nonclinical Pharmacology and Toxicology' },
      { id: 'regulatory-section-3', title: '3. Clinical Pharmacology' },
      { id: 'regulatory-section-4', title: '4. Clinical Study Reports' },
      { id: 'regulatory-section-5', title: '5. Statistical Analysis' },
      { id: 'regulatory-section-6', title: '6. Integrated Summary of Efficacy' },
      { id: 'regulatory-section-7', title: '7. Integrated Summary of Safety' },
      { id: 'regulatory-section-8', title: '8. Risk Assessment and Risk Management' },
      { id: 'regulatory-section-9', title: '9. Labeling' },
      { id: 'regulatory-section-10', title: '10. Regulatory Compliance' }
    ];
  };

  // Get sections based on current selection
  const regulatoryDocumentSections = getSectionsForDocument(documentType, country);

  // Smart Content Distribution Function
  const distributeContentToSections = (fullContent) => {
    console.log('🔍 Smart content distribution starting...');
    console.log('Content length:', fullContent.length);
    
    const newSectionEdits = { ...sectionEdits };
    
    // Split content into paragraphs/sections
    const contentParts = fullContent.split(/\n\s*\n+/).filter(part => part.trim().length > 50);
    console.log('Content parts found:', contentParts.length);
    
    // Dynamic Keywords based on current sections
    const generateSectionKeywords = (sections) => {
      const keywords = {};
      sections.forEach(section => {
        const title = section.title.toLowerCase();
        const sectionId = section.id;
        
        // Generate keywords based on section title
        if (title.includes('chemistry') || title.includes('manufacturing') || title.includes('cmc') || title.includes('quality')) {
          keywords[sectionId] = [
            'chemistry', 'manufacturing', 'controls', 'cmc', 'drug substance', 'drug product', 
            'formulation', 'quality', 'specifications', 'stability', 'container', 'closure',
            'analytical methods', 'impurities', 'batch', 'process', 'raw materials'
          ];
        } else if (title.includes('nonclinical') || title.includes('non-clinical') || title.includes('toxicology')) {
          keywords[sectionId] = [
            'nonclinical', 'non-clinical', 'toxicology', 'pharmacology', 'animal', 'preclinical', 'toxicity',
            'carcinogenicity', 'genotoxicity', 'reproductive', 'safety pharmacology',
            'toxicokinetics', 'acute', 'chronic', 'dose', 'species', 'in vivo', 'in vitro'
          ];
        } else if (title.includes('clinical pharmacology')) {
          keywords[sectionId] = [
            'clinical pharmacology', 'pharmacokinetics', 'pharmacodynamics', 'pk', 'pd',
            'absorption', 'distribution', 'metabolism', 'excretion', 'adme', 'bioavailability',
            'bioequivalence', 'drug interaction', 'population pk', 'exposure', 'clearance'
          ];
        } else if (title.includes('clinical') && (title.includes('study') || title.includes('trial') || title.includes('development'))) {
          keywords[sectionId] = [
            'clinical study', 'trial', 'patient', 'subject', 'efficacy', 'endpoint', 'primary',
            'secondary', 'inclusion', 'exclusion', 'randomized', 'controlled', 'phase',
            'study design', 'protocol', 'adverse events', 'demographics', 'results'
          ];
        } else if (title.includes('statistical') || title.includes('analysis')) {
          keywords[sectionId] = [
            'statistical', 'analysis', 'statistics', 'power', 'sample size', 'significance',
            'confidence interval', 'p-value', 'hypothesis', 'test', 'regression', 'anova',
            'chi-square', 'survival', 'kaplan-meier', 'intention to treat', 'per protocol'
          ];
        } else if (title.includes('efficacy') || title.includes('effectiveness') || title.includes('benefit')) {
          keywords[sectionId] = [
            'efficacy', 'effectiveness', 'response', 'outcome', 'benefit', 'improvement',
            'clinical response', 'remission', 'cure', 'success rate', 'therapeutic effect',
            'treatment response', 'clinical benefit', 'functional improvement'
          ];
        } else if (title.includes('safety') || title.includes('adverse') || title.includes('tolerability')) {
          keywords[sectionId] = [
            'safety', 'adverse', 'side effect', 'tolerability', 'toxicity', 'death',
            'serious adverse event', 'discontinuation', 'laboratory abnormalities',
            'vital signs', 'ecg', 'risk', 'contraindication', 'warning', 'precaution'
          ];
        } else if (title.includes('risk') && title.includes('management')) {
          keywords[sectionId] = [
            'risk', 'benefit', 'management', 'mitigation', 'rems', 'monitoring',
            'risk minimization', 'safety concern', 'identified risk', 'potential risk',
            'risk evaluation', 'pharmacovigilance', 'signal detection'
          ];
        } else if (title.includes('labeling') || title.includes('product information')) {
          keywords[sectionId] = [
            'labeling', 'label', 'indication', 'dosage', 'administration', 'contraindication',
            'warning', 'precaution', 'adverse reaction', 'drug interaction', 'use in specific populations',
            'overdosage', 'description', 'clinical pharmacology', 'how supplied'
          ];
        } else if (title.includes('regulatory') || title.includes('compliance') || title.includes('administrative')) {
          keywords[sectionId] = [
            'regulatory', 'compliance', 'guideline', 'regulation', 'ich', 'fda', 'ema', 'mhra', 'nmpa',
            'gcp', 'gmp', 'glp', 'quality system', 'inspection', 'audit', 'deviation',
            'corrective action', 'regulatory pathway', 'submission', 'approval', 'administrative'
          ];
        } else {
          // Default general keywords for unmatched sections
          keywords[sectionId] = [
            'clinical', 'study', 'data', 'analysis', 'evaluation', 'assessment', 'information'
          ];
        }
      });
      return keywords;
    };
    
    const sectionKeywords = generateSectionKeywords(regulatoryDocumentSections);
    
    // Score each content part against each section
    contentParts.forEach(content => {
      const contentLower = content.toLowerCase();
      let bestSection = null;
      let bestScore = 0;
      
      // Calculate keyword match scores for each section
      Object.entries(sectionKeywords).forEach(([sectionId, keywords]) => {
        const score = keywords.reduce((acc, keyword) => {
          const matches = (contentLower.match(new RegExp(keyword.replace(/\s+/g, '\\s+'), 'g')) || []).length;
          return acc + matches * keyword.split(' ').length; // Weight multi-word keywords higher
        }, 0);
        
        if (score > bestScore) {
          bestScore = score;
          bestSection = sectionId;
        }
      });
      
      // Only assign if we have a reasonable confidence (score > 2)
      if (bestSection && bestScore > 2) {
        console.log(`Matched content to ${bestSection} (score: ${bestScore})`);
        if (newSectionEdits[bestSection]) {
          // Append to existing content with separator
          newSectionEdits[bestSection] += '\n\n' + content.trim();
        } else {
          newSectionEdits[bestSection] = content.trim();
        }
      } else {
        // Fallback: assign to the first empty section or append to a general section
        const emptySections = regulatoryDocumentSections.filter(section => !newSectionEdits[section.id]);
        if (emptySections.length > 0) {
          newSectionEdits[emptySections[0].id] = content.trim();
        } else {
          // Append to Clinical Study Reports as a general fallback
          if (newSectionEdits['regulatory-section-4']) {
            newSectionEdits['regulatory-section-4'] += '\n\n' + content.trim();
          } else {
            newSectionEdits['regulatory-section-4'] = content.trim();
          }
        }
      }
    });
    
    console.log('Final section distribution:');
    Object.entries(newSectionEdits).forEach(([sectionId, content]) => {
      if (content) {
        const sectionTitle = regulatoryDocumentSections.find(s => s.id === sectionId)?.title || sectionId;
        console.log(`${sectionTitle}: ${content.length} characters`);
      }
    });
    
    return newSectionEdits;
  };

  // Helper Functions for Enhanced Editing
  const handleSectionEdit = (sectionId, content) => {
    setSectionEdits(prev => ({
      ...prev,
      [sectionId]: content
    }));
  };

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

  const exportToWord = async () => {
    try {
      const allContent = Object.values(sectionEdits).join('\n\n---\n\n');
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: 'Regulatory Document',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: '\n' + allContent,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unified-regulatory-document-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Error exporting to Word: ' + error.message);
    }
  };

  // Load parameters from navigation state (map selection)
  useEffect(() => {
    if (location.state) {
      const { 
        selectedCountry, 
        selectedCountryId, 
        selectedRegion, 
        selectedDocuments 
      } = location.state;
      
      if (selectedCountry) {
        setCountry(selectedCountry);
        setSelectedCountryData({
          country: selectedCountry,
          countryId: selectedCountryId,
          region: selectedRegion,
          availableDocuments: selectedDocuments || []
        });
        
        if (selectedDocuments && selectedDocuments.length > 0) {
          setDocumentType(selectedDocuments[0].name);
        }
      }
    }
  }, [location.state]);

  // Country Intelligence Analysis
  const analyzeCountryRecommendations = async (regionKey) => {
    if (!regionKey || intelligenceLoading) return;
    
    const availableCountries = getCountriesForRegion(regionKey);
    if (availableCountries.length === 0) return;

    setIntelligenceLoading(true);
    
    try {
      const studyParams = {
        disease: disease?.trim(),
        trialPhase,
        targetSampleSize,
        documentType
      };

      const recommendations = await countryIntelligenceService.analyzeCountryRecommendations(
        studyParams, 
        availableCountries
      );
      
      setCountryRecommendations(recommendations);
    } catch (error) {
      console.warn('Country intelligence analysis failed:', error);
      // Don't break existing functionality - just skip recommendations
      setCountryRecommendations({});
    } finally {
      setIntelligenceLoading(false);
    }
  };

  // Trigger analysis when region or study parameters change
  useEffect(() => {
    if (selectedDropdownRegion && (disease || trialPhase || documentType)) {
      // Debounce analysis to avoid too many API calls
      const timeoutId = setTimeout(() => {
        analyzeCountryRecommendations(selectedDropdownRegion);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedDropdownRegion, disease, trialPhase, documentType, targetSampleSize]);

  // CSV Template Headers - Complete field set matching single form
  const csvTemplate = [
    // Basic Information
    'study_name',
    'disease_condition',
    'drug_class',
    'mechanism_of_action',
    'compound_name',
    
    // Trial Characteristics
    'trial_phase',
    'trial_type',
    'blinding',
    'randomization',
    
    // Population Details
    'min_age',
    'max_age',
    'gender',
    'target_sample_size',
    'inclusion_criteria',
    'exclusion_criteria',
    
    // Treatment & Control
    'drug_formulation',
    'route_of_administration',
    'dosing_regimen',
    'control_group',
    
    // Endpoints & Outcomes
    'primary_endpoints',
    'secondary_endpoints',
    'outcome_measure_tool',
    
    // Statistical Considerations
    'statistical_power',
    'significance_level',
    
    // Regulatory Submission
    'country',
    'document_type'
  ];

  // Helper function to get region by country name
  const getRegionByCountry = (countryName) => {
    for (const [region, countries] of Object.entries(regionCountryMap)) {
      if (countries.includes(countryName)) return region;
    }
    return null;
  };

  // Get available countries for selected region
  const getCountriesForRegion = (regionKey) => {
    return regions[regionKey]?.countries || [];
  };

  // Handle region change in dropdown
  const handleDropdownRegionChange = (regionKey) => {
    setSelectedDropdownRegion(regionKey);
    setCountry(''); // Reset country when region changes
    setDocumentType(''); // Reset document type
    setSelectedCountryData(null);
  };

  // Handle country change in dropdown
  const handleDropdownCountryChange = (countryName) => {
    setCountry(countryName);
    
    // Find the country data and set selectedCountryData
    if (selectedDropdownRegion) {
      const regionData = regions[selectedDropdownRegion];
      const countryData = regionData?.countries.find(c => c.name === countryName);
      
      if (countryData) {
        setSelectedCountryData({
          country: countryData.name,
          countryId: countryData.id,
          region: regionData.name,
          availableDocuments: countryData.documents
        });
        
        // Auto-select first document type if available
        if (countryData.documents && countryData.documents.length > 0) {
          setDocumentType(countryData.documents[0].name);
        }
      }
    }
  };

  // Handle map country selection
  const handleMapCountrySelect = (country, region) => {
    // Sync both map selection and dropdown selection
    setSelectedDropdownRegion(region);
    setCountry(country.name);
    setSelectedCountryData({
      country: country.name,
      countryId: country.id,
      region: regions[region].name,
      availableDocuments: country.documents
    });
    
    if (country.documents && country.documents.length > 0) {
      setDocumentType(country.documents[0].name);
    }
  };

  // Generate CSV Template with standardized country names
  const generateCsvTemplate = () => {
    const headers = csvTemplate.join(',');
    
    // Get all available countries from regions data
    const availableCountries = Object.values(regions).flatMap(region => 
      region.countries.map(country => ({
        name: country.name,
        region: region.name,
        documents: country.documents.map(doc => doc.name)
      }))
    );
    
    const sampleData = [
      // Complete sample row with all fields using exact country names
      'PSORA-301,Moderate to Severe Psoriasis,Biologics,IL-17A inhibition,LUM-2024,Phase III,Interventional,Double-blind,Yes,18,75,All,300,"Adults aged 18-75 years with moderate-to-severe plaque psoriasis","Pregnancy or breastfeeding; active infections",Injection,Subcutaneous,150mg at Week 0 and 4 then every 12 weeks,Placebo,"PASI-75 response at Week 16","PASI-90 response; sPGA 0/1; DLQI improvement",PASI,80,0.05,United States,IND (Investigational New Drug)',
      
      'ECZEMA-201,Atopic Dermatitis,Small molecule,JAK1/JAK3 inhibition,LUM-2025,Phase II,Interventional,Double-blind,Yes,12,65,All,150,"Moderate-to-severe atopic dermatitis; inadequate response to topical treatments","Immunocompromised patients; active malignancy",Tablet,Oral,10mg once daily for 16 weeks,Placebo,"EASI-75 response at Week 12","Itch NRS improvement; sleep quality; QoL measures",EASI,80,0.05,European Union,CTA (Clinical Trial Application)',
      
      'ARTHRO-302,Rheumatoid Arthritis,Biologics,TNF-alpha inhibition,LUM-2026,Phase III,Interventional,Double-blind,Yes,18,80,All,400,"Active RA despite MTX; DAS28 > 5.1","Previous anti-TNF therapy; serious infections",IV Infusion,Intravenous,5mg/kg at Week 0-2-6 then every 8 weeks,Active Comparator,"ACR20 response at Week 24","ACR50/70 response; DAS28 remission; radiographic progression",DAS28,90,0.01,Canada,Clinical Trial Application (Health Canada)',
      
      'ONCO-401,Non-Small Cell Lung Cancer,Monoclonal Antibody,PD-1 inhibition,LUM-2027,Phase I,Interventional,Open-label,No,18,80,All,60,"Advanced NSCLC; ECOG 0-1; adequate organ function","Active brain metastases; autoimmune disease",IV Infusion,Intravenous,10mg/kg every 2 weeks for 24 weeks,No Control,"Safety and tolerability; MTD determination","ORR; PFS; biomarker analysis",RECIST,80,0.05,Japan,Clinical Trial Notification (CTN)'
    ];
    
    // Add reference section with available countries and documents
    const referenceSection = [
      '',
      '# REFERENCE: Available Countries and Document Types',
      '# Copy the exact country name and document type from below:',
      '',
      '# NORTH AMERICA:',
      '# United States: IND (Investigational New Drug), NDA (New Drug Application), BLA (Biologics License Application)',
      '# Canada: Clinical Trial Application (Health Canada), New Drug Submission (NDS), Notice of Compliance (NOC)',
      '# Mexico: COFEPRIS Clinical Trial Authorization, COFEPRIS New Drug Registration',
      '',
      '# EUROPE:',
      '# European Union: CTA (Clinical Trial Application), MAA (Marketing Authorization Application), IMPD (Investigational Medicinal Product Dossier)',
      '# United Kingdom: Clinical Trial Authorisation (UK), Marketing Authorisation (UK), Voluntary Scheme for Branded Medicines Pricing',
      '# Switzerland: Clinical Trial Authorisation (Swissmedic), Marketing Authorisation (Switzerland)',
      '# Russia: Clinical Trial Permit (Roszdravnadzor), Registration Dossier (Russia), Russian GMP Certificate',
      '',
      '# ASIA PACIFIC:',
      '# Japan: Clinical Trial Notification (CTN), J-NDA (New Drug Application), PMDA Scientific Advice',
      '# China: IND (China), NDA (China), Drug Registration Certificate',
      '# South Korea: IND (Korea), NDA (Korea), Korean GMP Certificate',
      '# Australia: CTN (Clinical Trial Notification), AUS (Australian Submission), TGA GMP Certificate',
      '# Singapore: Clinical Trial Certificate (HSA), Product License (Singapore)',
      '# India: Clinical Trial Permission (CDSCO), New Drug Application (India), Import License',
      '# Taiwan: IND (Taiwan), NDA (Taiwan)',
      '',
      '# LATIN AMERICA:',
      '# Brazil: ANVISA Clinical Trial Authorization, ANVISA Registration Dossier, ANVISA GMP Certificate',
      '# Argentina: ANMAT Clinical Trial Authorization, ANMAT Drug Registration',
      '# Colombia: INVIMA Clinical Trial Permit, INVIMA Drug Registration',
      '# Chile: ISP Clinical Trial Authorization, ISP Drug Registration',
      '',
      '# AFRICA & MIDDLE EAST:',
      '# South Africa: SAHPRA Clinical Trial Authorization, SAHPRA Medicine Registration',
      '# Israel: Israeli MOH Clinical Trial Permit, Israeli Drug Registration',
      '# Saudi Arabia: SFDA Clinical Trial Authorization, SFDA Drug Registration',
      '# United Arab Emirates: DHA Clinical Trial Permit, UAE Drug Registration'
    ];
    
    const csvContent = [headers, ...sampleData, ...referenceSection].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research_pipeline_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle CSV File Upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n')
          .filter(line => line.trim()) // Remove empty lines
          .filter(line => !line.trim().startsWith('#')); // Remove comment lines starting with #
        
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          row.id = index;
          row.status = 'pending';
          return row;
        });

        setCsvData(data);
        setCsvPreview(data.slice(0, 5)); // Show first 5 rows
        setShowCsvPreview(true);
        setError('');
      } catch (err) {
        setError('Error parsing CSV file. Please check the format.');
        console.error('CSV parsing error:', err);
      }
    };

    reader.readAsText(file);
  };

  // Single Document Generation
  const handleSingleGeneration = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const enhancedFormData = {
        disease_name: disease.trim(),
        additional_parameters: {
          study_name: studyName.trim() || undefined,
          compound_name: compoundName.trim() || undefined,
          drug_class: drugClass.trim() || undefined,
          mechanism: mechanism.trim() || undefined,
          country: country || undefined,
          document_type: documentType || undefined,
          
          // Trial Characteristics
          trial_phase: trialPhase || undefined,
          trial_type: trialType || undefined,
          blinding: blinding || undefined,
          randomization: randomization || undefined,
          
          // Population Details
          min_age: minAge || undefined,
          max_age: maxAge || undefined,
          gender: gender || undefined,
          target_sample_size: targetSampleSize || undefined,
          inclusion_criteria: inclusionCriteria.trim() || undefined,
          exclusion_criteria: exclusionCriteria.trim() || undefined,
          
          // Treatment & Control
          drug_formulation: drugFormulation || undefined,
          route_of_administration: routeOfAdministration || undefined,
          dosing_regimen: dosingRegimen.trim() || undefined,
          control_group: controlGroup || undefined,
          
          // Endpoints & Outcomes
          primary_endpoints: primaryEndpoints.trim() || undefined,
          secondary_endpoints: secondaryEndpoints.trim() || undefined,
          outcome_measure_tool: outcomeMeasureTool || undefined,
          
          // Statistical Considerations
          statistical_power: statisticalPower || undefined,
          significance_level: significanceLevel || undefined,
        }
      };

      if (!disease || disease.trim() === '') {
        throw new Error('Disease/Condition is required');
      }

      const jobId = startJob('regulatory_document', enhancedFormData, apiService.generateIndModule);
      setBackgroundJobId(jobId);
      
      monitorJob(jobId);
      
    } catch (err) {
      console.error('Single document generation error:', err);
      setError(`Failed to start document generation: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Batch Document Generation
  const handleBatchGeneration = async () => {
    if (!csvData || csvData.length === 0) {
      setError('Please upload a CSV file with study data.');
      return;
    }

    setLoading(true);
    setError('');
    setBatchResults([]);
    
    const progress = {};
    csvData.forEach(row => {
      progress[row.id] = { status: 'pending', progress: 0 };
    });
    setBatchProgress(progress);

    try {
      // Process each row sequentially to avoid overwhelming the API
      for (const row of csvData) {
        setBatchProgress(prev => ({
          ...prev,
          [row.id]: { status: 'processing', progress: 25 }
        }));

        // Map country to region for backend using our regions data
        const getRegionFromCountry = (country) => {
          // First try exact match
          for (const [regionKey, regionData] of Object.entries(regions)) {
            const foundCountry = regionData.countries.find(c => 
              c.name.toLowerCase() === country.toLowerCase()
            );
            if (foundCountry) {
              return regionData.name;
            }
          }
          
          // Fallback mapping for common variations
          const fallbackMap = {
            'usa': 'North America',
            'us': 'North America',
            'uk': 'Europe',
            'eu': 'Europe',
            'korea': 'Asia Pacific',
            'south korea': 'Asia Pacific'
          };
          
          return fallbackMap[country.toLowerCase()] || 'Unknown';
        };
        
        // Validate country and document type
        const validateCountryAndDocument = (country, documentType) => {
          for (const [regionKey, regionData] of Object.entries(regions)) {
            const foundCountry = regionData.countries.find(c => 
              c.name.toLowerCase() === country.toLowerCase()
            );
            if (foundCountry) {
              const foundDocument = foundCountry.documents.find(doc => 
                doc.name.toLowerCase().includes(documentType.toLowerCase()) ||
                documentType.toLowerCase().includes(doc.name.toLowerCase())
              );
              if (foundDocument) {
                return { isValid: true, country: foundCountry.name, document: foundDocument.name };
              }
            }
          }
          return { isValid: false, country, document: documentType };
        };
        
        const validation = validateCountryAndDocument(row.country, row.document_type);
        if (!validation.isValid) {
          console.warn(`Warning: Country "${row.country}" or document type "${row.document_type}" not found in our database for study ${row.study_name}`);
        }
        
        const formData = {
          disease_name: row.disease_condition || row.disease_name,
          additional_parameters: {
            // Basic Information
            study_name: row.study_name,
            compound_name: row.compound_name,
            indication: row.disease_condition, // Required for IND, CTA, etc.
            dosage_form: row.drug_formulation, // Required for IND
            protocol_number: row.study_name, // Use study_name as protocol_number for CTA
            drug_class: row.drug_class,
            mechanism: row.mechanism_of_action,
            
            // Trial Characteristics
            trial_phase: row.trial_phase,
            trial_type: row.trial_type,
            blinding: row.blinding,
            randomization: row.randomization,
            
            // Population Details
            min_age: row.min_age,
            max_age: row.max_age,
            gender: row.gender,
            target_sample_size: row.target_sample_size,
            inclusion_criteria: row.inclusion_criteria,
            exclusion_criteria: row.exclusion_criteria,
            
            // Treatment & Control
            drug_formulation: row.drug_formulation,
            route_of_administration: row.route_of_administration,
            dosing_regimen: row.dosing_regimen,
            control_group: row.control_group,
            
            // Endpoints & Outcomes
            primary_endpoints: row.primary_endpoints,
            secondary_endpoints: row.secondary_endpoints,
            outcome_measure_tool: row.outcome_measure_tool,
            
            // Statistical Considerations
            statistical_power: row.statistical_power,
            significance_level: row.significance_level,
            
            // Regulatory Submission
            country: row.country,
            document_type: row.document_type,
          }
        };

        // Debug: Log the final formData being sent
        console.log('Final formData being sent:', formData);
        console.log('Required parameters check - indication:', formData.additional_parameters?.indication);
        console.log('Required parameters check - dosage_form:', formData.additional_parameters?.dosage_form);

        try {
          const result = await apiService.generateIndModule(formData);
          
          // Save to backend - RE-ENABLED FOR PRISMA DEBUGGING
          try {
            await saveDocument({
              type: 'REGULATORY', // Must match DocumentType enum
              title: `${row.document_type} for ${row.study_name}`,
              disease: row.disease_condition,
              region: getRegionFromCountry(row.country),
              country: row.country,
              documentType: row.document_type,
              cmcSection: result.cmc_section || '',
              clinicalSection: result.clinical_section || '',
              content: result.document_content || `CMC SECTION:\n${result.cmc_section || ''}\n\nCLINICAL SECTION:\n${result.clinical_section || ''}`,
              tags: [row.study_name, row.compound_name, row.disease_condition].filter(Boolean), // Required array
            });
          } catch (saveError) {
            console.warn(`Failed to save document for ${row.study_name}:`, saveError);
            console.log('Save error details:', saveError.response?.data);
            console.log('Document data that failed:', {
              type: 'REGULATORY',
              title: `${row.document_type} for ${row.study_name}`,
              disease: row.disease_condition,
              region: getRegionFromCountry(row.country),
              country: row.country,
              documentType: row.document_type,
              studyName: row.study_name,
              compoundName: row.compound_name,
            });
          }

          setBatchProgress(prev => ({
            ...prev,
            [row.id]: { status: 'completed', progress: 100 }
          }));

          setBatchResults(prev => [...prev, {
            id: row.id,
            studyName: row.study_name,
            status: 'success',
            result: result
          }]);

        } catch (rowError) {
          console.error(`Error generating document for ${row.study_name}:`, rowError);
          
          setBatchProgress(prev => ({
            ...prev,
            [row.id]: { status: 'error', progress: 0 }
          }));

          setBatchResults(prev => [...prev, {
            id: row.id,
            studyName: row.study_name,
            status: 'error',
            error: rowError.message
          }]);
        }

        // Small delay to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (batchError) {
      console.error('Batch generation error:', batchError);
      setError(`Batch generation failed: ${batchError.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Monitor Background Job
  const monitorJob = (jobId) => {
    let checkAttempts = 0;
    const maxAttempts = 300;
    
    const checkJobStatus = async () => {
      checkAttempts++;
      
      if (checkAttempts > maxAttempts) {
        setError('Document generation timed out. Please try again.');
        setLoading(false);
        setBackgroundJobId(null);
        return;
      }
      
      const job = getJob(jobId);
      if (job) {
        if (job.status === 'completed') {
          setLoading(false);
          setBackgroundJobId(null);
          
          const response = job.result;
          
          if (response.document_content) {
            const content = response.document_content;
            let cmcSection = "";
            let clinicalSection = "";
            
            const possibleDividers = [
              "CLINICAL OVERVIEW", "CLINICAL SECTION", "CLINICAL STUDY", 
              "NONCLINICAL OVERVIEW", "3. NONCLINICAL", "4. CLINICAL", 
              "CLINICAL TRIAL", "EFFICACY AND SAFETY"
            ];
            
            let dividerIndex = -1;
            for (const divider of possibleDividers) {
              const index = content.indexOf(divider);
              if (index !== -1 && (dividerIndex === -1 || index < dividerIndex)) {
                dividerIndex = index;
              }
            }
            
            if (dividerIndex !== -1) {
              cmcSection = content.substring(0, dividerIndex).trim();
              clinicalSection = content.substring(dividerIndex).trim();
            } else {
              const midPoint = Math.floor(content.length / 2);
              cmcSection = content.substring(0, midPoint).trim();
              clinicalSection = content.substring(midPoint).trim();
            }
            
            const responseObj = {
              cmc_section: cmcSection,
              clinical_section: clinicalSection,
              document_content: content
            };
            setResult(responseObj);

            // Check if backend provided pre-sectioned data, otherwise use distribution
            if (responseObj.sectionsData) {
              console.log('Using pre-sectioned data from backend');
              const newSectionEdits = { ...sectionEdits };
              Object.entries(responseObj.sectionsData).forEach(([sectionId, content]) => {
                newSectionEdits[sectionId] = content;
              });
              setSectionEdits(newSectionEdits);
            } else {
              // Use smart content distribution to populate sections appropriately
              console.log('Using smart content distribution (fallback)');
              const smartSectionEdits = distributeContentToSections(content);
              setSectionEdits(smartSectionEdits);
            }

            // Auto-scroll to editable sections
            setTimeout(() => {
              const sectionsElement = document.querySelector('.document-sections');
              if (sectionsElement) {
                sectionsElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, 500);

            // Save to backend - DISABLED FOR NOW
            console.log("Single mode: Document generation successful, skipping save for now");
            /*try {
              await saveDocument({
                type: 'REGULATORY',
                title: `${documentType} for ${studyName || disease}`,
                disease,
                country,
                documentType,
                studyName,
                compoundName,
                cmcSection: cmcSection,
                clinicalSection: clinicalSection,
                content,
              });
              console.log('Document saved to backend successfully');
            } catch (saveError) {
              if (saveError.response?.status === 413) {
                console.warn('Document too large to save to backend (413 error). Document generated successfully but not saved.');
              } else {
                console.warn('Failed to save document to backend:', saveError);
              }
            }

          } else if (response.cmc_section || response.clinical_section || response) {
            // Set result regardless of structure
            setResult(response);
            
            // Check if backend provided pre-sectioned data
            if (response.sectionsData) {
              console.log('Using pre-sectioned data from backend');
              const newSectionEdits = { ...sectionEdits };
              Object.entries(response.sectionsData).forEach(([sectionId, content]) => {
                newSectionEdits[sectionId] = content;
              });
              setSectionEdits(newSectionEdits);
            } else {
              // Fallback to smart content distribution
              console.log('Using smart content distribution (fallback)');
              const fullContent = response.document_content || 
                                 `${response.cmc_section || ''}\n\n${response.clinical_section || ''}`;
              const smartSectionEdits = distributeContentToSections(fullContent.trim());
              setSectionEdits(smartSectionEdits);
            }
            
            // Auto-scroll to editable sections
            setTimeout(() => {
              const sectionsElement = document.querySelector('.document-sections');
              if (sectionsElement) {
                sectionsElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, 500);
            
            try {
              console.log("Single mode: Document generation successful, skipping save for now");
              /*await saveDocument({
                type: 'REGULATORY',
                title: `${documentType} for ${studyName || disease}`,
                disease,
                country,
                documentType,
                studyName,
                compoundName,
                cmcSection: response.cmc_section,
                clinicalSection: response.clinical_section,
                content: response.document_content || `CMC SECTION:\n${response.cmc_section}\n\nCLINICAL SECTION:\n${response.clinical_section}`,
              });
              console.log('Document saved to backend successfully');
            } catch (saveError) {
              if (saveError.response?.status === 413) {
                console.warn('Document too large to save to backend (413 error). Document generated successfully but not saved.');
              } else {
                console.warn('Failed to save document to backend:', saveError);
              }
            }*/
          }
          
          setTimeout(() => {
            document.querySelector('.result-container')?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100);
          
        } else if (job.status === 'error') {
          setLoading(false);
          setBackgroundJobId(null);
          console.error('Background job error details:', {
            jobId,
            error: job.error,
            data: job.data,
            type: job.type
          });
          setError(`Document generation failed: ${job.error || 'Unknown error occurred. Please check the console for details.'}`);
        } else {
          setTimeout(() => checkJobStatus(), 1000);
        }
      } else {
        console.warn(`Background job ${jobId} not found, attempt ${checkAttempts}/${maxAttempts}`);
        if (checkAttempts > 10) {
          setError('Lost connection to background job. Please try again.');
          setLoading(false);
          setBackgroundJobId(null);
          return;
        }
        setTimeout(() => checkJobStatus(), 1000);
      }
    };
    
    checkJobStatus();
  };

  // Handle Previous Documents
  const handleShowPreviousDocs = async () => {
    setShowPreviousDocs(!showPreviousDocs);
    if (!showPreviousDocs && previousDocs.length === 0) {
      setLoadingPreviousDocs(true);
      setFetchError('');
      try {
        const result = await getMyDocuments('REGULATORY');
        if (result.success) {
          setPreviousDocs(result.data);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setPreviousDocs([]);
        if (err.response?.status === 401) {
          setFetchError('Please log in to view previous documents.');
        } else {
          setFetchError('Error fetching previous regulatory documents. Please try again later.');
        }
      } finally {
        setLoadingPreviousDocs(false);
      }
    }
  };

  const handleSaveDocument = async () => {
    if (!result) {
      alert('No document to save');
      return;
    }

    const resultToSave = await saveRegulatoryDocument({
      title: `${country} - ${documentType}`,
      description: `Regulatory document for ${disease}`,
      disease: disease,
      country: country,
      region: selectedRegion,
      documentType: documentType,
      content: result.cmc_section || result.clinical_section || result.full_document || '',
      sections: result,
      cmcSection: result.cmc_section,
      clinicalSection: result.clinical_section
    });

    if (resultToSave.success) {
      alert('Document saved successfully!');
    } else {
      alert('Failed to save document: ' + (resultToSave.error || 'Unknown error'));
    }
  };

  // Download Results as ZIP (for batch)
  const downloadBatchResults = async () => {
    const successfulResults = batchResults.filter(r => r.status === 'success');
    
    if (successfulResults.length === 0) {
      alert('No successful documents to download.');
      return;
    }

    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().slice(0, 10);
      
      // Create a main folder for this batch
      const batchFolder = zip.folder(`Regulatory_Documents_${timestamp}`);
      
      // Process each successful result
      for (let i = 0; i < successfulResults.length; i++) {
        const result = successfulResults[i];
        const studyName = result.studyName || `Study_${i + 1}`;
        const sanitizedStudyName = studyName.replace(/[^a-zA-Z0-9-_]/g, '_');
        
        // Create a folder for this study
        const studyFolder = batchFolder.folder(sanitizedStudyName);
        
        // Generate combined document content
        const combinedContent = `REGULATORY DOCUMENT - ${studyName}
Generated: ${new Date().toISOString()}

CMC SECTION:
${result.result.cmc_section || 'No CMC content available'}

CLINICAL SECTION:
${result.result.clinical_section || 'No clinical content available'}

FULL DOCUMENT:
${result.result.document_content || 'No document content available'}`;

        // Add text file
        studyFolder.file(`${sanitizedStudyName}_Document.txt`, combinedContent);
        
        // Generate PDF for each document
        try {
          const doc = new jsPDF();
          doc.setFont('helvetica');
          doc.setFontSize(10);
          
          const pageHeight = doc.internal.pageSize.height;
          const pageWidth = doc.internal.pageSize.width;
          const margin = 15;
          const maxLineWidth = pageWidth - (margin * 2);
          const lineHeight = 6;
          const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
          
          const lines = doc.splitTextToSize(combinedContent, maxLineWidth);
          let currentLine = 0;
          
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            if (currentLine >= maxLinesPerPage) {
              doc.addPage();
              currentLine = 0;
            }
            
            const yPosition = margin + (currentLine * lineHeight);
            doc.text(lines[lineIndex], margin, yPosition);
            currentLine++;
          }
          
          // Convert PDF to blob and add to ZIP
          const pdfBlob = doc.output('blob');
          studyFolder.file(`${sanitizedStudyName}_Document.pdf`, pdfBlob);
          
        } catch (pdfError) {
          console.warn(`Failed to generate PDF for ${studyName}:`, pdfError);
          // Continue with other documents even if PDF generation fails
        }

        // Add separate CMC and Clinical sections as individual files
        if (result.result.cmc_section) {
          studyFolder.file(`${sanitizedStudyName}_CMC_Section.txt`, result.result.cmc_section);
        }
        
        if (result.result.clinical_section) {
          studyFolder.file(`${sanitizedStudyName}_Clinical_Section.txt`, result.result.clinical_section);
        }
      }
      
      // Add a summary file
      const summary = `BATCH GENERATION SUMMARY
Generated: ${new Date().toISOString()}
Total Studies Processed: ${batchResults.length}
Successful Documents: ${successfulResults.length}
Failed Documents: ${batchResults.filter(r => r.status === 'error').length}

SUCCESSFUL STUDIES:
${successfulResults.map((r, i) => `${i + 1}. ${r.studyName}`).join('\n')}

${batchResults.filter(r => r.status === 'error').length > 0 ? `
FAILED STUDIES:
${batchResults.filter(r => r.status === 'error').map((r, i) => `${i + 1}. ${r.studyName} - ${r.error}`).join('\n')}
` : ''}
`;
      
      batchFolder.file('Batch_Summary.txt', summary);
      
      // Generate and download the ZIP file
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `Regulatory_Documents_${timestamp}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log(`Successfully created ZIP with ${successfulResults.length} documents`);
      
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. Please try again.');
    }
  };

  // Reset Form
  const resetForm = () => {
    // Basic Information
    setDisease('');
    setDrugClass('');
    setMechanism('');
    setDocumentType('');
    setStudyName('');
    setCompoundName('');
    
    // Trial Characteristics
    setTrialPhase('');
    setTrialType('');
    setBlinding('');
    setRandomization('');
    
    // Population Details
    setMinAge('');
    setMaxAge('');
    setGender('');
    setTargetSampleSize('');
    setInclusionCriteria('');
    setExclusionCriteria('');
    
    // Treatment & Control
    setDrugFormulation('');
    setRouteOfAdministration('');
    setDosingRegimen('');
    setControlGroup('');
    
    // Endpoints & Outcomes
    setPrimaryEndpoints('');
    setSecondaryEndpoints('');
    setOutcomeMeasureTool('');
    
    // Statistical Considerations
    setStatisticalPower('80');
    setSignificanceLevel('0.05');
    
    setResult(null);
    setError('');
    
    // Reset dropdown state
    setSelectedDropdownRegion('');
    setSelectedCountryData(null);
    
    // Reset batch state
    setCsvData([]);
    setCsvPreview([]);
    setShowCsvPreview(false);
    setBatchProgress({});
    setBatchResults([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="unified-regulatory-generator">
      {/* AI Assistant Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        context="unified regulatory document generation"
      />
      
      {/* Floating AI Assistant Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon=""
        tooltip="Ask Lumina AI for help"
      />

      {/* Header */}
      <div className="generator-header">
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b', textAlign: 'left' }}>Medical Research Document Generator</h2>
          <p>Generate regulatory submissions for your research studies</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowMap(!showMap)} className="btn btn-outline">
            {showMap ? 'Hide Map' : 'Select Country'}
          </button>
          <button onClick={handleShowPreviousDocs} className="btn btn-outline">
            {showPreviousDocs ? 'Hide Previous' : 'Previous Docs'}
          </button>
        </div>
      </div>

      {/* Interactive Regulatory Map */}
      {showMap && (
        <div className="interactive-map-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#2d3748' }}>Global Regulatory Document Map</h3>
              <p style={{ margin: '0.5rem 0 0 0', color: '#4a5568' }}>
                Select a region to explore available regulatory documents by country
              </p>
            </div>
          </div>
          
          <div style={{ position: 'relative', width: '100%', height: '400px', margin: '20px 0' }}>
            <ComposableMap projection="geoMercator" width={900} height={400} style={{ width: '100%', height: '400px' }}>
              <ZoomableGroup center={[20, 20]} zoom={1}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const countryName = geo.properties.NAME;
                      const region = getRegionByCountry(countryName);
                      const isRegion = selectedRegion ? region === selectedRegion : false;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => {
                            if (!selectedRegion && region) {
                              setSelectedRegion(region);
                            } else if (selectedRegion && isRegion) {
                              // Find country in regions[selectedRegion].countries
                              const regionObj = regions[selectedRegion];
                              if (regionObj) {
                                const country = regionObj.countries.find(c => c.name === countryName);
                                if (country) handleMapCountrySelect(country, selectedRegion);
                              }
                            }
                          }}
                          style={{
                            default: {
                              fill: selectedRegion
                                ? (isRegion ? regionColors[selectedRegion] : '#e2e8f0')
                                : (region ? regionColors[region] : '#e2e8f0'),
                              stroke: '#fff',
                              strokeWidth: 0.75,
                              outline: 'none',
                              cursor: region ? 'pointer' : 'default',
                              opacity: selectedRegion ? (isRegion ? 1 : 0.5) : 0.85
                            },
                            hover: {
                              fill: region ? regionColors[region] : '#cbd5e0',
                              opacity: 1,
                              outline: 'none',
                              cursor: region ? 'pointer' : 'default'
                            },
                            pressed: {
                              fill: region ? regionColors[region] : '#cbd5e0',
                              outline: 'none',
                              cursor: region ? 'pointer' : 'default'
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {/* Add clickable region dots */}
                {Object.entries(regionCentroids).map(([regionId, coords]) => (
                  <Marker key={regionId} coordinates={coords}>
                    <circle
                      r={selectedRegion === regionId ? 18 : 13}
                      fill={regionColors[regionId]}
                      stroke="#2d3748"
                      strokeWidth={selectedRegion === regionId ? 3 : 2}
                      opacity={hoveredRegion === regionId ? 0.85 : 0.7}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={() => setHoveredRegion(regionId)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => setSelectedRegion(regionId)}
                    />
                    <text
                      textAnchor="middle"
                      y={selectedRegion === regionId ? 35 : 28}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: selectedRegion === regionId ? 15 : 13,
                        fontWeight: selectedRegion === regionId ? 'bold' : 'normal',
                        fill: '#2d3748',
                        cursor: 'pointer',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {regionNameMap[regionId]}
                    </text>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {/* Region Details */}
          {selectedRegion && (
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '0',
              padding: '20px',
              marginTop: '20px',
              border: `2px solid ${regions[selectedRegion].color}`
            }}>
              <h4 style={{ 
                margin: '0 0 15px 0', 
                color: regions[selectedRegion].color,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {regions[selectedRegion].name}
                <span style={{ 
                  fontSize: '0.8rem', 
                  background: regions[selectedRegion].color,
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '0'
                }}>
                  {regions[selectedRegion].countries.length} countries
                </span>
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px'
              }}>
                {regions[selectedRegion].countries.map((country) => (
                  <div
                    key={country.id}
                    style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '0',
                      border: `2px solid ${regions[selectedRegion].color}`,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px',
                      paddingBottom: '15px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '1.1rem', marginBottom: '4px' }}>
                          {country.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                          {country.documents.length} document type{country.documents.length !== 1 ? 's' : ''} available
                        </div>
                      </div>
                    </div>

                    {/* Available Documents List - Always shown */}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', marginBottom: '10px' }}>
                        Available Documents:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {country.documents.map((doc, idx) => (
                          <div
                            key={doc.id || idx}
                            onClick={() => {
                              handleMapCountrySelect(country, selectedRegion);
                              setDocumentType(doc.name);
                            }}
                            style={{
                              fontSize: '0.8rem',
                              color: '#2d3748',
                              padding: '10px 12px',
                              backgroundColor: '#f7fafc',
                              borderRadius: '0',
                              border: '1px solid #e2e8f0',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e6fffa';
                              e.currentTarget.style.borderColor = regions[selectedRegion].color;
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f7fafc';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: regions[selectedRegion].color }}>
                              • {doc.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#718096', marginLeft: '12px' }}>
                              {doc.purpose}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#ebf8ff',
            borderRadius: '0',
            border: '1px solid #bee3f8'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#2c5282' }}>
              <strong>How to use:</strong> Click on a region above to see available countries, 
              then click on a country to auto-fill your regulatory submission fields.
            </div>
          </div>
        </div>
      )}

      {/* Previous Documents Section */}
      {showPreviousDocs && (
        <div className="previous-docs-section">
          <h4>Previous Regulatory Documents</h4>
          {loadingPreviousDocs ? (
            <p>Loading...</p>
          ) : fetchError ? (
            <p style={{ color: 'red' }}>{fetchError}</p>
          ) : previousDocs.length === 0 ? (
            <p>No previous regulatory documents found.</p>
          ) : (
            <div className="docs-list">
              {previousDocs.slice(0, 3).map(doc => (
                <div key={doc.id} className="doc-item">
                  <strong>{doc.title}</strong>
                  <span>{doc.disease} • {doc.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode Selection */}
      <div className="mode-selection">
        <h3>Document Generation Mode</h3>
        <div className="mode-toggle">
          <div 
            className={`mode-card ${mode === 'single' ? 'active' : ''}`}
            onClick={() => setMode('single')}
          >
            <div className="mode-icon"></div>
            <h4>Single Document</h4>
            <p>Generate one regulatory submission</p>
          </div>
          <div 
            className={`mode-card ${mode === 'batch' ? 'active' : ''}`}
            onClick={() => setMode('batch')}
          >
            <div className="mode-icon"></div>
            <h4>Batch Processing</h4>
            <p>Multiple regulatory documents</p>
          </div>
        </div>
      </div>

      {/* Single Document Mode */}
      {mode === 'single' && (
        <div className="single-mode">
          {/* Regulatory Submission Section - Moved to Top */}
          <div className="form-section">
            <h3>Regulatory Submission</h3>
            {selectedCountryData && (
              <div className="selected-country-info">
                <h4>📍 Selected: {selectedCountryData.country} ({selectedCountryData.region})</h4>
                <p>Available documents: {selectedCountryData.availableDocuments.map(doc => doc.name).join(', ')}</p>
              </div>
            )}
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Study Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={studyName}
                  onChange={(e) => setStudyName(e.target.value)}
                  placeholder="e.g., PSORA-301"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Compound Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={compoundName}
                  onChange={(e) => setCompoundName(e.target.value)}
                  placeholder="e.g., LUM-2024"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Region/Continent</label>
                <select
                  className="form-select"
                  value={selectedDropdownRegion}
                  onChange={(e) => handleDropdownRegionChange(e.target.value)}
                >
                  <option value="">Select Region</option>
                  {Object.entries(regions).map(([key, region]) => (
                    <option key={key} value={key}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDropdownRegion && (
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Country</label>
                    {intelligenceLoading && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Analyzing recommendations...
                      </span>
                    )}
                  </div>
                  <select
                    className="form-select"
                    value={country}
                    onChange={(e) => handleDropdownCountryChange(e.target.value)}
                    style={{ marginBottom: '10px' }}
                  >
                    <option value="">Select Country</option>
                    {getCountriesForRegion(selectedDropdownRegion)
                      .sort((a, b) => {
                        // Sort by recommendation score if available
                        const scoreA = countryRecommendations[a.name]?.score || 0.5;
                        const scoreB = countryRecommendations[b.name]?.score || 0.5;
                        return scoreB - scoreA;
                      })
                      .map(country => {
                        const rec = countryRecommendations[country.name];
                        const icon = rec ? countryIntelligenceService.getPriorityIcon(rec.priority) : '';
                        return (
                          <option key={country.id} value={country.name}>
                            {icon} {country.name} {rec?.score ? `(${(rec.score * 100).toFixed(0)}%)` : ''}
                          </option>
                        );
                      })}
                  </select>
                  
                </div>
              )}

              {selectedCountryData && (
                <>
                  <div className="form-group">
                    <label className="form-label">Document Type</label>
                    <select
                      className="form-select"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                    >
                      <option value="">Select Document Type</option>
                      {selectedCountryData.availableDocuments.map(doc => (
                        <option key={doc.id} value={doc.name}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Disease/Condition <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  placeholder="e.g., Psoriasis, Atopic Dermatitis"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Drug Class</label>
                <input
                  type="text"
                  className="form-input"
                  value={drugClass}
                  onChange={(e) => setDrugClass(e.target.value)}
                  placeholder="e.g., Small molecule, Biologics"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mechanism of Action</label>
                <input
                  type="text"
                  className="form-input"
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  placeholder="e.g., PDE4 inhibition, JAK-STAT pathway"
                />
              </div>
            </div>
          </div>

          {/* Trial Characteristics */}
          <div className="form-section">
            <h3>Trial Characteristics</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Trial Phase</label>
                <select
                  className="form-select"
                  value={trialPhase}
                  onChange={(e) => setTrialPhase(e.target.value)}
                >
                  <option value="">Select Phase</option>
                  {trialPhases.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trial Type</label>
                <select
                  className="form-select"
                  value={trialType}
                  onChange={(e) => setTrialType(e.target.value)}
                >
                  <option value="">Select Type</option>
                  {trialTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Blinding</label>
                <select
                  className="form-select"
                  value={blinding}
                  onChange={(e) => setBlinding(e.target.value)}
                >
                  <option value="">Select Blinding</option>
                  {blindingOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Randomization</label>
                <select
                  className="form-select"
                  value={randomization}
                  onChange={(e) => setRandomization(e.target.value)}
                >
                  <option value="">Select</option>
                  {randomizationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Population Details */}
          <div className="form-section">
            <h3>Population Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Minimum Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="e.g., 18"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="e.g., 75"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Sample Size</label>
                <input
                  type="number"
                  className="form-input"
                  value={targetSampleSize}
                  onChange={(e) => setTargetSampleSize(e.target.value)}
                  placeholder="e.g., 120"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inclusion Criteria</label>
                <textarea
                  className="form-textarea"
                  value={inclusionCriteria}
                  onChange={(e) => setInclusionCriteria(e.target.value)}
                  placeholder="e.g., Adults aged 18-75 years, Confirmed diagnosis of moderate-to-severe condition..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exclusion Criteria</label>
                <textarea
                  className="form-textarea"
                  value={exclusionCriteria}
                  onChange={(e) => setExclusionCriteria(e.target.value)}
                  placeholder="e.g., Pregnancy, Active infection, Immunocompromised state..."
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Treatment & Control */}
          <div className="form-section">
            <h3> Treatment & Control</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Drug Formulation</label>
                <select
                  className="form-select"
                  value={drugFormulation}
                  onChange={(e) => setDrugFormulation(e.target.value)}
                >
                  <option value="">Select Formulation</option>
                  {formulationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Route of Administration</label>
                <select
                  className="form-select"
                  value={routeOfAdministration}
                  onChange={(e) => setRouteOfAdministration(e.target.value)}
                >
                  <option value="">Select Route</option>
                  {routeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dosing Regimen</label>
                <input
                  type="text"
                  className="form-input"
                  value={dosingRegimen}
                  onChange={(e) => setDosingRegimen(e.target.value)}
                  placeholder="e.g., 50mg once daily for 12 weeks"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Control Group</label>
                <select
                  className="form-select"
                  value={controlGroup}
                  onChange={(e) => setControlGroup(e.target.value)}
                >
                  <option value="">Select Control</option>
                  {controlOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Endpoints & Outcomes */}
          <div className="form-section">
            <h3>Endpoints & Outcomes</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Primary Endpoint(s)</label>
                <textarea
                  className="form-textarea"
                  value={primaryEndpoints}
                  onChange={(e) => setPrimaryEndpoints(e.target.value)}
                  placeholder="e.g., Proportion of patients achieving PASI 75 at Week 16"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secondary Endpoint(s)</label>
                <textarea
                  className="form-textarea"
                  value={secondaryEndpoints}
                  onChange={(e) => setSecondaryEndpoints(e.target.value)}
                  placeholder="e.g., PASI 90 response, sPGA score, Quality of life measures"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Outcome Measure Tool</label>
                <select
                  className="form-select"
                  value={outcomeMeasureTool}
                  onChange={(e) => setOutcomeMeasureTool(e.target.value)}
                >
                  <option value="">Select Measurement Tool</option>
                  {measurementTools.map(tool => (
                    <option key={tool} value={tool}>{tool}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Statistical Considerations */}
          <div className="form-section">
            <h3>Statistical Considerations</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Statistical Power (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={statisticalPower}
                  onChange={(e) => setStatisticalPower(e.target.value)}
                  placeholder="80"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Significance Level (α)</label>
                <input
                  type="number"
                  className="form-input"
                  value={significanceLevel}
                  onChange={(e) => setSignificanceLevel(e.target.value)}
                  placeholder="0.05"
                  step="0.01"
                  min="0"
                  max="1"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="action-buttons">
            <button
              onClick={handleSingleGeneration}
              disabled={loading || !disease}
              className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
            >
              {loading ? 'Generating...' : 'Generate Regulatory Document'}
            </button>
            <button onClick={resetForm} className="btn btn-secondary">
              Reset Form
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
            {result && (
              <button
                onClick={handleSaveDocument}
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
                Save Document
              </button>
            )}
          </div>

          {/* Single Document Results - Editable Sections */}
          {result && (
          <div className="document-sections" style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            border: '2px solid #10b981', 
            borderRadius: '0',
            backgroundColor: '#f0fdf4' 
          }}>
            <div className="sections-header">
              <h3 style={{ color: '#065f46', fontSize: '1.5rem', marginBottom: '1rem' }}>
                Document Generated! Edit Sections Below:
              </h3>
              <div className="section-actions">
                <button 
                  onClick={exportToWord}
                  className="btn btn-outline"
                  disabled={Object.keys(sectionEdits).length === 0}
                >
                  Export to Word
                </button>
              </div>
            </div>

            <div className="sections-grid">
              {regulatoryDocumentSections.map(section => {
                const sectionContent = sectionEdits[section.id] || '';
                
                return (
                  <div key={section.id} className="document-section">
                    <div className="section-header">
                      <h4>{section.title}</h4>
                      <button
                        onClick={() => toggleAIForSection(section.id)}
                        style={{
                          background: aiEnabledSections.has(section.id) ? '#10b981' : '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '0',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {aiEnabledSections.has(section.id) ? '🤖 AI ON' : '🤖 AI OFF'}
                      </button>
                    </div>
                    
                    <RichTextEditor
                      value={sectionContent}
                      onChange={(content) => handleSectionEdit(section.id, content)}
                      placeholder={sectionContent ? `Edit ${section.title}...` : `Content for ${section.title} will appear here after you generate the regulatory document above...`}
                      minHeight="200px"
                      context={`regulatory document ${section.title.toLowerCase()}`}
                      aiEnabled={aiEnabledSections.has(section.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Batch Processing Mode */}
      {mode === 'batch' && (
        <div className="batch-mode">
          <div className="form-section">
            <h3>Batch Regulatory Document Processing</h3>
            
            {/* CSV Upload */}
            <div className="csv-upload-section">
              <h4>Upload Pipeline Data</h4>
              <div className="csv-guidance" style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '0', 
                marginBottom: '15px',
                border: '1px solid #dee2e6'
              }}>
                <strong>Country & Document Guidelines:</strong>
                <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                  <li>Use exact country names from the template (e.g., "United States", "European Union", "Japan")</li>
                  <li>Use exact document type names (e.g., "IND (Investigational New Drug)", "CTA (Clinical Trial Application)")</li>
                  <li>Download the template below to see all available options</li>
                  <li>The template includes a reference section with all valid country/document combinations</li>
                </ul>
              </div>
              <div className="upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-content">
                    <p>Drag & drop CSV file or click to browse</p>
                    <button type="button" className="btn btn-primary">
                      Choose File
                    </button>
                  </div>
                </div>
                
                <div className="upload-actions">
                  <button
                    onClick={generateCsvTemplate}
                    className="btn btn-outline"
                    type="button"
                  >
                    Download CSV Template
                  </button>
                  <button
                    onClick={() => setShowCountryReference(!showCountryReference)}
                    className="btn btn-outline"
                    type="button"
                  >
                    {showCountryReference ? 'Hide' : 'Show'} Available Countries
                  </button>
                </div>
              </div>
            </div>

            {/* Country Reference */}
            {showCountryReference && (
              <div className="country-reference-section" style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '0',
                marginTop: '20px',
                border: '1px solid #dee2e6'
              }}>
                <h4>Available Countries and Document Types</h4>
                <p>Copy these exact names for your CSV:</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  {Object.entries(regions).map(([regionKey, regionData]) => (
                    <div key={regionKey} style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '0',
                      border: '1px solid #e9ecef'
                    }}>
                      <h5 style={{ 
                        margin: '0 0 10px 0', 
                        color: regionData.color,
                        fontWeight: 'bold'
                      }}>
                        {regionData.name}
                      </h5>
                      {regionData.countries.map(country => (
                        <div key={country.id} style={{ marginBottom: '10px' }}>
                          <strong style={{ fontSize: '14px' }}>{country.name}</strong>
                          <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                            {country.documents.map(doc => (
                              <li key={doc.id} style={{ fontSize: '12px', color: '#6c757d' }}>
                                {doc.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSV Preview */}
            {showCsvPreview && csvPreview.length > 0 && (
              <div className="csv-preview-section">
                <h4>Pipeline Preview ({csvData.length} studies)</h4>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Study Name</th>
                        <th>Disease</th>
                        <th>Compound</th>
                        <th>Phase</th>
                        <th>Sample Size</th>
                        <th>Country</th>
                        <th>Document</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, index) => (
                        <tr key={index}>
                          <td>{row.study_name}</td>
                          <td>{row.disease_condition}</td>
                          <td>{row.compound_name}</td>
                          <td>{row.trial_phase}</td>
                          <td>{row.target_sample_size}</td>
                          <td>{row.country}</td>
                          <td>{row.document_type}</td>
                          <td>
                            <span className={`status-badge ${batchProgress[row.id]?.status || 'pending'}`}>
                              {batchProgress[row.id]?.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 5 && (
                    <p className="preview-note">Showing first 5 of {csvData.length} studies</p>
                  )}
                </div>
              </div>
            )}

            {/* Batch Progress */}
            {loading && Object.keys(batchProgress).length > 0 && (
              <div className="batch-progress-section">
                <h4>🔄 Generation Progress</h4>
                <div className="progress-list">
                  {csvData.map(row => (
                    <div key={row.id} className="progress-item">
                      <div className="progress-info">
                        <span className="study-name">{row.study_name}</span>
                        <span className={`progress-status ${batchProgress[row.id]?.status || 'pending'}`}>
                          {batchProgress[row.id]?.status || 'pending'}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${batchProgress[row.id]?.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Results */}
            {batchResults.length > 0 && (
              <div className="batch-results-section">
                <h4>Generation Results</h4>
                <div className="results-summary">
                  <span className="success-count">
                    {batchResults.filter(r => r.status === 'success').length} Successful
                  </span>
                  <span className="error-count">
                    {batchResults.filter(r => r.status === 'error').length} Failed
                  </span>
                </div>
                
                <button 
                  onClick={downloadBatchResults}
                  className="btn btn-primary"
                  disabled={batchResults.filter(r => r.status === 'success').length === 0}
                >
                  📦 Download ZIP Archive
                </button>
              </div>
            )}

            {/* Generate All Button */}
            <div className="action-buttons">
              <button
                onClick={handleBatchGeneration}
                disabled={loading || csvData.length === 0}
                className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
              >
                {loading ? 'Processing Pipeline...' : 'Generate All Documents'}
              </button>
              <button onClick={resetForm} className="btn btn-secondary">
                Reset Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error" aria-live="polite">
          {error}
        </div>
      )}

      <PreviousDocuments
        isOpen={showDocHistory}
        onClose={() => setShowDocHistory(false)}
        documentType="REGULATORY"
        onSelectDocument={(doc) => {
          if (doc.content) {
            setResult({
              cmc_section: doc.cmcSection || '',
              clinical_section: doc.clinicalSection || '',
              full_document: doc.content
            });
          }
          if (doc.disease) setDisease(doc.disease);
          if (doc.country) setCountry(doc.country);
          setShowDocHistory(false);
        }}
      />
    </div>
  );
};

export default UnifiedRegulatoryGenerator;