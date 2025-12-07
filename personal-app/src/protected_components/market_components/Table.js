'use client';
import React, { useMemo, useState } from 'react';

const REQUIRED_HEADERS = ['Ticker', 'Date', 'Close'];

export default function Table({ prices, selectedTicker = '' }) {
  const [sortRules, setSortRules] = useState([]);

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') return filtered.length > 0 ? filtered : [];
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  // Flatten and sort prices
  const sortedPrices = useMemo(() => {
    if (!prices || !selectedTicker || !prices[selectedTicker]) return [];

    const entries = Object.entries(prices[selectedTicker]).map(([date, close]) => ({
      Ticker: selectedTicker,
      Date: date,
      Close: close,
    }));

    // Apply sorting rules
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      entries.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothAreNumbers = !isNaN(numA) && !isNaN(numB);
        if (bothAreNumbers) return direction === 'asc' ? numA - numB : numB - numA;

        const strA = valA?.toString().toLowerCase() ?? '';
        const strB = valB?.toString().toLowerCase() ?? '';
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return entries;
  }, [prices, sortRules, selectedTicker]);

  const renderSortControls = (key) => {
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={() => onSortClick(key, 'desc')} title="Sort Descending" style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: '#08519c',
          color: rule?.direction === 'desc' ? '#fb6a4a' : '#f7fbff'
        }}>▼</button>
        <button onClick={() => onSortClick(key, 'asc')} title="Sort Ascending" style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: '#08519c',
          color: rule?.direction === 'asc' ? '#fb6a4a' : '#f7fbff'
        }}>▲</button>
        <button onClick={() => onSortClick(key, 'remove')} title="Remove Sort" style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: '#08519c',
          color: '#f7fbff'
        }}>✕</button>
      </div>
    );
  };

  return (
    <div>
      <div className="grid">
        <div className="grid-item grid9">
          Sorting priority: {sortRules.length === 0
          ? 'None'
          : sortRules.map((rule, i) => `(${i + 1}) ${rule.key}`).join('; ')
        }
        </div>
        <div className="grid-item grid1">
          <button onClick={() => setSortRules([])} style={{backgroundColor: '#fb6a4a', color: 'white'}}>
            Clear
          </button>
        </div>
      </div>

      <table border="1" cellPadding="8" style={{borderCollapse: 'collapse', width: '100%'}}>
        <thead>
        <tr>
          {REQUIRED_HEADERS.map((header) => (
            <th key={header} style={{verticalAlign: 'top'}}>
              {renderSortControls(header)} {header}
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {sortedPrices.map((price, idx) => (
          <tr key={idx}>
            <td>{price.Ticker}</td>
            <td>{price.Date}</td>
            <td style={{textAlign: 'right'}}>
              {Number(price.Close).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
