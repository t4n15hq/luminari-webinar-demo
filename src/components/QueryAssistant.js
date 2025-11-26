import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import apiService from '../services/api';
import PreviousDocuments from './common/PreviousDocuments';
import { saveConversation } from '../services/documentService';

const QueryAssistant = () => {
  const [question, setQuestion] = useState('');
  const [diseaseContext, setDiseaseContext] = useState('');
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]); // Changed from queryHistory to messages for chat format
  const [error, setError] = useState('');
  const [showPreviousDocs, setShowPreviousDocs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchProtocols();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchProtocols = async () => {
    try {
      const response = await apiService.listProtocols();
      setProtocols(response || []);
    } catch (err) {
      // console.error('Error fetching protocols:', err);
    }
  };

  // Check if question is completely off-topic
  const isCompletelyOffTopic = (question) => {
    const offTopicKeywords = [
      'weather', 'temperature', 'climate', 'rain', 'snow', 'sunny', 'cloudy',
      'recipe', 'cooking', 'restaurant', 'meal', 'dinner', 'lunch',
      'sports', 'football', 'basketball', 'soccer', 'game', 'score', 'team',
      'movie', 'film', 'entertainment', 'celebrity', 'actor', 'actress',
      'politics', 'election', 'vote', 'president', 'government',
      'travel', 'vacation', 'hotel', 'flight', 'tourism'
    ];

    const questionLower = question.toLowerCase();
    return offTopicKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(questionLower);
    });
  };

  // Generate standardized response for irrelevant questions
  const getStandardizedResponse = (question) => {
    const responses = [
      {
        condition: (q) => q.toLowerCase().includes('weather') || q.toLowerCase().includes('temperature'),
        response: `CLINICAL PROTOCOL ASSISTANT - QUERY SCOPE NOTICE

I'm Lumina™, your specialized clinical protocol and regulatory documentation assistant. Your question appears to be about weather/temperature topics, which are outside my area of expertise.

MY SPECIALIZED CAPABILITIES:
• Clinical trial protocol design and optimization
• Regulatory document generation (IND, NDA, BLA, CTD, eCTD)
• Endpoint selection and statistical considerations
• Patient population definitions and inclusion/exclusion criteria
• Safety monitoring and adverse event assessment
• Regulatory compliance guidance (FDA, EMA, ICH guidelines)

RELEVANT QUESTIONS I CAN HELP WITH:
• "What are appropriate primary endpoints for a Phase 3 psoriasis trial?"
• "How should I structure inclusion criteria for elderly patients?"
• "What safety monitoring is required for oncology studies?"
• "How do I design a pediatric dosing study?"

Please ask a question related to clinical trials, protocols, or regulatory affairs, and I'll provide detailed, professional guidance.`
      },
      {
        condition: (q) => q.toLowerCase().includes('recipe') || q.toLowerCase().includes('cooking') || q.toLowerCase().includes('food'),
        response: `CLINICAL PROTOCOL ASSISTANT - QUERY SCOPE NOTICE

I'm Lumina™, your specialized clinical protocol and regulatory documentation assistant. Your question appears to be about cooking/recipes, which are outside my area of expertise.

MY SPECIALIZED CAPABILITIES:
• Clinical trial protocol design and optimization
• Regulatory document generation (IND, NDA, BLA, CTD, eCTD)
• Endpoint selection and statistical considerations
• Patient population definitions and inclusion/exclusion criteria
• Safety monitoring and adverse event assessment
• Regulatory compliance guidance (FDA, EMA, ICH guidelines)

RELEVANT QUESTIONS I CAN HELP WITH:
• "What are key efficacy endpoints for dermatology trials?"
• "How should I design a dose-escalation study?"
• "What are FDA requirements for pediatric studies?"
• "How do I calculate sample size for a superiority trial?"

Please ask a question related to clinical trials, protocols, or regulatory affairs, and I'll provide detailed, professional guidance.`
      },
      {
        condition: (q) => true,
        response: `CLINICAL PROTOCOL ASSISTANT - QUERY SCOPE NOTICE

I'm Lumina™, your specialized clinical protocol and regulatory documentation assistant. Your question appears to be outside my area of clinical and regulatory expertise.

MY SPECIALIZED CAPABILITIES:
• Clinical trial protocol design and optimization
• Regulatory document generation (IND, NDA, BLA, CTD, eCTD)
• Endpoint selection and statistical considerations
• Patient population definitions and inclusion/exclusion criteria
• Safety monitoring and adverse event assessment
• Regulatory compliance guidance (FDA, EMA, ICH guidelines)
• Disease-specific protocol requirements (dermatology, oncology, neurology, etc.)

EXAMPLES OF RELEVANT QUESTIONS:
• "What are appropriate primary endpoints for a Phase 2 atopic dermatitis trial?"
• "How should I structure inclusion criteria for a lung cancer study?"
• "What safety assessments are required for immunotherapy trials?"
• "How do I design a bioequivalence study?"
• "What are EMA guidelines for pediatric development?"

Please rephrase your question to focus on clinical trials, protocol development, or regulatory affairs, and I'll provide comprehensive, professional guidance.`
      }
    ];

    return responses.find(r => r.condition(question))?.response || responses[responses.length - 1].response;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setQuestion(''); // Clear input immediately
    setLoading(true);
    setError('');

    try {
      let responseText;
      let isStandardized = false;

      // Check if question is off-topic
      if (isCompletelyOffTopic(question)) {
        responseText = getStandardizedResponse(question);
        isStandardized = true;
      } else {
        // Send to AI API
        const response = await apiService.queryAssistant({
          question: userMessage.content,
          disease_context: diseaseContext || undefined,
          protocol_id: selectedProtocolId || undefined,
        });
        responseText = response.answer;
      }

      // Add assistant response to chat
      const assistantMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
        isStandardized
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to fetch answer. Please try again.');
      // Remove the user message if request failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) {
      alert('No conversation to save');
      return;
    }

    // Get first user message for title
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 100)
      : 'Conversation';

    const result = await saveConversation({
      title: title,
      description: `Chat with ${Math.floor(messages.length / 2)} messages`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tags: ['ask-lumina', diseaseContext].filter(Boolean)
    });

    if (result.success) {
      alert('Conversation saved successfully!');
    } else {
      alert('Failed to save conversation: ' + (result.error || 'Unknown error'));
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0 && window.confirm('Start a new conversation? Current chat will be cleared unless saved.')) {
      setMessages([]);
      setQuestion('');
      setError('');
    }
  };

  return (
    <div className="query-assistant">
      <style>{`
        .markdown-content p {
          margin: 0.5rem 0;
        }
        .markdown-content p:first-child {
          margin-top: 0;
        }
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        .markdown-content strong {
          font-weight: 700;
          color: inherit;
        }
        .markdown-content ul, .markdown-content ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        .markdown-content li {
          margin: 0.25rem 0;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          margin: 1rem 0 0.5rem 0;
          font-weight: 700;
        }
        .markdown-content h1 {
          font-size: 1.25rem;
        }
        .markdown-content h2 {
          font-size: 1.1rem;
        }
        .markdown-content h3 {
          font-size: 1rem;
        }
        .markdown-content code {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .markdown-content pre {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.75rem;
          border-radius: 4px;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b', textAlign: 'left' }}>
            Ask Lumina<span className="trademark">™</span>
          </h2>
          <p style={{ margin: 0 }}>Your AI assistant for clinical protocols and regulatory guidance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowPreviousDocs(true)}
            style={{
              padding: '0.5rem 1rem',
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
            Previous Conversations
          </button>
          {messages.length > 0 && (
            <>
              <button
                onClick={handleSaveConversation}
                style={{
                  padding: '0.5rem 1rem',
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
                Save Conversation
              </button>
              <button
                onClick={handleNewChat}
                style={{
                  padding: '0.5rem 1rem',
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
                New Chat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Optional Context Fields */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
            Disease Context (Optional)
          </label>
          <input
            type="text"
            className="form-input"
            value={diseaseContext}
            onChange={(e) => setDiseaseContext(e.target.value)}
            placeholder="e.g., Psoriasis, Eczema"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
            Reference Protocol (Optional)
          </label>
          <select
            className="form-select"
            value={selectedProtocolId}
            onChange={(e) => setSelectedProtocolId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', fontSize: '14px' }}
          >
            <option value="">None</option>
            {protocols.map(protocol => (
              <option key={protocol.protocol_id} value={protocol.protocol_id}>
                {protocol.disease_name} – {new Date(protocol.generation_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div style={{
        height: '500px',
        overflowY: 'auto',
        border: '2px solid #000000',
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            height: '100%',
            padding: '2rem'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              lineHeight: '1.8',
              maxWidth: '600px'
            }}>
              <p style={{ margin: '0 0 1rem 0', color: '#1e293b', fontWeight: '500' }}>
                Welcome to Ask Lumina™
              </p>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                I can help you with:
              </p>
              <ul style={{ margin: '0 0 1.5rem 0', paddingLeft: '1.25rem' }}>
                <li>Clinical trial protocol design and optimization</li>
                <li>Regulatory document requirements (IND, NDA, BLA, CTD)</li>
                <li>Endpoint selection and statistical considerations</li>
                <li>Patient population and inclusion/exclusion criteria</li>
                <li>Safety monitoring and adverse event assessment</li>
                <li>Regulatory compliance guidance (FDA, EMA, ICH)</li>
              </ul>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Type your question below to begin.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '1rem',
                    backgroundColor: message.role === 'user' ? '#683D94' : '#f1f5f9',
                    color: message.role === 'user' ? 'white' : '#1e293b',
                    borderRadius: '0',
                    border: message.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    position: 'relative'
                  }}
                >
                  {message.role === 'assistant' && (
                    <div style={{
                      fontWeight: '600',
                      fontSize: '12px',
                      marginBottom: '0.5rem',
                      color: '#683D94'
                    }}>
                      Lumina™
                      {message.isStandardized && (
                        <span style={{
                          marginLeft: '0.5rem',
                          backgroundColor: '#fbbf24',
                          color: '#92400e',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}>
                          SCOPE NOTICE
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ lineHeight: '1.6', fontSize: '14px' }} className="markdown-content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    marginTop: '0.5rem',
                    opacity: 0.7
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '1rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '0.5rem', color: '#683D94' }}>
                    Lumina™
                  </div>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#991b1b',
          marginBottom: '1rem',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a follow-up question..."
          rows={3}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '2px solid #000000',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            resize: 'vertical'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: loading || !question.trim() ? '#94a3b8' : '#683D94',
            border: 'none',
            cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
            alignSelf: 'flex-end'
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.5rem' }}>
        Press Enter to send, Shift+Enter for new line
      </div>

      <PreviousDocuments
        isOpen={showPreviousDocs}
        onClose={() => setShowPreviousDocs(false)}
        documentType="CHAT"
        onSelectDocument={(doc) => {
          if (doc.messages && Array.isArray(doc.messages)) {
            setMessages(doc.messages.map(m => ({
              ...m,
              timestamp: doc.createdAt
            })));
          }
          setShowPreviousDocs(false);
        }}
      />
    </div>
  );
};

export default QueryAssistant;
