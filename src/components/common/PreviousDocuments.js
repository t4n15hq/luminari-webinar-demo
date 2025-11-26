import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PreviousDocuments.css';

const API_BASE_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'https://luminari-be.onrender.com';

const PreviousDocuments = ({ isOpen, onClose, documentType, onSelectDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStarred, setFilterStarred] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, documentType, filterStarred]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      if (documentType === 'CHAT') {
        // Fetch conversations for Ask Lumina
        const params = new URLSearchParams();
        if (filterStarred) params.append('starred', 'true');

        const response = await axios.get(`${API_BASE_URL}/my-conversations?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Conversations response:', response.data);
        setConversations(response.data);
      } else {
        // Fetch documents from specific endpoints based on type
        const params = new URLSearchParams();
        if (filterStarred) params.append('starred', 'true');

        let endpoint;
        if (documentType === 'PROTOCOL') {
          endpoint = '/protocols';
        } else if (documentType === 'STUDY_DESIGN') {
          endpoint = '/study-designs';
        } else if (documentType === 'REGULATORY') {
          endpoint = '/regulatory-documents';
        } else {
          // Fallback to generic endpoint for other types
          endpoint = '/my-documents';
          if (documentType) params.append('type', documentType);
        }

        console.log(`Fetching ${documentType} documents from: ${API_BASE_URL}${endpoint}?${params}`);
        const response = await axios.get(`${API_BASE_URL}${endpoint}?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`${documentType} response:`, response.data);

        // Handle both array and object responses
        const data = Array.isArray(response.data) ? response.data : (response.data.documents || response.data.data || []);
        console.log(`Processed ${documentType} documents:`, data);
        setDocuments(data);
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        endpoint: err.config?.url
      });

      let errorMessage = 'Failed to load previous documents';
      if (err.response?.status === 404) {
        errorMessage = 'Document endpoint not found. Please check backend configuration.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      let endpoint;
      if (documentType === 'CHAT') {
        endpoint = `/my-conversations/${doc.id}`;
      } else if (documentType === 'PROTOCOL') {
        endpoint = `/protocols/${doc.id}`;
      } else if (documentType === 'STUDY_DESIGN') {
        endpoint = `/study-designs/${doc.id}`;
      } else if (documentType === 'REGULATORY') {
        endpoint = `/regulatory-documents/${doc.id}`;
      } else {
        endpoint = `/my-documents/${doc.id}`;
      }

      console.log(`Fetching document details from: ${API_BASE_URL}${endpoint}`);
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Document details response:', response.data);

      // Normalize content field name based on document type
      const docData = response.data;
      if (documentType === 'PROTOCOL' && docData.fullProtocol) {
        docData.content = docData.fullProtocol;
      } else if ((documentType === 'STUDY_DESIGN' || documentType === 'REGULATORY') && docData.fullDocument) {
        docData.content = docData.fullDocument;
      }

      console.log('Normalized document:', {
        hasContent: !!docData.content,
        hasFullProtocol: !!docData.fullProtocol,
        hasFullDocument: !!docData.fullDocument,
        contentLength: docData.content?.length || 0
      });

      setSelectedDoc(docData);
      setViewMode('detail');
    } catch (err) {
      console.error('View document error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      let errorMessage = 'Failed to load document details';
      if (err.response?.status === 404) {
        errorMessage = 'Document not found';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStar = async (doc, e) => {
    e.stopPropagation();

    try {
      const token = localStorage.getItem('authToken');

      let endpoint;
      if (documentType === 'CHAT') {
        endpoint = `/my-conversations/${doc.id}/star`;
      } else if (documentType === 'PROTOCOL') {
        endpoint = `/protocols/${doc.id}/star`;
      } else if (documentType === 'STUDY_DESIGN') {
        endpoint = `/study-designs/${doc.id}/star`;
      } else if (documentType === 'REGULATORY') {
        endpoint = `/regulatory-documents/${doc.id}/star`;
      } else {
        endpoint = `/my-documents/${doc.id}/star`;
      }

      await axios.patch(
        `${API_BASE_URL}${endpoint}`,
        { starred: !doc.starred },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchDocuments();
    } catch (err) {
      console.error('Toggle star error:', err);
    }
  };

  const handleSelectDocument = async (doc) => {
    if (onSelectDocument) {
      try {
        // Fetch full document content first
        const token = localStorage.getItem('authToken');

        let endpoint;
        if (documentType === 'CHAT') {
          endpoint = `/my-conversations/${doc.id}`;
        } else if (documentType === 'PROTOCOL') {
          endpoint = `/protocols/${doc.id}`;
        } else if (documentType === 'STUDY_DESIGN') {
          endpoint = `/study-designs/${doc.id}`;
        } else if (documentType === 'REGULATORY') {
          endpoint = `/regulatory-documents/${doc.id}`;
        } else {
          endpoint = `/my-documents/${doc.id}`;
        }

        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const fullDoc = response.data;

        // Normalize content field name before passing to callback
        const normalizedDoc = { ...fullDoc };
        if (documentType === 'PROTOCOL' && fullDoc.fullProtocol) {
          normalizedDoc.content = fullDoc.fullProtocol;
        } else if ((documentType === 'STUDY_DESIGN' || documentType === 'REGULATORY') && fullDoc.fullDocument) {
          normalizedDoc.content = fullDoc.fullDocument;
        }

        console.log('Selecting document with content length:', normalizedDoc.content?.length || 0);
        onSelectDocument(normalizedDoc);
        onClose();
      } catch (err) {
        console.error('Error fetching full document:', err);
        setError('Failed to load full document content');
      }
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDoc(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      'PROTOCOL': 'Protocol',
      'STUDY_DESIGN': 'Study Design',
      'REGULATORY': 'Regulatory Document',
      'CHAT': 'Conversation',
      'OTHER': 'Document'
    };
    return labels[type] || type;
  };

  const filteredItems = documentType === 'CHAT'
    ? conversations.filter(conv =>
        !searchTerm ||
        conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents.filter(doc =>
        !searchTerm ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.disease?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  if (!isOpen) return null;

  return (
    <div className="previous-docs-overlay" onClick={onClose}>
      <div className="previous-docs-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="previous-docs-header">
          <h2>
            {viewMode === 'list'
              ? `Previous ${getDocumentTypeLabel(documentType)}s`
              : 'Document Details'}
          </h2>
          <button onClick={onClose} className="previous-docs-close">�</button>
        </div>

        {error && (
          <div className="previous-docs-error">
            {error}
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            {/* Search and Filters */}
            <div className="previous-docs-controls">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="previous-docs-search"
              />
              <label className="previous-docs-filter">
                <input
                  type="checkbox"
                  checked={filterStarred}
                  onChange={(e) => setFilterStarred(e.target.checked)}
                />
                <span>P Starred only</span>
              </label>
            </div>

            {/* Document List */}
            <div className="previous-docs-list">
              {loading ? (
                <div className="previous-docs-loading">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="previous-docs-empty">
                  No {filterStarred ? 'starred ' : ''}documents found
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="previous-doc-item"
                    onClick={() => handleViewDocument(item)}
                  >
                    <div className="previous-doc-header">
                      <div className="previous-doc-title-row">
                        <h3 className="previous-doc-title">{item.title}</h3>
                        <button
                          className={`previous-doc-star ${item.starred ? 'starred' : ''}`}
                          onClick={(e) => handleToggleStar(item, e)}
                        >
                          {item.starred ? 'P' : ''}
                        </button>
                      </div>
                      {item.description && (
                        <p className="previous-doc-description">{item.description}</p>
                      )}
                    </div>
                    <div className="previous-doc-meta">
                      {item.disease && (
                        <span className="previous-doc-tag">{item.disease}</span>
                      )}
                      {item.country && (
                        <span className="previous-doc-tag">{item.country}</span>
                      )}
                      {item.documentType && (
                        <span className="previous-doc-tag">{item.documentType}</span>
                      )}
                      <span className="previous-doc-date">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Document Detail View */}
            <div className="previous-doc-detail">
              <button onClick={handleBackToList} className="previous-doc-back">
                � Back to List
              </button>

              {loading ? (
                <div className="previous-docs-loading">Loading...</div>
              ) : selectedDoc ? (
                <>
                  <div className="previous-doc-detail-header">
                    <h3>{selectedDoc.title}</h3>
                    <button
                      className={`previous-doc-star-btn ${selectedDoc.starred ? 'starred' : ''}`}
                      onClick={(e) => handleToggleStar(selectedDoc, e)}
                    >
                      {selectedDoc.starred ? 'P Starred' : ' Star'}
                    </button>
                  </div>

                  {selectedDoc.description && (
                    <p className="previous-doc-detail-desc">{selectedDoc.description}</p>
                  )}

                  <div className="previous-doc-detail-meta">
                    <span>Created: {new Date(selectedDoc.createdAt).toLocaleString()}</span>
                    {selectedDoc.disease && <span>Disease: {selectedDoc.disease}</span>}
                    {selectedDoc.country && <span>Country: {selectedDoc.country}</span>}
                  </div>

                  {documentType === 'CHAT' ? (
                    <div className="previous-doc-messages">
                      {Array.isArray(selectedDoc.messages) && selectedDoc.messages.map((msg, idx) => (
                        <div key={idx} className={`previous-doc-message ${msg.role}`}>
                          <div className="previous-doc-message-role">{msg.role}</div>
                          <div className="previous-doc-message-content">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="previous-doc-content">
                      <pre>{selectedDoc.content}</pre>
                    </div>
                  )}

                  {onSelectDocument && (
                    <button
                      onClick={() => handleSelectDocument(selectedDoc)}
                      className="previous-doc-use-btn"
                    >
                      Use This Document
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PreviousDocuments;
