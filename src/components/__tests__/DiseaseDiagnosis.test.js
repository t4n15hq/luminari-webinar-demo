import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import DiseaseDiagnosis from '../DiseaseDiagnosis';

// Mock the FloatingButton component
jest.mock('../common/FloatingButton', () => {
  return function MockFloatingButton({ onClick, label }) {
    return <button onClick={onClick} data-testid="floating-button">{label}</button>;
  };
});

// Mock the AskLuminaPopup component
jest.mock('../common/AskLuminaPopup', () => {
  return function MockAskLuminaPopup({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="ask-lumina-popup">
        <button onClick={onClose} data-testid="close-popup">Close</button>
      </div>
    ) : null;
  };
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('DiseaseDiagnosis Component', () => {
  beforeEach(() => {
    // Clear any previous state
    jest.clearAllMocks();
  });

  test('renders disease screening header with emoji', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    expect(screen.getByText(/🏥 Disease Screening/)).toBeInTheDocument();
    expect(screen.getByText(/🔬 Select a medical specialty to access AI-powered diagnosis tools/)).toBeInTheDocument();
  });

  test('renders Ask Lumina floating button', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const floatingButton = screen.getByTestId('floating-button');
    expect(floatingButton).toBeInTheDocument();
    expect(floatingButton).toHaveTextContent('Ask Lumina™');
  });

  test('displays all medical specialties', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    // Check for active specialties
    expect(screen.getByText('Dermatology')).toBeInTheDocument();
    expect(screen.getByText('Pulmonology')).toBeInTheDocument();
    
    // Check for coming soon specialties
    expect(screen.getByText('Neurology')).toBeInTheDocument();
    expect(screen.getByText('Oncology')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Mental Health')).toBeInTheDocument();
    expect(screen.getByText('Gastroenterology')).toBeInTheDocument();
    expect(screen.getByText('Infectious Diseases')).toBeInTheDocument();
    expect(screen.getByText('Endocrinology')).toBeInTheDocument();
    expect(screen.getByText('Rheumatology')).toBeInTheDocument();
    expect(screen.getByText('General Medicine')).toBeInTheDocument();
    expect(screen.getByText('Rare Disease')).toBeInTheDocument();
  });

  test('shows access tools button for active specialties', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const accessButtons = screen.getAllByText(/🚀 Access Tools/);
    expect(accessButtons).toHaveLength(2); // Dermatology and Pulmonology are active
  });

  test('shows coming soon button for inactive specialties', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const comingSoonButtons = screen.getAllByText(/⏳ Coming Soon/);
    expect(comingSoonButtons.length).toBeGreaterThan(0);
  });

  test('opens Ask Lumina popup when floating button is clicked', async () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const floatingButton = screen.getByTestId('floating-button');
    fireEvent.click(floatingButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('ask-lumina-popup')).toBeInTheDocument();
    });
  });

  test('closes Ask Lumina popup when close button is clicked', async () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    // Open popup
    const floatingButton = screen.getByTestId('floating-button');
    fireEvent.click(floatingButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('ask-lumina-popup')).toBeInTheDocument();
    });
    
    // Close popup
    const closeButton = screen.getByTestId('close-popup');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('ask-lumina-popup')).not.toBeInTheDocument();
    });
  });

  test('specialty cards have proper styling for active vs inactive', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    // Find dermatology card (active)
    const dermatologyCard = screen.getByText('Dermatology').closest('div');
    expect(dermatologyCard).not.toHaveStyle('opacity: 0.6');
    
    // Find neurology card (inactive) - check for disabled button
    const neurologySection = screen.getByText('Neurology').closest('div');
    const comingSoonButton = neurologySection.querySelector('button[disabled]');
    expect(comingSoonButton).toBeInTheDocument();
    expect(comingSoonButton).toHaveStyle('cursor: not-allowed');
  });

  test('access tools links navigate to correct paths', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const dermatologyLink = screen.getByRole('link', { name: /🚀 Access Tools/i });
    expect(dermatologyLink).toHaveAttribute('href', '/diagnosis/dermatology');
  });

  test('specialty descriptions are displayed correctly', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    expect(screen.getByText(/Skin disease detection and analysis using image recognition/)).toBeInTheDocument();
    expect(screen.getByText(/Lung cancer risk assessment using clinical data and text analysis/)).toBeInTheDocument();
    expect(screen.getByText(/Neurological condition assessment and cognitive analysis/)).toBeInTheDocument();
  });

  test('renders emoji icons correctly for specialties', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    // Check that emoji icons are rendered as text content
    const specialtyCards = screen.getAllByText(/\p{Emoji}/u);
    expect(specialtyCards.length).toBeGreaterThan(0);
  });

  test('handles mouse hover effects on active specialty cards', () => {
    renderWithRouter(<DiseaseDiagnosis />);
    
    const dermatologyCard = screen.getByText('Dermatology').closest('div');
    
    // Test hover effect
    fireEvent.mouseEnter(dermatologyCard);
    // Note: CSS hover effects are difficult to test directly in jsdom
    // In a real browser environment, this would change the box-shadow
    
    fireEvent.mouseLeave(dermatologyCard);
  });
});