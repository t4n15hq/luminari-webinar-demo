import React, { useState, useRef, useEffect } from 'react';
import CloseButton from './CloseButton';
import openaiService from '../../services/openaiService';

const AIFloatingPrompt = ({ onApplySuggestion, onClose, selectedText, position }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const promptRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Validate that the request is medical/clinical related or basic editing
    const medicalKeywords = [
      'clinical', 'medical', 'patient', 'disease', 'treatment', 'therapy', 'drug', 'protocol',
      'regulatory', 'study', 'trial', 'research', 'pharmaceutical', 'diagnosis', 'symptom'
    ];
    
    const editingKeywords = [
      'professional', 'grammar', 'clarity', 'improve', 'rewrite', 'edit', 'formal', 'technical',
      'concise', 'simplify', 'academic', 'fix', 'tone', 'style', 'clear', 'readable'
    ];
    
    const offTopicKeywords = [
      'weather', 'recipe', 'cooking', 'sports', 'movie', 'film', 'politics', 'election',
      'music', 'song', 'travel', 'vacation', 'restaurant', 'food', 'shopping', 'fashion',
      'car', 'automobile', 'game', 'gaming', 'cryptocurrency', 'bitcoin', 'dating', 'marriage'
    ];
    
    const promptLower = prompt.toLowerCase();
    const selectedTextLower = selectedText?.toLowerCase() || '';
    
    // Allow if it's medical content, editing commands, or if we can't determine context
    const isMedicalContext = medicalKeywords.some(keyword => 
      promptLower.includes(keyword) || selectedTextLower.includes(keyword)
    );
    
    const isEditingCommand = editingKeywords.some(keyword => 
      promptLower.includes(keyword)
    );
    
    const isObviouslyOffTopic = offTopicKeywords.some(keyword => 
      promptLower.includes(keyword)
    );
    
    // Only block if it's obviously off-topic AND not an editing command
    if (isObviouslyOffTopic && !isEditingCommand && !isMedicalContext) {
      alert('This AI assistant only helps with medical research and clinical documentation. Please provide text related to clinical trials, regulatory submissions, or medical research.');
      return;
    }

    console.log('Submitting AI request:', { prompt, selectedText });
    setIsProcessing(true);
    
    try {
      // Include the selected text in the prompt
      const fullPrompt = `Selected text: "${selectedText}"\n\nUser request: ${prompt}`;
      console.log('Full prompt being sent:', fullPrompt);
      
      const response = await openaiService.generateTextImprovement(fullPrompt);
      console.log('AI service response:', response);
      
      // Automatically apply the first (best) suggestion
      if (response && response.length > 0) {
        console.log('AI response received:', response[0]);
        console.log('Calling onApplySuggestion with:', response[0]);
        onApplySuggestion(response[0]);
        setPrompt('');
        onClose();
      } else {
        console.error('No response received from AI service');
        alert('No response received from AI service. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      console.error('Error details:', error.response || error.message);
      // Show a brief error message
      alert(`Unable to process your request: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={promptRef}
      className="ai-prompt-container"
      style={{
        position: 'fixed',
        left: `${position?.x || 0}px`,
        top: `${position?.y || 0}px`,
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: '#ffffff',
        border: '2px solid #3b82f6',
        borderRadius: '0',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '1rem',
        minWidth: '300px',
        maxWidth: '500px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.5rem'
      }}>
        <div>
          <h4 style={{ margin: 0, color: '#1e40af', fontSize: '1rem' }}>
            AI Text Assistant
          </h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
            For medical & clinical content only
          </p>
        </div>
        <CloseButton onClick={onClose} variant="default" size={24} />
      </div>

      {/* Selected Text Display */}
      {selectedText && (
        <div className="selected-text-display">
          <div className="selected-text-label">
            Selected text:
          </div>
          <div className="selected-text-content">
            "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem', 
            color: '#374151',
            fontWeight: '500'
          }}>
            What would you like to do with the selected text?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Make this more concise, Rewrite in professional tone, Simplify this paragraph..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Quick actions:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              'Make concise',
              'Professional tone',
              'Simplify',
              'Academic style',
              'Fix grammar'
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="quick-action-btn"
                onClick={() => {
                  setPrompt(action);
                  // Auto-submit when quick action is clicked
                  setTimeout(() => {
                    const form = promptRef.current.querySelector('form');
                    if (form) {
                      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                  }, 100);
                }}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: '#374151',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !prompt.trim()}
          style={{
            background: isProcessing ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            width: '100%',
            transition: 'all 0.2s'
          }}
        >
          {isProcessing ? 'Processing...' : 'Apply AI Improvement'}
        </button>
      </form>

      {/* Processing Indicator */}
      {isProcessing && (
        <div style={{ 
          marginTop: '1rem', 
          textAlign: 'center', 
          color: '#6b7280', 
          fontSize: '0.875rem' 
        }}>
          AI is improving your text...
        </div>
      )}
    </div>
  );
};

export default AIFloatingPrompt; 