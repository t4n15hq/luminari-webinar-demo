import React from 'react';

/**
 * LoadingSpinner component for indicating loading states
 * @param {Object} props - Component props
 * @param {string} props.size - Spinner size: 'sm', 'md', or 'lg'
 * @param {string} props.color - CSS color for the spinner
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Whether to display as a full-screen overlay
 * @returns {React.ReactElement}
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'var(--color-primary)',
  text,
  fullScreen = false
}) => {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px'
  };

  const borderWidth = {
    sm: '2px',
    md: '3px',
    lg: '4px'
  };

  const spinnerStyle = {
    width: sizeMap[size],
    height: sizeMap[size],
    borderWidth: borderWidth[size],
    borderColor: `rgba(0, 0, 0, 0.1)`,
    borderLeftColor: color
  };

  const spinner = (
    <div 
      className={`spinner spinner-${size}`}
      style={spinnerStyle}
      role="status"
      aria-hidden="true"
    />
  );

  if (fullScreen) {
    return (
      <div className="loading-overlay">
        {spinner}
        {text && <div className="loading-text">{text}</div>}
      </div>
    );
  }

  if (text) {
    return (
      <div className="loading-indicator">
        {spinner}
        <div className="loading-text">{text}</div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;