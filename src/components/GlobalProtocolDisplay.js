import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const GlobalProtocolDisplay = () => {
  const { globalProtocolResult, globalStudyDesign } = useAuth();

  // Don't render anything if no protocol data exists
  if (!globalProtocolResult && !globalStudyDesign) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      border: '2px solid #3b82f6',
      borderRadius: '0',
      padding: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.5rem'
      }}>
        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>
          📋 Active Protocol
        </h4>
        <span style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '0.2rem 0.5rem',
          borderRadius: '0',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          LIVE
        </span>
      </div>

      {globalProtocolResult && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '0.25rem'
          }}>
            Enhanced Protocol
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#64748b',
            marginBottom: '0.25rem'
          }}>
            Protocol ID: {globalProtocolResult?.protocol_id || 'N/A'}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            padding: '0.5rem',
            borderRadius: '0',
            border: '1px solid #e2e8f0'
          }}>
            {globalProtocolResult?.protocol ? 
              globalProtocolResult.protocol.substring(0, 100) + '...' : 
              'No content available'
            }
          </div>
        </div>
      )}

      {globalStudyDesign && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#059669',
            marginBottom: '0.25rem'
          }}>
            Study Design
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            backgroundColor: '#f0fdf4',
            padding: '0.5rem',
            borderRadius: '0',
            border: '1px solid #10b981'
          }}>
            CMC & Clinical sections available
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '0.75rem'
      }}>
        <button
          onClick={() => window.location.href = '/protocol'}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          View Protocol
        </button>
        <button
          onClick={() => {
            if (globalProtocolResult?.protocol) {
              navigator.clipboard.writeText(globalProtocolResult.protocol);
            }
          }}
          style={{
            padding: '0.5rem',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #000000',
            borderRadius: '0',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
          title="Copy Protocol to Clipboard"
        >
          📋
        </button>
      </div>
    </div>
  );
};

export default GlobalProtocolDisplay;
