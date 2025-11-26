// src/components/EnhancedMedicalAnalysis.js
// NEW COMPONENT - TIER 1 ENHANCEMENTS WITH CLAUDE API

import React, { useState } from 'react';
import claudeService from '../services/claudeService';
import './EnhancedMedicalAnalysis.css';

const EnhancedMedicalAnalysis = () => {
  // State management for all three tiers
  const [activeTab, setActiveTab] = useState('text-processing');
  const [loading, setLoading] = useState(false);

  // TIER 1 ENHANCEMENT 1: Enhanced Free Text Processing
  const [textInput, setTextInput] = useState('');
  const [extractionType, setExtractionType] = useState('comprehensive');
  const [textResults, setTextResults] = useState(null);

  // TIER 1 ENHANCEMENT 2: Pattern Recognition
  const [dataInput, setDataInput] = useState('');
  const [analysisType, setAnalysisType] = useState('correlation');
  const [patternResults, setPatternResults] = useState(null);

  // TIER 1 ENHANCEMENT 3: Decision Transparency
  const [promptInput, setPromptInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [decisionType, setDecisionType] = useState('clinical');
  const [reasoningResults, setReasoningResults] = useState(null);

  // Enhanced Text Processing Handler
  const handleTextProcessing = async () => {
    if (!textInput.trim()) {
      alert('Please enter clinical text to analyze');
      return;
    }

    setLoading(true);
    try {
      const result = await claudeService.enhancedTextProcessing(textInput, extractionType);
      setTextResults(result);
    } catch (error) {
      console.error('Text processing error:', error);
      alert('Text processing failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Pattern Recognition Handler
  const handlePatternAnalysis = async () => {
    if (!dataInput.trim()) {
      alert('Please enter data to analyze');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(dataInput);
    } catch (error) {
      alert('Please enter valid JSON data');
      return;
    }

    setLoading(true);
    try {
      const result = await claudeService.analyzePatterns(parsedData, analysisType);
      setPatternResults(result);
    } catch (error) {
      console.error('Pattern analysis error:', error);
      alert('Pattern analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Decision Transparency Handler
  const handleReasoningGeneration = async () => {
    if (!promptInput.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const result = await claudeService.generateWithReasoning(promptInput, contextInput, decisionType);
      setReasoningResults(result);
    } catch (error) {
      console.error('Reasoning generation error:', error);
      alert('Reasoning generation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'text-processing', label: 'Enhanced Text Processing' },
    { id: 'pattern-recognition', label: 'Pattern Recognition' },
    { id: 'decision-transparency', label: 'Decision Transparency' }
  ];

  return (
    <div className="unified-regulatory-generator">
      <div className="generator-header">
        <div>
          <h2>Enhanced Medical Analysis</h2>
          <p>Advanced AI-powered medical analysis with enhanced capabilities</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mode-selector">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`mode-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TIER 1 ENHANCEMENT 1: Enhanced Free Text Processing */}
      {activeTab === 'text-processing' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Enhanced Free Text Processing</h3>
            <p className="card-subtitle">Extract structured medical information from clinical text with high precision</p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="extraction-type">Extraction Type:</label>
              <select
                id="extraction-type"
                value={extractionType}
                onChange={(e) => setExtractionType(e.target.value)}
              >
                <option value="comprehensive">Comprehensive Analysis</option>
                <option value="medications">Medication Extraction</option>
                <option value="diagnoses">Diagnosis Extraction</option>
                <option value="lab-values">Laboratory Values</option>
                <option value="symptoms">Symptoms & Findings</option>
                <option value="timeline">Timeline Analysis</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="clinical-text">Clinical Text:</label>
              <textarea
                id="clinical-text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter clinical text, patient notes, medical records, etc.

Example: 
Patient is a 45-year-old male with a 3-month history of progressive dyspnea and chest pain. Physical examination reveals bilateral lower extremity edema. Laboratory results show BNP 1200 pg/mL (normal <100). Echocardiogram demonstrates reduced ejection fraction of 35%. Started on lisinopril 10mg daily and metoprolol 25mg BID."
                rows="8"
              />
            </div>

            <button
              onClick={handleTextProcessing}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Processing...' : 'Extract Medical Data'}
            </button>

          {textResults && (
            <div className="results-section">
              <h4>Extraction Results</h4>
              <div className="result-metadata">
                <span className="confidence-badge">Confidence: {(textResults.confidence * 100).toFixed(1)}%</span>
                <span className="timestamp">Generated: {new Date(textResults.timestamp).toLocaleString()}</span>
                <span className="type-badge">Type: {textResults.processingType}</span>
              </div>
              <div className="confidence-explanation">
                <small style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  Confidence Score: Indicates how certain the AI is about the accuracy of the extracted information (higher = more reliable)
                </small>
              </div>
              <div className="result-content">
                <pre>{textResults.extractedData}</pre>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* TIER 1 ENHANCEMENT 2: Pattern Recognition */}
      {activeTab === 'pattern-recognition' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pattern Recognition in Medical Data</h3>
            <p className="card-subtitle">Identify meaningful patterns, correlations, and insights in medical datasets</p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="analysis-type">Analysis Type:</label>
              <select
                id="analysis-type"
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
              >
                <option value="correlation">Correlation Analysis</option>
                <option value="treatment-efficacy">Treatment Efficacy Patterns</option>
                <option value="disease-progression">Disease Progression</option>
                <option value="patient-clustering">Patient Similarity Clustering</option>
                <option value="risk-factors">Risk Factor Identification</option>
                <option value="outcome-prediction">Outcome Prediction</option>
                <option value="regulatory-trends">Regulatory Approval Trends</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="medical-data">Medical Data (JSON format):</label>
              <textarea
                id="medical-data"
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder="Enter medical data in JSON format

Example:
{
  &quot;patients&quot;: [
    {
      &quot;id&quot;: 1,
      &quot;age&quot;: 45,
      &quot;diagnosis&quot;: &quot;Heart Failure&quot;,
      &quot;ejection_fraction&quot;: 35,
      &quot;medications&quot;: [&quot;lisinopril&quot;, &quot;metoprolol&quot;],
      &quot;outcome&quot;: &quot;improved&quot;
    },
    {
      &quot;id&quot;: 2,
      &quot;age&quot;: 52,
      &quot;diagnosis&quot;: &quot;Heart Failure&quot;,
      &quot;ejection_fraction&quot;: 28,
      &quot;medications&quot;: [&quot;enalapril&quot;, &quot;carvedilol&quot;],
      &quot;outcome&quot;: &quot;stable&quot;
    }
  ]
}"
                rows="12"
              />
            </div>

            <button
              onClick={handlePatternAnalysis}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Analyzing...' : 'Analyze Patterns'}
            </button>

          {patternResults && (
            <div className="results-section">
              <h4>Pattern Analysis Results</h4>
              <div className="result-metadata">
                <span className="confidence-badge">Confidence: {(patternResults.confidence * 100).toFixed(1)}%</span>
                <span className="timestamp">Generated: {new Date(patternResults.timestamp).toLocaleString()}</span>
                <span className="type-badge">Analysis: {patternResults.analysisType}</span>
              </div>
              <div className="confidence-explanation">
                <small style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  Confidence Score: Shows how reliable the AI considers its pattern analysis findings (higher = stronger patterns detected)
                </small>
              </div>
              <div className="result-content">
                <pre>{patternResults.patterns}</pre>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* TIER 1 ENHANCEMENT 3: Decision Transparency */}
      {activeTab === 'decision-transparency' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Decision Transparency & Reasoning</h3>
            <p className="card-subtitle">Generate responses with comprehensive reasoning and transparent decision-making</p>
          </div>
          <div className="card-body">

            <div className="form-group">
              <label htmlFor="decision-type">Decision Type:</label>
              <select
                id="decision-type"
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value)}
              >
                <option value="clinical">Clinical Decision</option>
                <option value="diagnostic">Diagnostic Assessment</option>
                <option value="treatment">Treatment Planning</option>
                <option value="regulatory">Regulatory Strategy</option>
                <option value="research">Research Design</option>
                <option value="risk-assessment">Risk Assessment</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prompt-input">Question/Prompt:</label>
              <textarea
                id="prompt-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Enter your medical question or decision prompt

Example:
Should we initiate ACE inhibitor therapy for this patient with heart failure and reduced ejection fraction?"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="context-input">Clinical Context (optional):</label>
              <textarea
                id="context-input"
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder="Provide relevant clinical context

Example:
45-year-old male with newly diagnosed heart failure, EF 35%, mild kidney dysfunction (creatinine 1.3 mg/dL), no known allergies. Currently on metoprolol 25mg BID."
                rows="4"
              />
            </div>

            <button
              onClick={handleReasoningGeneration}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Reasoning...' : 'Generate with Reasoning'}
            </button>

          {reasoningResults && (
            <div className="results-section">
              <h4>Decision with Detailed Reasoning</h4>
              <div className="result-metadata">
                <span className="confidence-badge">Confidence: {(reasoningResults.reasoning.confidence * 100).toFixed(1)}%</span>
                <span className="timestamp">Generated: {new Date(reasoningResults.timestamp).toLocaleString()}</span>
                <span className="type-badge">Type: {reasoningResults.decisionType}</span>
              </div>
              <div className="confidence-explanation">
                <small style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  Confidence Score: Reflects how certain the AI is about its decision and reasoning (higher = more confident in recommendation)
                </small>
              </div>
              
              <div className="reasoning-breakdown">
                <div className="decision-summary">
                  <h5>Decision & Reasoning</h5>
                  <div className="decision-content">
                    <pre>{reasoningResults.decision}</pre>
                  </div>
                </div>

                <div className="reasoning-details">
                  <h5>Reasoning Structure</h5>
                  <div className="reasoning-grid">
                    <div className="reasoning-item">
                      <strong>Summary:</strong>
                      <p>{reasoningResults.reasoning.summary}</p>
                    </div>
                    <div className="reasoning-item">
                      <strong>Primary Rationale:</strong>
                      <p>{reasoningResults.reasoning.rationale}</p>
                    </div>
                    <div className="reasoning-item">
                      <strong>Supporting Evidence:</strong>
                      <p>{reasoningResults.reasoning.evidence}</p>
                    </div>
                    <div className="reasoning-item">
                      <strong>Alternatives Considered:</strong>
                      <p>{reasoningResults.reasoning.alternatives}</p>
                    </div>
                    <div className="reasoning-item">
                      <strong>Risk Assessment:</strong>
                      <p>{reasoningResults.reasoning.risks}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Professional Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="professional-loading-container">
            <div className="medical-spinner">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <div className="center-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
            </div>
            <div className="loading-content">
              <h3>Analyzing Medical Data</h3>
              <p>Analyzing data...</p>
              <div className="progress-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMedicalAnalysis;