import React, { useState } from 'react';
import { SearchIcon, ArrowRightIcon } from '../icons/MedicalIcons';
import CloseButton from './CloseButton';
import openaiService from '../../services/openaiService';

const AskLuminaPopup = ({ isOpen, onClose, contextData = null }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    // Client-side theme validation
    const offTopicKeywords = [
      'weather', 'recipe', 'cooking', 'sports', 'movie', 'film', 'politics', 'election', 'voting',
      'music', 'song', 'concert', 'travel', 'vacation', 'restaurant', 'food', 'shopping', 'fashion',
      'car', 'automobile', 'game', 'gaming', 'cryptocurrency', 'bitcoin', 'stock', 'investment',
      'relationship', 'dating', 'marriage', 'school', 'homework', 'vacation', 'holiday'
    ];
    
    const queryLower = query.toLowerCase();
    const isObviouslyOffTopic = offTopicKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(queryLower);
    });
    
    if (isObviouslyOffTopic) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: query,
        timestamp: new Date()
      };
      
      const restrictionMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I can only help with medical research, clinical trials, and regulatory affairs. Please ask a question related to healthcare, drug development, clinical protocols, or medical documentation.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage, restrictionMessage]);
      setQuery('');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setQuery('');

    try {
      // Use the queryAssistant function from openaiService
      const response = await openaiService.queryAssistant({
        question: userMessage.content,
        disease_context: contextData || undefined
      });
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending query:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              AI
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                Ask Lumina™
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
                AI Clinical Research Assistant
              </p>
            </div>
          </div>
          <CloseButton
            onClick={onClose}
            variant="light"
            size={32}
          />
        </div>

        {/* Context Info */}
        {contextData && (
          <div style={{
            padding: '1rem 2rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '0.875rem',
            color: '#64748b'
          }}>
            <strong>Context:</strong> {contextData}
          </div>
        )}

        {/* Messages Area */}
        <div style={{
          flex: 1,
          padding: '1.5rem 2rem',
          overflowY: 'auto',
          maxHeight: '400px'
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem', 
                fontWeight: '600',
                color: '#3b82f6'
              }}>?</div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Ask me about medical research!</h4>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                I specialize in clinical trials, regulatory submissions, drug development, and medical documentation. Ask me about protocols, study design, FDA/EMA processes, or medical conditions.
              </p>
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '0.5rem',
                border: '1px solid #e0f2fe'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.75rem', 
                  color: '#0369a1',
                  fontWeight: '500'
                }}>
                  I only answer questions about medical research, clinical trials, and regulatory affairs.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '1rem',
                    backgroundColor: message.type === 'user' ? 'var(--color-primary)' : 'var(--color-gray-100)',
                    color: message.type === 'user' ? 'white' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {message.type === 'user' ? 'You' : 'AI'}
                  </div>
                  <div style={{
                    backgroundColor: message.type === 'user' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                    color: message.type === 'user' ? 'white' : '#374151',
                    padding: '0.75rem 1rem',
                    borderRadius: '1rem',
                    maxWidth: '80%',
                    fontSize: '0.875rem',
                    lineHeight: '1.5'
                  }}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '1rem',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    AI
                  </div>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '1rem',
                    fontSize: '0.875rem',
                    color: '#64748b'
                  }}>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <div className="loading-spinner" style={{ width: '12px', height: '12px' }}></div>
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about clinical trials, regulatory submissions, medical research..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  paddingRight: '3rem'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <SearchIcon 
                size={16} 
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: query.trim() && !isLoading ? 'pointer' : 'not-allowed',
                opacity: query.trim() && !isLoading ? 1 : 0.5,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (query.trim() && !isLoading) {
                  e.target.style.backgroundColor = 'var(--color-primary-dark)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--color-primary)';
              }}
            >
              Ask
              <ArrowRightIcon size={14} />
            </button>
          </form>
          
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                marginTop: '0.75rem',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AskLuminaPopup;