'use client';
import React, { useState, useMemo } from "react";

export default function Holdings({ holdingsArray = [] }) {
  const [sortRules, setSortRules] = useState([]);

  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    totalQuantity: "Quantity",
    avgCost: "Average Cost",
    price: "Last Price",
    totalProceeds: "Cost Basis",
    value: "Market Value",
    unrealisedPL: "Unrealised P/L",
    realisedPL: "Realised P/L",
    pl: "P/L",
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

    array = array.map(h => ({
      ...h,
      pl: h.unrealisedPL !== null && h.realisedPL !== null
        ? h.unrealisedPL + h.realisedPL
        : null
    }));

    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      array.sort((a, b) => {
        const valA = a[key], valB = b[key];
        const numA = parseFloat(valA), numB = parseFloat(valB);
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

  const aggregates = useMemo(() => {
    const map = {};
    const missingPLCurrencies = new Set();

    holdingsArray.forEach(h => {
      const curr = h.currency || "N/A";
      if (!map[curr]) map[curr] = { unrealisedPL: 0, realisedPL: 0, pl: 0 };

      if (h.unrealisedPL !== null) map[curr].unrealisedPL += h.unrealisedPL;
      else missingPLCurrencies.add(curr);

      if (h.realisedPL !== null) map[curr].realisedPL += h.realisedPL;
      else missingPLCurrencies.add(curr);

      if (h.pl !== null) map[curr].pl += h.pl;
      else missingPLCurrencies.add(curr);
    });

    return { map, missingPLCurrencies: Array.from(missingPLCurrencies) };
  }, [holdingsArray]);

  const formatNumber = (num) =>
    num === null || num === undefined ? "—" : Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStyle = (num) => ({
    textAlign: 'right',
    color: num < 0 ? 'red' : 'black'
  });

  const renderSortControls = (key) => {
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={() => onSortClick(key, 'desc')} title="Sort Descending"
                style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#08519c', color: rule?.direction === 'desc' ? '#fb6a4a' : '#f7fbff' }}>▼</button>
        <button onClick={() => onSortClick(key, 'asc')} title="Sort Ascending"
                style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#08519c', color: rule?.direction === 'asc' ? '#fb6a4a' : '#f7fbff' }}>▲</button>
        <button onClick={() => onSortClick(key, 'remove')} title="Remove Sort"
                style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#08519c', color: '#f7fbff' }}>✕</button>
      </div>
    );
  };

  return (
    <div>
      <h2>Holdings</h2>

      {/* Missing P/L notice */}
      {aggregates.missingPLCurrencies.length > 0 && (
        <p style={{ color: 'orange', fontWeight: 'bold' }}>
          P/L data missing for tickers in: {aggregates.missingPLCurrencies.join(", ")}
        </p>
      )}

      {/* Aggregate table */}
      <table>
        <thead>
        <tr>
          <th>Currency</th>
          <th>Unrealised P/L</th>
          <th>Realised P/L</th>
          <th>Total P/L</th>
        </tr>
        </thead>
        <tbody>
        {Object.entries(aggregates.map).map(([currency, agg]) => (
          <tr key={currency}>
            <td>{currency}</td>
            <td style={getStyle(agg.unrealisedPL)}>{formatNumber(agg.unrealisedPL)}</td>
            <td style={getStyle(agg.realisedPL)}>{formatNumber(agg.realisedPL)}</td>
            <td style={getStyle(agg.pl)}>{formatNumber(agg.pl)}</td>
          </tr>
        ))}
        </tbody>
      </table>

      {/* Sorting info */}
      <p>
        Sorting priority: {sortRules.length === 0
        ? 'None'
        : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join('; ')}
      </p>

      <div className="grid">
        <div className="grid-item grid9"></div>
        <div className="grid-item grid1">
          <button onClick={() => setSortRules([])} style={{backgroundColor: '#fb6a4a', color: 'white'}}>Clear</button>
        </div>
      </div>

      {/* Main holdings table */}
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
            <td style={getStyle(h.price)}>{formatNumber(h.price)}</td>
            <td style={getStyle(h.totalProceeds)}>{formatNumber(h.totalProceeds)}</td>
            <td style={getStyle(h.value)}>{formatNumber(h.value)}</td>
            <td style={getStyle(h.unrealisedPL)}>{formatNumber(h.unrealisedPL)}</td>
            <td style={getStyle(h.realisedPL)}>{formatNumber(h.realisedPL)}</td>
            <td style={getStyle(h.pl)}>{formatNumber(h.pl)}</td>
            <td>{h.currency}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
