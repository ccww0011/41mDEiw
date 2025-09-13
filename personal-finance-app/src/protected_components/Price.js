'use client';

import React, {useMemo, useState} from "react";
import {usePrices} from "@/context/PriceContext";
import {useTransactions} from "@/context/TransactionContext";

const REQUIRED_HEADERS = [
  'Ticker',
  'Date',
  'Close',
];

export default function Price() {

  // Multi-sort state: array of {key, direction}
  const { tickers } = useTransactions();
  const { prices, loadingPrices } = usePrices();

  const [filters, setFilters] = useState({});
  const [sortRules, setSortRules] = useState([]);

  // Sorting
  const sortedPrices = useMemo(() => {
    if (!Array.isArray(prices)) return [];

    // Filter first
    let filtered = [...prices];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });

    // Then sort
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      filtered.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothAreNumbers = !isNaN(numA) && !isNaN(numB);
        if (bothAreNumbers) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        const strA = valA?.toString().toLowerCase() ?? '';
        const strB = valB?.toString().toLowerCase() ?? '';
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [prices, sortRules, filters]);


  // Handler for clicking Asc, Desc, Remove buttons
  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') {
        return filtered.length > 0 ? filtered : [];
      }
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  // Render sort control buttons for each column
  const renderSortControls = (key) => {
    // Check current rule direction for this key if exists
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{display: "flex", alignItems: "center"}}>
        <button
          onClick={() => onSortClick(key, 'desc')}
          title="Sort Descending"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: rule?.direction === 'desc' ? '#fb6a4a' : '#f7fbff'
          }}
        >
          ▼
        </button>
        <button
          onClick={() => onSortClick(key, 'asc')}
          title="Sort Ascending"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: rule?.direction === 'asc' ? '#fb6a4a' : '#f7fbff'
          }}
        >
          ▲
        </button>
        <button
          onClick={() => onSortClick(key, 'remove')}
          title="Remove Sort"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: rule?.direction === 'remove' ? '#fb6a4a' : '#f7fbff'
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <>
      <div>
        <h2>Prices</h2>
        <p>
          Sorting priority: {sortRules.length === 0
          ? 'None'
          : sortRules
            .map((rule, i) => `(${i + 1}) ${rule.key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}`)
            .join('; ')}
        </p>

        <div className="grid">
          <div className="grid-item grid8"></div>
          <div className="grid-item grid1">
            <button
              onClick={() => setSortRules([])}
              style={{backgroundColor: '#fb6a4a', color: 'white'}}
            >
              Clear Sort
            </button>
          </div>
          <div className="grid-item grid1">
            <button
              onClick={() => setFilters({})}
              style={{backgroundColor: '#969696', color: 'white'}}
            >
              Clear Filter
            </button>
          </div>
        </div>

        <table border="1" cellPadding="8" style={{borderCollapse: 'collapse', width: '100%'}}>
          <thead>
          <tr>
            {REQUIRED_HEADERS.map((header) => (
              <th key={header} style={{verticalAlign: 'top'}}>
                {renderSortControls(header)} {header.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}
              </th>
            ))}
          </tr>

          <tr>
            {REQUIRED_HEADERS.map((header) => {
              const options = Array.from(
                new Set((Array.isArray(prices) ? prices : []).map(tx => tx[header]).filter(Boolean))
              ).sort();

              return (
                <th key={header}>
                  <select
                    value={filters[header] || 'All'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        [header]: value === 'All' ? undefined : value,
                      }));
                    }}
                    style={{width: '100%'}}
                  >
                    <option value="All">All</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </th>
              );
            })}
          </tr>
          </thead>

          {loadingPrices && sortedPrices == null ? undefined :
            <tbody>
            {sortedPrices.map((price, idx) => (
              <tr key={idx}>
                <td>{price.Ticker}</td>
                <td>{price.Date}</td>
                <td style={{textAlign: 'right'}}>{Number(price.Close).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</td>
              </tr>
            ))}
            </tbody>
          }
        </table>
      </div>
    </>
  );
}
