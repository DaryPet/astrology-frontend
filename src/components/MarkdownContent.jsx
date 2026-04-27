import React from 'react';

const MarkdownContent = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;
  let inTable = false;
  let tableRows = [];
  let tableHeaders = [];

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(<ul key={`ul-${elements.length}`} className="markdown-list">{currentList}</ul>);
      } else {
        elements.push(<ol key={`ol-${elements.length}`} className="markdown-list">{currentList}</ol>);
      }
      currentList = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <table key={`table-${elements.length}`} className="markdown-table">
          <thead>
            <tr>
              {tableHeaders.map((header, i) => (
                <th key={`th-${i}`}>{formatInline(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={`tr-${ri}`}>
                {row.map((cell, ci) => (
                  <td key={`td-${ri}-${ci}`}>{formatInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableRows = [];
      tableHeaders = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Detect table rows (lines starting with |)
    if (/^\|.*\|/.test(trimmedLine)) {
const cells = trimmedLine.split('|').map(cell => cell.trim());

      if (!inTable) {
        flushList();
        inTable = true;
        tableHeaders = cells;
        return;
      }

      // Skip separator row (e.g., |---|---|)
      if (cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c))) {
        return;
      }

      if (inTable && cells.length > 0) {
        tableRows.push(cells);
        return;
      }
    }

    // If we were in a table but this line isn't a table row, end the table
    if (inTable && !/^\|.*\|/.test(trimmedLine)) {
      flushTable();
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      flushTable();
      elements.push(<h1 key={`h1-${index}`} className="markdown-h1">{trimmedLine.substring(2)}</h1>);
    } else if (trimmedLine.startsWith('## ')) {
      flushList();
      flushTable();
      elements.push(<h2 key={`h2-${index}`} className="markdown-h2">{trimmedLine.substring(3)}</h2>);
    } else if (trimmedLine.startsWith('### ')) {
      flushList();
      flushTable();
      elements.push(<h3 key={`h3-${index}`} className="markdown-h3">{trimmedLine.substring(4)}</h3>);
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (listType !== 'ul') {
        flushList();
        flushTable();
        listType = 'ul';
      }
      currentList.push(<li key={`li-${index}`} className="markdown-li">{formatInline(trimmedLine.substring(2))}</li>);
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== 'ol') {
        flushList();
        flushTable();
        listType = 'ol';
      }
      currentList.push(<li key={`li-${index}`} className="markdown-li">{formatInline(trimmedLine.replace(/^\d+\.\s/, ''))}</li>);
    } else if (trimmedLine === '---') {
      flushList();
      flushTable();
      elements.push(<hr key={`hr-${index}`} className="markdown-hr" />);
    } else if (trimmedLine === '') {
      flushList();
      // Only flush table on blank line if next line isn't a table row
    } else {
      flushList();
      flushTable();
      elements.push(<p key={`p-${index}`} className="markdown-p">{formatInline(trimmedLine)}</p>);
    }
  });

  flushList();
  flushTable();

  return <div className="markdown-content">{elements}</div>;
};

const formatInline = (text) => {
  if (!text) return '';

  const parts = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);

    if (boldMatch) {
      if (boldMatch.index > 0) {
        let before = remaining.substring(0, boldMatch.index).replace(/\*/g, '');
        if (before) parts.push(before);
      }
      parts.push(<strong key={`bold-${keyIndex++}`}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
    } else {
      let rest = remaining.replace(/\*/g, '');
      if (rest) parts.push(rest);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
};

export default MarkdownContent;