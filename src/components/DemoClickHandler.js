import React, { useEffect, useState } from 'react';
import './DemoClickHandler.css';

const DemoClickHandler = () => {
  const [clickCount, setClickCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const CLICK_THRESHOLD = 3;

  useEffect(() => {
    const handleClick = (e) => {
      // Check if the clicked element or its parent has pointer-events: none
      const target = e.target;
      const computedStyle = window.getComputedStyle(target);

      // Check if element is disabled via our demo CSS
      if (computedStyle.pointerEvents === 'none' ||
          target.closest('input:not(.sidebar input)') ||
          target.closest('textarea:not(.sidebar textarea)') ||
          target.closest('button:not(.sidebar button):not(.sidebar-toggle):not(.sidebar-mobile-toggle)') ||
          target.closest('.btn:not(.sidebar .btn)')) {

        setClickCount(prev => {
          const newCount = prev + 1;
          if (newCount >= CLICK_THRESHOLD) {
            setShowPopup(true);
            return 0; // Reset counter
          }
          return newCount;
        });
      }
    };

    // Add click listener to document
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  const closePopup = () => {
    setShowPopup(false);
    setClickCount(0);
  };

  if (!showPopup) return null;

  return (
    <>
      <div className="demo-popup-overlay" onClick={closePopup}></div>
      <div className="demo-popup">
        <button className="demo-popup-close" onClick={closePopup}>×</button>
        <div className="demo-popup-content">
          <h2>Interested in Trying Luminari?</h2>
          <p>
            This is a demo version with limited interactivity. To explore the full capabilities
            of our platform and see how it can transform your clinical research workflow,
            please contact the Luminari team.
          </p>
          <div className="demo-popup-actions">
            <a
              href="mailto:contact@luminari.com"
              className="demo-popup-btn demo-popup-btn-primary"
            >
              Contact Us
            </a>
            <button
              onClick={closePopup}
              className="demo-popup-btn demo-popup-btn-secondary"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoClickHandler;
