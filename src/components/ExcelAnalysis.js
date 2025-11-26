// src/components/ExcelAnalysis.js
import React, { useState, useCallback } from 'react';
import ExcelAnalysisService from '../services/excelAnalysisService';
import PDFExportService from '../services/pdfExportService';
import './ExcelAnalysis.css';
import '../App.css';

const ExcelAnalysis = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState(null);
  const [activeTab, setActiveTab] = useState('inclusion');

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const results = await ExcelAnalysisService.analyzeExcelFile(file);
      setAnalysisData(results);
      
      // Auto-select first worksheet
      const firstWorksheet = Object.keys(results.worksheets)[0];
      if (firstWorksheet) {
        setSelectedWorksheet(firstWorksheet);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const exportToPDF = useCallback(() => {
    if (analysisData) {
      PDFExportService.downloadPDF(
        analysisData,
        `Biomarker_Analysis_${analysisData.fileName.replace(/\.[^/.]+$/, '')}.pdf`
      );
    }
  }, [analysisData]);

  const renderPatientSelectionCriteria = (biomarkerAnalysis, criteriaType) => {
    const categories = Object.entries(biomarkerAnalysis).filter(([_, biomarkers]) => biomarkers.length > 0);
    
    if (categories.length === 0) {
      return <p className="text-muted">No biomarkers identified for patient selection criteria.</p>;
    }

    const getCriteriaRecommendations = (category, biomarkers, type) => {
      return biomarkers.map(biomarker => {
        const criteria = biomarker.selectionCriteria;
        if (!criteria) return `${biomarker.original} - manual evaluation required`;
        
        switch (type) {
          case 'inclusion':
            return criteria.inclusion || criteria.reference || `Include based on ${biomarker.original}`;
          case 'exclusion':
            return criteria.exclusion || criteria.monitoring || `Exclude abnormal ${biomarker.original}`;
          case 'stratification':
            return criteria.stratification || criteria.subgroup || `Stratify by ${biomarker.original}`;
          default:
            return biomarker.original;
        }
      });
    };

    return (
      <div className="selection-criteria-content">
        {categories.map(([category, biomarkers]) => {
          const recommendations = getCriteriaRecommendations(category, biomarkers, criteriaType);
          return (
            <div key={category} className="criteria-category">
              <div className="criteria-header">
                <div className="category-info">
                  <h5 className="criteria-category-title">
                    {category.charAt(0).toUpperCase() + category.slice(1)} Criteria
                  </h5>
                  <span className="criteria-count">{biomarkers.length} biomarkers</span>
                </div>
                <div className="criteria-priority">
                  <span className={`priority-badge ${category === 'safety' ? 'high' : category === 'efficacy' ? 'medium' : 'low'}`}>
                    {category === 'safety' ? 'High Priority' : category === 'efficacy' ? 'Medium Priority' : 'Low Priority'}
                  </span>
                </div>
              </div>
              
              <div className="criteria-recommendations">
                {recommendations.map((rec, index) => (
                  <div key={index} className="criteria-item">
                    <div className="criteria-content">
                      <span className="biomarker-name">{biomarkers[index]?.original}</span>
                      <span className="criteria-text">{rec}</span>
                      {biomarkers[index]?.dataAnalysis && (
                        <div className="data-insights">
                          {biomarkers[index].dataAnalysis.type === 'numeric' ? (
                            <span className="data-range">
                              Range: {biomarkers[index].dataAnalysis.min?.toFixed(1)} - {biomarkers[index].dataAnalysis.max?.toFixed(1)}
                              {biomarkers[index].dataAnalysis.outliers > 0 && (
                                <span className="outlier-warning"> ({biomarkers[index].dataAnalysis.outliers} outliers)</span>
                              )}
                            </span>
                          ) : (
                            <span className="data-categories">
                              {biomarkers[index].dataAnalysis.uniqueValues} categories, n={biomarkers[index].dataAnalysis.count}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="badges">
                      {biomarkers[index]?.fdaRelevant && (
                        <span className="fda-badge">FDA</span>
                      )}
                      {biomarkers[index]?.dataAnalysis?.type === 'numeric' && (
                        <span className="numeric-badge">Numeric</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const renderStatisticalAnalysis = (statisticalAnalysis) => {
    const stats = Object.entries(statisticalAnalysis).filter(([key]) => key !== '_correlations');
    
    if (stats.length === 0) {
      return <p className="text-muted">No numerical columns available for statistical analysis.</p>;
    }

    return (
      <div className="statistical-analysis">
        <div className="stats-grid">
          {stats.map(([column, data]) => (
            <div key={column} className="stat-card">
              <h5 className="stat-column-name">{column}</h5>
              <div className="stat-details">
                <div className="stat-row">
                  <span className="stat-label">Count:</span>
                  <span className="stat-value">{data.count}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Mean:</span>
                  <span className="stat-value">{data.mean?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Median:</span>
                  <span className="stat-value">{data.median?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Std Dev:</span>
                  <span className="stat-value">{data.standardDeviation?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Missing:</span>
                  <span className="stat-value">{data.missingCount}</span>
                </div>
                {data.outliers && data.outliers.length > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Outliers:</span>
                    <span className="stat-value">{data.outliers.length}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {statisticalAnalysis._correlations && (
          <div className="correlations-section">
            <h4>Strong Correlations (|r| &gt; 0.7)</h4>
            <div className="correlations-list">
              {Object.entries(statisticalAnalysis._correlations)
                .filter(([key, value]) => Math.abs(value) > 0.7 && !key.includes('_') === false)
                .map(([pair, correlation]) => (
                  <div key={pair} className="correlation-item">
                    <span className="correlation-pair">{pair.replace('_', ' ↔ ')}</span>
                    <span className={`correlation-value ${correlation > 0 ? 'positive' : 'negative'}`}>
                      {correlation.toFixed(3)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDataQuality = (dataQuality) => (
    <div className="data-quality-section">
      <div className="quality-metrics">
        <div className="quality-metric">
          <span className="metric-label">Data Completeness</span>
          <div className="metric-bar">
            <div 
              className="metric-fill" 
              style={{ width: `${dataQuality.dataCompleteness}%` }}
            ></div>
          </div>
          <span className="metric-value">{dataQuality.dataCompleteness}%</span>
        </div>
        
        <div className="quality-metric">
          <span className="metric-label">Quality Score</span>
          <div className="metric-bar">
            <div 
              className="metric-fill" 
              style={{ width: `${dataQuality.qualityScore}%` }}
            ></div>
          </div>
          <span className="metric-value">{dataQuality.qualityScore}/100</span>
        </div>
      </div>
      
      <div className="quality-details">
        <div className="quality-stat">
          <span className="quality-label">Total Cells:</span>
          <span className="quality-value">{dataQuality.totalCells.toLocaleString()}</span>
        </div>
        <div className="quality-stat">
          <span className="quality-label">Empty Cells:</span>
          <span className="quality-value">{dataQuality.emptyCells.toLocaleString()}</span>
        </div>
        <div className="quality-stat">
          <span className="quality-label">Duplicate Rows:</span>
          <span className="quality-value">{dataQuality.duplicateRows}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="excel-analysis-container">
      <div className="container">
        <div className="analysis-header">
          <h1>Excel Biomarker Analysis</h1>
          <p>Upload your dataset to analyze biomarkers and optimize patient selection criteria</p>
        </div>

        {/* File Upload Section */}
        <div className="upload-section">
          <div 
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="upload-content">
              <div className="upload-icon"></div>
              <h3>Upload Dataset</h3>
              <p>Drop Excel/CSV file here</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-primary">
                Choose File
              </label>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Analyzing dataset...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-section">
            <div className="error-message">{error}</div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisData && (
          <div className="analysis-results">
            {/* Overall Summary */}
            <div className="summary-section">
              <div className="summary-header">
                <h2>Analysis Summary</h2>
                <button 
                  onClick={exportToPDF}
                  className="btn btn-secondary"
                  title="Export analysis to PDF"
                >
                  Export PDF
                </button>
              </div>
              
              {/* Patient Selection Overview */}
              <div className="patient-selection-overview">
                <div className="selection-card primary">
                  <div className="selection-icon"></div>
                  <div className="selection-value">{analysisData.overallSummary.totalRecords.toLocaleString()}</div>
                  <div className="selection-label">Eligible Patients</div>
                  <div className="selection-sublabel">Total Population Pool</div>
                </div>
                <div className="selection-card success">
                  <div className="selection-icon"></div>
                  <div className="selection-value">{analysisData.overallSummary.fdaCompliantBiomarkers}</div>
                  <div className="selection-label">Selection Criteria</div>
                  <div className="selection-sublabel">Biomarkers Available</div>
                </div>
                <div className="selection-card warning">
                  <div className="selection-icon"></div>
                  <div className="selection-value">{analysisData.overallSummary.averageDataQuality}%</div>
                  <div className="selection-label">Data Completeness</div>
                  <div className="selection-sublabel">Selection Reliability</div>
                </div>
                <div className="selection-card secondary">
                  <div className="selection-icon"></div>
                  <div className="selection-value">{Math.round(analysisData.overallSummary.totalRecords * 0.15)}</div>
                  <div className="selection-label">Estimated Enrollment</div>
                  <div className="selection-sublabel">After Screening</div>
                </div>
              </div>
            </div>

            {/* Worksheet Tabs */}
            {Object.keys(analysisData.worksheets).length > 1 && (
              <div className="worksheet-tabs">
                {Object.keys(analysisData.worksheets).map(sheetName => (
                  <button
                    key={sheetName}
                    className={`tab-button ${selectedWorksheet === sheetName ? 'active' : ''}`}
                    onClick={() => setSelectedWorksheet(sheetName)}
                  >
                    {sheetName}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Worksheet Content */}
            {selectedWorksheet && analysisData.worksheets[selectedWorksheet] && (
              <div className="worksheet-analysis">
                <div className="worksheet-header">
                  <h3>Worksheet: {selectedWorksheet}</h3>
                  <div className="worksheet-stats">
                    <span>{analysisData.worksheets[selectedWorksheet].totalRows} rows</span>
                    <span>{analysisData.worksheets[selectedWorksheet].totalColumns} columns</span>
                  </div>
                </div>

                {/* Data Quality */}
                <div className="analysis-section">
                  <h4>Data Quality Assessment</h4>
                  {renderDataQuality(analysisData.worksheets[selectedWorksheet].dataQuality)}
                </div>

                {/* Patient Selection Criteria */}
                <div className="analysis-section patient-selection-criteria">
                  <h4>Selection Criteria</h4>
                  <div className="selection-tabs">
                    <div className="tab-navigation">
                      <button 
                        className={`tab-btn ${activeTab === 'inclusion' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('inclusion')}
                      >
                        Inclusion
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'exclusion' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('exclusion')}
                      >
                        Exclusion
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'stratification' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('stratification')}
                      >
                        Stratification
                      </button>
                    </div>
                    <div className="tab-content">
                      <div className={`tab-panel ${activeTab === 'inclusion' ? 'active' : ''}`} id="inclusion">
                        {activeTab === 'inclusion' && renderPatientSelectionCriteria(analysisData.worksheets[selectedWorksheet].biomarkerAnalysis, 'inclusion')}
                      </div>
                      <div className={`tab-panel ${activeTab === 'exclusion' ? 'active' : ''}`} id="exclusion">
                        {activeTab === 'exclusion' && renderPatientSelectionCriteria(analysisData.worksheets[selectedWorksheet].biomarkerAnalysis, 'exclusion')}
                      </div>
                      <div className={`tab-panel ${activeTab === 'stratification' ? 'active' : ''}`} id="stratification">
                        {activeTab === 'stratification' && renderPatientSelectionCriteria(analysisData.worksheets[selectedWorksheet].biomarkerAnalysis, 'stratification')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistical Analysis */}
                <div className="analysis-section">
                  <h4>Statistical Analysis</h4>
                  {renderStatisticalAnalysis(analysisData.worksheets[selectedWorksheet].statisticalAnalysis)}
                </div>

                {/* AI Analysis */}
                {analysisData.aiAnalysis && (
                  <div className="analysis-section ai-analysis">
                    <details className="ai-analysis-toggle">
                      <summary className="ai-analysis-header">
                        AI Analysis
                      </summary>
                    <div className="ai-analysis-content">
                      {analysisData.aiAnalysis.claudeInsights?.error ? (
                        <div className="ai-error">
                          <p><strong>AI Analysis:</strong> {analysisData.aiAnalysis.claudeInsights.error}</p>
                          {analysisData.aiAnalysis.claudeInsights.fallbackRecommendations && (
                            <div className="fallback-recommendations">
                              <h5>Fallback Recommendations:</h5>
                              <ul>
                                {analysisData.aiAnalysis.claudeInsights.fallbackRecommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="ai-insights">
                          
                          {analysisData.aiAnalysis.claudeInsights && (
                            <div className="claude-insights">
                              <div className="insight-section">
                                <h5>AI Clinical Assessment</h5>
                                <div className="insight-content">
                                  {typeof analysisData.aiAnalysis.claudeInsights === 'string' ? (
                                    <p>{analysisData.aiAnalysis.claudeInsights}</p>
                                  ) : (
                                    <div className="structured-insights">
                                      {/* Handle Claude API structured response */}
                                      {analysisData.aiAnalysis.claudeInsights.summary && (
                                        <div className="ai-summary">
                                          <strong>Summary:</strong>
                                          <p>{typeof analysisData.aiAnalysis.claudeInsights.summary === 'string' 
                                            ? analysisData.aiAnalysis.claudeInsights.summary 
                                            : JSON.stringify(analysisData.aiAnalysis.claudeInsights.summary)}</p>
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.decision && (
                                        <div className="ai-decision">
                                          <strong>Clinical Decision:</strong>
                                          <div className="decision-content">
                                            {typeof analysisData.aiAnalysis.claudeInsights.decision === 'string' ? (
                                              <div className="formatted-decision">
                                                {analysisData.aiAnalysis.claudeInsights.decision.split('\n').map((line, index) => {
                                                  if (line.trim() === '') return null;
                                                  
                                                  // Format headers and sections
                                                  if (line.includes('DECISION SUMMARY:') || line.includes('PRIMARY RATIONALE:') || 
                                                      line.includes('SUPPORTING EVIDENCE:') || line.includes('ALTERNATIVES CONSIDERED:') ||
                                                      line.includes('RISK ASSESSMENT:') || line.includes('CONFIDENCE LEVEL:') ||
                                                      line.includes('MONITORING PLAN:') || line.includes('CLINICAL IMPLICATIONS:')) {
                                                    return <h4 key={index} className="decision-header">{line}</h4>;
                                                  }
                                                  
                                                  // Format risk categories
                                                  if (line.includes('HIGH RISKS:') || line.includes('MEDIUM RISKS:') || line.includes('LOW RISKS:')) {
                                                    return <h5 key={index} className="risk-category">{line}</h5>;
                                                  }
                                                  
                                                  // Format bullet points
                                                  if (line.trim().startsWith('- ')) {
                                                    return <li key={index} className="evidence-point">{line.substring(2)}</li>;
                                                  }
                                                  
                                                  // Handle JSON blocks
                                                  if (line.trim().startsWith('``json') || line.trim().startsWith('```json')) {
                                                    return <div key={index} className="json-indicator"><strong>Detailed Analysis Data:</strong></div>;
                                                  }
                                                  
                                                  if (line.trim() === '``' || line.trim() === '```') {
                                                    return null; // Skip end markers
                                                  }
                                                  
                                                  // Handle JSON content
                                                  if (line.trim().startsWith('{') && line.includes('"clinical_analysis"')) {
                                                    try {
                                                      const jsonData = JSON.parse(line);
                                                      return (
                                                        <div key={index} className="structured-analysis-summary">
                                                          <h5>Structured Analysis Summary</h5>
                                                          <div className="analysis-grid">
                                                            {jsonData.clinical_analysis && (
                                                              <div className="analysis-card">
                                                                <h6>Dataset Suitability: {jsonData.clinical_analysis.dataset_suitability?.overall_assessment}</h6>
                                                                <p><strong>Regulatory Readiness:</strong> {jsonData.clinical_analysis.dataset_suitability?.regulatory_readiness}</p>
                                                                {jsonData.clinical_analysis.dataset_suitability?.strengths && (
                                                                  <div>
                                                                    <strong>Key Strengths:</strong>
                                                                    <ul>
                                                                      {jsonData.clinical_analysis.dataset_suitability.strengths.slice(0, 3).map((strength, i) => (
                                                                        <li key={i}>{strength}</li>
                                                                      ))}
                                                                    </ul>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                          <details className="full-analysis-details">
                                                            <summary>View Complete Detailed Analysis</summary>
                                                            <pre className="json-display">{JSON.stringify(jsonData, null, 2)}</pre>
                                                          </details>
                                                        </div>
                                                      );
                                                    } catch (e) {
                                                      return <div key={index} className="json-block">{line}</div>;
                                                    }
                                                  }
                                                  
                                                  // Regular paragraphs
                                                  return <p key={index} className="decision-paragraph">{line}</p>;
                                                })}
                                              </div>
                                            ) : (
                                              <pre className="json-display">{JSON.stringify(analysisData.aiAnalysis.claudeInsights.decision, null, 2)}</pre>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.rationale && (
                                        <div className="ai-rationale">
                                          <strong>Rationale:</strong>
                                          <p>{typeof analysisData.aiAnalysis.claudeInsights.rationale === 'string' 
                                            ? analysisData.aiAnalysis.claudeInsights.rationale 
                                            : JSON.stringify(analysisData.aiAnalysis.claudeInsights.rationale)}</p>
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.reasoning && (
                                        <div className="ai-reasoning">
                                          <strong>AI Reasoning:</strong>
                                          {Array.isArray(analysisData.aiAnalysis.claudeInsights.reasoning) ? (
                                            <ul>
                                              {analysisData.aiAnalysis.claudeInsights.reasoning.map((reason, index) => (
                                                <li key={index}>{typeof reason === 'string' ? reason : JSON.stringify(reason)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>{typeof analysisData.aiAnalysis.claudeInsights.reasoning === 'string' 
                                              ? analysisData.aiAnalysis.claudeInsights.reasoning 
                                              : JSON.stringify(analysisData.aiAnalysis.claudeInsights.reasoning)}</p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.evidence && (
                                        <div className="ai-evidence">
                                          <strong>Evidence:</strong>
                                          {Array.isArray(analysisData.aiAnalysis.claudeInsights.evidence) ? (
                                            <ul>
                                              {analysisData.aiAnalysis.claudeInsights.evidence.map((item, index) => (
                                                <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>{typeof analysisData.aiAnalysis.claudeInsights.evidence === 'string' 
                                              ? analysisData.aiAnalysis.claudeInsights.evidence 
                                              : JSON.stringify(analysisData.aiAnalysis.claudeInsights.evidence)}</p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.alternatives && (
                                        <div className="ai-alternatives">
                                          <strong>Alternative Considerations:</strong>
                                          {Array.isArray(analysisData.aiAnalysis.claudeInsights.alternatives) ? (
                                            <ul>
                                              {analysisData.aiAnalysis.claudeInsights.alternatives.map((alt, index) => (
                                                <li key={index}>{typeof alt === 'string' ? alt : JSON.stringify(alt)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>{typeof analysisData.aiAnalysis.claudeInsights.alternatives === 'string' 
                                              ? analysisData.aiAnalysis.claudeInsights.alternatives 
                                              : JSON.stringify(analysisData.aiAnalysis.claudeInsights.alternatives)}</p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.risks && (
                                        <div className="ai-risks">
                                          <strong>Risk Assessment:</strong>
                                          {Array.isArray(analysisData.aiAnalysis.claudeInsights.risks) ? (
                                            <ul>
                                              {analysisData.aiAnalysis.claudeInsights.risks.map((risk, index) => (
                                                <li key={index}>{typeof risk === 'string' ? risk : JSON.stringify(risk)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>{typeof analysisData.aiAnalysis.claudeInsights.risks === 'string' 
                                              ? analysisData.aiAnalysis.claudeInsights.risks 
                                              : JSON.stringify(analysisData.aiAnalysis.claudeInsights.risks)}</p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {analysisData.aiAnalysis.claudeInsights.confidence && (
                                        <div className="ai-confidence">
                                          <strong>Confidence Level:</strong>
                                          <p>{typeof analysisData.aiAnalysis.claudeInsights.confidence === 'string' 
                                            ? analysisData.aiAnalysis.claudeInsights.confidence 
                                            : JSON.stringify(analysisData.aiAnalysis.claudeInsights.confidence)}</p>
                                        </div>
                                      )}
                                      
                                      {/* Fallback for any other structured data */}
                                      {Object.keys(analysisData.aiAnalysis.claudeInsights).length === 0 && (
                                        <div className="ai-raw-response">
                                          <strong>AI Response:</strong>
                                          <pre style={{whiteSpace: 'pre-wrap', fontSize: '12px'}}>
                                            {JSON.stringify(analysisData.aiAnalysis.claudeInsights, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    </details>
                  </div>
                )}

                {/* Clinical Assessment - Collapsible Major Section */}
                {analysisData.enhancedRecommendations?.clinical && 
                 analysisData.enhancedRecommendations.clinical.some(rec => rec.length > 200) && (
                  <div className="analysis-section clinical-assessment-major">
                    <details className="clinical-assessment-toggle">
                      <summary className="clinical-assessment-header">
                        Clinical Assessment
                      </summary>
                    <div className="clinical-assessment-content">
                      {analysisData.enhancedRecommendations.clinical
                        .filter(rec => rec.length > 200)
                        .map((clinicalAnalysis, index) => (
                          <div key={index} className="clinical-analysis-full">
                            {clinicalAnalysis.split('\n').map((line, lineIndex) => {
                              if (line.trim() === '') return null;
                              
                              // Major section headers
                              if (line.includes('DECISION SUMMARY:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Clinical Decision Summary</h5>
                                  </div>
                                );
                              }
                              
                              if (line.includes('PRIMARY RATIONALE:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Primary Rationale</h5>
                                  </div>
                                );
                              }
                              
                              if (line.includes('SUPPORTING EVIDENCE:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Supporting Evidence</h5>
                                  </div>
                                );
                              }
                              
                              if (line.includes('RISK ASSESSMENT:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Risk Assessment</h5>
                                  </div>
                                );
                              }
                              
                              if (line.includes('CONFIDENCE LEVEL:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Confidence Level</h5>
                                  </div>
                                );
                              }
                              
                              if (line.includes('CLINICAL IMPLICATIONS:')) {
                                return (
                                  <div key={lineIndex} className="clinical-major-section">
                                    <h5 className="clinical-major-header">Clinical Implications</h5>
                                  </div>
                                );
                              }
                              
                              // Risk categories and subsections
                              if (line.includes('HIGH RISKS:') || line.includes('MITIGATION STRATEGIES:') || 
                                  line.includes('MONITORING PLAN:')) {
                                return <h6 key={lineIndex} className="clinical-subsection-header">{line}</h6>;
                              }
                              
                              // Evidence bullet points
                              if (line.trim().startsWith('- ')) {
                                return (
                                  <div key={lineIndex} className="clinical-evidence-point">
                                    <span className="evidence-bullet">•</span>
                                    <span className="evidence-text">{line.substring(2)}</span>
                                  </div>
                                );
                              }
                              
                              // Handle detailed clinical analysis JSON
                              if (line.includes('DETAILED CLINICAL ANALYSIS:')) {
                                return (
                                  <div key={lineIndex} className="clinical-detailed-section">
                                    <h5 className="clinical-major-header">Detailed Clinical Analysis</h5>
                                  </div>
                                );
                              }
                              
                              if (line.trim().startsWith('{')) {
                                try {
                                  const jsonData = JSON.parse(line);
                                  return (
                                    <div key={lineIndex} className="clinical-structured-analysis">
                                      {/* Dataset Suitability Card */}
                                      {jsonData.dataset_suitability && (
                                        <div className="clinical-insight-card dataset-card">
                                          <h6>Dataset Suitability Assessment</h6>
                                          <div className="assessment-status">
                                            <span className="status-label">Overall Assessment:</span>
                                            <span className={`status-value ${jsonData.dataset_suitability.overall_assessment?.toLowerCase().replace(/\s+/g, '-')}`}>
                                              {jsonData.dataset_suitability.overall_assessment}
                                            </span>
                                          </div>
                                          <div className="assessment-status">
                                            <span className="status-label">Regulatory Readiness:</span>
                                            <span className="status-value regulatory">
                                              {jsonData.dataset_suitability.regulatory_readiness}
                                            </span>
                                          </div>
                                          
                                          {jsonData.dataset_suitability.strengths && (
                                            <div className="strengths-section">
                                              <strong>Key Strengths:</strong>
                                              <ul className="strengths-list">
                                                {jsonData.dataset_suitability.strengths.slice(0, 4).map((strength, i) => (
                                                  <li key={i}>{strength}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          
                                          {jsonData.dataset_suitability.limitations && (
                                            <div className="limitations-section">
                                              <strong>Critical Limitations:</strong>
                                              <ul className="limitations-list">
                                                {jsonData.dataset_suitability.limitations.slice(0, 3).map((limitation, i) => (
                                                  <li key={i}>{limitation}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Biomarker Quality Card */}
                                      {jsonData.biomarker_quality_assessment && (
                                        <div className="clinical-insight-card biomarker-card">
                                          <h6>🧬 Biomarker Quality Assessment</h6>
                                          <div className="biomarker-grid">
                                            {jsonData.biomarker_quality_assessment.fda_relevant_biomarkers && (
                                              <div className="biomarker-metric">
                                                <span className="metric-label">FDA-Relevant Biomarkers:</span>
                                                <span className="metric-value">{jsonData.biomarker_quality_assessment.fda_relevant_biomarkers.count || 'Multiple'}</span>
                                              </div>
                                            )}
                                            {jsonData.biomarker_quality_assessment.protein_biomarker_quality && (
                                              <div className="biomarker-metric">
                                                <span className="metric-label">Total Proteins:</span>
                                                <span className="metric-value">{jsonData.biomarker_quality_assessment.protein_biomarker_quality.total_proteins}</span>
                                              </div>
                                            )}
                                            {jsonData.biomarker_quality_assessment.mutation_panel_quality && (
                                              <div className="biomarker-metric">
                                                <span className="metric-label">Clinical Significance:</span>
                                                <span className="metric-value">{jsonData.biomarker_quality_assessment.mutation_panel_quality.clinical_significance}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Regulatory Compliance Card */}
                                      {jsonData.regulatory_compliance && (
                                        <div className="clinical-insight-card regulatory-card">
                                          <h6>Regulatory Compliance Status</h6>
                                          <div className="regulatory-status">
                                            <span className="status-label">FDA Submission Readiness:</span>
                                            <span className="status-value">{jsonData.regulatory_compliance.fda_submission_readiness?.current_status}</span>
                                          </div>
                                          {jsonData.regulatory_compliance.regulatory_pathway && (
                                            <div className="regulatory-pathway">
                                              <strong>Recommended Pathway:</strong> {jsonData.regulatory_compliance.regulatory_pathway.recommended_route}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Complete Analysis Toggle */}
                                      <details className="full-clinical-analysis-toggle">
                                        <summary>View Complete Technical Analysis</summary>
                                        <pre className="clinical-json-display">{JSON.stringify(jsonData, null, 2)}</pre>
                                      </details>
                                    </div>
                                  );
                                } catch (e) {
                                  return null;
                                }
                              }
                              
                              // Regular paragraphs
                              return <p key={lineIndex} className="clinical-paragraph">{line}</p>;
                            })}
                          </div>
                        ))}
                    </div>
                    </details>
                  </div>
                )}

                {/* Recommendations */}
                {analysisData.enhancedRecommendations && (
                  <div className="analysis-section enhanced-recommendations">
                    <h4>Recommendations</h4>
                    <div className="recommendations-grid">
                      {Object.entries(analysisData.enhancedRecommendations).map(([category, recommendations]) => (
                        recommendations.length > 0 && category !== 'clinical' && (
                          <div key={category} className="recommendation-category">
                            <h5 className="category-title">
                              {category.charAt(0).toUpperCase() + category.slice(1)} 
                              <span className="rec-count">({recommendations.length})</span>
                            </h5>
                            <ul className="recommendation-list">
                              {recommendations.map((rec, index) => (
                                <li key={index} className={`recommendation-item ${category}`}>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      ))}
                      
                      {/* Clinical Summary - Short Items Only */}
                      {analysisData.enhancedRecommendations.clinical && 
                       analysisData.enhancedRecommendations.clinical.some(rec => rec.length <= 200) && (
                        <div className="recommendation-category">
                          <h5 className="category-title">
                            Clinical 
                            <span className="rec-count">({analysisData.enhancedRecommendations.clinical.filter(rec => rec.length <= 200).length})</span>
                          </h5>
                          <ul className="recommendation-list">
                            {analysisData.enhancedRecommendations.clinical
                              .filter(rec => rec.length <= 200)
                              .map((rec, index) => (
                                <li key={index} className="recommendation-item clinical">
                                  {rec}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="analysis-section">
                  <h4>Summary</h4>
                  <div className="summary-content">
                    <p><strong>Overview:</strong> {analysisData.worksheets[selectedWorksheet].summary.overview}</p>
                    <p><strong>Data Quality:</strong> {analysisData.worksheets[selectedWorksheet].summary.dataQuality}</p>
                    <p><strong>Variables:</strong> {analysisData.worksheets[selectedWorksheet].summary.columnBreakdown}</p>
                    <p><strong>Biomarkers:</strong> {analysisData.worksheets[selectedWorksheet].summary.biomarkerSummary}</p>
                    
                    {analysisData.worksheets[selectedWorksheet].summary.recommendations.length > 0 && (
                      <div className="recommendations">
                        <h5>Recommendations:</h5>
                        <ul>
                          {analysisData.worksheets[selectedWorksheet].summary.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .excel-analysis-container {
          padding: var(--space-lg);
          max-width: 1400px;
          margin: 0 auto;
        }

        .analysis-header {
          text-align: center;
          margin-bottom: var(--space-2xl);
        }

        .analysis-header h1 {
          color: #2D2D2D;
          margin-bottom: var(--space-md);
        }

        .upload-section {
          margin-bottom: var(--space-2xl);
        }

        .upload-zone {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-2xl);
          text-align: center;
          transition: all 0.3s ease;
          background: var(--color-background-subtle);
        }

        .upload-zone.drag-over {
          border-color: var(--color-primary);
          background: var(--color-primary-subtle);
        }

        .upload-content .upload-icon {
          font-size: 3rem;
          margin-bottom: var(--space-lg);
        }

        .file-input {
          display: none;
        }

        .loading-section {
          text-align: center;
          padding: var(--space-2xl);
        }

        .summary-section {
          margin-bottom: var(--space-2xl);
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .summary-card {
          background: var(--color-background-card);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          text-align: center;
          box-shadow: var(--shadow-md);
        }

        .summary-card.highlight {
          background: var(--color-primary-subtle);
          border: 2px solid var(--color-primary);
        }

        .summary-card h3 {
          font-size: var(--text-2xl);
          color: var(--color-primary);
          margin: 0 0 var(--space-xs) 0;
        }

        .worksheet-tabs {
          display: flex;
          margin-bottom: var(--space-lg);
          border-bottom: 1px solid var(--color-border);
        }

        .tab-button {
          padding: var(--space-md) var(--space-lg);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: var(--color-text-secondary);
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
        }

        .tab-button.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .analysis-section {
          background: var(--color-background-card);
          padding: var(--space-lg);
          margin-bottom: var(--space-md);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }

        .biomarker-tables {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .biomarker-category-title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .biomarker-count {
          background: var(--color-primary);
          color: white;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
        }

        .table-container {
          overflow-x: auto;
        }

        .biomarker-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: var(--space-lg);
        }

        .biomarker-table th,
        .biomarker-table td {
          padding: var(--space-sm) var(--space-md);
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }

        .biomarker-table th {
          background: var(--color-gray-100);
          font-weight: 600;
          color: var(--color-text);
        }

        .biomarker-table tr.fda-relevant {
          background: rgba(104, 61, 148, 0.05);
        }

        .status-badge {
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .status-badge.relevant {
          background: var(--color-primary);
          color: white;
        }

        .status-badge.not-relevant {
          background: var(--color-gray-200);
          color: var(--color-text-secondary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .stat-card {
          background: var(--color-background-subtle);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .stat-column-name {
          font-weight: 600;
          margin-bottom: var(--space-md);
          color: var(--color-primary);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--space-xs);
        }

        .stat-label {
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .data-quality-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .quality-metrics {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .quality-metric {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .metric-label {
          min-width: 150px;
          font-weight: 500;
        }

        .metric-bar {
          flex: 1;
          height: 20px;
          background: var(--color-gray-200);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.3s ease;
        }

        .metric-value {
          min-width: 80px;
          text-align: right;
          font-weight: 600;
        }

        .quality-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-md);
        }

        .quality-stat {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm);
          background: var(--color-background-card);
          border-radius: var(--radius-md);
        }

        .correlations-section {
          margin-top: var(--space-xl);
          padding-top: var(--space-xl);
          border-top: 1px solid var(--color-border);
        }

        .correlations-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .correlation-item {
          display: flex;
          justify-content: space-between;
          padding: var(--space-sm);
          background: var(--color-background-subtle);
          border-radius: var(--radius-md);
        }

        .correlation-value.positive {
          color: var(--color-primary);
          font-weight: 600;
        }

        .correlation-value.negative {
          color: var(--color-primary);
          font-weight: 600;
        }

        .recommendations ul {
          padding-left: var(--space-lg);
        }

        .recommendations li {
          margin-bottom: var(--space-sm);
        }

        /* AI Analysis Styles */
        .ai-analysis {
          border: 2px solid var(--color-primary);
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
        }

        .ai-analysis h4 {
          color: var(--color-primary);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        /* AI Analysis Toggle */
        .ai-analysis-toggle {
          width: 100%;
        }

        .ai-analysis-header {
          cursor: pointer;
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          text-align: center;
          padding: var(--space-xl);
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.1) 0%, rgba(104, 61, 148, 0.05) 100%);
          border: 2px solid rgba(104, 61, 148, 0.2);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
          transition: all 0.2s ease;
        }

        .ai-analysis-header:hover {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.15) 0%, rgba(104, 61, 148, 0.08) 100%);
          transform: translateY(-1px);
        }

        .ai-analysis-type {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--color-border);
        }

        .analysis-badge {
          background: var(--color-primary);
          color: white;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
          text-transform: uppercase;
        }

        .analysis-timestamp {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }

        .claude-insights {
          background: rgba(255, 255, 255, 0.7);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(104, 61, 148, 0.2);
        }

        .insight-section h5 {
          color: var(--color-primary);
          margin-bottom: var(--space-md);
          font-weight: 600;
        }

        .ai-decision {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-reasoning {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
        }

        .ai-summary {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-rationale {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-evidence {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-alternatives {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-risks {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-confidence {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .ai-raw-response {
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .structured-insights > div {
          margin-bottom: var(--space-md);
        }

        .structured-insights ul {
          margin: var(--space-sm) 0;
          padding-left: var(--space-lg);
        }

        .structured-insights li {
          margin-bottom: var(--space-xs);
          line-height: 1.5;
        }

        /* Enhanced Decision Formatting */
        .decision-content {
          margin-top: var(--space-md);
        }

        .formatted-decision {
          line-height: 1.6;
        }

        .decision-header {
          color: var(--color-primary);
          font-size: var(--text-lg);
          font-weight: 700;
          margin: var(--space-lg) 0 var(--space-md) 0;
          padding-bottom: var(--space-xs);
          border-bottom: 2px solid var(--color-primary);
        }

        .risk-category {
          color: var(--color-primary);
          font-size: var(--text-md);
          font-weight: 600;
          margin: var(--space-md) 0 var(--space-sm) 0;
        }

        .evidence-point {
          color: var(--color-text);
          margin: var(--space-xs) 0;
          padding-left: var(--space-md);
          border-left: 3px solid var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-sm);
          list-style: none;
        }

        .decision-paragraph {
          margin: var(--space-sm) 0;
          color: var(--color-text);
          line-height: 1.6;
        }

        .json-display {
          background: var(--color-gray-50);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: var(--text-sm);
          overflow-x: auto;
          white-space: pre-wrap;
          margin: var(--space-md) 0;
        }

        .json-indicator {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin: var(--space-md) 0;
          text-align: center;
          color: var(--color-primary);
        }

        .structured-analysis-summary {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
          border: 1px solid rgba(104, 61, 148, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          margin: var(--space-lg) 0;
        }

        .structured-analysis-summary h5 {
          color: var(--color-primary);
          margin-bottom: var(--space-md);
          font-size: var(--text-lg);
          font-weight: 600;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }

        .analysis-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
        }

        .analysis-card h6 {
          color: var(--color-primary);
          font-weight: 600;
          margin-bottom: var(--space-sm);
          font-size: var(--text-md);
        }

        .analysis-card ul {
          margin: var(--space-sm) 0;
          padding-left: var(--space-lg);
        }

        .analysis-card li {
          margin-bottom: var(--space-xs);
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }

        .full-analysis-details {
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-md);
          margin-top: var(--space-md);
        }

        .full-analysis-details summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--color-primary);
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          background: rgba(104, 61, 148, 0.05);
          transition: background 0.2s ease;
        }

        .full-analysis-details summary:hover {
          background: rgba(104, 61, 148, 0.1);
        }

        .json-block {
          background: var(--color-gray-50);
          border-left: 3px solid var(--color-warning);
          padding: var(--space-sm);
          margin: var(--space-xs) 0;
          font-family: monospace;
          font-size: var(--text-sm);
          word-break: break-all;
        }

        .ai-error {
          background: rgba(239, 68, 68, 0.1);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-error);
        }

        /* Enhanced Recommendations Styles */
        .enhanced-recommendations {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
          border: 1px solid rgba(104, 61, 148, 0.3);
        }

        .enhanced-recommendations h4 {
          color: var(--color-primary);
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-lg);
        }

        .recommendation-category {
          background: rgba(255, 255, 255, 0.8);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
          font-weight: 600;
          color: var(--color-text);
        }

        .rec-count {
          background: var(--color-primary);
          color: white;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
        }

        .recommendation-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .recommendation-item {
          padding: var(--space-sm) var(--space-md);
          margin-bottom: var(--space-sm);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--color-border);
          background: var(--color-background-subtle);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .recommendation-item.immediate {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        .recommendation-item.regulatory {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        .recommendation-item.clinical {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        .recommendation-item.statistical {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        .recommendation-item.aiInsights {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        .recommendation-item.dataQuality {
          border-left-color: var(--color-primary);
          background: rgba(104, 61, 148, 0.05);
        }

        /* Clinical Recommendation Specific Styles */
        .long-recommendation {
          width: 100%;
        }

        .rec-summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--color-primary);
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          background: rgba(104, 61, 148, 0.05);
          border: 1px solid rgba(104, 61, 148, 0.2);
          transition: background 0.2s ease;
          margin-bottom: var(--space-sm);
        }

        .rec-summary:hover {
          background: rgba(104, 61, 148, 0.1);
        }

        .rec-content {
          padding: var(--space-md);
          background: rgba(255, 255, 255, 0.5);
          border-radius: var(--radius-md);
          margin-top: var(--space-sm);
        }

        .clinical-section-header {
          color: var(--color-primary);
          font-size: var(--text-md);
          font-weight: 700;
          margin: var(--space-md) 0 var(--space-sm) 0;
          padding-bottom: var(--space-xs);
          border-bottom: 2px solid var(--color-primary);
        }

        .clinical-subsection {
          color: var(--color-primary);
          font-size: var(--text-sm);
          font-weight: 600;
          margin: var(--space-md) 0 var(--space-sm) 0;
        }

        .clinical-bullet {
          color: var(--color-text);
          margin: var(--space-xs) 0;
          padding: var(--space-xs) var(--space-md);
          background: rgba(104, 61, 148, 0.05);
          border-left: 3px solid var(--color-primary);
          border-radius: var(--radius-sm);
          list-style: none;
        }

        .clinical-paragraph {
          margin: var(--space-sm) 0;
          color: var(--color-text);
          line-height: 1.6;
          font-size: var(--text-sm);
        }

        .clinical-json-start {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin: var(--space-md) 0;
          text-align: center;
          color: var(--color-primary);
          font-weight: 600;
        }

        .clinical-structured-data {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
          border: 1px solid rgba(104, 61, 148, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          margin: var(--space-md) 0;
        }

        .clinical-structured-data h6 {
          color: var(--color-primary);
          margin-bottom: var(--space-md);
          font-size: var(--text-md);
          font-weight: 600;
        }

        .clinical-insight-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin-bottom: var(--space-md);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .clinical-insight-card strong {
          color: var(--color-primary);
        }

        .full-clinical-json {
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-md);
          margin-top: var(--space-md);
        }

        .full-clinical-json summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--color-primary);
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          background: rgba(104, 61, 148, 0.05);
          transition: background 0.2s ease;
        }

        .full-clinical-json summary:hover {
          background: rgba(104, 61, 148, 0.1);
        }

        .clinical-json-display {
          background: var(--color-gray-50);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: var(--text-xs);
          overflow-x: auto;
          white-space: pre-wrap;
          margin: var(--space-md) 0;
          max-height: 400px;
          overflow-y: auto;
        }

        /* Major Clinical Assessment Section */
        .clinical-assessment-major {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.03) 0%, rgba(104, 61, 148, 0.03) 100%);
          border: 2px solid rgba(104, 61, 148, 0.2);
          margin: var(--space-xl) 0;
          padding: var(--space-xl);
        }

        .clinical-assessment-major h4 {
          color: var(--color-primary);
          font-size: var(--text-xl);
          margin-bottom: var(--space-lg);
          text-align: center;
          border-bottom: 3px solid var(--color-primary);
          padding-bottom: var(--space-md);
        }

        .clinical-assessment-content {
          max-width: none;
        }

        .clinical-analysis-full {
          background: rgba(255, 255, 255, 0.8);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-lg);
        }

        .clinical-major-section {
          margin: var(--space-xl) 0 var(--space-lg) 0;
        }

        .clinical-major-header {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          margin: 0;
          padding: var(--space-md);
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.1) 0%, rgba(104, 61, 148, 0.05) 100%);
          border-left: 5px solid var(--color-primary);
          border-radius: var(--radius-md);
        }

        .clinical-subsection-header {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--color-primary);
          margin: var(--space-lg) 0 var(--space-md) 0;
          padding: var(--space-sm) var(--space-md);
          background: rgba(104, 61, 148, 0.05);
          border-left: 4px solid var(--color-primary);
          border-radius: var(--radius-sm);
        }

        .clinical-evidence-point {
          display: flex;
          align-items: flex-start;
          margin: var(--space-md) 0;
          padding: var(--space-md);
          background: rgba(104, 61, 148, 0.05);
          border-left: 4px solid var(--color-primary);
          border-radius: var(--radius-md);
        }

        .evidence-bullet {
          color: var(--color-primary);
          font-weight: bold;
          margin-right: var(--space-md);
          font-size: var(--text-lg);
        }

        .evidence-text {
          flex: 1;
          line-height: 1.6;
          color: var(--color-text);
        }

        .clinical-structured-analysis {
          margin: var(--space-xl) 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-lg);
        }

        .clinical-insight-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .clinical-insight-card h6 {
          font-size: var(--text-lg);
          font-weight: 600;
          margin-bottom: var(--space-lg);
          color: var(--color-primary);
          border-bottom: 2px solid var(--color-border);
          padding-bottom: var(--space-sm);
        }

        .dataset-card {
          border-left: 5px solid var(--color-primary);
        }

        .biomarker-card {
          border-left: 5px solid var(--color-primary);
        }

        .regulatory-card {
          border-left: 5px solid var(--color-primary);
        }

        .assessment-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: var(--space-md) 0;
          padding: var(--space-md);
          background: var(--color-gray-50);
          border-radius: var(--radius-md);
        }

        .status-label {
          font-weight: 600;
          color: var(--color-text);
        }

        .status-value {
          font-weight: 700;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
        }

        .status-value.suitable-with-modifications {
          background: rgba(104, 61, 148, 0.1);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .status-value.regulatory {
          background: rgba(104, 61, 148, 0.1);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .biomarker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-md);
          margin-top: var(--space-md);
        }

        .biomarker-metric {
          display: flex;
          flex-direction: column;
          padding: var(--space-md);
          background: var(--color-gray-50);
          border-radius: var(--radius-md);
        }

        .metric-label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-xs);
        }

        .metric-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-primary);
        }

        .strengths-section, .limitations-section {
          margin: var(--space-lg) 0;
        }

        .strengths-list li {
          color: var(--color-primary);
          margin: var(--space-sm) 0;
        }

        .limitations-list li {
          color: var(--color-primary);
          margin: var(--space-sm) 0;
        }

        .regulatory-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: var(--space-md) 0;
          padding: var(--space-md);
          background: var(--color-gray-50);
          border-radius: var(--radius-md);
        }

        .regulatory-pathway {
          margin: var(--space-md) 0;
          padding: var(--space-md);
          background: rgba(104, 61, 148, 0.05);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--color-primary);
        }

        .full-clinical-analysis-toggle {
          margin-top: var(--space-xl);
          border-top: 2px solid var(--color-border);
          padding-top: var(--space-lg);
        }

        .full-clinical-analysis-toggle summary {
          cursor: pointer;
          font-weight: 600;
          color: var(--color-primary);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          background: rgba(104, 61, 148, 0.05);
          border: 1px solid rgba(104, 61, 148, 0.2);
          transition: all 0.2s ease;
          text-align: center;
        }

        .full-clinical-analysis-toggle summary:hover {
          background: rgba(104, 61, 148, 0.1);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(104, 61, 148, 0.15);
        }

        @media (min-width: 1024px) {
          .clinical-structured-analysis {
            grid-template-columns: 1fr 1fr;
          }
          
          .clinical-insight-card:last-child {
            grid-column: 1 / -1;
          }
        }

        /* Simplified Key Metrics */
        .key-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-xl);
          margin: var(--space-xl) 0;
          padding: var(--space-xl) 0;
          border-bottom: 1px solid var(--color-border);
        }

        .metric-card {
          text-align: center;
          padding: var(--space-xl);
          background: var(--color-background-card);
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .metric-card.primary {
          border-color: var(--color-primary);
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
        }

        .metric-value {
          font-size: var(--text-3xl);
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }

        .metric-label {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        /* Clinical Assessment Toggle */
        .clinical-assessment-toggle {
          width: 100%;
        }

        .clinical-assessment-header {
          cursor: pointer;
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          text-align: center;
          padding: var(--space-xl);
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.1) 0%, rgba(104, 61, 148, 0.05) 100%);
          border: 2px solid rgba(104, 61, 148, 0.2);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
          transition: all 0.2s ease;
        }

        .clinical-assessment-header:hover {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.15) 0%, rgba(104, 61, 148, 0.08) 100%);
          transform: translateY(-1px);
        }

        /* Patient Selection Criteria Styles */
        .patient-selection-criteria {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.03) 0%, rgba(104, 61, 148, 0.03) 100%);
          border: 2px solid rgba(104, 61, 148, 0.2);
        }

        .selection-tabs {
          width: 100%;
        }

        .tab-navigation {
          display: flex;
          margin-bottom: var(--space-xl);
          border-bottom: 2px solid var(--color-border);
          gap: var(--space-md);
        }

        .tab-btn {
          padding: var(--space-lg) var(--space-xl);
          background: var(--color-background-subtle);
          border: 1px solid var(--color-border);
          border-bottom: none;
          cursor: pointer;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          transition: all 0.2s ease;
          font-size: var(--text-md);
        }

        .tab-btn:hover {
          background: var(--color-background-card);
          color: var(--color-text);
        }

        .tab-btn.active {
          background: var(--color-background-card);
          color: var(--color-primary);
          border-color: var(--color-primary);
          border-bottom: 2px solid var(--color-background-card);
          margin-bottom: -2px;
        }

        .tab-content {
          min-height: 300px;
        }

        .tab-panel {
          display: none;
        }

        .tab-panel.active {
          display: block;
        }

        .selection-criteria-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xl);
        }

        .criteria-category {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-lg);
          margin-bottom: var(--space-md);
        }

        .criteria-category:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .criteria-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
          padding-bottom: var(--space-sm);
          border-bottom: 1px solid var(--color-border);
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .criteria-category-title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          margin: 0;
        }

        .criteria-count {
          background: var(--color-primary);
          color: white;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .criteria-priority {
          display: flex;
          align-items: center;
        }

        .priority-badge {
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
          text-transform: uppercase;
        }

        .priority-badge.high {
          background: rgba(104, 61, 148, 0.15);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .priority-badge.medium {
          background: rgba(104, 61, 148, 0.1);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .priority-badge.low {
          background: rgba(104, 61, 148, 0.05);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .criteria-recommendations {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .criteria-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          background: var(--color-background-subtle);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--color-primary);
          margin-bottom: var(--space-sm);
          transition: all 0.2s ease;
        }

        .criteria-item:hover {
          background: var(--color-background-card);
          transform: translateX(2px);
        }

        .criteria-icon {
          font-size: var(--text-xl);
          display: flex;
          align-items: center;
        }

        .criteria-text {
          font-weight: 500;
          color: var(--color-text);
          line-height: 1.5;
        }

        .biomarker-detail {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-xs);
        }

        .biomarker-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text);
        }

        .criteria-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          flex: 1;
        }

        .data-insights {
          margin-top: var(--space-xs);
        }

        .data-range {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          font-family: monospace;
        }

        .data-categories {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .outlier-warning {
          color: var(--color-primary);
          font-weight: 600;
        }

        .badges {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          align-items: flex-end;
        }

        .numeric-badge {
          background: var(--color-primary);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 10px;
          font-weight: 600;
        }

        .fda-badge {
          background: var(--color-primary);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 10px;
          font-weight: 600;
        }

        .criteria-summary {
          margin-top: var(--space-2xl);
          padding-top: var(--space-xl);
          border-top: 2px solid var(--color-border);
        }

        .criteria-summary h5 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .strategy-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-lg);
        }

        .strategy-card {
          padding: var(--space-xl);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .strategy-card.enrollment {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
          border-left: 4px solid var(--color-primary);
        }

        .strategy-card.regulatory {
          background: linear-gradient(135deg, rgba(104, 61, 148, 0.05) 0%, rgba(104, 61, 148, 0.02) 100%);
          border-left: 4px solid var(--color-primary);
        }

        .strategy-card h6 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .strategy-card p {
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* Trial Design Styles */
        .trial-design {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(168, 85, 247, 0.03) 100%);
          border: 2px solid rgba(99, 102, 241, 0.2);
        }

        .trial-recommendations {
          width: 100%;
        }

        .recommendation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--space-xl);
        }

        .trial-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          transition: all 0.2s ease;
        }

        .trial-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .trial-card.population {
          border-left: 4px solid var(--color-primary);
        }

        .trial-card.enrollment {
          border-left: 4px solid var(--color-primary);
        }

        .trial-card h5 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-md);
        }

        .trial-card p {
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-lg);
        }

        .population-metrics {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .metric {
          display: flex;
          justify-content: space-between;
          padding: var(--space-md);
          background: var(--color-gray-50);
          border-radius: var(--radius-md);
        }

        .metric-label {
          font-weight: 600;
          color: var(--color-text);
        }

        .metric-value {
          font-weight: 700;
          color: var(--color-primary);
        }

        .strategy-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .strategy-list li {
          padding: var(--space-sm) 0;
          color: var(--color-text);
          border-bottom: 1px solid var(--color-border);
        }

        .strategy-list li:last-child {
          border-bottom: none;
        }

        .strategy-list li::before {
          content: '';
          color: var(--color-primary);
          font-weight: bold;
          margin-right: var(--space-sm);
        }

        /* Enhanced Selection Card Styles */
        .selection-card {
          text-align: center;
          padding: var(--space-lg);
          background: var(--color-background-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .selection-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--color-border);
          transition: background 0.2s ease;
        }

        .selection-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .selection-card.primary::before {
          background: var(--color-primary);
        }

        .selection-card.success::before {
          background: var(--color-primary);
        }

        .selection-card.warning::before {
          background: var(--color-primary);
        }

        .selection-card.secondary::before {
          background: var(--color-primary);
        }

        .selection-icon {
          font-size: 2rem;
          margin-bottom: var(--space-sm);
        }

        .selection-value {
          font-size: var(--text-3xl);
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }

        .selection-label {
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: var(--space-xs);
        }

        .selection-sublabel {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }

        /* Increased spacing between sections */
        .analysis-section {
          margin: var(--space-2xl) 0;
        }

        .analysis-section h4 {
          margin-bottom: var(--space-xl);
          font-size: var(--text-xl);
          padding-bottom: var(--space-md);
          border-bottom: 2px solid var(--color-border);
        }

        @media (max-width: 768px) {
          .key-metrics {
            grid-template-columns: 1fr;
            gap: var(--space-lg);
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .quality-details {
            grid-template-columns: 1fr;
          }

          .patient-selection-overview {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-md);
          }

          .tab-navigation {
            flex-direction: column;
          }

          .criteria-item {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .biomarker-detail {
            align-items: center;
          }

          .strategy-cards {
            grid-template-columns: 1fr;
          }

          .recommendation-grid {
            grid-template-columns: 1fr;
          }

          .trial-card {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default ExcelAnalysis;