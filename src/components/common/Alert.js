import React from 'react';

/**
 * Alert component for displaying status messages
 * @param {Object} props - Component props
 * @param {string} props.type - Alert type: 'success', 'error', 'info', or 'warning'
 * @param {string} props.title - Optional alert title
 * @param {string|React.ReactNode} props.message - Alert message content
 * @param {boolean} props.dismissible - Whether the alert can be dismissed
 * @param {Function} props.onDismiss - Callback for when alert is dismissed
 * @returns {React.ReactElement}
 */
const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  dismissible = false, 
  onDismiss 
}) => {
  // Icon mapping for different alert types
  const iconMap = {
    success: '',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-icon">
        {iconMap[type]}
      </div>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{message}</div>
      </div>
      {dismissible && (
        <button 
          className="alert-dismiss" 
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;