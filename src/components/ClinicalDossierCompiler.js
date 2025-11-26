import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import apiService from '../services/api';
import './ClinicalDossierCompiler.css';

const ClinicalDossierCompiler = () => {
  const [selectedDossierType, setSelectedDossierType] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validatingDocuments, setValidatingDocuments] = useState(new Set());
  const [primaryIndication, setPrimaryIndication] = useState('');
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');

  const dossierTypes = [
    { 
      id: 'impd', 
      name: 'Investigational Medicinal Product Dossier (IMPD)',
      description: 'EU dossier containing quality, production, and control information',
      icon: '', // removed emoji
      color: '#4F46E5'
    },
    { 
      id: 'ind', 
      name: 'Investigational New Drug (IND) Application',
      description: 'US FDA submission for investigational new drug trials',
      icon: '', // removed emoji
      color: '#059669'
    },
    { 
      id: 'ctd', 
      name: 'Common Technical Document (CTD)',
      description: 'Standardized format for quality, safety, and efficacy information',
      icon: '', // removed emoji
      color: '#DC2626'
    },
    { 
      id: 'ectd', 
      name: 'Electronic Common Technical Document (eCTD)',
      description: 'Electronic version of CTD for digital submission',
      icon: '', // removed emoji
      color: '#7C3AED'
    }
  ];

  const documentCategories = [
    { id: 'protocol', name: 'Protocol', required: true, icon: '', maxFiles: 1 },                                                                              
    { id: 'ib', name: "Investigator's Brochure (IB)", required: true, icon: '', maxFiles: 1 },                                                                
    { id: 'quality', name: 'Quality Information', required: true, icon: '', maxFiles: 3 },                                                                     
    { id: 'nonclinical', name: 'Non-clinical Data', required: true, icon: '', maxFiles: 5 },                                                                  
    { id: 'clinical', name: 'Clinical Data', required: true, icon: '', maxFiles: 10 },                                                                        
    { id: 'application', name: 'Application Form', required: true, icon: '', maxFiles: 1 },                                                                   
    { id: 'other', name: 'Other Documents', required: false, icon: '', maxFiles: 5 }                                                                          
  ];

  // Country-specific regulatory requirements
  const countryRegulatoryData = {
    'US': {
      name: 'United States',
      regulator: 'FDA',
      submissionRoute: 'IND',
      documents: ['Protocol', 'IB', 'ICF', 'FDA Forms 1571/1572', 'CMC', 'Preclinical Data', 'IRB Approval', 'Financial Disclosures', 'Insurance']
    },
    'EU': {
      name: 'European Union',
      regulator: 'EMA/NCAS',
      submissionRoute: 'IMPD/CTA (CTD/eCTD)',
      documents: ['Protocol', 'IB', 'ICF (translated)', 'IMPD Modules (Quality/Nonclinical/Clinical)', 'GMP', 'EC Opinion', 'Insurance']
    },
    'JP': {
      name: 'Japan',
      regulator: 'PMDA/MHI',
      submissionRoute: 'CTN',
      documents: ['Protocol', 'IB', 'ICF (Japanese)', 'CTA Form', 'Preclinical', 'CMC', 'IRB Approval', 'HGRAC (if applicable)']
    },
    'CN': {
      name: 'China',
      regulator: 'NMPA',
      submissionRoute: 'IND',
      documents: ['Protocol', 'IB', 'ICF (Mandarin)', 'CTA Form', 'Preclinical', 'CMC', 'IRB Approval', 'HGRAC (if applicable)']
    },
    'IN': {
      name: 'India',
      regulator: 'CDSCO',
      submissionRoute: 'CTA/IND',
      documents: ['Protocol', 'IB', 'ICF (English + Local)', 'Form 44', 'Schedule Y', 'EC Approval', 'Insurance', 'PI CV']
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

  // Extract text from file for validation
  const extractTextFromFile = async (file) => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        // For PDFs, we'll use a simplified approach
        // In production, you'd want to use a proper PDF text extraction library
        resolve(`PDF document: ${file.name} - Content extraction requires PDF parsing library`);
      } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      } else {
        // For other document types, return basic info
        resolve(`Document: ${file.name} - Binary file content`);
      }
    });
  };

  // Validate document content
  const validateDocument = async (document) => {
    if (!document.category || !primaryIndication.trim()) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Category or primary indication not specified',
        recommendation: 'Please assign a category and specify primary indication'
      };
    }

    setValidatingDocuments(prev => new Set(prev).add(document.id));

    try {
      // Extract text content from file
      const documentText = await extractTextFromFile(document.file);
      
      const categoryInfo = documentCategories.find(cat => cat.id === document.category);
      
      const validationData = {
        documentText,
        fileName: document.name,
        expectedCategory: document.category,
        categoryDescription: categoryInfo?.name || document.category,
        primaryIndication: primaryIndication.trim(),
        dossierType: selectedDossierType,
        fileType: document.file.type,
        fileSize: document.file.size,
        language: 'english' // Could be detected or user-specified
      };

      const validationResult = await apiService.validateDocumentContent(validationData);
      
      // Update document with validation result
      setUploadedDocuments(docs => 
        docs.map(doc => 
          doc.id === document.id 
            ? { ...doc, validation: validationResult }
            : doc
        )
      );

      return validationResult;
    } catch (error) {
      console.error('Validation error:', error);
      const errorResult = {
        isValid: false,
        confidence: 0,
        reason: 'Validation service error',
        recommendation: 'Try validation again or contact support'
      };
      
      setUploadedDocuments(docs => 
        docs.map(doc => 
          doc.id === document.id 
            ? { ...doc, validation: errorResult }
            : doc
        )
      );
      
      return errorResult;
    } finally {
      setValidatingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

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
        validation: null
      }));
      setUploadedDocuments([...uploadedDocuments, ...newDocuments]);
    }
  });

  const handleCategoryChange = async (documentId, category) => {
    const categoryCount = uploadedDocuments.filter(doc => doc.category === category).length;
    const maxFiles = documentCategories.find(cat => cat.id === category)?.maxFiles || 10;
    
    if (categoryCount >= maxFiles) {
      alert(`Maximum ${maxFiles} file(s) allowed for ${category}`);
      return;
    }
    
    // Update category
    setUploadedDocuments(docs => 
      docs.map(doc => 
        doc.id === documentId ? { ...doc, category, validation: null } : doc
      )
    );

    // Auto-validate if primary indication is set
    if (primaryIndication.trim()) {
      const document = uploadedDocuments.find(doc => doc.id === documentId);
      if (document) {
        const updatedDocument = { ...document, category };
        setTimeout(() => validateDocument(updatedDocument), 100);
      }
    }
  };

  const removeDocument = (documentId) => {
    setUploadedDocuments(docs => docs.filter(doc => doc.id !== documentId));
  };

  const manualValidateDocument = async (documentId) => {
    const document = uploadedDocuments.find(doc => doc.id === documentId);
    if (document) {
      await validateDocument(document);
    }
  };

  const validateAllDocuments = async () => {
    if (!primaryIndication.trim()) {
      // TODO: Replace with user-friendly notification system
      // alert('Please specify the primary indication before validating documents.');
      return;
    }

    const documentsToValidate = uploadedDocuments.filter(doc => doc.category);
    
    for (const document of documentsToValidate) {
      await validateDocument(document);
    }
  };

  const compileDossier = async () => {
    setLoading(true);
    
    try {
      // console.log('Starting dossier compilation...');
      // console.log('Selected dossier type:', selectedDossierType);
      // console.log('Uploaded documents:', uploadedDocuments);
      
      const result = await apiService.compileDossier(selectedDossierType, uploadedDocuments);
      
      // console.log('Compilation result:', result);
      
      if (result.success) {
        // TODO: Replace with user-friendly notification system
        // alert(result.message || `Dossier compiled successfully! Downloaded as: ${result.fileName}`);
        // Optionally reset the form
        setUploadedDocuments([]);
        setSelectedDossierType('');
        setPrimaryIndication('');
      }
    } catch (error) {
      console.error('Detailed error:', error);
      // alert(`Failed to compile dossier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isReadyToCompile = () => {
    if (!selectedDossierType) return false;
    
    const requiredCategories = documentCategories
      .filter(cat => cat.required)
      .map(cat => cat.id);
    
    const uploadedCategories = uploadedDocuments
      .map(doc => doc.category)
      .filter(Boolean);
    
    return requiredCategories.every(req => uploadedCategories.includes(req));
  };

  const getCategoryStatus = (categoryId) => {
    const uploaded = uploadedDocuments.filter(doc => doc.category === categoryId).length;
    const category = documentCategories.find(cat => cat.id === categoryId);
    const required = category?.required;
    const maxFiles = category?.maxFiles || 10;
    
    if (required && uploaded === 0) return 'missing';
    if (uploaded >= maxFiles) return 'full';
    if (uploaded > 0) return 'partial';
    return 'empty';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'missing': return 'Missing';
      case 'full': return 'Complete';
      case 'partial': return 'Partial';
      default: return 'Empty';
    }
  };

  const getValidationIcon = (validation) => {
    if (!validation) return 'Not Validated';
    if (validation.confidence >= 0.8) return 'Valid';
    if (validation.confidence >= 0.6) return 'Warning';
    return 'Invalid';
  };

  const getValidationColor = (validation) => {
    if (!validation) return '#94a3b8';
    if (validation.confidence >= 0.8) return '#10b981';
    if (validation.confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getValidationSummary = () => {
    const validatedDocs = uploadedDocuments.filter(doc => doc.validation);
    const validDocs = validatedDocs.filter(doc => doc.validation.isValid);
    const highConfidence = validatedDocs.filter(doc => doc.validation.confidence >= 0.8);
    
    return {
      total: uploadedDocuments.length,
      validated: validatedDocs.length,
      valid: validDocs.length,
      highConfidence: highConfidence.length
    };
  };

  const summary = getValidationSummary();

  return (
    <div className="clinical-dossier-compiler">
      {/* Main Content Area */}
      <div className="dossier-main-content">
        <div className="page-header">
          <h1 className="page-title">Clinical Dossier Compiler</h1>
          <p className="page-description">
            Compile various clinical trial documents into a single regulatory dossier with AI-powered document validation
          </p>
        </div>

        {/* Primary Indication Input */}
        <div className="dossier-section">
          <h2 className="section-title">Primary Indication</h2>
          <input
            type="text"
            value={primaryIndication}
            onChange={(e) => setPrimaryIndication(e.target.value)}
            placeholder="Enter the primary disease/condition (e.g., Type 2 Diabetes, Alzheimer's Disease)"
            className="form-input"
          />
          <p className="section-description">
            This helps validate that uploaded documents are relevant to your clinical indication
          </p>
        </div>

        {/* Country Selection */}
        <div className="dossier-section">
          <h2 className="section-title">Target Country/Region</h2>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="form-select"
          >
            <option value="">Select a country/region...</option>
            {Object.entries(countryRegulatoryData).map(([code, data]) => (
              <option key={code} value={code}>
                {data.name} ({data.regulator})
              </option>
            ))}
          </select>
          <p className="section-description">
            Select the target country/region for regulatory submission
          </p>
        </div>

        {/* Dossier Type Selection */}
        <div className="dossier-section">
          <h2 className="section-title">Select Dossier Type</h2>
          <div className="dossier-types-grid">
            {dossierTypes.map(type => (
              <button
                key={type.id}
                className={`dossier-type-card ${selectedDossierType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedDossierType(type.id)}
              >
                <div className="dossier-type-header">
                  <h3 className="dossier-type-name">{type.name}</h3>
                </div>
                <p className="dossier-type-description">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

      {selectedDossierType && (
        <>
          {/* Document Upload Area */}
          <div className="dossier-section">
            <h2 className="section-title">Upload Documents</h2>
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 7L11.8845 4.76892C11.5634 4.1268 11.4029 3.80573 11.1634 3.57116C10.9516 3.36373 10.6963 3.20597 10.4161 3.10931C10.0992 3 9.74021 3 9.02229 3H5.2C4.0799 3 3.51984 3 3.09202 3.21799C2.71569 3.40973 2.40973 3.71569 2.21799 4.09202C2 4.51984 2 5.0799 2 6.2V7M2 7H17.2C18.8802 7 19.7202 7 20.362 7.32698C20.9265 7.6146 21.3854 8.07354 21.673 8.63803C22 9.27976 22 10.1198 22 11.8V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V7Z" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="dropzone-title">
                {isDragActive
                  ? 'Drop the files here...'
                  : 'Drag and drop documents here, or click to select files'}
              </p>
              <p className="dropzone-subtitle">
                Accepted formats: PDF, DOC, DOCX, XLS, XLSX, TXT
              </p>
            </div>
          </div>

          {/* Validation Summary */}
          {uploadedDocuments.length > 0 && (
            <div className="dossier-section">
              <div className="section-header">
                <h2 className="section-title">Document Validation Summary</h2>
                <button
                  onClick={validateAllDocuments}
                  disabled={!primaryIndication.trim() || validatingDocuments.size > 0}
                  className={`btn btn-small ${primaryIndication.trim() ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {validatingDocuments.size > 0 ? 'Validating...' : 'Validate All'}
                </button>
              </div>

              <div className="validation-metrics">
                <div className="validation-metric-card">
                  <div className="metric-value">{summary.total}</div>
                  <div className="metric-label">Total Documents</div>
                </div>
                <div className="validation-metric-card">
                  <div className="metric-value">{summary.validated}</div>
                  <div className="metric-label">Validated</div>
                </div>
                <div className="validation-metric-card">
                  <div className="metric-value">{summary.valid}</div>
                  <div className="metric-label">Valid Documents</div>
                </div>
                <div className="validation-metric-card">
                  <div className="metric-value">{summary.highConfidence}</div>
                  <div className="metric-label">High Confidence</div>
                </div>
              </div>
            </div>
          )}

          {/* Document Categories Checklist */}
          <div className="dossier-section">
            <h2 className="section-title">Required Documents Checklist</h2>
            <div className="document-checklist-grid">
              {documentCategories.map(cat => {
                const status = getCategoryStatus(cat.id);
                const uploadedCount = uploadedDocuments.filter(doc => doc.category === cat.id).length;

                const statusClass = status === 'missing' ? 'status-danger' :
                                   status === 'full' ? 'status-success' :
                                   status === 'partial' ? 'status-warning' : 'status-neutral';

                return (
                  <div key={cat.id} className={`checklist-item ${statusClass}`}>
                    <div className="checklist-item-content">
                      <div className="checklist-item-name">
                        {cat.name} {cat.required && <span className="checklist-item-required">*</span>}
                      </div>
                      <div className="checklist-item-count">
                        {uploadedCount}/{cat.maxFiles} files
                      </div>
                    </div>
                    <span className={`status-chip ${statusClass}`}>{getStatusIcon(status)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <div className="dossier-section">
              <h2 className="section-title">Uploaded Documents ({uploadedDocuments.length})</h2>
              <div className="documents-list">
                {uploadedDocuments.map(doc => (
                  <div key={doc.id} className="document-item">
                    <div className="document-info">
                      <div className="document-name-row">
                        <span className="document-name">{doc.name}</span>
                        {validatingDocuments.has(doc.id) && (
                          <span className="tag tag-light">Validating...</span>
                        )}
                      </div>
                      <div className="document-size">
                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      {doc.validation && (
                        <div className="document-validation">
                          <span className="validation-description" style={{ color: getValidationColor(doc.validation) }}>
                            Confidence: {(doc.validation.confidence * 100).toFixed(1)}% - {doc.validation.reason}
                          </span>
                          {doc.validation.recommendation && (
                            <>
                              {' | '}
                              <span className="validation-recommendation">
                                Recommendation: {doc.validation.recommendation}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="document-actions">
                      <select
                        value={doc.category}
                        onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
                        className="category-select"
                      >
                        <option value="">Select Category</option>
                        {documentCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.required && '*'}
                          </option>
                        ))}
                      </select>
                      {doc.category && primaryIndication.trim() && (
                        <button
                          onClick={() => manualValidateDocument(doc.id)}
                          disabled={validatingDocuments.has(doc.id)}
                          className="btn btn-small btn-outline-primary"
                        >
                          {validatingDocuments.has(doc.id) ? 'Validating...' : 'Validate'}
                        </button>
                      )}
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="btn btn-small btn-outline-danger"
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
          <div className="dossier-section dossier-cta">
            <div className="dossier-cta-content">
              <button
                onClick={compileDossier}
                disabled={!isReadyToCompile() || loading}
                className={`btn btn-lg btn-block ${isReadyToCompile() && !loading ? 'btn-primary' : 'btn-secondary'}`}
              >
                {loading ? 'Compiling Dossier...' : 'Compile Dossier'}
              </button>
              {!isReadyToCompile() && !loading && (
                <p className="warning-message">
                  Please upload all required documents and assign categories before compiling
                </p>
              )}
              {primaryIndication.trim() && uploadedDocuments.some(doc => doc.validation && !doc.validation.isValid) && (
                <p className="info-message">
                  Some documents have validation issues. Review and address them before compiling.
                </p>
              )}
            </div>
          </div>
        </>
      )}
      </div>

      {/* Country-Specific Compiler Sidebar */}
      <div className="dossier-sidebar">
        <h3 className="sidebar-title">Country Compiler</h3>

        {selectedCountry ? (
          <>
            <div className="sidebar-card">
              <h4 className="sidebar-card-title">
                {countryRegulatoryData[selectedCountry].name}
              </h4>
              <p className="sidebar-card-info">
                <strong>Regulator:</strong> {countryRegulatoryData[selectedCountry].regulator}
              </p>
              <p className="sidebar-card-info">
                <strong>Submission Route:</strong> {countryRegulatoryData[selectedCountry].submissionRoute}
              </p>
            </div>

            <div className="sidebar-card">
              <h4 className="sidebar-card-title">Required Documents</h4>
              <div className="sidebar-documents-list">
                {countryRegulatoryData[selectedCountry].documents.map((doc, index) => (
                  <div key={index} className="sidebar-document-item">
                    <span className="sidebar-document-bullet">•</span>
                    <span className="sidebar-document-name">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                // Generate country-specific dossier
                console.log(`Compiling dossier for ${countryRegulatoryData[selectedCountry].name}`);
              }}
              className="btn btn-primary btn-block"
            >
              Compile for {countryRegulatoryData[selectedCountry].name}
            </button>
          </>
        ) : (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H22" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="sidebar-empty-text">
              Select a country/region to view specific regulatory requirements and compile a targeted dossier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalDossierCompiler;