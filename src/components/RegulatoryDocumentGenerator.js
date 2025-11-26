// src/components/RegulatoryDocumentGenerator.js
// Main Document Generation Form and Logic

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { saveDocument } from '../services/api';
import { getMyDocuments } from '../services/documentService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs'; // NEW IMPORT
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import DocumentViewer from './common/DocumentViewer';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import RichTextEditor from './common/RichTextEditor';

const RegulatoryDocumentGenerator = () => {
  // Basic Information
  const [disease, setDisease] = useState('');
  const [drugClass, setDrugClass] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [country, setCountry] = useState('');
  const [documentType, setDocumentType] = useState('');

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

  // UI State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cmc');
  const [selectedCountryData, setSelectedCountryData] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAskLumina, setShowAskLumina] = useState(false);
  const [showPreviousDocuments, setShowPreviousDocuments] = useState(false);
  const [previousDocuments, setPreviousDocuments] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [documentsPerPage] = useState(5);
  const [fetchError, setFetchError] = useState('');
  
  // Individual section editing state
  const [sectionEdits, setSectionEdits] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [aiEnabledSections, setAiEnabledSections] = useState(new Set());
  
  // Reference Document Panel State
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [selectedReferenceDocument, setSelectedReferenceDocument] = useState(null);
  const [referenceDocumentTOC, setReferenceDocumentTOC] = useState([]);
  const [selectedReferenceSection, setSelectedReferenceSection] = useState(null);
  const [selectedReferenceSectionContent, setSelectedReferenceSectionContent] = useState('');
  
  // Section Selection and Editing State
  const [selectedDocumentSections, setSelectedDocumentSections] = useState(new Set());
  const [editableSelectedContent, setEditableSelectedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Background processing
  const { startJob, getJob } = useBackgroundJobs('regulatory_document');
  const [backgroundJobId, setBackgroundJobId] = useState(null);
  
  // For navigation
  const location = useLocation();
  const navigate = useNavigate();
  
  // Dropdown Options
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

  // Regulatory document sections for navigation
  const regulatoryDocumentSections = [
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

  // Load parameters from navigation state
  useEffect(() => {
    // Check for navigation state from map selection
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
        
        // Pre-select the first available document type
        if (selectedDocuments && selectedDocuments.length > 0) {
          setDocumentType(selectedDocuments[0].name);
        }
      }
    }
    
    // Removed auto-population from localStorage
  }, [location.state, disease]);

  // Navigate back to map selection
  const handleBackToMap = () => {
    navigate('/regulatory-documents');
  };

  // Helper Functions for Document Management
  const fetchPreviousDocuments = async () => {
    if (!showPreviousDocuments && previousDocuments.length === 0) {
      setLoadingPrevious(true);
      try {
        const result = await getMyDocuments('REGULATORY');
        if (result.success) {
          setPreviousDocuments(result.data || []);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error fetching previous documents:', error);
        setFetchError('Failed to load previous documents');
      } finally {
        setLoadingPrevious(false);
      }
    }
    setShowPreviousDocuments(!showPreviousDocuments);
  };

  const handleDocumentView = (doc) => {
    setViewerDoc(doc);
    setViewerOpen(true);
  };

  const handleSelectReference = (doc) => {
    setSelectedReferenceDocument(doc);
    if (doc && doc.content) {
      try {
        const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
        setReferenceDocumentTOC(regulatoryDocumentSections);
      } catch (error) {
        console.error('Error parsing reference document:', error);
        setReferenceDocumentTOC([]);
      }
    }
  };

  const handleReferenceClose = () => {
    setSelectedReferenceDocument(null);
    setReferenceDocumentTOC([]);
    setSelectedReferenceSection(null);
    setSelectedReferenceSectionContent('');
    setShowReferencePanel(false);
  };

  const handleReferenceSectionClick = (section) => {
    setSelectedReferenceSection(section);
    if (selectedReferenceDocument && selectedReferenceDocument.content) {
      try {
        const content = typeof selectedReferenceDocument.content === 'string' 
          ? JSON.parse(selectedReferenceDocument.content) 
          : selectedReferenceDocument.content;
        
        const sectionContent = content[section.id] || `Content for ${section.title}`;
        setSelectedReferenceSectionContent(sectionContent);
      } catch (error) {
        console.error('Error getting reference section content:', error);
        setSelectedReferenceSectionContent(`Content for ${section.title}`);
      }
    }
  };

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
      a.download = `regulatory-document-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Error exporting to Word: ' + error.message);
    }
  };
  
  // Main form submit handler - UPDATED FOR BACKGROUND PROCESSING
  const handleSubmit = async () => {
    setError('');
    setResult(null);

    try {
      // Compile all enhanced form data
      const enhancedFormData = {
        disease_name: disease.trim(),
        additional_parameters: {
          // Basic parameters
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
          inclusion_criteria: inclusionCriteria || undefined,
          exclusion_criteria: exclusionCriteria || undefined,
          
          // Treatment & Control
          drug_formulation: drugFormulation || undefined,
          route_of_administration: routeOfAdministration || undefined,
          dosing_regimen: dosingRegimen || undefined,
          control_group: controlGroup || undefined,
          
          // Endpoints & Outcomes
          primary_endpoints: primaryEndpoints || undefined,
          secondary_endpoints: secondaryEndpoints || undefined,
          outcome_measure_tool: outcomeMeasureTool || undefined,
          
          // Statistical Considerations
          statistical_power: statisticalPower || undefined,
          significance_level: significanceLevel || undefined
        }
      };
      
      if (!disease || disease.trim() === '') {
        throw new Error('Disease/Condition is required');
      }

      // Start background job instead of blocking UI
      const jobId = startJob('regulatory_document', enhancedFormData, apiService.generateIndModule);
      setBackgroundJobId(jobId);
      
      // Show loading state
      setLoading(true);
      
      // Monitor job progress with timeout
      let checkAttempts = 0;
      const maxAttempts = 300; // 5 minutes max (300 * 1000ms)
      
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
            
            // Process the result
            const response = job.result;
            
            // Check structure of response to handle both response formats
            if (response.document_content) {
              // For document types that return a single content field
              const content = response.document_content;
              let cmcSection = "";
              let clinicalSection = "";
              
              // Try to find a logical dividing point based on section headers
              const possibleDividers = [
                "CLINICAL OVERVIEW", "CLINICAL SECTION", "CLINICAL STUDY", 
                "NONCLINICAL OVERVIEW", "3. NONCLINICAL", "4. CLINICAL", 
                "CLINICAL TRIAL", "EFFICACY AND SAFETY"
              ];
              
              let dividerIndex = -1;
              
              // Find the earliest occurrence of any divider
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
                // If no clear divider, split roughly in half
                const midPoint = Math.floor(content.length / 2);
                cmcSection = content.substring(0, midPoint).trim();
                clinicalSection = content.substring(midPoint).trim();
              }
              
              setResult({
                cmc_section: cmcSection,
                clinical_section: clinicalSection,
                document_content: content
              });

              // Populate section edits for the main page display
              const newSectionEdits = { ...sectionEdits };
              newSectionEdits['regulatory-section-1'] = cmcSection;
              newSectionEdits['regulatory-section-4'] = clinicalSection;
              
              // Distribute content to other sections if available
              const sections = content.split(/(?=\d+\.\s|\n#{1,3}\s)/);
              if (sections.length > 2) {
                sections.forEach((section, index) => {
                  if (section.trim() && index < regulatoryDocumentSections.length) {
                    const sectionId = regulatoryDocumentSections[index].id;
                    if (!newSectionEdits[sectionId]) {
                      newSectionEdits[sectionId] = section.trim();
                    }
                  }
                });
              }
              
              setSectionEdits(newSectionEdits);
              // Save regulatory document to backend (with authentication)
              try {
                await saveDocument({
                  type: 'REGULATORY',
                  title: `${documentType} for ${disease}`,
                  disease,
                  country,
                  documentType,
                  cmcSection: cmcSection,
                  clinicalSection: clinicalSection,
                  content,
                });
                console.log('Document saved to backend successfully');
              } catch (saveError) {
                if (saveError.response?.status === 413) {
                  console.warn('Document too large to save to backend (413 error). Document generated successfully but not saved.');
                  // Don't set error since generation was successful
                } else {
                  console.warn('Failed to save document to backend:', saveError);
                }
                // Continue with UI update even if save fails
              }
            } else if (response.cmc_section && response.clinical_section) {
              // For document types that return separate CMC and clinical sections
              setResult(response);
              
              // Populate section edits for the main page display
              const newSectionEdits = { ...sectionEdits };
              newSectionEdits['regulatory-section-1'] = response.cmc_section;
              newSectionEdits['regulatory-section-4'] = response.clinical_section;
              setSectionEdits(newSectionEdits);
              // Save regulatory document to backend (with authentication)
              try {
                await saveDocument({
                  type: 'REGULATORY',
                  title: `${documentType} for ${disease}`,
                  disease,
                  country,
                  documentType,
                  cmcSection: response.cmc_section,
                  clinicalSection: response.clinical_section,
                  content: response.document_content || `CMC SECTION:\n${response.cmc_section}\n\nCLINICAL SECTION:\n${response.clinical_section}`,
                });
                console.log('Document saved to backend successfully');
              } catch (saveError) {
                if (saveError.response?.status === 413) {
                  console.warn('Document too large to save to backend (413 error). Document generated successfully but not saved.');
                  // Don't set error since generation was successful
                } else {
                  console.warn('Failed to save document to backend:', saveError);
                }
                // Continue with UI update even if save fails
              }
            } else {
              // Fallback: treat the entire response as clinical section
              const fallbackContent = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
              setResult({
                cmc_section: "",
                clinical_section: fallbackContent,
                document_content: fallbackContent
              });
              // Save regulatory document to backend (with authentication)
              try {
                await saveDocument({
                  type: 'REGULATORY',
                  title: `${documentType} for ${disease}`,
                  disease,
                  country,
                  documentType,
                  cmcSection: "",
                  clinicalSection: fallbackContent,
                  content: fallbackContent,
                });
                console.log('Document saved to backend successfully');
              } catch (saveError) {
                if (saveError.response?.status === 413) {
                  console.warn('Document too large to save to backend (413 error). Document generated successfully but not saved.');
                  // Don't set error since generation was successful
                } else {
                  console.warn('Failed to save document to backend:', saveError);
                }
                // Continue with UI update even if save fails
              }
            }
            
            // Automatically scroll to results
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
            // Job still running, check again in 1 second
            setTimeout(() => checkJobStatus(), 1000);
          }
        } else {
          // Job not found - might have been lost, show warning
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
      
      // Start monitoring
      checkJobStatus();
      
    } catch (err) {
      console.error('Regulatory document generation error:', {
        error: err,
        message: err.message,
        stack: err.stack,
        formData: { disease, documentType, country }
      });
      setError(`Failed to start document generation: ${err.message || 'Unknown error occurred. Please check the console for details.'}`);
      setLoading(false);
      setBackgroundJobId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setDisease('');
    setDrugClass('');
    setMechanism('');
    setDocumentType('');
    
    // Reset all fields
    setTrialPhase('');
    setTrialType('');
    setBlinding('');
    setRandomization('');
    setMinAge('');
    setMaxAge('');
    setGender('');
    setTargetSampleSize('');
    setInclusionCriteria('');
    setExclusionCriteria('');
    setDrugFormulation('');
    setRouteOfAdministration('');
    setDosingRegimen('');
    setControlGroup('');
    setPrimaryEndpoints('');
    setSecondaryEndpoints('');
    setOutcomeMeasureTool('');
    setStatisticalPower('80');
    setSignificanceLevel('0.05');
    
    setResult(null);
    setError('');
  };

  // Improved content rendering
  const renderContent = (content) => {
    if (!content) return <p>No content available.</p>;
    
    const paragraphs = content.split('\n');
    
    return (
      <div className="content-text">
        {paragraphs.map((para, idx) => (
          para.trim() ? 
            <p key={idx} className="content-paragraph">{para}</p> : 
            <br key={idx} />
        ))}
      </div>
    );
  };

  // Duplicate state variables removed - using the ones defined above

  return (
    <div className="regulatory-document-generator">
      {/* AI Assistant Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        context="regulatory document generation"
      />
      
      {/* Floating AI Assistant Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon=""
        tooltip="Ask Lumina AI for help"
      />

      {/* Document Viewer Modal */}
      {viewerOpen && viewerDoc && (
        <DocumentViewer
          document={viewerDoc}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Header with Back Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Enhanced Regulatory Document Generator</h2>
          <p>Generate comprehensive regulatory documentation with detailed trial design parameters</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowReferencePanel(!showReferencePanel)}
            className="btn"
            style={{
              background: showReferencePanel ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '0',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showReferencePanel ? 'Close' : 'Reference'} 
            {showReferencePanel ? 'Close Reference' : 'Open Reference Document'}
          </button>
          <button onClick={fetchPreviousDocuments} className="btn btn-outline">
            {showPreviousDocuments ? 'Hide Previous Docs' : 'Previous Docs'}
          </button>
        </div>
      </div>
      {showPreviousDocuments && (
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
          {loadingPrevious ? <p>Loading...</p> : fetchError ? <p style={{ color: 'red' }}>{fetchError}</p> : (
            (() => {
              const filtered = previousDocuments.filter(doc =>
                doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.disease?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.country?.toLowerCase().includes(searchTerm.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / documentsPerPage);
              const startIdx = (currentPage - 1) * documentsPerPage;
              const paginated = filtered.slice(startIdx, startIdx + documentsPerPage);
              return filtered.length === 0 ? <p>No previous regulatory documents found.</p> : (
                <>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0 }}>
                    {paginated.map(doc => (
                      <li key={doc.id} style={{ marginBottom: '0.5rem', listStyle: 'none', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                        <strong>{doc.title}</strong> <span style={{ color: '#64748b', fontSize: '0.9em' }}>{doc.disease} {doc.country && `| ${doc.country}`}</span>
                        <button style={{ marginLeft: '1rem', padding: '2px 8px', borderRadius: '0', background: '#64748b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85em' }} onClick={() => { setViewerDoc(doc); setViewerOpen(true); }}>
                          View
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
          <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} title={viewerDoc?.title} content={viewerDoc?.content} metadata={{ disease: viewerDoc?.disease, country: viewerDoc?.country, documentType: viewerDoc?.documentType }} />
        </div>
      )}

      {/* Selected Country Info with Available Documents */}
      {selectedCountryData && (
        <div style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #9ae6b4',
          borderRadius: '0',
          padding: '20px',
          marginBottom: '25px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#276749', fontSize: '1.25rem', fontWeight: '600' }}>
            📍 Selected: {selectedCountryData.country} ({selectedCountryData.region})
          </h3>
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#22543d', fontSize: '1.1rem', fontWeight: '500' }}>
              Available Documents:
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {selectedCountryData.availableDocuments.map((doc, index) => (
                <div key={doc.id || index} style={{
                  backgroundColor: 'white',
                  border: '1px solid #9ae6b4',
                  borderRadius: '0',
                  padding: '12px 15px',
                  cursor: documentType === doc.name ? 'default' : 'pointer',
                  backgroundColor: documentType === doc.name ? '#c6f6d5' : 'white',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setDocumentType(doc.name)}
                onMouseEnter={(e) => {
                  if (documentType !== doc.name) {
                    e.currentTarget.style.backgroundColor = '#f0fff4';
                    e.currentTarget.style.borderColor = '#68d391';
                  }
                }}
                onMouseLeave={(e) => {
                  if (documentType !== doc.name) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#9ae6b4';
                  }
                }}
                >
                  <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                    {doc.purpose}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      {showHelp && (
        <div className="info-box mb-4">
          <h4>Additional Regulatory Fields You Can Consider Adding:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <h5>Advanced Regulatory Strategy:</h5>
              <ul style={{ fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
                <li>Fast Track designation eligibility</li>
                <li>Breakthrough therapy designation</li>
                <li>Orphan drug designation</li>
                <li>Priority review qualifications</li>
                <li>Pediatric investigation plan (PIP)</li>
              </ul>
            </div>
            <div>
              <h5>Manufacturing & Quality:</h5>
              <ul style={{ fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
                <li>Manufacturing site locations</li>
                <li>GMP certification status</li>
                <li>Release testing specifications</li>
                <li>Stability study designs</li>
                <li>Comparability protocols</li>
              </ul>
            </div>
            <div>
              <h5>Risk Management:</h5>
              <ul style={{ fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
                <li>Risk evaluation strategies (REMS)</li>
                <li>Pharmacovigilance plans</li>
                <li>Safety data collection methods</li>
                <li>Benefit-risk assessment frameworks</li>
                <li>Post-marketing commitments</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Reference Panel */}
      <div style={{ 
        display: 'flex', 
        gap: '20px',
        flex: showReferencePanel ? '1' : '1',
        minWidth: showReferencePanel ? '50%' : '100%'
      }}>
        {/* Left Panel - Main Form */}
        <div style={{ 
          flex: showReferencePanel ? '1' : '1',
          minWidth: showReferencePanel ? '50%' : '100%'
        }}>
          <div className="regulatory-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="disease" className="form-label">Disease/Condition <span className="required">*</span></label>
              <input
                id="disease"
                type="text"
                className="form-input"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="e.g., Psoriasis, Eczema, Atopic Dermatitis"
                required
              />
            </div>

            {/* Document Type Selection */}
            {selectedCountryData && (
              <div className="form-group">
                <label htmlFor="documentType" className="form-label">Document Type <span className="required">*</span></label>
                <select
                  id="documentType"
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
                <div className="form-help">
                  {selectedCountryData.availableDocuments.find(doc => doc.name === documentType)?.purpose}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="drug-class" className="form-label">Drug Class</label>
              <input
                id="drug-class"
                type="text"
                className="form-input"
                value={drugClass}
                onChange={(e) => setDrugClass(e.target.value)}
                placeholder="e.g., Corticosteroid, Biologics, Small molecule"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mechanism">Mechanism of Action</label>
              <input
                id="mechanism"
                type="text"
                value={mechanism}
                onChange={(e) => setMechanism(e.target.value)}
                placeholder="e.g., PDE4 inhibition, JAK-STAT pathway"
              />
            </div>
          </div>
        </div>

        {/* Trial Characteristics Section */}
        <div className="form-section">
          <h3>Trial Characteristics</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="trialPhase">Trial Phase</label>
              <select
                id="trialPhase"
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
              <label htmlFor="trialType">Trial Type</label>
              <select
                id="trialType"
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
              <label htmlFor="blinding">Blinding</label>
              <select
                id="blinding"
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
              <label>Randomization</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="randomization"
                    value="Yes"
                    checked={randomization === 'Yes'}
                    onChange={(e) => setRandomization(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="randomization"
                    value="No"
                    checked={randomization === 'No'}
                    onChange={(e) => setRandomization(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  No
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Population Details Section */}
        <div className="form-section">
          <h3>Population Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="minAge">Minimum Age</label>
              <input
                id="minAge"
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="e.g., 18"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxAge">Maximum Age</label>
              <input
                id="maxAge"
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="e.g., 75"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
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
              <label htmlFor="targetSampleSize">Target Sample Size</label>
              <input
                id="targetSampleSize"
                type="number"
                value={targetSampleSize}
                onChange={(e) => setTargetSampleSize(e.target.value)}
                placeholder="e.g., 120"
                min="1"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="inclusionCriteria">Inclusion Criteria</label>
                <button
                  type="button"
                  onClick={() => toggleAIForSection('inclusion-criteria')}
                  style={{
                    background: aiEnabledSections.has('inclusion-criteria') ? '#10b981' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '0',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {aiEnabledSections.has('inclusion-criteria') ? 'AI ON' : 'AI OFF'}
                </button>
              </div>
              <RichTextEditor
                value={sectionEdits['inclusion-criteria'] || inclusionCriteria}
                onChange={(content) => {
                  handleSectionEdit('inclusion-criteria', content);
                  setInclusionCriteria(content);
                }}
                placeholder="e.g., Adults aged 18-75 years, Confirmed diagnosis of moderate-to-severe condition..."
                minHeight="120px"
                context="inclusion criteria for regulatory study"
                aiEnabled={aiEnabledSections.has('inclusion-criteria')}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="exclusionCriteria">Exclusion Criteria</label>
                <button
                  type="button"
                  onClick={() => toggleAIForSection('exclusion-criteria')}
                  style={{
                    background: aiEnabledSections.has('exclusion-criteria') ? '#10b981' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '0',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {aiEnabledSections.has('exclusion-criteria') ? 'AI ON' : 'AI OFF'}
                </button>
              </div>
              <RichTextEditor
                value={sectionEdits['exclusion-criteria'] || exclusionCriteria}
                onChange={(content) => {
                  handleSectionEdit('exclusion-criteria', content);
                  setExclusionCriteria(content);
                }}
                placeholder="e.g., Pregnancy, Active infection, Immunocompromised state..."
                minHeight="120px"
                context="exclusion criteria for regulatory study"
                aiEnabled={aiEnabledSections.has('exclusion-criteria')}
              />
            </div>
          </div>
        </div>

        {/* Treatment & Control Section */}
        <div className="form-section">
          <h3>Treatment & Control</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="drugFormulation">Drug Formulation</label>
              <select
                id="drugFormulation"
                value={drugFormulation}
                onChange={(e) => setDrugFormulation(e.target.value)}
              >
                <option value="">Select Formulation</option>
                {drugFormulationOptions.map(formulation => (
                  <option key={formulation} value={formulation}>{formulation}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="routeOfAdministration">Route of Administration</label>
              <select
                id="routeOfAdministration"
                value={routeOfAdministration}
                onChange={(e) => setRouteOfAdministration(e.target.value)}
              >
                <option value="">Select Route</option>
                {routeOptions.map(route => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dosingRegimen">Dosing Regimen</label>
              <input
                id="dosingRegimen"
                type="text"
                value={dosingRegimen}
                onChange={(e) => setDosingRegimen(e.target.value)}
                placeholder="e.g., 50mg once daily for 12 weeks"
              />
            </div>

            <div className="form-group">
              <label htmlFor="controlGroup">Control Group</label>
              <select
                id="controlGroup"
                value={controlGroup}
                onChange={(e) => setControlGroup(e.target.value)}
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
        <div className="form-section">
          <h3>Endpoints & Outcomes</h3>
          <div className="form-grid">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="primaryEndpoints">Primary Endpoint(s)</label>
                <button
                  type="button"
                  onClick={() => toggleAIForSection('primary-endpoints')}
                  style={{
                    background: aiEnabledSections.has('primary-endpoints') ? '#10b981' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '0',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {aiEnabledSections.has('primary-endpoints') ? 'AI ON' : 'AI OFF'}
                </button>
              </div>
              <RichTextEditor
                value={sectionEdits['primary-endpoints'] || primaryEndpoints}
                onChange={(content) => {
                  handleSectionEdit('primary-endpoints', content);
                  setPrimaryEndpoints(content);
                }}
                placeholder="e.g., Proportion of patients achieving PASI 75 at Week 16"
                minHeight="100px"
                context="primary endpoints for regulatory study"
                aiEnabled={aiEnabledSections.has('primary-endpoints')}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="secondaryEndpoints">Secondary Endpoint(s)</label>
                <button
                  type="button"
                  onClick={() => toggleAIForSection('secondary-endpoints')}
                  style={{
                    background: aiEnabledSections.has('secondary-endpoints') ? '#10b981' : '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '0',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {aiEnabledSections.has('secondary-endpoints') ? '🤖 AI ON' : '🤖 AI OFF'}
                </button>
              </div>
              <RichTextEditor
                value={sectionEdits['secondary-endpoints'] || secondaryEndpoints}
                onChange={(content) => {
                  handleSectionEdit('secondary-endpoints', content);
                  setSecondaryEndpoints(content);
                }}
                placeholder="e.g., PASI 90 response, sPGA score, Quality of life measures"
                minHeight="100px"
                context="secondary endpoints for regulatory study"
                aiEnabled={aiEnabledSections.has('secondary-endpoints')}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="outcomeMeasureTool">Outcome Measure Tool</label>
              <select
                id="outcomeMeasureTool"
                value={outcomeMeasureTool}
                onChange={(e) => setOutcomeMeasureTool(e.target.value)}
              >
                <option value="">Select Measurement Tool</option>
                {outcomeMeasureTools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistical Considerations Section */}
        <div className="form-section">
          <h3>Statistical Considerations</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="statisticalPower">Statistical Power (%)</label>
              <input
                id="statisticalPower"
                type="number"
                value={statisticalPower}
                onChange={(e) => setStatisticalPower(e.target.value)}
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
                value={significanceLevel}
                onChange={(e) => setSignificanceLevel(e.target.value)}
                placeholder="0.05"
                step="0.01"
                min="0.01"
                max="0.2"
              />
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !disease}
            className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? 'Generating...' : `Generate Enhanced ${documentType || 'Regulatory Documents'}`}
          </button>
          <button 
            type="button" 
            onClick={resetForm}
            className="btn btn-secondary"
          >
            Reset Form
          </button>
        </div>

        {/* Regulatory Document Sections - Similar to Protocol Generator */}
        <div className="document-sections">
          <div className="sections-header">
            <h3>Regulatory Document Sections</h3>
            <div className="section-actions">
              <button 
                onClick={exportToWord}
                className="btn btn-outline"
                disabled={!result && Object.keys(sectionEdits).length === 0}
              >
                📄 Export to Word
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
      </div>

          {error && <div className="alert alert-error" aria-live="polite">{error}</div>}

          {loading && <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <p>Generating comprehensive regulatory documentation with enhanced trial parameters...</p>
          </div>}
          </div>
        </div>

        {/* Right Panel - Reference Document */}
        {showReferencePanel && (
          <div style={{ 
            flex: '1',
            minWidth: '400px',
            background: '#f8f9fa',
            border: '1px solid #e2e8f0',
            borderRadius: '0',
            padding: '20px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d3748' }}>Reference Document</h3>
            
            {!selectedReferenceDocument ? (
              <div>
                <p style={{ color: '#718096', marginBottom: '15px' }}>Select a document to use as reference:</p>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {previousDocuments.map(doc => (
                    <div 
                      key={doc.id} 
                      style={{
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        backgroundColor: 'white'
                      }}
                      onClick={() => handleSelectReference(doc)}
                    >
                      <strong>{doc.title || 'Untitled Document'}</strong>
                      <br />
                      <small style={{ color: '#718096' }}>
                        {doc.disease && `Disease: ${doc.disease}`}
                        {doc.country && ` • Country: ${doc.country}`}
                        {doc.created_at && ` • ${new Date(doc.created_at).toLocaleDateString()}`}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: '#2d3748' }}>{selectedReferenceDocument.title || 'Reference Document'}</h4>
                  <button 
                    onClick={handleReferenceClose}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      fontSize: '18px', 
                      cursor: 'pointer', 
                      color: '#718096' 
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Table of Contents */}
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>Sections:</h5>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {referenceDocumentTOC.map(section => (
                      <div 
                        key={section.id}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderRadius: '0',
                          marginBottom: '4px',
                          backgroundColor: selectedReferenceSection?.id === section.id ? '#e6fffa' : 'white',
                          border: selectedReferenceSection?.id === section.id ? '1px solid #38b2ac' : '1px solid #e2e8f0'
                        }}
                        onClick={() => handleReferenceSectionClick(section)}
                      >
                        <span style={{ fontSize: '0.9rem', color: '#2d3748' }}>{section.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Section Content */}
                {selectedReferenceSection && (
                  <div>
                    <h5 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>
                      {selectedReferenceSection.title}
                    </h5>
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0',
                      padding: '15px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        margin: 0, 
                        fontFamily: 'inherit',
                        color: '#2d3748'
                      }}>
                        {selectedReferenceSectionContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Result Section */}
      {result && (
        <div className="result-container" aria-live="polite">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'cmc' ? 'active' : ''}`}
              onClick={() => setActiveTab('cmc')}
            >
              CMC Section
            </button>
            <button
              className={`tab-btn ${activeTab === 'clinical' ? 'active' : ''}`}
              onClick={() => setActiveTab('clinical')}
            >
              Clinical Section
            </button>
          </div>

          <div className="module-content">
            {activeTab === 'cmc' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Chemistry, Manufacturing, and Controls (CMC)</h3>
                  <button
                    onClick={() => toggleAIForSection('regulatory-section-1')}
                    style={{
                      background: aiEnabledSections.has('regulatory-section-1') ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '0',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {aiEnabledSections.has('regulatory-section-1') ? '🤖 AI ON' : '🤖 AI OFF'}
                  </button>
                </div>
                <RichTextEditor
                  value={sectionEdits['regulatory-section-1'] || result.cmc_section || ''}
                  onChange={(content) => handleSectionEdit('regulatory-section-1', content)}
                  placeholder="CMC section content will appear here..."
                  minHeight="400px"
                  context="regulatory CMC section"
                  aiEnabled={aiEnabledSections.has('regulatory-section-1')}
                />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Clinical Section</h3>
                  <button
                    onClick={() => toggleAIForSection('regulatory-section-4')}
                    style={{
                      background: aiEnabledSections.has('regulatory-section-4') ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '0',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {aiEnabledSections.has('regulatory-section-4') ? '🤖 AI ON' : '🤖 AI OFF'}
                  </button>
                </div>
                <RichTextEditor
                  value={sectionEdits['regulatory-section-4'] || result.clinical_section || ''}
                  onChange={(content) => handleSectionEdit('regulatory-section-4', content)}
                  placeholder="Clinical section content will appear here..."
                  minHeight="400px"
                  context="regulatory clinical section"
                  aiEnabled={aiEnabledSections.has('regulatory-section-4')}
                />
              </>
            )}
          </div>

          <div className="action-buttons">
            <button
              onClick={() => {
                const content = activeTab === 'cmc'
                  ? (sectionEdits['regulatory-section-1'] || result.cmc_section)
                  : (sectionEdits['regulatory-section-4'] || result.clinical_section);
                navigator.clipboard.writeText(content);
                alert('Current section copied!');
              }}
              className="view-button"
            >
              Copy Current Section
            </button>
            <button
              onClick={() => {
                const cmcContent = sectionEdits['regulatory-section-1'] || result.cmc_section || 'No CMC content available';
                const clinicalContent = sectionEdits['regulatory-section-4'] || result.clinical_section || 'No clinical content available';
                navigator.clipboard.writeText(
                  `CMC SECTION:\n\n${cmcContent}\n\nCLINICAL SECTION:\n\n${clinicalContent}`
                );
                alert('All sections copied!');
              }}
              className="view-button"
            >
              Copy All
            </button>
            <button
              onClick={exportToWord}
              className="view-button"
              style={{ 
                background: '#10b981', 
                color: 'white', 
                border: 'none' 
              }}
            >
              📄 Export to Word
            </button>
            <button
              onClick={() => {
                try {
                  const cmcContent = sectionEdits['regulatory-section-1'] || result.cmc_section || 'No CMC content available';
                  const clinicalContent = sectionEdits['regulatory-section-4'] || result.clinical_section || 'No clinical content available';
                  const content = `CMC SECTION:\n\n${cmcContent}\n\nCLINICAL SECTION:\n\n${clinicalContent}`;
                  
                  // Check content size to prevent memory issues
                  if (content.length > 1000000) { // 1MB limit
                    alert('Document is too large for PDF generation. Please copy the content instead.');
                    return;
                  }
                  
                  const doc = new jsPDF();
                  doc.setFont('helvetica');
                  doc.setFontSize(10); // Smaller font to fit more content
                  
                  // PDF page settings
                  const pageHeight = doc.internal.pageSize.height;
                  const pageWidth = doc.internal.pageSize.width;
                  const margin = 15; // Smaller margins
                  const maxLineWidth = pageWidth - (margin * 2);
                  const lineHeight = 6; // Tighter line spacing
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
                  
                  const fileName = `${documentType || 'Regulatory'}_${disease || 'Document'}_${new Date().toISOString().slice(0, 10)}.pdf`;
                  doc.save(fileName);
                  
                } catch (pdfError) {
                  console.error('PDF generation failed:', pdfError);
                  alert('PDF generation failed. You can copy the content using the "Copy All" button instead.');
                }
              }}
              className="view-button"
            >
              Download as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegulatoryDocumentGenerator;