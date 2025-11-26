// src/components/common/BackgroundJobs.js
import React, { useState } from 'react';
import { useBackgroundJobs } from '../../hooks/useBackgroundJobs';
import jsPDF from 'jspdf';

const BackgroundJobs = () => {
  const { activeJobs, completedJobs, cancelJob, clearJob, clearCompleted, hasActiveJobs, hasCompletedJobs } = useBackgroundJobs();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no jobs
  if (!hasActiveJobs && !hasCompletedJobs) {
    return null;
  }

  const totalJobs = activeJobs.length + completedJobs.length;

  const formatDuration = (startTime, endTime) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const downloadJobResult = (job) => {
    try {
      let content = '';
      let filename = '';
      
      if (job.type === 'regulatory_document') {
        if (job.result && job.result.document_content) {
          content = job.result.document_content;
          filename = `regulatory_document_${Date.now()}.pdf`;
        } else if (job.result && (job.result.cmc_section || job.result.clinical_section)) {
          content = `CMC SECTION:\n${job.result.cmc_section || ''}\n\nCLINICAL SECTION:\n${job.result.clinical_section || ''}`;
          filename = `regulatory_document_${Date.now()}.pdf`;
        }
      } else if (job.type === 'protocol') {
        if (job.result && job.result.protocol) {
          content = job.result.protocol;
          filename = `protocol_${job.result.protocol_id || Date.now()}.pdf`;
        }
      } else if (job.type === 'study_design') {
        if (job.result && (job.result.cmc_section || job.result.clinical_section)) {
          content = `CMC SECTION:\n${job.result.cmc_section || ''}\n\nCLINICAL SECTION:\n${job.result.clinical_section || ''}`;
          filename = `study_design_${Date.now()}.pdf`;
        }
      } else if (job.type === 'batch_regulatory') {
        if (job.result && job.result.document_content) {
          content = job.result.document_content;
          filename = `batch_regulatory_${Date.now()}.pdf`;
        }
      }
      
      if (content && content.trim()) {
        // Generate PDF using jsPDF with multi-page support
        const doc = new jsPDF();
        doc.setFont('helvetica');
        doc.setFontSize(12);
        
        // PDF page settings
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        const lineHeight = 7;
        const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
        
        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(content, maxLineWidth);
        
        let currentLine = 0;
        
        // Add content with automatic page breaks
        for (let i = 0; i < lines.length; i++) {
          if (currentLine >= maxLinesPerPage) {
            doc.addPage();
            currentLine = 0;
          }
          
          const yPosition = margin + (currentLine * lineHeight);
          doc.text(lines[i], margin, yPosition);
          currentLine++;
        }
        
        doc.save(filename);
      } else {
        alert('No content available for download. Please check if the job completed successfully.');
      }
    } catch (error) {
      console.error('Error downloading job result:', error);
      alert(`Error downloading PDF: ${error.message}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      right: '20px',
      zIndex: 1000,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
          borderRadius: '0',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3), 0 4px 16px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          fontSize: '14px',
          fontWeight: '600',
          letterSpacing: '0.025em',
          userSelect: 'none',
          ...(isExpanded ? {
            borderRadius: '0',
            background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-dark) 100%)',
            boxShadow: '0 12px 40px rgba(67, 56, 202, 0.4), 0 6px 20px rgba(0, 0, 0, 0.15)'
          } : {}),
          ':hover': !isExpanded ? {
            transform: 'translateY(-2px) scale(1.02)',
            boxShadow: '0 12px 40px rgba(79, 70, 229, 0.4), 0 6px 20px rgba(0, 0, 0, 0.15)'
          } : {}
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.target.style.transform = 'translateY(-2px) scale(1.02)';
            e.target.style.boxShadow = '0 12px 40px rgba(79, 70, 229, 0.4), 0 6px 20px rgba(0, 0, 0, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 8px 32px rgba(79, 70, 229, 0.3), 0 4px 16px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>⟲</span>
        <span>Background Jobs</span>
        <span style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '4px 8px',
          borderRadius: '0',
          fontSize: '12px',
          fontWeight: '700',
          minWidth: '20px',
          textAlign: 'center'
        }}>
          {totalJobs}
        </span>
        <span style={{
          fontSize: '12px',
          opacity: 0.8,
          transition: 'transform 0.3s ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </div>
      
      {isExpanded && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '0 0 16px 16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: 'none',
          boxShadow: '0 12px 40px rgba(67, 56, 202, 0.4), 0 6px 20px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          maxWidth: '400px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {/* Active Jobs */}
          {hasActiveJobs && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '0',
                border: '1px solid #f59e0b'
              }}>
                <span>◐</span>
                <span>Active Jobs ({activeJobs.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeJobs.map((job) => (
                  <div key={job.id} style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {job.type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Running for {formatDuration(job.startTime)}
                        </div>
                      </div>
                      <button
                        onClick={() => cancelJob(job.id)}
                        style={{
                          background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error) 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '0',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${job.progress || 25}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                        borderRadius: '0',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {hasCompletedJobs && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                borderRadius: '0',
                border: '1px solid #16a34a'
              }}>
                <span>Complete</span>
                <span>Completed Jobs ({completedJobs.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completedJobs.slice().reverse().map((job) => (
                  <div key={job.id} style={{
                    background: job.status === 'completed' 
                      ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
                      : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
                    border: `1px solid ${job.status === 'completed' ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '0',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {job.type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: job.status === 'completed' ? '#16a34a' : '#dc2626',
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          {job.status === 'completed' ? '✓' : '✕'} • {formatDuration(job.startTime, job.endTime)}
                        </div>
                        {job.error && (
                          <div style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            background: '#fef2f2',
                            padding: '4px 8px',
                            borderRadius: '0',
                            border: '1px solid #fecaca'
                          }}>
                            Error: {job.error}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {job.status === 'completed' && (
                          <button
                            onClick={() => downloadJobResult(job)}
                            style={{
                              background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-dark) 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            ⬇ Download
                          </button>
                        )}
                        <button
                          onClick={() => clearJob(job.id)}
                          style={{
                            background: 'linear-gradient(135deg, var(--color-gray-500) 0%, var(--color-gray-600) 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {hasCompletedJobs && (
            <button 
              onClick={clearCompleted} 
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--color-gray-500) 0%, var(--color-gray-600) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginTop: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, var(--color-gray-600) 0%, var(--color-gray-700) 100%)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Clear Completed Jobs
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundJobs;
