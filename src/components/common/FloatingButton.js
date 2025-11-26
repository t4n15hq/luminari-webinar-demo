import React from 'react';

const FloatingButton = ({ 
  onClick, 
  icon, 
  label, 
  position = 'bottom-right',
  className = '',
  style = {},
  variant = 'primary'
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-right':
        return { bottom: '2rem', right: '2rem' };
      case 'bottom-left':
        return { bottom: '2rem', left: '2rem' };
      case 'top-right':
        return { top: '2rem', right: '2rem' };
      case 'top-left':
        return { top: '2rem', left: '2rem' };
      default:
        return { bottom: '2rem', right: '2rem' };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
          border: '1px solid rgba(37, 99, 235, 0.2)'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-gray-500)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(100, 116, 139, 0.3)',
          border: '1px solid rgba(100, 116, 139, 0.2)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        };
      default:
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
          border: '1px solid rgba(37, 99, 235, 0.2)'
        };
    }
  };

  const baseStyles = {
    position: 'fixed',
    zIndex: 9999,
    padding: '1rem 1.5rem',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: 'fit-content',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    userSelect: 'none',
    outline: 'none',
    border: 'none',
    textDecoration: 'none',
    ...getPositionStyles(),
    ...getVariantStyles(),
    ...style
  };

  const handleMouseEnter = (e) => {
    e.target.style.transform = 'translateY(-3px) scale(1.02)';
    e.target.style.boxShadow = variant === 'primary' 
      ? '0 12px 40px rgba(37, 99, 235, 0.4)' 
      : variant === 'secondary'
      ? '0 12px 40px rgba(107, 114, 128, 0.4)'
      : '0 12px 40px rgba(16, 185, 129, 0.4)';
  };

  const handleMouseLeave = (e) => {
    e.target.style.transform = 'translateY(0) scale(1)';
    e.target.style.boxShadow = variant === 'primary' 
      ? '0 8px 32px rgba(37, 99, 235, 0.3)' 
      : variant === 'secondary'
      ? '0 8px 32px rgba(107, 114, 128, 0.3)'
      : '0 8px 32px rgba(16, 185, 129, 0.3)';
  };

  const handleMouseDown = (e) => {
    e.target.style.transform = 'translateY(-1px) scale(0.98)';
  };

  const handleMouseUp = (e) => {
    e.target.style.transform = 'translateY(-3px) scale(1.02)';
  };

  return (
    <button
      onClick={onClick}
      className={className}
      style={baseStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={(e) => {
        e.target.style.outline = '2px solid rgba(37, 99, 235, 0.5)';
        e.target.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.target.style.outline = 'none';
      }}
    >
      {icon && (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: '1.1em'
        }}>
          {icon}
        </span>
      )}
      <span style={{ 
        fontWeight: '600',
        letterSpacing: '0.025em'
      }}>
        {label}
      </span>
    </button>
  );
};

export default FloatingButton;