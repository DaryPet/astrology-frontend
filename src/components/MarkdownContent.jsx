import React from 'react';

const MarkdownContent = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(<ul key={`ul-${elements.length}`}>{currentList}</ul>);
      } else {
        elements.push(<ol key={`ol-${elements.length}`}>{currentList}</ol>);
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={`h1-${index}`}>{trimmedLine.substring(2)}</h1>);
    } else if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={`h2-${index}`}>{trimmedLine.substring(3)}</h2>);
    } else if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={`h3-${index}`}>{trimmedLine.substring(4)}</h3>);
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(<li key={`li-${index}`}>{formatInline(trimmedLine.substring(2))}</li>);
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(<li key={`li-${index}`}>{formatInline(trimmedLine.replace(/^\d+\.\s/, ''))}</li>);
    } else if (trimmedLine === '---') {
      flushList();
      elements.push(<hr key={`hr-${index}`} />);
    } else if (trimmedLine === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={`p-${index}`}>{formatInline(trimmedLine)}</p>);
    }
  });

  flushList();

  return <div className="markdown-content">{elements}</div>;
};

const formatInline = (text) => {
  const parts = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    if (boldMatch && (!italicMatch || boldMatch.index < italicMatch.index)) {
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index));
      }
      parts.push(<strong key={`bold-${keyIndex++}`}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
    } else if (italicMatch) {
      if (italicMatch.index > 0) {
        parts.push(remaining.substring(0, italicMatch.index));
      }
      parts.push(<em key={`italic-${keyIndex++}`}>{italicMatch[1]}</em>);
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
};

export default MarkdownContent;