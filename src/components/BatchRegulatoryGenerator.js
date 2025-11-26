// src/components/BatchRegulatoryGenerator.js - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { saveDocument } from '../services/api';
import { getMyDocuments } from '../services/documentService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs'; // NEW IMPORT
import jsPDF from 'jspdf';
import DocumentViewer from './common/DocumentViewer';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import RichTextEditor from './common/RichTextEditor';

const BatchRegulatoryGenerator = () => {
  const navigate = useNavigate();
  const [showAskLumina, setShowAskLumina] = useState(false);
  const [aiEnabledFields, setAiEnabledFields] = useState(new Set());
  
  // Form data state - ENHANCED WITH ALL FIELDS
  const [formData, setFormData] = useState({
    // Basic Information
    disease_name: '',
    drug_class: '',
    mechanism: '',
    
    // Trial Characteristics
    trial_phase: '',
    trial_type: '',
    blinding: '',
    randomization: '',
    
    // Population Details
    min_age: '',
    max_age: '',
    gender: '',
    target_sample_size: '',
    inclusion_criteria: '',
    exclusion_criteria: '',
    
    // Treatment & Control
    drug_formulation: '',
    route_of_administration: '',
    dosing_regimen: '',
    control_group: '',
    
    // Endpoints & Outcomes
    primary_endpoints: '',
    secondary_endpoints: '',
    outcome_measure_tool: '',
    
    // Statistical Considerations
    statistical_power: '80',
    significance_level: '0.05'
  });

  // Selected documents for batch processing
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  
  // Batch processing state
  const [batchQueue, setBatchQueue] = useState([]);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [currentProcessing, setCurrentProcessing] = useState(null);
  const [completedDocuments, setCompletedDocuments] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchError, setBatchError] = useState('');

  // Background processing
  const { startJob, getJob } = useBackgroundJobs('batch_regulatory');
  const [backgroundJobIds, setBackgroundJobIds] = useState([]);

  // Previous regulatory documents state
  const [showPreviousDocs, setShowPreviousDocs] = useState(false);
  const [previousDocs, setPreviousDocs] = useState([]);
  const [loadingPreviousDocs, setLoadingPreviousDocs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [docsPerPage] = useState(5);
  const [fetchError, setFetchError] = useState('');

  // Document Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  // Dropdown options - ADDED FROM REGULATORY DOCUMENT GENERATOR
  const trialPhases = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];
  const trialTypes = ['Interventional', 'Observational', 'Expanded Access'];
  const blindingOptions = ['Open-label', 'Single-blind', 'Double-blind'];
  const genderOptions = ['All', 'Male', 'Female'];
  const drugFormulationOptions = ['Tablet', 'Capsule', 'Injection', 'Topical Cream', 'Topical Gel', 'Patch', 'Inhalation', 'Oral Solution'];
  const routeOptions = ['Oral', 'Intravenous (IV)', 'Subcutaneous (SC)', 'Intramuscular (IM)', 'Topical', 'Inhalation', 'Transdermal'];
  const controlGroupOptions = ['Placebo', 'Standard of Care (SoC)', 'Active Comparator', 'Historical Control', 'None'];
  const outcomeMeasureTools = [
    'PASI (Psoriasis Area and Severity Index)',
    'DLQI (Dermatology Life Quality Index)',
    'EASI (Eczema Area and Severity Index)',
    'IGA (Investigator Global Assessment)',
    'VAS (Visual Analog Scale)',
    'FVC (Forced Vital Capacity)',
    'FEV1 (Forced Expiratory Volume)',
    'HAM-D (Hamilton Depression Rating Scale)',
    'MMSE (Mini-Mental State Examination)',
    'WOMAC (Western Ontario and McMaster Universities Arthritis Index)',
    'Custom/Other'
  ];

  // Available regulatory documents by region
  const documentLibrary = {
    'North America': [
      { id: 'us_ind', name: 'IND (Investigational New Drug)', country: 'United States', region: 'North America', description: 'US FDA clinical trial authorization' },
      { id: 'us_nda', name: 'NDA (New Drug Application)', country: 'United States', region: 'North America', description: 'US FDA marketing authorization' },
      { id: 'us_bla', name: 'BLA (Biologics License Application)', country: 'United States', region: 'North America', description: 'US FDA biologics authorization' },
      { id: 'ca_cta', name: 'Clinical Trial Application (Health Canada)', country: 'Canada', region: 'North America', description: 'Canadian clinical trial authorization' },
      { id: 'ca_nds', name: 'New Drug Submission (NDS)', country: 'Canada', region: 'North America', description: 'Canadian marketing authorization' },
      { id: 'mx_cofepris_cta', name: 'COFEPRIS Clinical Trial Authorization', country: 'Mexico', region: 'North America', description: 'Mexican clinical trial approval' }
    ],
    'Europe': [
      { id: 'eu_cta', name: 'CTA (Clinical Trial Application)', country: 'European Union', region: 'Europe', description: 'EU clinical trial authorization via CTIS' },
      { id: 'eu_maa', name: 'MAA (Marketing Authorization Application)', country: 'European Union', region: 'Europe', description: 'EU marketing authorization' },
      { id: 'eu_impd', name: 'IMPD (Investigational Medicinal Product Dossier)', country: 'European Union', region: 'Europe', description: 'EU product dossier' },
      { id: 'uk_cta', name: 'Clinical Trial Authorisation (UK)', country: 'United Kingdom', region: 'Europe', description: 'MHRA clinical trial authorization' },
      { id: 'uk_ma', name: 'Marketing Authorisation (UK)', country: 'United Kingdom', region: 'Europe', description: 'MHRA marketing authorization' },
      { id: 'ch_cta', name: 'Clinical Trial Authorisation (Swissmedic)', country: 'Switzerland', region: 'Europe', description: 'Swiss clinical trial authorization' },
      { id: 'ru_cta', name: 'Clinical Trial Permit (Roszdravnadzor)', country: 'Russia', region: 'Europe', description: 'Russian clinical trial authorization' }
    ],
    'Asia Pacific': [
      { id: 'jp_ctn', name: 'Clinical Trial Notification (CTN)', country: 'Japan', region: 'Asia Pacific', description: 'PMDA clinical trial notification' },
      { id: 'jp_nda', name: 'J-NDA (New Drug Application)', country: 'Japan', region: 'Asia Pacific', description: 'Japanese marketing authorization' },
      { id: 'cn_ind', name: 'IND (China)', country: 'China', region: 'Asia Pacific', description: 'NMPA clinical trial authorization' },
      { id: 'cn_nda', name: 'NDA (China)', country: 'China', region: 'Asia Pacific', description: 'Chinese marketing authorization' },
      { id: 'kr_ind', name: 'IND (Korea)', country: 'South Korea', region: 'Asia Pacific', description: 'MFDS clinical trial authorization' },
      { id: 'au_ctn', name: 'CTN (Clinical Trial Notification)', country: 'Australia', region: 'Asia Pacific', description: 'TGA clinical trial notification' },
      { id: 'sg_ctc', name: 'Clinical Trial Certificate (HSA)', country: 'Singapore', region: 'Asia Pacific', description: 'Singapore clinical trial authorization' },
      { id: 'in_cta', name: 'Clinical Trial Permission (CDSCO)', country: 'India', region: 'Asia Pacific', description: 'Indian clinical trial authorization' }
    ],
    'Latin America': [
      { id: 'br_anvisa_cta', name: 'ANVISA Clinical Trial Authorization', country: 'Brazil', region: 'Latin America', description: 'Brazilian clinical trial authorization' },
      { id: 'br_anvisa_nda', name: 'ANVISA Registration Dossier', country: 'Brazil', region: 'Latin America', description: 'Brazilian marketing authorization' },
      { id: 'ar_anmat_cta', name: 'ANMAT Clinical Trial Authorization', country: 'Argentina', region: 'Latin America', description: 'Argentine clinical trial authorization' },
      { id: 'co_invima_cta', name: 'INVIMA Clinical Trial Permit', country: 'Colombia', region: 'Latin America', description: 'Colombian clinical trial authorization' }
    ],
    'Africa & Middle East': [
      { id: 'za_sahpra_cta', name: 'SAHPRA Clinical Trial Authorization', country: 'South Africa', region: 'Africa & Middle East', description: 'South African clinical trial authorization' },
      { id: 'il_cta', name: 'Israeli MOH Clinical Trial Permit', country: 'Israel', region: 'Africa & Middle East', description: 'Israeli clinical trial authorization' },
      { id: 'sa_sfda_cta', name: 'SFDA Clinical Trial Authorization', country: 'Saudi Arabia', region: 'Africa & Middle East', description: 'Saudi clinical trial authorization' },
      { id: 'ae_dha_cta', name: 'DHA Clinical Trial Permit', country: 'United Arab Emirates', region: 'Africa & Middle East', description: 'UAE clinical trial authorization' }
    ]
  };

  // Removed auto-population from localStorage

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle AI for specific fields
  const toggleAIForField = (fieldId) => {
    setAiEnabledFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  // Handle document selection
  const handleDocumentSelect = (document, isSelected) => {
    if (isSelected) {
      setSelectedDocuments(prev => [...prev, document]);
    } else {
      setSelectedDocuments(prev => prev.filter(doc => doc.id !== document.id));
    }
  };

  // Select all documents in a region
  const handleSelectRegion = (region) => {
    const regionDocs = documentLibrary[region];
    const newSelections = regionDocs.filter(doc => 
      !selectedDocuments.some(selected => selected.id === doc.id)
    );
    setSelectedDocuments(prev => [...prev, ...newSelections]);
  };

  // Clear all selections
  const handleClearSelections = () => {
    setSelectedDocuments([]);
  };

  // FIXED: Generate document using existing API routing
  const generateDocumentForCountry = async (document, formData) => {
    // Prepare API data using the existing routing system
    const apiData = {
      disease_name: formData.disease_name,
      additional_parameters: {
        ...formData,
        country: document.country,
        document_type: document.name
      }
    };

    // Use the existing generateIndModule function which handles all routing
    return await apiService.generateIndModule(apiData);
  };

  // Start batch processing - UPDATED FOR BACKGROUND PROCESSING
  const startBatchProcessing = async () => {
    if (selectedDocuments.length === 0) {
      // TODO: Replace with user-friendly notification system
      // alert('Please select at least one document to generate.');
      return;
    }

    if (!formData.disease_name.trim()) {
      // TODO: Replace with user-friendly notification system
      // alert('Please enter a disease/condition.');
      return;
    }

    setProcessingStatus('processing');
    setBatchProgress(0);
    setBatchError('');
    setCompletedDocuments([]);

    // Create batch queue
    const queue = selectedDocuments.map(doc => ({
      ...doc,
      status: 'pending',
      result: null,
      error: null,
      startTime: null,
      endTime: null,
    }));

    setBatchQueue(queue);

    // Start background jobs for each document
    const jobIds = [];
    
    for (let i = 0; i < queue.length; i++) {
      const document = queue[i];
      
      // Update status to processing
      setBatchQueue(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'processing', startTime: new Date() } : item
      ));

      // Start background job for this document
      const jobId = startJob('batch_regulatory', {
        document,
        formData,
        index: i,
        total: queue.length
      }, async (data) => {
        return await generateDocumentForCountry(data.document, data.formData);
      });
      
      jobIds.push(jobId);
    }
    
    setBackgroundJobIds(jobIds);
    
    // Monitor all jobs
    // The polling logic is now handled by useEffect
  };

  // Download individual document - FIXED VERSION
  const downloadDocument = (document) => {
    if (!document.result) {
      // TODO: Replace with user-friendly notification system
      // alert('No document content available to download.');
      return;
    }

    try {
      let content = '';
      let filename = `${document.name.replace(/[^a-zA-Z0-9\s]/g, '_')}_${formData.disease_name.replace(/[^a-zA-Z0-9\s]/g, '_')}.pdf`;

      // Handle different result formats
      if (document.result.document_content) {
        content = document.result.document_content;
      } else if (document.result.cmc_section && document.result.clinical_section) {
        content = `CMC SECTION:\n\n${document.result.cmc_section}\n\nCLINICAL SECTION:\n\n${document.result.clinical_section}`;
      } else if (document.result.cmc_section) {
        content = `CMC SECTION:\n\n${document.result.cmc_section}`;
      } else if (document.result.clinical_section) {
        content = `CLINICAL SECTION:\n\n${document.result.clinical_section}`;
      } else {
        content = JSON.stringify(document.result, null, 2);
      }

      // Ensure content is not empty
      if (!content || content.trim() === '') {
        // TODO: Replace with user-friendly notification system
        // alert('Document content is empty. Cannot download.');
        return;
      }

      // Generate PDF using jsPDF with multi-page support
      const doc = new jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(12);
      
      // PDF page settings
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      const lineHeight = 7;
      const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
      
      // Split content into lines that fit the page width
      const lines = doc.splitTextToSize(content, maxLineWidth);
      
      let currentLine = 0;
      
      // Add content with automatic page breaks
      for (let i = 0; i < lines.length; i++) {
        if (currentLine >= maxLinesPerPage) {
          doc.addPage();
          currentLine = 0;
        }
        
        const yPosition = margin + (currentLine * lineHeight);
        doc.text(lines[i], margin, yPosition);
        currentLine++;
      }
      
      doc.save(filename);
      
    } catch (error) {
      // TODO: Replace with user-friendly notification system
      // alert(`Download failed: ${error.message}`);
    }
  };

  // Download all completed documents - FIXED VERSION
  const downloadAllDocuments = async () => {
    const completedDocs = batchQueue.filter(doc => doc.status === 'completed' && doc.result);
    
    if (completedDocs.length === 0) {
      // TODO: Replace with user-friendly notification system
      // alert('No completed documents to download.');
      return;
    }

    try {
      // console.log(`Starting download of ${completedDocs.length} documents...`);
      
      // Download each document separately with a small delay
      for (let i = 0; i < completedDocs.length; i++) {
        const doc = completedDocs[i];
        // console.log(`Downloading document ${i + 1}/${completedDocs.length}: ${doc.name}`);
        
        downloadDocument(doc);
        
        // Small delay between downloads to prevent browser issues
        if (i < completedDocs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // TODO: Replace with user-friendly notification system
      // alert(`Successfully initiated download of ${completedDocs.length} documents.`);
      
    } catch (error) {
      // TODO: Replace with user-friendly notification system
      // alert(`Batch download failed: ${error.message}`);
    }
  };

  // Reset batch processing
  const resetBatch = () => {
    setFormData({
      // Basic Information
      disease_name: '',
      drug_class: '',
      mechanism: '',
      
      // Trial Characteristics
      trial_phase: '',
      trial_type: '',
      blinding: '',
      randomization: '',
      
      // Population Details
      min_age: '',
      max_age: '',
      gender: '',
      target_sample_size: '',
      inclusion_criteria: '',
      exclusion_criteria: '',
      
      // Treatment & Control
      drug_formulation: '',
      route_of_administration: '',
      dosing_regimen: '',
      control_group: '',
      
      // Endpoints & Outcomes
      primary_endpoints: '',
      secondary_endpoints: '',
      outcome_measure_tool: '',
      
      // Statistical Considerations
      statistical_power: '80',
      significance_level: '0.05'
    });
    setSelectedDocuments([]);
    setBatchQueue([]);
    setProcessingStatus('idle');
    setCurrentProcessing(null);
    setCompletedDocuments([]);
    setBatchProgress(0);
    setBatchError('');
  };

  // Estimate processing time
  const getEstimatedTime = () => {
    const avgTimePerDoc = 30; // seconds
    const totalTime = selectedDocuments.length * avgTimePerDoc;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    return `${minutes}m ${seconds}s`;
  };

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
        setFetchError('Error fetching previous regulatory documents. Please try again later.');
      } finally {
        setLoadingPreviousDocs(false);
      }
    }
  };

  const savedJobIds = useRef(new Set());
  const jobIdsRef = useRef([]);
  const batchQueueRef = useRef([]);

  // Update refs whenever state changes
  useEffect(() => { jobIdsRef.current = backgroundJobIds; }, [backgroundJobIds]);
  useEffect(() => { batchQueueRef.current = batchQueue; }, [batchQueue]);

  // Polling effect
  useEffect(() => {
    if (processingStatus !== 'processing') return;
    const interval = setInterval(async () => {
      const jobIds = jobIdsRef.current;
      const prevQueue = batchQueueRef.current;
      const updatedQueue = [];
      let anyChanged = false;
      // console.log('Polling batch jobs:', prevQueue, jobIds);
      for (let idx = 0; idx < prevQueue.length; idx++) {
        const item = prevQueue[idx];
        const jobId = jobIds[idx];
        const job = getJob(jobId);
        // console.log('Job status:', jobId, job && job.status);
        if (job) {
          if (job.status === 'completed') {
            if (!savedJobIds.current.has(jobId)) {
              try {
                // console.log('Attempting to save:', {
                //   country: item.country,
                //   region: item.region,
                //   jobId,
                //   data: {
                //     type: 'REGULATORY',
                //     title: `${item.name || item.documentType || 'Regulatory Document'} for ${formData.disease_name}`,
                //     disease: formData.disease_name,
                //     region: item.region || 'Unknown',
                //     country: item.country || 'Unknown',
                //     documentType: item.name || item.documentType || 'Unknown',
                //     content: job.result.document_content || `CMC SECTION:\n${job.result.cmc_section}\n\nCLINICAL SECTION:\n${job.result.clinical_section}`,
                //     cmcSection: job.result.cmc_section,
                //     clinicalSection: job.result.clinical_section,
                //   }
                // });
                await saveDocument({
                  type: 'REGULATORY',
                  title: `${item.name || item.documentType || 'Regulatory Document'} for ${formData.disease_name}`,
                  disease: formData.disease_name,
                  region: item.region || 'Unknown',
                  country: item.country || 'Unknown',
                  documentType: item.name || item.documentType || 'Unknown',
                  content: job.result.document_content || `CMC SECTION:\n${job.result.cmc_section}\n\nCLINICAL SECTION:\n${job.result.clinical_section}`,
                  cmcSection: job.result.cmc_section,
                  clinicalSection: job.result.clinical_section,
                });
                savedJobIds.current.add(jobId);
                // console.log('Saved document for country:', item.country, 'region:', item.region, 'jobId:', jobId);
              } catch (err) {
                // console.error('Failed to save document for', item.country, 'region:', item.region, 'jobId:', jobId, err);
              }
            }
            updatedQueue.push({
              ...item,
              status: 'completed',
              result: job.result,
              endTime: item.endTime || new Date(),
            });
            anyChanged = true;
          } else if (job.status === 'error') {
            updatedQueue.push({
              ...item,
              status: 'error',
              error: job.error,
              endTime: item.endTime || new Date(),
            });
            anyChanged = true;
          } else {
            updatedQueue.push(item);
          }
        } else {
          updatedQueue.push(item);
        }
      }
      if (anyChanged) setBatchQueue(updatedQueue);
      // Update progress
      const completedCount = jobIds.filter(jobId => {
        const job = getJob(jobId);
        return job && job.status === 'completed';
      }).length;
      setBatchProgress((completedCount / (jobIds.length || 1)) * 100);
      const allDone = updatedQueue.every(item => item.status === 'completed' || item.status === 'error');
      if (allDone) {
        setProcessingStatus('completed');
        setCurrentProcessing(null);
        setBackgroundJobIds([]);
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [processingStatus, formData.disease_name, getJob]);

  return (
    <div className="batch-regulatory-generator" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', position: 'relative' }}>
      {/* Ask Lumina Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Batch Regulatory Generator - Global Document Submission"
      />

      {/* Professional Ask Lumina Floating Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon="AI"
        label="Ask Lumina™"
        variant="primary"
      />

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>
              Batch Regulatory Document Generator
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
              Generate multiple regulatory documents simultaneously for global submission
            </p>

            <br />
            <button
              onClick={() => navigate('/regulatory-documents')}
              className="btn btn-secondary"
            >
              ← Back to Single Document Generator
            </button>
          </div>
          <div>
            <button
              onClick={handleShowPreviousDocs}
              className="btn btn-outline"
            >
              {showPreviousDocs ? 'Hide Previous Docs' : 'Previous Docs'}
            </button>
          </div>
        </div>
      </div>
      {showPreviousDocs && (
        <div style={{ background: '#f7fafc', border: '1px solid #000000', borderRadius: '0', padding: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Previous Regulatory Documents</h4>
          <input
            type="text"
            className="form-input"
            placeholder="Search by title, disease, or country..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ marginBottom: '0.75rem' }}
          />
          {loadingPreviousDocs ? <p>Loading...</p> : fetchError ? <p style={{ color: 'red' }}>{fetchError}</p> : (
            (() => {
              const filtered = previousDocs.filter(doc =>
                (doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 doc.disease?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 doc.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 doc.region?.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              const totalPages = Math.ceil(filtered.length / docsPerPage);
              const startIdx = (currentPage - 1) * docsPerPage;
              const paginated = filtered.slice(startIdx, startIdx + docsPerPage);
              return filtered.length === 0 ? <p>No previous regulatory documents found.</p> : (
                <>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0 }}>
                    {paginated.map(doc => (
                      <li key={doc.id} style={{ marginBottom: '0.5rem', listStyle: 'none', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                        <strong>{doc.title}</strong> <span style={{ color: '#64748b', fontSize: '0.9em' }}>{doc.disease} {doc.region && `| ${doc.region}`} {doc.country && `| ${doc.country}`}</span>
                        <button style={{ marginLeft: '1rem', padding: '2px 8px', borderRadius: '0', background: '#64748b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85em' }} onClick={() => { setViewerDoc(doc); setViewerOpen(true); }}>
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', gap: '0.5rem' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ minWidth: 60, padding: '6px 16px', borderRadius: '0', border: '1px solid #000000', background: currentPage === 1 ? '#e2e8f0' : '#4299e1', color: currentPage === 1 ? '#a0aec0' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '1rem' }}>Previous</button>
                    <span style={{ alignSelf: 'center', fontWeight: 500, fontSize: '1rem', color: '#1e293b' }}>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ minWidth: 60, padding: '6px 16px', borderRadius: '0', border: '1px solid #000000', background: currentPage === totalPages ? '#e2e8f0' : '#4299e1', color: currentPage === totalPages ? '#a0aec0' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '1rem' }}>Next</button>
                  </div>
                </>
              );
            })()
          )}
          <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} title={viewerDoc?.title} content={viewerDoc?.content} metadata={{ disease: viewerDoc?.disease, country: viewerDoc?.country, documentType: viewerDoc?.documentType }} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Form and Document Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left Panel: Enhanced Form */}
          <div style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: '1rem' }}>
            {/* Basic Information Form - ENHANCED WITH ALL FIELDS */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Basic Information
              </h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  Disease/Condition *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.disease_name}
                  onChange={(e) => handleInputChange('disease_name', e.target.value)}
                  placeholder="e.g., Psoriasis, Atopic Dermatitis"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Drug Class
                  </label>
                  <input
                    type="text"
                    value={formData.drug_class}
                    onChange={(e) => handleInputChange('drug_class', e.target.value)}
                    placeholder="e.g., Small molecule, Biologics"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Mechanism of Action
                  </label>
                  <input
                    type="text"
                    value={formData.mechanism}
                    onChange={(e) => handleInputChange('mechanism', e.target.value)}
                    placeholder="e.g., PDE4 inhibition, JAK-STAT pathway"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Trial Characteristics Section */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Trial Characteristics
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Trial Phase
                  </label>
                  <select
                    value={formData.trial_phase}
                    onChange={(e) => handleInputChange('trial_phase', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Phase</option>
                    {trialPhases.map(phase => (
                      <option key={phase} value={phase}>{phase}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Trial Type
                  </label>
                  <select
                    value={formData.trial_type}
                    onChange={(e) => handleInputChange('trial_type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Type</option>
                    {trialTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Blinding
                  </label>
                  <select
                    value={formData.blinding}
                    onChange={(e) => handleInputChange('blinding', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Blinding</option>
                    {blindingOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Randomization
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="randomization"
                        value="Yes"
                        checked={formData.randomization === 'Yes'}
                        onChange={(e) => handleInputChange('randomization', e.target.value)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="randomization"
                        value="No"
                        checked={formData.randomization === 'No'}
                        onChange={(e) => handleInputChange('randomization', e.target.value)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Population Details Section */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Population Details
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Minimum Age
                  </label>
                  <input
                    type="number"
                    value={formData.min_age}
                    onChange={(e) => handleInputChange('min_age', e.target.value)}
                    placeholder="e.g., 18"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Maximum Age
                  </label>
                  <input
                    type="number"
                    value={formData.max_age}
                    onChange={(e) => handleInputChange('max_age', e.target.value)}
                    placeholder="e.g., 75"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Gender</option>
                    {genderOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Target Sample Size
                  </label>
                  <input
                    type="number"
                    value={formData.target_sample_size}
                    onChange={(e) => handleInputChange('target_sample_size', e.target.value)}
                    placeholder="e.g., 120"
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: '500', color: '#374151' }}>
                      Inclusion Criteria
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleAIForField('inclusion_criteria')}
                      style={{
                        background: aiEnabledFields.has('inclusion_criteria') ? '#10b981' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '0',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {aiEnabledFields.has('inclusion_criteria') ? 'AI ON' : 'AI OFF'}
                    </button>
                  </div>
                  <RichTextEditor
                    value={formData.inclusion_criteria}
                    onChange={(content) => handleInputChange('inclusion_criteria', content)}
                    placeholder="e.g., Adults aged 18-75 years, Confirmed diagnosis of moderate-to-severe condition..."
                    style={{ minHeight: '120px' }}
                    aiEnabled={aiEnabledFields.has('inclusion_criteria')}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: '500', color: '#374151' }}>
                      Exclusion Criteria
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleAIForField('exclusion_criteria')}
                      style={{
                        background: aiEnabledFields.has('exclusion_criteria') ? '#10b981' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '0',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {aiEnabledFields.has('exclusion_criteria') ? 'AI ON' : 'AI OFF'}
                    </button>
                  </div>
                  <RichTextEditor
                    value={formData.exclusion_criteria}
                    onChange={(content) => handleInputChange('exclusion_criteria', content)}
                    placeholder="e.g., Pregnancy, Active infection, Immunocompromised state..."
                    style={{ minHeight: '120px' }}
                    aiEnabled={aiEnabledFields.has('exclusion_criteria')}
                  />
                </div>
              </div>
            </div>

            {/* Treatment & Control Section */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Treatment & Control
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Drug Formulation
                  </label>
                  <select
                    value={formData.drug_formulation}
                    onChange={(e) => handleInputChange('drug_formulation', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Formulation</option>
                    {drugFormulationOptions.map(formulation => (
                      <option key={formulation} value={formulation}>{formulation}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Route of Administration
                  </label>
                  <select
                    value={formData.route_of_administration}
                    onChange={(e) => handleInputChange('route_of_administration', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Route</option>
                    {routeOptions.map(route => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Dosing Regimen
                  </label>
                  <input
                    type="text"
                    value={formData.dosing_regimen}
                    onChange={(e) => handleInputChange('dosing_regimen', e.target.value)}
                    placeholder="e.g., 50mg once daily for 12 weeks"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Control Group
                  </label>
                  <select
                    value={formData.control_group}
                    onChange={(e) => handleInputChange('control_group', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  >
                    <option value="">Select Control</option>
                    {controlGroupOptions.map(control => (
                      <option key={control} value={control}>{control}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Endpoints & Outcomes Section */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Endpoints & Outcomes
              </h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '500', color: '#374151' }}>
                    Primary Endpoint(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleAIForField('primary_endpoints')}
                    style={{
                      background: aiEnabledFields.has('primary_endpoints') ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '0',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    {aiEnabledFields.has('primary_endpoints') ? 'AI ON' : 'AI OFF'}
                  </button>
                </div>
                <RichTextEditor
                  value={formData.primary_endpoints}
                  onChange={(content) => handleInputChange('primary_endpoints', content)}
                  placeholder="e.g., Proportion of patients achieving PASI 75 at Week 16"
                  style={{ minHeight: '100px' }}
                  aiEnabled={aiEnabledFields.has('primary_endpoints')}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '500', color: '#374151' }}>
                    Secondary Endpoint(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleAIForField('secondary_endpoints')}
                    style={{
                      background: aiEnabledFields.has('secondary_endpoints') ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '0',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    {aiEnabledFields.has('secondary_endpoints') ? 'AI ON' : 'AI OFF'}
                  </button>
                </div>
                <RichTextEditor
                  value={formData.secondary_endpoints}
                  onChange={(content) => handleInputChange('secondary_endpoints', content)}
                  placeholder="e.g., PASI 90 response, sPGA score, Quality of life measures"
                  style={{ minHeight: '100px' }}
                  aiEnabled={aiEnabledFields.has('secondary_endpoints')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                  Outcome Measure Tool
                </label>
                <select
                  value={formData.outcome_measure_tool}
                  onChange={(e) => handleInputChange('outcome_measure_tool', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0'
                  }}
                >
                  <option value="">Select Measurement Tool</option>
                  {outcomeMeasureTools.map(tool => (
                    <option key={tool} value={tool}>{tool}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statistical Considerations Section */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Statistical Considerations
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Statistical Power (%)
                  </label>
                  <input
                    type="number"
                    value={formData.statistical_power}
                    onChange={(e) => handleInputChange('statistical_power', e.target.value)}
                    placeholder="80"
                    min="1"
                    max="99"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Significance Level (α)
                  </label>
                  <input
                    type="number"
                    value={formData.significance_level}
                    onChange={(e) => handleInputChange('significance_level', e.target.value)}
                    placeholder="0.05"
                    step="0.01"
                    min="0.01"
                    max="0.2"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* REMOVE: Document Selection from left panel */}
            {/* Document Selection */}
            {/* Right Panel: Document Selection and Processing */}
          </div>

          {/* Right Panel: Document Selection and Processing */}
          <div>
            {/* Document Selection */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
                  Select Documents ({selectedDocuments.length} selected)
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleClearSelections}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--color-error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {Object.entries(documentLibrary).map(([region, documents]) => (
                <div key={region} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    <h3 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      margin: 0,
                      color: '#374151'
                    }}>
                      {region}
                    </h3>
                    <button
                      onClick={() => handleSelectRegion(region)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Select All
                    </button>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gap: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0'
                  }}>
                    {documents.map((doc) => {
                      const isSelected = selectedDocuments.some(selected => selected.id === doc.id);
                      return (
                        <label
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem',
                            backgroundColor: isSelected ? '#dbeafe' : 'white',
                            borderRadius: '0',
                            border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleDocumentSelect(doc, e.target.checked)}
                            style={{ marginRight: '0.75rem' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500', color: '#1f2937' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {doc.country} • {doc.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Processing Controls */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '0', 
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Batch Processing
              </h2>

              {selectedDocuments.length > 0 && (
                <div style={{ 
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '0',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                    <strong>Selected:</strong> {selectedDocuments.length} documents<br />
                    <strong>Estimated time:</strong> {getEstimatedTime()}<br />
                    <strong>Countries:</strong> {[...new Set(selectedDocuments.map(doc => doc.country))].join(', ')}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  onClick={startBatchProcessing}
                  disabled={processingStatus === 'processing' || selectedDocuments.length === 0 || !formData.disease_name.trim()}
                  className={`btn btn-success btn-lg ${processingStatus === 'processing' ? 'btn-loading' : ''}`}
                  style={{ flex: 1 }}
                >
                  {processingStatus === 'processing' ? 'Processing...' : `Generate ${selectedDocuments.length} Documents`}
                </button>

                {(processingStatus === 'completed' || batchQueue.length > 0) && (
                  <button
                    onClick={resetBatch}
                    className="btn btn-secondary"
                  >
                    Reset
                  </button>
                )}
              </div>

              {processingStatus === 'processing' && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    width: '100%', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '0', 
                    overflow: 'hidden',
                    marginBottom: '0.5rem'
                  }}>
                    <div 
                      style={{ 
                        width: `${batchProgress}%`, 
                        height: '20px', 
                        backgroundColor: 'var(--color-primary)', 
                        transition: 'width 0.3s ease' 
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
                    {batchProgress.toFixed(0)}% Complete
                    {currentProcessing && (
                      <span> • Processing: {currentProcessing.name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Results Panel */}
            {batchQueue.length > 0 && (
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0', 
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
                    Processing Results
                  </h2>
                  {completedDocuments.length > 0 && (
                    <button
                      onClick={downloadAllDocuments}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-success)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Download All ({completedDocuments.length})
                    </button>
                  )}
                </div>

                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto'
                }}>
                  {batchQueue.map((doc, index) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '1rem',
                        borderBottom: index < batchQueue.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: doc.status === 'processing' ? '#fef3c7' : 
                                      doc.status === 'completed' ? '#f0fdf4' : 
                                      doc.status === 'error' ? '#fef2f2' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#1f2937' }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {doc.country}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: doc.status === 'pending' ? '#f3f4f6' :
                                           doc.status === 'processing' ? '#fbbf24' :
                                           doc.status === 'completed' ? '#10b981' :
                                           doc.status === 'error' ? '#ef4444' : '#9ca3af',
                            color: doc.status === 'pending' ? '#374151' : 'white'
                          }}>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </span>
                          
                          {doc.status === 'completed' && (
                            <button
                              onClick={() => downloadDocument(doc)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              ⬇ Download
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {doc.error && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '0',
                          fontSize: '0.75rem',
                          color: '#dc2626'
                        }}>
                          Error: {doc.error}
                        </div>
                      )}
                      
                      {doc.endTime && doc.startTime && (
                        <div style={{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          Processing time: {Math.round((doc.endTime - doc.startTime) / 1000)}s
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary Statistics */}
                {processingStatus === 'completed' && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                        {batchQueue.length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                        {batchQueue.filter(doc => doc.status === 'completed').length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>✓</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {batchQueue.filter(doc => doc.status === 'error').length}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>✕</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {batchQueue.filter(doc => doc.endTime && doc.startTime)
                          .reduce((sum, doc) => sum + Math.round((doc.endTime - doc.startTime) / 1000), 0)}s
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Time</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchRegulatoryGenerator;