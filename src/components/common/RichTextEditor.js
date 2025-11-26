import React, { useRef, useState, useEffect, useCallback } from 'react';
import AIFloatingPrompt from './AIFloatingPrompt';

const RichTextEditor = ({ value, onChange, placeholder, style, aiEnabled = false }) => {
  const editorRef = useRef(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [savedRange, setSavedRange] = useState(null);
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 });
  const [aiPromptEnabled, setAiPromptEnabled] = useState(aiEnabled);
  const [editorContent, setEditorContent] = useState(value);

  // Update editor content when value prop changes
  useEffect(() => {
    setEditorContent(value);
  }, [value]);

  // Update aiPromptEnabled when aiEnabled prop changes
  useEffect(() => {
    setAiPromptEnabled(aiEnabled);
  }, [aiEnabled]);

  // Simple formatting functions using execCommand
  const execCommand = (command, value = null) => {
    editorRef.current.focus();
    
    // If no text is selected, select all text
    const selection = window.getSelection();
    if (!selection.toString()) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Execute the command
    document.execCommand(command, false, value);
    
    // Get the updated content
    const newContent = editorRef.current.innerHTML;
    setEditorContent(newContent);
    onChange(newContent);
  };

  // Formatting functions
  const makeBold = () => execCommand('bold');
  const makeItalic = () => execCommand('italic');
  const makeUnderline = () => execCommand('underline');
  
  const changeFontSize = (size) => {
    const fontSizeMap = {
      '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7'
    };
    execCommand('fontSize', fontSizeMap[size] || '3');
  };

  const alignText = (alignment) => {
    execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
  };

  const insertList = (type) => {
    const command = type === 'Unordered' ? 'insertUnorderedList' : 'insertOrderedList';
    execCommand(command);
  };

  const clearFormatting = () => execCommand('removeFormat');

  // Handle text selection for AI prompt
  const handleSelection = useCallback(() => {
    console.log('=== HANDLE SELECTION START ===');
    console.log('aiPromptEnabled:', aiPromptEnabled);
    if (!aiPromptEnabled) {
      console.log('AI not enabled, exiting');
      return;
    }
    
    const selection = window.getSelection();
    const rawText = selection.toString();
    const selectedText = rawText.trim();
    
    console.log('Raw text length:', rawText.length);
    console.log('Trimmed text length:', selectedText.length);
    console.log('Selected text:', `"${selectedText}"`);
    console.log('Range count:', selection.rangeCount);
    
    // Check if selection is within our editor
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const editorElement = editorRef.current;
      const isInEditor = editorElement && (editorElement.contains(container) || editorElement === container);
      console.log('Selection is in our editor:', isInEditor);
      
      if (!isInEditor) {
        console.log('Selection not in our editor, ignoring');
        return;
      }
    }
    
    if (selectedText.length > 0 && selection.rangeCount > 0) {
      console.log('Valid selection found! Setting up AI prompt...');
      setSelectedText(selectedText);
      
      // Save the current selection range for later replacement
      const range = selection.getRangeAt(0);
      const savedRange = {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        selectedText: selectedText
      };
      setSavedRange(savedRange);
      console.log('Saved range:', savedRange);
      
      const rect = range.getBoundingClientRect();
      console.log('Selection rect:', rect);
      
      // Calculate position relative to viewport (for fixed positioning)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;
      
      // Ensure prompt doesn't go off-screen
      if (x < 150) x = 150;
      if (x > viewportWidth - 150) x = viewportWidth - 150;
      if (rect.top < 200) y = rect.bottom + 10;
      if (rect.bottom > viewportHeight - 300) y = rect.top - 300;
      
      console.log('Setting prompt position to:', { x, y });
      setPromptPosition({ x, y });
      setShowAIPrompt(true);
      console.log('🎯 AI PROMPT SHOULD NOW BE VISIBLE!');
      console.log('=== HANDLE SELECTION END ===');
    } else {
      console.log('❌ No valid selection - selectedText.length:', selectedText.length, 'rangeCount:', selection.rangeCount);
      setShowAIPrompt(false);
      setSavedRange(null);
      console.log('=== HANDLE SELECTION END ===');
    }
  }, [aiPromptEnabled]);

  // Apply AI suggestion
  const applyAISuggestion = useCallback((suggestion) => {
    console.log('=== APPLY AI SUGGESTION START ===');
    console.log('Suggestion to apply:', suggestion);
    console.log('Saved range:', savedRange);
    
    if (!savedRange) {
      console.log('❌ No saved range found');
      alert('No text selection saved. The AI suggestion was: ' + suggestion);
      return;
    }
    
    try {
      // Restore the original selection range
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Verify the saved containers still exist in the DOM
      if (!editorRef.current.contains(savedRange.startContainer) || 
          !editorRef.current.contains(savedRange.endContainer)) {
        console.log('❌ Saved range containers no longer exist');
        throw new Error('Selection range is no longer valid');
      }
      
      range.setStart(savedRange.startContainer, savedRange.startOffset);
      range.setEnd(savedRange.endContainer, savedRange.endOffset);
      
      // Verify the range contains the expected text
      const rangeText = range.toString();
      console.log('Range text:', rangeText);
      console.log('Expected text:', savedRange.selectedText);
      
      if (rangeText !== savedRange.selectedText) {
        console.log('⚠️ Range text doesn\'t match expected text, but proceeding...');
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      editorRef.current.focus();
      
      // Try using execCommand first (most reliable for contentEditable)
      const success = document.execCommand('insertText', false, suggestion);
      console.log('execCommand insertText success:', success);
      
      if (success) {
        const newContent = editorRef.current.innerHTML;
        setEditorContent(newContent);
        onChange(newContent);
        console.log('✅ Text replacement successful via execCommand');
      } else {
        // Fallback: Manual DOM manipulation
        range.deleteContents();
        const textNode = document.createTextNode(suggestion);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        const newContent = editorRef.current.innerHTML;
        setEditorContent(newContent);
        onChange(newContent);
        console.log('✅ Text replacement successful via manual DOM manipulation');
      }
    } catch (error) {
      console.error('Text replacement failed:', error);
      alert('Text replacement failed. The AI suggestion was: ' + suggestion);
    }
    
    setShowAIPrompt(false);
    setSelectedText('');
    setSavedRange(null);
    editorRef.current.focus();
    console.log('=== APPLY AI SUGGESTION END ===');
  }, [onChange, savedRange]);

  // Close AI prompt
  const closeAIPrompt = useCallback(() => {
    setShowAIPrompt(false);
    setSelectedText('');
    setSavedRange(null);
  }, []);

  // Handle input changes
  const handleInput = (e) => {
    const newContent = e.target.innerHTML;
    setEditorContent(newContent);
    onChange(newContent);
  };

  // Add simplified event listener for AI (just mouseup)
  useEffect(() => {
    const editor = editorRef.current;
    console.log('Setting up mouseup listener, aiPromptEnabled:', aiPromptEnabled, 'editor:', !!editor);
    if (editor && aiPromptEnabled) {
      const handleMouseUp = () => {
        console.log('Mouseup event fired! Waiting 150ms then checking selection...');
        setTimeout(() => {
          console.log('Now calling handleSelection after mouseup...');
          handleSelection();
        }, 150);
      };
      
      editor.addEventListener('mouseup', handleMouseUp);
      return () => editor.removeEventListener('mouseup', handleMouseUp);
    }
  }, [aiPromptEnabled, handleSelection]);

  // Handle scroll events to keep popup positioned correctly
  useEffect(() => {
    if (!showAIPrompt) return;

    const handleScroll = () => {
      // Update prompt position when scrolling
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = rect.left + rect.width / 2;
        let y = rect.top - 10;
        
        // Ensure prompt doesn't go off-screen
        if (x < 150) x = 150;
        if (x > viewportWidth - 150) x = viewportWidth - 150;
        if (rect.top < 200) y = rect.bottom + 10;
        if (rect.bottom > viewportHeight - 300) y = rect.top - 300;
        
        setPromptPosition({ x, y });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAIPrompt]);

  // Handle clicks outside to close prompt
  useEffect(() => {
    const handleClickOutside = (event) => {
      console.log('Click outside check, event target:', event.target);
      console.log('Closest ai-prompt-container:', event.target.closest('.ai-prompt-container'));
      console.log('Closest rich-text-editor:', event.target.closest('.rich-text-editor'));
      
      if (showAIPrompt) {
        // Don't close if clicking inside the AI prompt or the editor itself
        const isInsidePrompt = event.target.closest('.ai-prompt-container');
        const isInsideEditor = event.target.closest('.rich-text-editor');
        
        if (!isInsidePrompt && !isInsideEditor) {
          console.log('Closing AI prompt due to outside click');
          closeAIPrompt();
        } else {
          console.log('Click inside prompt or editor, keeping open');
        }
      }
    };

    if (showAIPrompt) {
      // Use a slight delay to avoid immediate closure on the same click that opened it
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAIPrompt, closeAIPrompt]);

  return (
    <div className="rich-text-editor" style={{ border: '1px solid #d1d5db', borderRadius: '0' }}>
      {/* Rich Text Toolbar */}
      <div style={{
        borderBottom: '1px solid #d1d5db',
        padding: '8px',
        background: '#f9fafb',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center'
      }}>
        {/* Font Size */}
        <select
          onChange={(e) => changeFontSize(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            fontSize: '14px',
            color: '#1e40af',
            background: '#ffffff',
            cursor: 'pointer',
            minWidth: '80px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <option value="3">Normal</option>
          <option value="1">Small</option>
          <option value="2">Medium</option>
          <option value="4">Large</option>
          <option value="5">Extra Large</option>
          <option value="6">Huge</option>
        </select>

        {/* Bold */}
        <button
          onClick={makeBold}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Bold"
        >
          B
        </button>

        {/* Italic */}
        <button
          onClick={makeItalic}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontStyle: 'italic',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Italic"
        >
          I
        </button>

        {/* Underline */}
        <button
          onClick={makeUnderline}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Underline"
        >
          U
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 4px' }}></div>

        {/* Alignment */}
        <button
          onClick={() => alignText('left')}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Align Left"
        >
          ⬅
        </button>

        <button
          onClick={() => alignText('center')}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Align Center"
        >
          ↔
        </button>

        <button
          onClick={() => alignText('right')}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Align Right"
        >
          ➡
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 4px' }}></div>

        {/* Lists */}
        <button
          onClick={() => insertList('Unordered')}
          style={{
            padding: '6px 10px',
            border: '2px solid #3b82f6',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1e40af',
            minWidth: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#eff6ff'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Bullet List"
        >
          •
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 4px' }}></div>

        {/* AI Prompt Toggle */}
        {aiEnabled && (
          <button
            onClick={() => setAiPromptEnabled(!aiPromptEnabled)}
            style={{
              padding: '6px 10px',
              border: `2px solid ${aiPromptEnabled ? '#10b981' : '#3b82f6'}`,
              borderRadius: '0',
              background: aiPromptEnabled ? '#d1fae5' : '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              color: aiPromptEnabled ? '#065f46' : '#1e40af',
              minWidth: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => e.target.style.background = aiPromptEnabled ? '#a7f3d0' : '#eff6ff'}
            onMouseOut={(e) => e.target.style.background = aiPromptEnabled ? '#d1fae5' : '#ffffff'}
            title={aiPromptEnabled ? 'AI Enabled - Click to disable' : 'AI Disabled - Click to enable'}
          >
            🤖 AI
          </button>
        )}

        {/* Clear Formatting */}
        <button
          onClick={clearFormatting}
          style={{
            padding: '6px 10px',
            border: '2px solid #ef4444',
            borderRadius: '0',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#dc2626',
            minWidth: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.target.style.background = '#fef2f2'}
          onMouseOut={(e) => e.target.style.background = '#ffffff'}
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>
      
      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        dangerouslySetInnerHTML={{ __html: editorContent }}
        onInput={handleInput}
        style={{
          ...style,
          padding: '12px',
          minHeight: '200px',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: '1.5',
          border: '1px solid #d1d5db',
          borderRadius: '0',
          backgroundColor: '#ffffff'
        }}
        placeholder={placeholder}
      />
      
      {/* AI Floating Prompt */}
      {showAIPrompt && (
        <AIFloatingPrompt
          onApplySuggestion={applyAISuggestion}
          onClose={closeAIPrompt}
          selectedText={selectedText}
          position={promptPosition}
        />
      )}
    </div>
  );
};

export default RichTextEditor; 