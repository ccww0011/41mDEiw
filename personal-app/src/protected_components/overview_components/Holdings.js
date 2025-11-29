'use client';
import React, { useState, useMemo } from "react";

export default function Holdings({ holdingsArray = [] }) {
  const [sortRules, setSortRules] = useState([]);

  // Mapping internal keys to column headers
  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    totalQuantity: "Qtn",
    avgCost: "Avg Cost",
    totalCost: "Proceeds",
    price: "Price",
    value: "Value",
    pl: "Unrealised P/L",
    currency: "Currency"
  };

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const sortedHoldings = useMemo(() => {
    let array = [...holdingsArray];
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      array.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothNumbers = !isNaN(numA) && !isNaN(numB);
        if (bothNumbers) return direction === 'asc' ? numA - numB : numB - numA;
        const strA = valA?.toString().toLowerCase() ?? '';
        const strB = valB?.toString().toLowerCase() ?? '';
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return array;
  }, [holdingsArray, sortRules]);

  const formatNumber = (num) =>
    Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStyle = (num) => ({
    textAlign: 'right',
    color: num < 0 ? 'red' : 'black'
  });

  const renderSortControls = (key) => {
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => onSortClick(key, 'desc')}
          title="Sort Descending"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: '#08519c',
            color: rule?.direction === 'desc' ? '#fb6a4a' : '#f7fbff'
          }}
        >▼</button>
        <button
          onClick={() => onSortClick(key, 'asc')}
          title="Sort Ascending"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: '#08519c',
            color: rule?.direction === 'asc' ? '#fb6a4a' : '#f7fbff'
          }}
        >▲</button>
        <button
          onClick={() => onSortClick(key, 'remove')}
          title="Remove Sort"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: '#08519c',
            color: '#f7fbff'
          }}
        >✕</button>
      </div>
    );
  };

  return (
    <div>
      <h2>Holdings</h2>

      <p>
        Sorting priority: {sortRules.length === 0
        ? 'None'
        : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join('; ')}
      </p>

      <div className="grid">
        <div className="grid-item grid9"></div>
        <div className="grid-item grid1">
          <button
            onClick={() => setSortRules([])}
            style={{backgroundColor: '#fb6a4a', color: 'white'}}
          >
            Clear
          </button>
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
        <tr>
          {Object.keys(COLUMN_NAMES).map(key => (
            <th key={key}>
              {renderSortControls(key)}{COLUMN_NAMES[key]}
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {sortedHoldings.map(h => (
          <tr key={`${h.ticker}|${h.exchange}`}>
            <td>{h.ticker}</td>
            <td>{h.description}</td>
            <td>{h.exchange}</td>
            <td style={getStyle(h.totalQuantity)}>{formatNumber(h.totalQuantity)}</td>
            <td style={getStyle(h.avgCost)}>{formatNumber(h.avgCost)}</td>
            <td style={getStyle(h.totalCost)}>{formatNumber(h.totalCost)}</td>
            <td style={getStyle(h.price)}>{formatNumber(h.price)}</td>
            <td style={getStyle(h.value)}>{formatNumber(h.value)}</td>
            <td style={getStyle(h.pl)}>{formatNumber(h.pl)}</td>
            <td>{h.currency}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
