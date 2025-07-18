import React, { useMemo } from 'react';
import { highlighter } from './highlighter.js';
import './highlighter.css';

const HighlightedText = ({ text, format, className = '' }) => {
  const highlightedHtml = useMemo(() => {
    if (!text) return '';
    return highlighter.highlight(text, format);
  }, [text, format]);

  return (
    <div 
      className={`syntax-highlighter ${className}`}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  );
};

export default HighlightedText;