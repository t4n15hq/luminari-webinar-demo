import React from 'react';
import CloseButton from './CloseButton';

const DocumentViewer = ({ open, onClose, title, content, metadata }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0',
        maxWidth: '700px',
        width: '90vw',
        maxHeight: '80vh',
        padding: '2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        overflow: 'auto',
        position: 'relative'
      }}>
        <CloseButton 
          onClick={onClose} 
          variant="default" 
          size={32}
          position="absolute"
          style={{ top: '16px', right: '16px' }}
        />
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {metadata && (
          <div style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.95em' }}>
            {Object.entries(metadata).map(([k, v]) => v && <span key={k} style={{ marginRight: 12 }}><strong>{k}:</strong> {v}</span>)}
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1.05em', color: '#22223b' }}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;