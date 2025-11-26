import React from 'react';

/**
 * Button component for consistent styling
 * @param {Object} props - Component props
 * @param {string} props.variant - Button variant: 'primary', 'secondary', 'success', 'danger', 'outline'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.icon - Optional icon to display before text
 * @param {string} props.type - Button type attribute (button, submit, reset)
 * @returns {React.ReactElement}
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style = {},
  onClick,
  children,
  icon,
  type = 'button',
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={isDisabled}
      onClick={!isDisabled ? onClick : undefined}
      style={style}
      {...props}
    >
      {icon && !loading && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;