import React from 'react';

const CloseButton = ({ 
  onClick, 
  size = 24, 
  variant = 'default', 
  position = 'relative', 
  style = {} 
}) => {
  // Different variants for different contexts
  const variants = {
    default: {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      color: '#374151',
      hoverBackgroundColor: 'rgba(0, 0, 0, 0.2)',
      hoverColor: '#111827'
    },
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      hoverBackgroundColor: 'rgba(255, 255, 255, 0.3)',
      hoverColor: 'white'
    },
    dark: {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      color: '#6b7280',
      hoverBackgroundColor: 'rgba(239, 68, 68, 0.1)',
      hoverColor: '#dc2626'
    },
    danger: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      color: '#dc2626',
      hoverBackgroundColor: 'rgba(239, 68, 68, 0.2)',
      hoverColor: '#b91c1c'
    }
  };

  const variantStyle = variants[variant] || variants.default;

  const baseStyle = {
    position: position,
    width: `${size}px`,
    height: `${size}px`,
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.6}px`,
    fontWeight: '400',
    lineHeight: '1',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    backgroundColor: variantStyle.backgroundColor,
    color: variantStyle.color,
    ...style
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const currentStyle = {
    ...baseStyle,
    backgroundColor: isHovered 
      ? variantStyle.hoverBackgroundColor 
      : variantStyle.backgroundColor,
    color: isHovered 
      ? variantStyle.hoverColor 
      : variantStyle.color,
    transform: isHovered ? 'scale(1.1)' : 'scale(1)'
  };

  return (
    <button
      onClick={onClick}
      style={currentStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Close"
      title="Close"
    >
      ×
    </button>
  );
};

export default CloseButton;