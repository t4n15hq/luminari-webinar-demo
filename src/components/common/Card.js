import React from 'react';

/**
 * Card component for consistent content containers
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.header - Optional card header content
 * @param {React.ReactNode} props.footer - Optional card footer content
 * @param {string} props.title - Optional card title
 * @param {string} props.subtitle - Optional card subtitle
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.hover - Whether to show hover effects
 * @returns {React.ReactElement}
 */
const Card = ({ 
  children,
  header,
  footer,
  title,
  subtitle,
  className = '',
  style = {},
  hover = true
}) => {
  return (
    <div className={`card ${hover ? 'hover-lift' : ''} ${className}`} style={style}>
      {(header || title) && (
        <div className="card-header">
          {header || (
            <>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <div className="card-subtitle">{subtitle}</div>}
            </>
          )}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;