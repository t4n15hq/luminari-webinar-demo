import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUpload, ResultsChat } from './common';
import apiService from '../services/api';
import {
  ArrowLeftIcon,
  UploadIcon,
  ActivityIcon,
  FileTextIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  HomeIcon,
  ClockIcon,
  BarChartIcon
} from './icons/MedicalIcons';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import ResultsChart from './common/ResultsChart';
import './LungCancerDetector.css';

const LungCancerDetector = () => {
  // Analysis mode state - 'single' or 'batch'
  const [analysisMode, setAnalysisMode] = useState('single');
  const [showAskLumina, setShowAskLumina] = useState(false);

  // Single analysis states
  const [transcript, setTranscript] = useState('');
  const [textPrediction, setTextPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Batch processing states
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showResultsChat, setShowResultsChat] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const handleBatchFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    const batchItems = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'pending',
      prediction: null,
      transcript: '',
      error: null
    }));
    
    setBatchFiles(batchItems);
    setBatchResults([]);
  };

  const addManualText = () => {
    const textEntry = {
      id: Date.now(),
      file: null,
      name: `Manual Text Entry ${batchFiles.length + 1}`,
      type: 'text/plain',
      size: 0,
      status: 'pending',
      prediction: null,
      transcript: '',
      error: null,
      isManual: true
    };
    
    setBatchFiles(prev => [...prev, textEntry]);
  };

  const updateBatchText = (id, text) => {
    setBatchFiles(prev => prev.map(item => 
      item.id === id ? { ...item, transcript: text } : item
    ));
  };

  const removeBatchFile = (id) => {
    setBatchFiles(prev => prev.filter(item => item.id !== id));
  };

  const processBatch = async () => {
    setBatchLoading(true);
    setBatchProgress(0);
    setProcessingStatus('Starting batch processing...');
    
    const results = [];
    
    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      setProcessingStatus(`Processing ${item.name} (${i + 1}/${batchFiles.length})`);
      
      try {
        // Update status to processing
        setBatchFiles(prev => prev.map(file => 
          file.id === item.id ? { ...file, status: 'processing' } : file
        ));

        let textToAnalyze = '';
        
        if (item.isManual) {
          // Use manually entered text
          textToAnalyze = item.transcript;
        } else if (item.file) {
          // Process file based on type
          if (item.type.startsWith('text') || item.name.endsWith('.txt')) {
            textToAnalyze = await item.file.text();
          } else if (item.type.startsWith('audio')) {
            // Use OpenAI Whisper for audio transcription
            const openaiService = await import('../services/openaiService');
            textToAnalyze = await openaiService.default.transcribeAudio(item.file);
          } else {
            throw new Error('Unsupported file type');
          }
        }

        if (!textToAnalyze.trim()) {
          throw new Error('No text content to analyze');
        }

        // Analyze text for lung cancer
        const response = await apiService.predictLungCancerText({
          text: textToAnalyze
        });

        const result = {
          ...item,
          status: 'completed',
          prediction: {
            prediction: response.prediction,
            probability: response.probability,
            detected: response.probability >= 0.35
          },
          transcript: textToAnalyze,
          confidence: response.probability
        };

        results.push(result);
        
        // Update individual file status
        setBatchFiles(prev => prev.map(file => 
          file.id === item.id ? result : file
        ));

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        const errorResult = {
          ...item,
          status: 'error',
          error: error.message || 'Processing failed',
          prediction: null
        };
        results.push(errorResult);
        
        setBatchFiles(prev => prev.map(file => 
          file.id === item.id ? errorResult : file
        ));
      }
      
      setBatchProgress(((i + 1) / batchFiles.length) * 100);
    }
    
    setBatchResults(results);
    setBatchLoading(false);
    setProcessingStatus('Batch processing completed!');
  };

  const exportBatchResults = () => {
    const csvContent = [
      ['File Name', 'Type', 'Cancer Detected', 'Confidence (%)', 'Status', 'Text Preview', 'Error'],
      ...batchResults.map(result => [
        result.name,
        result.isManual ? 'Manual Text' : result.type,
        result.prediction?.detected ? 'Yes' : 'No',
        result.prediction?.probability ? (result.prediction.probability * 100).toFixed(1) : 'N/A',
        result.status,
        result.transcript ? result.transcript.substring(0, 100) + '...' : 'N/A',
        result.error || 'None'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lung_cancer_batch_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTextPredict = async () => {
    if (!transcript.trim()) {
      // TODO: Replace with user-friendly notification system
      // alert('Please provide text to analyze.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Analyzing text for cancer detection...');

    const timeout = setTimeout(() => {
      setLoadingMessage('Starting up analysis service, please wait...');
    }, 5000);

    try {
      const response = await apiService.predictLungCancerText({
        text: transcript
      });
      
      clearTimeout(timeout);
      
      setTextPrediction({
        prediction: response.prediction,
        probability: response.probability,
        detected: response.probability >= 0.35
      });

      // Removed localStorage data saving

    } catch (error) {
      clearTimeout(timeout);
      // console.error('Text prediction error:', error);
      setTextPrediction({
        prediction: null,
        probability: 0,
        detected: false,
        error: 'Unable to analyze text. Please try again.'
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const resetAnalysis = () => {
    setTranscript('');
    setTextPrediction(null);
    setIsLoading(false);
    setLoadingMessage('');
  };

  const goToPage = (path) => {
    // Removed localStorage data saving
    window.location.href = path;
  };
  
  const getBatchSummary = () => {
    const totalFiles = batchResults.length;
    const detectedCases = batchResults.filter(r => r.prediction?.detected).length;
    const avgConfidence = detectedCases > 0 
      ? batchResults
          .filter(r => r.prediction?.detected)
          .reduce((sum, r) => sum + r.prediction.probability, 0) / detectedCases
      : 0;

    return { totalFiles, detectedCases, avgConfidence };
  };

  return (
    <div className="lung-cancer-detector" style={{ position: 'relative' }}>
      {/* Ask Lumina Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Pulmonology - Lung Cancer Risk Assessment"
      />

      {/* Professional Ask Lumina Floating Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon="AI"
        label="Ask Lumina™"
        variant="primary"
      />

      {showResultsChat && (
        <ResultsChat
          results={batchResults}
          onClose={() => setShowResultsChat(false)}
          contextName="Lung Cancer Batch Analysis"
        />
      )}
      {showChart && (
        <ResultsChart
          results={batchResults}
          onClose={() => setShowChart(false)}
          contextName="Lung Cancer Batch Analysis"
        />
      )}
      {/* Top Navigation Section */}
      <div className="page-navigation">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">/</span>
          <Link to="/diagnosis">Disease Diagnosis</Link>
          <span className="separator">/</span>
          <span>Pulmonology</span>
        </div>
        
        <Link to="/diagnosis" className="btn btn-secondary btn-sm">
          <ArrowLeftIcon size={16} />
          Back to Specialties
        </Link>
      </div>

      {/* Page Header Section */}
      <div className="page-header">
        <h1>Pulmonology Text Analysis</h1>
        <p>Clinical decision support tool for lung cancer risk assessment</p>
      </div>

      {/* Analysis Type Tabs */}
      <div className="analysis-tabs">
        <button
          className={`btn ${analysisMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAnalysisMode('single')}
        >
          Text Analysis
        </button>
        <button
          className={`btn ${analysisMode === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAnalysisMode('batch')}
        >
          Batch Processing
        </button>
        <button
          className="btn btn-secondary"
          disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          Video Analysis (Coming Soon)
        </button>
      </div>

      {/* Single Analysis Section */}
      {analysisMode === 'single' && (
        <div className="analysis-content">
          {/* Upload Card for Audio Files */}
          <div className="upload-card">
            <h3>Upload Audio File</h3>
            <FileUpload onTranscript={setTranscript} />
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '10px' }}>
              Upload MP3, WAV, or other audio files containing medical consultations or patient interviews
            </p>
          </div>

          {/* Manual Text Input */}
          <div className="upload-card" style={{ marginTop: '20px' }}>
            <h3>Or Enter Medical Text</h3>
            <textarea
              className="form-textarea"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter clinical notes, patient history, medical consultation transcript, or any medical text related to respiratory symptoms..."
              rows={8}
              style={{ minHeight: '150px' }}
            />
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '10px' }}>
              Paste medical text, consultation notes, or patient descriptions of symptoms
            </p>
          </div>

          {/* Analysis Button and Results */}
          {transcript && (
            <div className="transcript-container">
              <div style={{ display: 'flex', gap: '15px', marginTop: '20px', marginBottom: '20px' }}>
                <button
                  onClick={handleTextPredict}
                  disabled={isLoading}
                  className="btn btn-primary btn-lg"
                >
                  {isLoading ? loadingMessage || 'Analyzing...' : 'Analyze for Lung Cancer'}
                </button>
                
                <button
                  onClick={resetAnalysis}
                  disabled={isLoading}
                  className="btn btn-secondary btn-lg"
                >
                  Reset
                </button>
              </div>

              {/* Text Preview */}
              <div className="transcript-box" style={{ marginBottom: '20px' }}>
                <h4>Text to Analyze:</h4>
                <div style={{ 
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '0',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e9ecef'
                }}>
                  <pre className="transcript-text" style={{ 
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    {transcript}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {textPrediction && (
            <div className="prediction-results" style={{ marginTop: 30 }}>
              <div style={{ 
                backgroundColor: '#ffffff',
                padding: '30px',
                borderRadius: '0',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  textAlign: 'center', 
                  marginBottom: 20, 
                  color: '#2d3748', 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold' 
                }}>
                  Analysis Results
                </h3>
                
                {textPrediction.error ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#dc2626', 
                    padding: '20px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '0',
                    border: '1px solid #fecaca'
                  }}>
                    <h4>× Analysis Error</h4>
                    <p>{textPrediction.error}</p>
                  </div>
                ) : (
                  <>
                    {/* Main Result */}
                    <div style={{ 
                      textAlign: 'center', 
                      marginBottom: '30px',
                      padding: '25px',
                      backgroundColor: textPrediction.detected ? '#fef2f2' : '#f0fdf4',
                      borderRadius: '0',
                      border: `2px solid ${textPrediction.detected ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      <div style={{ 
                        fontSize: '4rem', 
                        marginBottom: '15px' 
                      }}>
                        {textPrediction.detected ? '!' : 'OK'}
                      </div>
                      
                      <h2 style={{ 
                        margin: '0 0 10px 0',
                        color: textPrediction.detected ? '#dc2626' : '#16a34a',
                        fontSize: '1.8rem'
                      }}>
                        {textPrediction.detected ? 'Cancer Indicators Detected' : 'No Cancer Indicators Detected'}
                      </h2>
                      
                      <p style={{ 
                        fontSize: '1.2rem', 
                        margin: '10px 0',
                        color: '#4b5563'
                      }}>
                        <strong>Confidence:</strong> {(textPrediction.probability * 100).toFixed(1)}%
                      </p>
                      
                      <p style={{ 
                        fontSize: '0.95rem', 
                        color: '#6b7280',
                        fontStyle: 'italic',
                        marginTop: '15px'
                      }}>
                        {textPrediction.detected 
                          ? 'The analysis suggests potential lung cancer indicators in the provided text. Please consult with a healthcare professional for proper evaluation.'
                          : 'The analysis did not find significant lung cancer indicators in the provided text. This does not replace professional medical evaluation.'
                        }
                      </p>
                    </div>

                    {/* Recommendation */}
                    <div style={{ 
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '0',
                      marginBottom: '25px'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>
                        Recommendation:
                      </h4>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#4b5563' }}>
                        {textPrediction.detected 
                          ? 'Given the detected indicators, it is recommended to schedule an immediate consultation with an oncologist or pulmonologist for further diagnostic imaging and evaluation.'
                          : 'Continue routine healthcare monitoring. If new symptoms develop or existing symptoms worsen, consult with your healthcare provider.'
                        }
                      </p>
                    </div>

                    {/* Next Steps */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                      <h4 style={{ textAlign: 'center', marginBottom: '15px', color: '#374151' }}>
                        Next Steps:
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button 
                          onClick={() => goToPage('/protocol')} 
                          className="btn btn-secondary"
                        >
                          Generate Clinical Protocol
                        </button>
                        <button 
                          onClick={() => goToPage('/ind-modules')} 
                          className="btn btn-secondary"
                        >
                          Generate Regulatory Document
                        </button>
                        <button 
                          onClick={() => goToPage('/query')} 
                          className="btn btn-secondary"
                        >
                          Ask Clinical Question
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Processing Section */}
      {analysisMode === 'batch' && (
        <div className="analysis-content">
          <div className="upload-card">
            <h3>Batch File Upload</h3>
            <input 
              type="file" 
              accept=".txt,audio/*" 
              multiple 
              onChange={handleBatchFileChange}
              style={{ marginBottom: '20px' }}
            />
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
              Select multiple text files (.txt) or audio files (MP3, WAV) for batch processing.
            </p>
            
            <button
              onClick={addManualText}
              className="btn btn-primary"
            >
              Add Manual Text Entry
            </button>
          </div>
          

          {batchFiles.length > 0 && (
            <div className="batch-files-container" style={{ marginTop: '20px' }}>
              <h3>Files for Processing ({batchFiles.length})</h3>
              
              <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0', padding: '10px' }}>
                {batchFiles.map((item) => (
                  <div key={item.id} className={`batch-result-card ${item.prediction?.detected ? 'positive' : item.status === 'error' ? 'error' : item.status === 'completed' ? 'negative' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          {item.name}
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#6b7280' }}>
                            ({item.isManual ? 'Manual Text' : item.type})
                          </span>
                        </div>
                        
                        {item.isManual ? (
                          <textarea
                            value={item.transcript}
                            onChange={(e) => updateBatchText(item.id, e.target.value)}
                            placeholder="Enter medical text for analysis..."
                            rows={3}
                            className="form-textarea"
                            style={{marginBottom: '10px'}}
                          />
                        ) : (
                          item.transcript && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: '#4b5563', 
                              backgroundColor: '#f9fafb',
                              padding: '8px',
                              borderRadius: '0',
                              marginBottom: '10px',
                              maxHeight: '80px',
                              overflowY: 'auto'
                            }}>
                              {item.transcript.substring(0, 200)}...
                            </div>
                          )
                        )}
                        
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: '500' }}>Status:</span> {item.status}
                          {item.prediction && (
                            <>
                              <br />
                              <span style={{ fontWeight: '500' }}>Result:</span> 
                              <span style={{ 
                                color: item.prediction.detected ? 'var(--color-error)' : 'var(--color-success)',
                                fontWeight: 'bold',
                                marginLeft: '5px'
                              }}>
                                {item.prediction.detected ? 'Cancer Indicators Detected' : 'No Indicators'}
                              </span>
                              <span style={{ marginLeft: '10px' }}>
                                ({(item.prediction.probability * 100).toFixed(1)}% confidence)
                              </span>
                            </>
                          )}
                          {item.error && (
                            <>
                              <br />
                              <span style={{ color: 'var(--color-error)' }}>Error: {item.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => removeBatchFile(item.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={processBatch}
                  disabled={batchLoading || batchFiles.length === 0}
                  className="btn btn-primary btn-lg"
                >
                  {batchLoading ? 'Processing...' : `Analyze ${batchFiles.length} Items`}
                </button>

                {batchResults.length > 0 && !batchLoading && (
                  <>
                    <button
                      onClick={exportBatchResults}
                      className="btn btn-success btn-lg"
                    >
                      Export Results (CSV)
                    </button>
                    <button
                      onClick={() => setShowResultsChat(true)}
                      className="btn btn-secondary btn-lg"
                    >
                      Chat with Results
                    </button>
                    <button
                      onClick={() => setShowChart(true)}
                      className="btn btn-secondary btn-lg"
                    >
                      Visualize Results
                    </button>
                  </>
                )}
              </div>

              {batchResults.length > 0 && !batchLoading && (
                <div className="batch-summary">
                  <h4>Batch Summary</h4>
                  <ul>
                    <li>
                      <div className="summary-value">{getBatchSummary().totalFiles}</div>
                      <div className="summary-label">Files Analyzed</div>
                    </li>
                    <li>
                      <div className="summary-value">{getBatchSummary().detectedCases}</div>
                      <div className="summary-label">Detected Cases</div>
                    </li>
                    <li>
                      <div className="summary-value">{(getBatchSummary().avgConfidence * 100).toFixed(1)}%</div>
                      <div className="summary-label">Avg. Confidence (Detected)</div>
                    </li>
                  </ul>
                </div>
              )}

              {batchLoading && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '0', overflow: 'hidden', marginBottom: '10px' }}>
                    <div 
                      style={{ 
                        width: `${batchProgress}%`, 
                        height: '20px', 
                        backgroundColor: '#4c51bf', 
                        transition: 'width 0.3s ease' 
                      }}
                    />
                  </div>
                  <p>{processingStatus}</p>
                  <p>{batchProgress.toFixed(0)}% Complete</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const nextBtnStyle = (bg, color) => ({
  padding: '12px 20px',
  backgroundColor: bg,
  color,
  border: 'none',
  borderRadius: '0',
  cursor: 'pointer',
  fontWeight: '500',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  textAlign: 'center'
});

export default LungCancerDetector;
