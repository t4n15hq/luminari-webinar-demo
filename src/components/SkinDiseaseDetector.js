import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FileUpload, ResultsChat } from './common';
import openaiService from '../services/openaiService';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';
import ResultsChart from './common/ResultsChart';
import './SkinDiseaseDetector.css';


const SkinDiseaseDetector = () => {
  // Analysis mode state - 'image', 'textAudio', 'batch', or 'video'
  const [analysisMode, setAnalysisMode] = useState('image');
  const [showAskLumina, setShowAskLumina] = useState(false);

  // Single image analysis states
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [prediction, setPrediction] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [race, setRace] = useState('');
  const [skinColor, setSkinColor] = useState('');
  const [skinType, setSkinType] = useState('');
  const [conditionDescription, setConditionDescription] = useState('');
  
  // Enhanced multi-modal fields
  const [medicalHistory, setMedicalHistory] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [currentMedications, setCurrentMedications] = useState('');
  const [enhancedInsights, setEnhancedInsights] = useState('');

  // Batch processing states
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showResultsChat, setShowResultsChat] = useState(false);
  const [showChart, setShowChart] = useState(false);


  // Text/Audio analysis states
  const [transcript, setTranscript] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);

  // Video analysis states (coming soon)
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setPrediction([]);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleBatchFileChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    const batchItems = imageFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      status: 'pending',
      prediction: null,
      metadata: {
        age: '',
        gender: '',
        race: '',
        skinColor: '',
        skinType: '',
        conditionDescription: ''
      }
    }));
    
    setBatchFiles(batchItems);
    setBatchResults([]);
  };

  const updateBatchMetadata = (id, field, value) => {
    setBatchFiles(prev => prev.map(item => 
      item.id === id 
        ? { ...item, metadata: { ...item.metadata, [field]: value } }
        : item
    ));
  };

  const removeBatchFile = (id) => {
    setBatchFiles(prev => prev.filter(item => item.id !== id));
  };

  // Enhanced multi-modal helper functions
  const toggleSymptom = (symptom) => {
    setSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const clearAllData = () => {
    setAge('');
    setGender('');
    setRace('');
    setSkinColor('');
    setSkinType('');
    setConditionDescription('');
    setMedicalHistory('');
    setFamilyHistory('');
    setSymptoms([]);
    setCurrentMedications('');
    setSelectedImage(null);
    setPreviewImage(null);
    setPrediction([]);
    setEnhancedInsights('');
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

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('age', item.metadata.age || '30');
        formData.append('gender', item.metadata.gender || 'Unknown');
        formData.append('race', item.metadata.race || 'Unknown');
        formData.append('skin_color', item.metadata.skinColor || 'Unknown');
        formData.append('skin_type', item.metadata.skinType || 'Unknown');
        formData.append('condition_description', item.metadata.conditionDescription || 'Unknown');

        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL || 'https://luminari-uic-skin-disease-detection.hf.space'}/predict/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const preds = response.data.prediction.map(p => ({
          ...p,
          label: p.label.replace(/\s+Photos/g, ''),
          confidence: Math.min(p.confidence, 1.0)
        })) || [];

        const result = {
          ...item,
          status: 'completed',
          prediction: preds,
          topPrediction: preds[0]
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
          error: 'Processing failed',
          prediction: []
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
      ['File Name', 'Top Prediction', 'Confidence', 'Status', 'Age', 'Gender', 'Race', 'Skin Color', 'Skin Type', 'Description'],
      ...batchResults.map(result => [
        result.name,
        result.topPrediction?.label || 'N/A',
        result.topPrediction?.confidence ? (result.topPrediction.confidence * 100).toFixed(1) + '%' : 'N/A',
        result.status,
        result.metadata.age || 'N/A',
        result.metadata.gender || 'N/A',
        result.metadata.race || 'N/A',
        result.metadata.skinColor || 'N/A',
        result.metadata.skinType || 'N/A',
        result.metadata.conditionDescription || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skin_disease_batch_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePredict = async (e) => {
    e.preventDefault();

    if (!selectedImage || !age || !gender || !race || !skinColor || !skinType || !conditionDescription) {
      // TODO: Replace with user-friendly notification system
      // alert('Please fill in all fields and select an image.');
      return;
    }

    // Enhanced context for better AI analysis
    const enhancedContext = `
    PATIENT PROFILE:
    - Age: ${age}, Gender: ${gender}, Ethnicity: ${race}
    - Skin: ${skinColor}, Type: ${skinType}
    
    CLINICAL PRESENTATION:
    - Description: ${conditionDescription}
    - Symptoms: ${symptoms.length > 0 ? symptoms.join(', ') : 'None reported'}
    
    MEDICAL HISTORY:
    - Past Medical History: ${medicalHistory || 'Not provided'}
    - Family History: ${familyHistory || 'Not provided'}
    - Current Medications: ${currentMedications || 'None reported'}
    
    ANALYSIS REQUEST: Provide detailed dermatological assessment considering all patient factors.
    `;

    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('age', age);
    formData.append('gender', gender);
    formData.append('race', race);
    formData.append('skin_color', skinColor);
    formData.append('skin_type', skinType);
    formData.append('condition_description', enhancedContext);

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'https://luminari-uic-skin-disease-detection.hf.space'}/predict/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const preds = response.data.prediction.map(p => ({
        ...p,
        label: p.label.replace(/\s+Photos/g, ''),
        confidence: Math.min(p.confidence, 1.0)
      })) || [];
      
      setPrediction(preds);

      // Generate enhanced insights based on multi-modal data
      if (preds.length > 0 && (medicalHistory || familyHistory || symptoms.length > 0 || currentMedications)) {
        const insights = await generateEnhancedInsights(preds);
        setEnhancedInsights(insights);
      } else {
        setEnhancedInsights('');
      }

    } catch (error) {
      // console.error('Prediction error:', error);
      setPrediction([{ label: 'An error occurred. Try again.', confidence: 0 }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced AI insights based on multi-modal data
  const generateEnhancedInsights = async (prediction) => {
    if (!prediction || prediction.length === 0) return null;
    
    try {
      const contextPrompt = `
      Based on the dermatological analysis results, provide enhanced clinical insights:
      
      TOP PREDICTION: ${prediction[0].label} (${(prediction[0].confidence * 100).toFixed(1)}% confidence)
      
      PATIENT CONTEXT:
      - Age: ${age}, Gender: ${gender}, Ethnicity: ${race}
      - Skin Type: ${skinColor}, ${skinType}
      - Symptoms: ${symptoms.join(', ') || 'None reported'}
      - Medical History: ${medicalHistory || 'Not provided'}
      - Family History: ${familyHistory || 'Not provided'}
      - Current Medications: ${currentMedications || 'None'}
      
      Please provide:
      1. Clinical significance of this finding for this patient profile
      2. Risk factors present based on patient history
      3. Recommended next steps specific to this case
      4. Follow-up considerations
      
      Keep response concise and clinical.
      `;
      
      const insights = await openaiService.queryAssistant({ question: contextPrompt });
      return insights?.answer || insights;
    } catch (error) {
      console.warn('Failed to generate enhanced insights:', error);
      return null;
    }
  };

  // Text/Audio analysis function
  const handleDiagnose = async () => {
    if (!transcript) return;
    setDiagnosisLoading(true);
    setDiagnosis('');

    try {
      const result = await openaiService.diagnoseConversation(transcript);
      setDiagnosis(result);
      
      if (result.includes('Extracted Metadata:')) {
        const metaSection = result.split('Extracted Metadata:')[1];
        if (metaSection) {
          const lines = metaSection.trim().split('\n');
          const metaMap = {};
          
          lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value && value !== 'Unknown') {
              metaMap[key.toLowerCase()] = value;
            }
          });
          
          if (metaMap.age) setAge(metaMap.age);
          if (metaMap.gender) setGender(metaMap.gender);
          if (metaMap.race) setRace(metaMap.race);
          if (metaMap['skin color']) setSkinColor(metaMap['skin color']);
          if (metaMap['skin type']) setSkinType(metaMap['skin type']);
          if (metaMap['condition description']) setConditionDescription(metaMap['condition description']);
        }
      }
    } catch (err) {
      console.error(err);
      setDiagnosis('Failed to get diagnosis. See console for details.');
    } finally {
      setDiagnosisLoading(false);
    }
  };

  const goToPage = (path) => {
    // Removed localStorage data saving
    window.location.href = path;
  };
  
  const getBatchSummary = () => {
    const totalFiles = batchResults.length;
    const highConfidenceDetections = batchResults.filter(r => r.topPrediction?.confidence >= 0.7).length;
    const allPredictions = batchResults.flatMap(r => r.prediction?.map(p => p.label) || []);
    const predictionCounts = allPredictions.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const mostCommonFinding = Object.keys(predictionCounts).reduce((a, b) => predictionCounts[a] > predictionCounts[b] ? a : b, 'N/A');

    return { totalFiles, highConfidenceDetections, mostCommonFinding };
  };

  // Circular Progress component
  const CircularProgress = ({ percentage, color, label }) => {
    const safePercentage = Math.min(percentage, 100);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (safePercentage / 100) * circumference;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 15px', width: '200px' }}>
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          borderRadius: '0', 
          padding: '10px 8px',
          marginBottom: '15px',
          width: '100%',
          color: '#333',
          fontWeight: 'bold',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          {label}
        </div>
        <div style={{ position: 'relative', width: `${radius * 2}px`, height: `${radius * 2}px` }}>
          <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
            <circle cx={radius} cy={radius} r={radius - 10} fill="transparent" stroke="#e6e6e6" strokeWidth="12" />
            <circle
              cx={radius} cy={radius} r={radius - 10} fill="transparent" stroke={color} strokeWidth="12"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${radius} ${radius})`} strokeLinecap="round"
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '24px', fontWeight: 'bold', color: '#1a365d'
          }}>
            {safePercentage.toFixed(0)}%
          </div>
        </div>
      </div>
    );
  };

  const [note, metaBlock = ''] = diagnosis.split(/Extracted Metadata:/i);
  const metaLines = metaBlock.trim().split('\n').map((l) => l.trim()).filter((l) => l);

  return (
    <div className="skin-disease-detector" style={{ position: 'relative' }}>
      {/* Ask Lumina Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Dermatology - Skin Disease Analysis"
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
          contextName="Dermatology Batch Analysis"
        />
      )}
      {showChart && (
        <ResultsChart
          results={batchResults}
          onClose={() => setShowChart(false)}
          contextName="Dermatology Batch Analysis"
        />
      )}
      {/* Top Navigation Section */}
      <div className="page-navigation">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">/</span>
          <Link to="/diagnosis">Disease Diagnosis</Link>
          <span className="separator">/</span>
          <span>Dermatology</span>
        </div>
        
        <Link to="/diagnosis" className="btn btn-secondary btn-sm">
          Back to Specialties
        </Link>
      </div>

      {/* Page Header Section */}
      <div className="page-header">
        <h1>Dermatological Image Analysis</h1>
        <p>Clinical decision support tool for skin lesion evaluation</p>
      </div>

      {/* Analysis Type Tabs */}
      <div className="analysis-tabs">
        <button
          className={`btn ${analysisMode === 'image' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAnalysisMode('image')}
        >
          Image Analysis
        </button>
        <button
          className={`btn ${analysisMode === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAnalysisMode('batch')}
        >
          Batch Processing
        </button>
        <button
          className={`btn ${analysisMode === 'textAudio' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAnalysisMode('textAudio')}
        >
          Text & Audio Analysis
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setAnalysisMode('video')}
          disabled
        >
          Video Analysis (In Development)
        </button>
      </div>

      {/* Single Image Analysis Section */}
      {analysisMode === 'image' && (
        <div className="analysis-content">
          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '0', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Image Upload</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #cbd5e0',
                borderRadius: '0',
                backgroundColor: '#f7fafc',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            />
            <div style={{ fontSize: '0.9rem', color: '#718096', marginTop: '10px' }}>
              Supported formats: JPEG, PNG, TIFF, BMP
            </div>

            {previewImage && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '400px', 
                    maxHeight: '400px',
                    borderRadius: '0',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '8px' }}>
                  Image ready for analysis
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '0', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
          }}>
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Patient Information</h3>
            <div className="metadata-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Age</label>
                <input 
                  type="number" 
                  placeholder="Patient age" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0' }}
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Ethnicity</label>
                <select 
                  value={race} 
                  onChange={(e) => setRace(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0' }}
                >
                  <option value="">Select Ethnicity</option>
                  <option>White / Caucasian</option>
                  <option>African American</option>
                  <option>Asian</option>
                  <option>Hispanic/Latino</option>
                  <option>Native American</option>
                  <option>Pacific Islander</option>
                  <option>Mixed/Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Skin Tone</label>
                <select 
                  value={skinColor} 
                  onChange={(e) => setSkinColor(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0' }}
                >
                  <option value="">Select Skin Tone</option>
                  <option>Very Light (Fitzpatrick I)</option>
                  <option>Light (Fitzpatrick II)</option>
                  <option>Medium Light (Fitzpatrick III)</option>
                  <option>Medium (Fitzpatrick IV)</option>
                  <option>Medium Dark (Fitzpatrick V)</option>
                  <option>Dark (Fitzpatrick VI)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Skin Type</label>
                <select 
                  value={skinType} 
                  onChange={(e) => setSkinType(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '0' }}
                >
                  <option value="">Select Skin Type</option>
                  <option>Oily</option>
                  <option>Dry</option>
                  <option>Combination</option>
                  <option>Normal</option>
                  <option>Sensitive</option>
                  <option>Acne-prone</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <label className="form-label">
                Clinical Description
              </label>
              <textarea
                className="form-textarea"
                placeholder="Detailed description of the lesion/condition (e.g., duration, symptoms, changes over time, associated pain/itching)"
                rows={3}
                value={conditionDescription}
                onChange={(e) => setConditionDescription(e.target.value)}
              />
            </div>

            {/* Enhanced Multi-Modal Fields */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#2d3748', marginBottom: '15px', fontSize: '1.1rem' }}>Additional Clinical Information</h4>
              
              {/* Symptoms Checklist */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '10px' }}>Current Symptoms</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '10px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0',
                  border: '1px solid #e9ecef'
                }}>
                  {['Itching', 'Burning', 'Pain', 'Redness', 'Swelling', 'Scaling', 'Crusting', 'Bleeding'].map(symptom => (
                    <label key={symptom} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      <input
                        type="checkbox"
                        checked={symptoms.includes(symptom)}
                        onChange={() => toggleSymptom(symptom)}
                        style={{ marginRight: '8px' }}
                      />
                      {symptom}
                    </label>
                  ))}
                </div>
              </div>

              {/* Medical History */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Past Medical History</label>
                <textarea
                  className="form-textarea"
                  placeholder="Previous skin conditions, allergies, surgeries, chronic diseases (e.g., diabetes, autoimmune conditions)"
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                />
              </div>

              {/* Family History */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Family History</label>
                <textarea
                  className="form-textarea"
                  placeholder="Family history of skin cancer, dermatological conditions, or genetic disorders"
                  rows={2}
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                />
              </div>

              {/* Current Medications */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Current Medications</label>
                <textarea
                  className="form-textarea"
                  placeholder="List current medications, especially those affecting skin or immune system"
                  rows={2}
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                />
              </div>

              {/* Clear Data Button */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  type="button"
                  onClick={clearAllData}
                  className="btn btn-secondary"
                  style={{ fontSize: '14px', padding: '8px 15px' }}
                >
                  Clear All Data
                </button>
                <div style={{ 
                  flex: 1, 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  display: 'flex', 
                  alignItems: 'center' 
                }}>
                  Note: More clinical context = more accurate analysis
                </div>
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={isLoading}
              className="btn btn-primary btn-lg"
              style={{marginTop: '25px', width: '100%'}}
            >
              {isLoading ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </div>

          {prediction.length > 0 && (
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
                
                <div style={{ 
                  display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 30,
                  backgroundColor: '#f8f9fa', padding: '30px 20px', borderRadius: 12
                }}>
                  {prediction.slice(0, 3).map((p, i) => (
                    <CircularProgress 
                      key={i} 
                      percentage={(p.confidence * 100)} 
                      color={i === 0 ? '#e53e3e' : i === 1 ? '#38b2ac' : '#a0aec0'} 
                      label={p.label}
                    />
                  ))}
                </div>

                {/* Detailed Results Table */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2d3748' }}>Detailed Confidence Scores</h4>
                  <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '0', 
                    overflow: 'hidden' 
                  }}>
                    {prediction.slice(0, 5).map((p, i) => (
                      <div key={i} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'white',
                        borderBottom: i < prediction.length - 1 ? '1px solid #e2e8f0' : 'none'
                      }}>
                        <span style={{ fontWeight: '500', color: '#2d3748' }}>{p.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '100px', 
                            height: '8px', 
                            backgroundColor: '#e2e8f0', 
                            borderRadius: '0',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${p.confidence * 100}%`, 
                              height: '100%',
                              backgroundColor: i === 0 ? '#e53e3e' : '#38b2ac',
                              borderRadius: '0'
                            }} />
                          </div>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: i === 0 ? '#e53e3e' : '#4a5568',
                            minWidth: '50px',
                            textAlign: 'right'
                          }}>
                            {(p.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Recommendations */}
                <div style={{ 
                  backgroundColor: '#ebf8ff',
                  border: '1px solid #bee3f8',
                  borderRadius: '0',
                  padding: '20px',
                  marginBottom: '25px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2b6cb0' }}>
                    Clinical Recommendations
                  </h4>
                  <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#2c5282' }}>
                    <strong>Primary Finding:</strong> {prediction[0].label} ({(prediction[0].confidence * 100).toFixed(1)}% confidence)
                    <br /><br />
                    <strong>Recommended Actions:</strong>
                    <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                      <li>Consult with a board-certified dermatologist for professional evaluation</li>
                      <li>Document lesion progression with serial photography</li>
                      <li>Consider dermoscopic examination for detailed analysis</li>
                      {prediction[0].confidence > 0.8 && (
                        <li>High confidence result - prioritize clinical correlation</li>
                      )}
                      {prediction[0].confidence < 0.6 && (
                        <li>Moderate confidence - additional diagnostic methods may be needed</li>
                      )}
                    </ul>
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      backgroundColor: '#fef5e7',
                      border: '1px solid #f6e05e',
                      borderRadius: '0',
                      fontSize: '0.9rem'
                    }}>
                      <strong>Important:</strong> This analysis is for clinical decision support only. 
                      Professional medical evaluation is required for diagnosis and treatment.
                    </div>
                  </div>
                </div>

                {/* Enhanced AI Insights */}
                {enhancedInsights && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '0',
                    padding: '20px',
                    marginBottom: '25px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      AI-Enhanced Clinical Insights
                      <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#4b5563' }}>
                        (Based on your additional clinical data)
                      </span>
                    </h4>
                    <div style={{ 
                      fontSize: '0.95rem', 
                      lineHeight: '1.6', 
                      color: '#166534',
                      whiteSpace: 'pre-line'
                    }}>
                      {enhancedInsights}
                    </div>
                  </div>
                )}

                {/* Next Steps Section */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '15px', color: '#374151' }}>
                    Generate Clinical Documentation
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button 
                      onClick={() => goToPage('/protocol')} 
                      className="btn btn-secondary"
                    >
                      Generate Clinical Protocol for {prediction[0].label}
                    </button>
                    <button 
                      onClick={() => goToPage('/ind-modules')} 
                      className="btn btn-secondary"
                    >
                      Generate Regulatory Documents
                    </button>
                    <button 
                      onClick={() => goToPage('/query')} 
                      className="btn btn-secondary"
                    >
                      Clinical Questions about {prediction[0].label}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Batch Processing Section */}
      {analysisMode === 'batch' && (
        <div className="analysis-content">
          <div className="upload-card">
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Batch Image Processing</h3>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleBatchFileChange}
              style={{
                width: '100%',
                padding: '15px',
                border: '2px dashed #cbd5e0',
                borderRadius: '0',
                backgroundColor: '#f7fafc',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            />
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#718096',
              marginTop: '15px'
            }}>
              Select multiple images for batch analysis. Supported formats: JPEG, PNG, TIFF, BMP
            </div>
          </div>

          {batchFiles.length > 0 && (
            <div className="batch-files-container" style={{ marginTop: '20px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3>Batch Queue ({batchFiles.length} images)</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={processBatch}
                    disabled={batchLoading || batchFiles.length === 0}
                    className="btn btn-primary"
                  >
                    {batchLoading ? 'Processing...' : `Analyze ${batchFiles.length} Images`}
                  </button>

                  {batchResults.length > 0 && !batchLoading && (
                    <>
                    <button
                      onClick={exportBatchResults}
                      className="btn btn-success"
                    >
                      Export Results
                    </button>
                     <button
                      onClick={() => setShowResultsChat(true)}
                      className="btn btn-secondary"
                    >
                      Chat with Results
                    </button>
                    <button
                      onClick={() => setShowChart(true)}
                      className="btn btn-secondary"
                    >
                      Visualize Results
                    </button>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ 
                maxHeight: '600px', 
                overflowY: 'auto', 
                border: '1px solid #e2e8f0', 
                borderRadius: '0', 
                backgroundColor: 'white'
              }}>
                {batchFiles.map((item) => (
                  <div key={item.id} className={`batch-result-card ${item.topPrediction?.confidence > 0.7 ? 'positive' : item.status === 'error' ? 'error' : item.status === 'completed' ? 'negative' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <img 
                        src={item.preview} 
                        alt={item.name} 
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          objectFit: 'cover', 
                          borderRadius: '0', 
                          marginRight: '20px',
                          border: '1px solid #e2e8f0'
                        }} 
                      />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                          <div style={{ fontWeight: 'bold', color: '#2d3748' }}>
                            {item.name}
                          </div>
                          <button 
                            onClick={() => removeBatchFile(item.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Remove
                          </button>
                        </div>
                        
                        {/* METADATA INPUTS RESTORED HERE */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                          gap: '8px', 
                          fontSize: '0.8rem',
                          marginBottom: '10px'
                        }}>
                          <input 
                            type="number" 
                            placeholder="Age" 
                            value={item.metadata.age}
                            onChange={(e) => updateBatchMetadata(item.id, 'age', e.target.value)}
                            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '0' }}
                          />
                          <select 
                            value={item.metadata.gender}
                            onChange={(e) => updateBatchMetadata(item.id, 'gender', e.target.value)}
                            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '0' }}
                          >
                            <option value="">Gender</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                          <select 
                            value={item.metadata.race}
                            onChange={(e) => updateBatchMetadata(item.id, 'race', e.target.value)}
                            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '0' }}
                          >
                            <option value="">Ethnicity</option>
                            <option>Caucasian</option>
                            <option>African American</option>
                            <option>Asian</option>
                            <option>Hispanic/Latino</option>
                            <option>Other</option>
                          </select>
                          <select 
                            value={item.metadata.skinColor}
                            onChange={(e) => updateBatchMetadata(item.id, 'skinColor', e.target.value)}
                            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '0' }}
                          >
                            <option value="">Skin Tone</option>
                            <option>Very Light (I)</option>
                            <option>Light (II)</option>
                            <option>Medium Light (III)</option>
                            <option>Medium (IV)</option>
                            <option>Medium Dark (V)</option>
                            <option>Dark (VI)</option>
                          </select>
                          <select 
                            value={item.metadata.skinType}
                            onChange={(e) => updateBatchMetadata(item.id, 'skinType', e.target.value)}
                            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '0' }}
                          >
                            <option value="">Skin Type</option>
                            <option>Oily</option>
                            <option>Dry</option>
                            <option>Combination</option>
                            <option>Normal</option>
                            <option>Sensitive</option>
                            <option>Acne-prone</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Condition Description"
                          value={item.metadata.conditionDescription}
                          onChange={(e) => updateBatchMetadata(item.id, 'conditionDescription', e.target.value)}
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '0.85rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0',
                            resize: 'vertical',
                            marginBottom: '10px'
                          }}
                        />
                        
                        <div style={{ fontSize: '0.85rem', color: '#4a5568' }}>
                          <strong>Status:</strong> {item.status}
                          {item.topPrediction && (
                            <>
                              <br />
                              <strong>Result:</strong> 
                              <span style={{ 
                                color: item.topPrediction.confidence > 0.7 ? 'var(--color-error)' : 'var(--color-success)',
                                fontWeight: 'bold',
                                marginLeft: '5px'
                              }}>
                                {item.topPrediction.label}
                              </span>
                              <span style={{ marginLeft: '10px' }}>
                                ({(item.topPrediction.confidence * 100).toFixed(1)}% confidence)
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
                    </div>
                  </div>
                ))}
              </div>
              
              {batchResults.length > 0 && !batchLoading && (
                <div className="batch-summary">
                  <h4>Batch Summary</h4>
                  <ul>
                    <li>
                      <div className="summary-value">{getBatchSummary().totalFiles}</div>
                      <div className="summary-label">Images Analyzed</div>
                    </li>
                    <li>
                      <div className="summary-value">{getBatchSummary().highConfidenceDetections}</div>
                      <div className="summary-label">High Confidence</div>
                    </li>
                    <li>
                      <div className="summary-value">{getBatchSummary().mostCommonFinding}</div>
                      <div className="summary-label">Most Common Finding</div>
                    </li>
                  </ul>
                </div>
              )}


              {batchLoading && (
                <div style={{ 
                  marginTop: '20px', 
                  textAlign: 'center',
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '0',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ 
                    width: '100%', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '0', 
                    overflow: 'hidden', 
                    marginBottom: '15px',
                    height: '20px'
                  }}>
                    <div 
                      style={{ 
                        width: `${batchProgress}%`, 
                        height: '100%', 
                        backgroundColor: '#38b2ac', 
                        transition: 'width 0.3s ease',
                        borderRadius: '0'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '5px' }}>
                    {processingStatus}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                    {batchProgress.toFixed(0)}% Complete • Processing with advanced deep learning models
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Text/Audio Analysis Section */}
      {analysisMode === 'textAudio' && (
        <div className="analysis-content">
          <div className="upload-card">
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Advanced Audio & Text Processing</h3>
            <FileUpload onTranscript={setTranscript} />
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: '#f7fafc', 
              borderRadius: '0',
              fontSize: '0.9rem', 
              color: '#4a5568'
            }}>
              <strong>Supported formats:</strong> MP3, WAV, M4A, TXT files | 
              <strong> Processing:</strong> Advanced speech-to-text with medical terminology recognition
            </div>
          </div>

          <div className="upload-card" style={{marginTop: '20px'}}>
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Manual Text Input</h3>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter detailed clinical notes, patient consultation transcript, or dermatological case description. Include symptoms, duration, appearance, location, and patient history for optimal analysis..."
              rows={8}
              className="form-textarea"
              style={{minHeight: '200px'}}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '10px',
              fontSize: '0.8rem',
              color: '#718096'
            }}>
              <span>Characters: {transcript.length} | Words: {transcript.split(/\s+/).filter(word => word.length > 0).length}</span>
              <span>Optimal length: 100-1000 words for best analysis</span>
            </div>
          </div>

          {transcript && (
            <div className="upload-card" style={{marginTop: '20px'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#2d3748' }}>Text Preview</h3>
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosisLoading}
                  className="btn btn-primary"
                >
                  {diagnosisLoading ? 'Analyzing...' : 'Generate Diagnosis'}
                </button>
              </div>
              
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '0',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e9ecef',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {transcript}
              </div>
            </div>
          )}

          {diagnosis && (
            <div className="upload-card" style={{marginTop: '20px'}}>
              <h3 style={{ marginTop: 0, color: '#2d3748' }}>AI Diagnosis Analysis</h3>
              
              <div style={{ 
                backgroundColor: '#f0fff4',
                border: '1px solid #9ae6b4',
                borderRadius: '0',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#276749' }}>Clinical Assessment</h4>
                <div style={{ 
                  fontSize: '1rem', 
                  lineHeight: '1.6', 
                  color: '#22543d'
                }}>
                  {note.trim()}
                </div>
              </div>

              {metaLines.length > 0 && (
                <div style={{ 
                  backgroundColor: '#ebf8ff',
                  border: '1px solid #90cdf4',
                  borderRadius: '0',
                  padding: '20px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2c5282' }}>Extracted Clinical Data</h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '10px' 
                  }}>
                    {metaLines.map((line, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px 12px',
                        backgroundColor: 'white',
                        borderRadius: '0',
                        fontSize: '0.9rem',
                        border: '1px solid #bee3f8'
                      }}>
                        {line}
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setAnalysisMode('image')}
                    className="btn btn-secondary"
                    style={{marginTop: '20px'}}
                  >
                    Transfer Data to Image Analysis
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW: Video/Motion Analysis Section - Coming Soon */}
      {analysisMode === 'video' && (
        <div className="analysis-content">
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '0',
            boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            textAlign: 'center',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            <h2 style={{ color: '#2d3748', marginBottom: '10px' }}>Video Analysis</h2>
            <p style={{ fontSize: '1rem', color: '#4a5568', marginBottom: '30px' }}>
              This feature is under development and will soon support advanced video-based lesion evaluation.
            </p>

            <input 
              type="file" 
              accept="video/*" 
              disabled
              style={{
                width: '100%',
                padding: '20px',
                border: '2px dashed #cbd5e0',
                borderRadius: '0',
                backgroundColor: '#f7fafc',
                color: '#a0aec0',
                cursor: 'not-allowed',
                fontSize: '16px'
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '10px' }}>
              Upload support for MP4, MOV, AVI • Max duration: 5 minutes • Optimal quality: 1080p
            </div>

            <div style={{
              marginTop: '25px',
              display: 'inline-block',
              backgroundColor: '#fffbea',
              color: '#744210',
              padding: '8px 20px',
              borderRadius: '0',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid #f6e05e'
            }}>
              In Development
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkinDiseaseDetector;