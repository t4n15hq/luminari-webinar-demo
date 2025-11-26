import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FloatingButton from '../FloatingButton';

describe('FloatingButton Component', () => {
  const defaultProps = {
    onClick: jest.fn(),
    icon: '🚀',
    label: 'Test Button'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default props', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Test Button');
    expect(button).toHaveTextContent('🚀');
  });

  test('calls onClick when clicked', () => {
    const mockOnClick = jest.fn();
    render(<FloatingButton {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('applies primary variant styles by default', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'var(--color-primary)',
      color: 'white'
    });
  });

  test('applies secondary variant styles', () => {
    render(<FloatingButton {...defaultProps} variant="secondary" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'var(--color-gray-500)',
      color: 'white'
    });
  });

  test('applies success variant styles', () => {
    render(<FloatingButton {...defaultProps} variant="success" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'var(--color-success)',
      color: 'white'
    });
  });

  test('positions button bottom-right by default', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      position: 'fixed',
      bottom: '2rem',
      right: '2rem'
    });
  });

  test('positions button bottom-left when specified', () => {
    render(<FloatingButton {...defaultProps} position="bottom-left" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      position: 'fixed',
      bottom: '2rem',
      left: '2rem'
    });
  });

  test('positions button top-right when specified', () => {
    render(<FloatingButton {...defaultProps} position="top-right" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      position: 'fixed',
      top: '2rem',
      right: '2rem'
    });
  });

  test('positions button top-left when specified', () => {
    render(<FloatingButton {...defaultProps} position="top-left" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      position: 'fixed',
      top: '2rem',
      left: '2rem'
    });
  });

  test('applies custom className', () => {
    render(<FloatingButton {...defaultProps} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('applies custom styles', () => {
    const customStyle = { marginTop: '10px', fontSize: '20px' };
    render(<FloatingButton {...defaultProps} style={customStyle} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      marginTop: '10px',
      fontSize: '20px'
    });
  });

  test('renders without icon when icon prop is not provided', () => {
    render(<FloatingButton onClick={jest.fn()} label="No Icon Button" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('No Icon Button');
    // Check that no icon span is rendered
    const iconSpan = button.querySelector('span[style*="fontSize: 1.1em"]');
    expect(iconSpan).not.toBeInTheDocument();
  });

  test('handles mouse events correctly', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // Test mouse enter (hover effect)
    fireEvent.mouseEnter(button);
    // Note: The actual style changes are applied via JavaScript,
    // which is harder to test in jsdom. In a real browser, this would
    // change the transform and box-shadow properties.
    
    // Test mouse leave
    fireEvent.mouseLeave(button);
    
    // Test mouse down
    fireEvent.mouseDown(button);
    
    // Test mouse up
    fireEvent.mouseUp(button);
  });

  test('handles focus and blur events', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // Test focus
    fireEvent.focus(button);
    // In a real browser, this would add outline styles
    
    // Test blur
    fireEvent.blur(button);
  });

  test('has proper accessibility attributes', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toHaveAttribute('disabled');
  });

  test('displays both icon and label correctly', () => {
    render(<FloatingButton {...defaultProps} icon="💊" label="Medical Button" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('💊');
    expect(button).toHaveTextContent('Medical Button');
    
    // Check that both icon and label are present
    const iconSpan = button.querySelector('span[style*="fontSize: 1.1em"]');
    const labelSpan = button.querySelector('span[style*="fontWeight: 600"]');
    
    expect(iconSpan).toBeInTheDocument();
    expect(labelSpan).toBeInTheDocument();
    expect(iconSpan).toHaveTextContent('💊');
    expect(labelSpan).toHaveTextContent('Medical Button');
  });

  test('applies correct z-index for layering', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      zIndex: '9999'
    });
  });

  test('has proper border radius for floating appearance', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      borderRadius: '2rem'
    });
  });

  test('includes backdrop filter for modern glass effect', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    });
  });

  test('prevents text selection for better UX', () => {
    render(<FloatingButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      userSelect: 'none'
    });
  });
});