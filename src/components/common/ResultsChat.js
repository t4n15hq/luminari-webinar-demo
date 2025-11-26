import React, { useState, useEffect, useRef, useMemo } from 'react';
import apiService from '../../services/api';
import LoadingSpinner from './LoadingSpinner';
import CloseButton from './CloseButton';

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

const UserAvatar = () => (
    <div className="chat-avatar user-avatar" title="You">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"/></svg>
    </div>
);

const AiAvatar = () => (
    <div className="chat-avatar ai-avatar" title="AI Analyst">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.965 8.521C19.988 8.347 20 8.174 20 8c0-2.39-1.23-4.47-3.11-5.64C15.64 1.43 13.9 1 12 1c-1.9 0-3.64.43-4.89 1.36C5.23 3.53 4 5.61 4 8c0 .174.012.347.035.521C2.786 9.24 2 10.53 2 12c0 1.47.786 2.76 2.035 3.479C4.012 15.653 4 15.826 4 16c0 2.39 1.23 4.47 3.11 5.64C8.36 22.57 10.1 23 12 23s3.64-.43 4.89-1.36C18.77 20.47 20 18.39 20 16c0-.174-.012-.347-.035-.521C21.214 14.76 22 13.47 22 12c0-1.47-.786-2.76-2.035-3.479M12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6M9.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5m5 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5"/></svg>
    </div>
);


const ResultsChat = ({ results, onClose, contextName }) => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Determine result type and headers
  const { columns, data } = useMemo(() => {
    if (!results || results.length === 0) {
      return { columns: [], data: [] };
    }
    const firstResult = results[0];
    let cols = [];
    let rows = [];

    if (firstResult.topPrediction) { // SkinDiseaseDetector
      cols = ['File Name', 'Top Prediction', 'Confidence', 'Status', 'Age', 'Gender', 'Race', 'Skin Color', 'Skin Type', 'Description'];
      rows = results.map(r => ({
        'File Name': r.name,
        'Top Prediction': r.topPrediction?.label || 'N/A',
        'Confidence': r.topPrediction ? `${(r.topPrediction.confidence * 100).toFixed(1)}%` : 'N/A',
        'Status': r.status,
        'Age': r.metadata?.age || 'N/A',
        'Gender': r.metadata?.gender || 'N/A',
        'Race': r.metadata?.race || 'N/A',
        'Skin Color': r.metadata?.skinColor || 'N/A',
        'Skin Type': r.metadata?.skinType || 'N/A',
        'Description': r.metadata?.conditionDescription || 'N/A'
      }));
    } else if (firstResult.prediction?.detected !== undefined) { // LungCancerDetector
      cols = ['File Name', 'Cancer Detected', 'Confidence', 'Status'];
      rows = results.map(r => ({
        'File Name': r.name,
        'Cancer Detected': r.prediction?.detected ? 'Yes' : 'No',
        'Confidence': r.prediction ? `${(r.prediction.probability * 100).toFixed(1)}%` : 'N/A',
        'Status': r.status
      }));
    }
    return { columns: cols, data: rows };
  }, [results]);

const resultsCsv = useMemo(() => {
  if (!data || data.length === 0) return '';
  
  try {
    const headers = columns;
    const csvRows = [headers.join(',')];

    data.forEach((row, index) => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle null/undefined values
        const stringValue = value === null || typeof value === 'undefined' ? '' : String(value);
        // Escape quotes and wrap in quotes
        const escaped = stringValue.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const csv = csvRows.join('\n');
    return csv;
  } catch (error) {
    return '';
  }
}, [columns, data]);
  
  // Set initial welcome message
  useEffect(() => {
    const isSkindisease = results.some(r => r.topPrediction);
    const welcomeText = isSkindisease 
      ? `Welcome to the Analysis Results Chat for ${contextName}. I have full access to the complete results data including patient demographics and metadata.\n\nYou can ask me to:\n- Summarize findings by demographics (age, gender, race)\n- Analyze skin type distributions\n- Count specific outcomes or conditions\n- Compare confidence levels across patient groups\n- Identify patterns in condition descriptions\n\nFor example, try asking: "What's the age distribution of detected cases?" or "How do confidence levels vary by skin type?"`
      : `Welcome to the Analysis Results Chat for ${contextName}. I have full access to the results table on the left.\n\nYou can ask me to:\n- Summarize the findings\n- Count specific outcomes\n- Identify trends or outliers\n\nFor example, try asking: "How many cases were positive?" or "What was the average confidence for detected cases?"`;
    
    setMessages([{
      sender: 'ai',
      text: welcomeText
    }]);
  }, [contextName, results]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newMessages = [...messages, { sender: 'user', text: userInput }];
    setMessages(newMessages);
    const questionToAsk = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await apiService.chatWithResults({
        results: resultsCsv,
        question: questionToAsk,
        history: newMessages.slice(-6) // Send last 6 messages for context
      });
      setMessages(prev => [...prev, { sender: 'ai', text: response.answer }]);
    } catch (error) {
      console.error("Chat API error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="results-chat-overlay" onClick={onClose}>
      <div className="results-chat-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="results-chat-table-pane">
            <div className="results-chat-header">
                <h3>{contextName} - Full Results</h3>
            </div>
            <div className="results-table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            {columns.map(col => <th key={col}>{col}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map(col => (
                                    <td key={`${rowIndex}-${col}`} data-value={row[col]}>
                                        {row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="results-chat-conversation-pane">
            <div className="results-chat-header">
              <h3>AI Data Analyst</h3>
              <CloseButton onClick={onClose} variant="default" size={28} />
            </div>
            <div className="results-chat-messages" ref={chatContainerRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  {msg.sender === 'ai' ? <AiAvatar /> : null}
                  <div className="chat-bubble">
                    <pre>{msg.text}</pre>
                  </div>
                  {msg.sender === 'user' ? <UserAvatar /> : null}
                </div>
              ))}
              {isLoading && (
                 <div className="chat-message ai loading">
                    <AiAvatar />
                    <div className="chat-bubble">
                        <LoadingSpinner size="sm" text="Thinking..."/>
                    </div>
                 </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="results-chat-input-form">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask about your results..."
                rows="2"
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey){
                        e.preventDefault();
                        handleSendMessage(e);
                    }
                }}
              />
              <button type="submit" disabled={isLoading || !userInput.trim()} aria-label="Send message">
                <SendIcon />
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ResultsChat;