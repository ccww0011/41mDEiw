'use client';

import React, { useMemo, useState } from "react";
import { usePrices } from "@/context/PriceContext";
import { useTransactions } from "@/context/TransactionContext";
import { getPrices } from "@/hooks/usePriceDatabase";

const REQUIRED_HEADERS = ['Ticker', 'Date', 'Close'];

export default function Price() {
  const { tickers } = useTransactions();
  const { prices, setPrices } = usePrices();

  const [selectedTicker, setSelectedTicker] = useState('');
  const [range, setRange] = useState('');

  const [sortRules, setSortRules] = useState([]);

  // Format a Date object to 'yyMMdd'
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

// Get first day of month
  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// Get first day of year
  const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);

// Get N days before today
  const subDays = (date, n) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - n);
    return newDate;
  };

  const getRangeDates = (range) => {
    const now = new Date();
    switch (range) {
      case 'Last7Days':
        return [formatDate(subDays(now, 6)), formatDate(now)];
      case 'MTD':
        return [formatDate(startOfMonth(now)), formatDate(now)];
      case 'YTD':
        return [formatDate(startOfYear(now)), formatDate(now)];
      default:
        return [null, null];
    }
  };

  const loadPrices = async () => {
    if (!selectedTicker || !range) return;
    const [startDate, endDate] = getRangeDates(range);
    await getPrices(selectedTicker, startDate, endDate, prices, setPrices);
  };

  // Sorting
  const sortedPrices = useMemo(() => {
    if (!prices || !selectedTicker || !prices[selectedTicker]) return [];

    const [startDate, endDate] = getRangeDates(range);

    // Flatten into array of objects
    let entries = Object.entries(prices[selectedTicker])
      .filter(([date]) => !startDate || !endDate || (date >= startDate && date <= endDate))
      .map(([date, close]) => ({
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

    return entries;
  }, [prices, sortRules, selectedTicker, range]);

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

  const renderSortControls = (key) => {
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
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
        >▼</button>
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
        >▲</button>
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
            color: '#f7fbff'
          }}
        >✕</button>
      </div>
    );
  };

  return (
    <div>
      <h2>Prices</h2>

      <div className="grid" style={{marginBottom: 16}}>
        <div className="grid-item grid2">
          <label>Ticker:</label>
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            style={{width: '100%'}}
          >
            <option value="">Select Ticker</option>
            {tickers.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid-item grid2">
          <label>Date Range:</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{width: '100%'}}
          >
            <option value="">Select Range</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>

        <div className="grid-item grid2">
          <label>Select:</label>
          <button onClick={loadPrices}>Load Prices</button>
        </div>
        <div className="grid-item grid2"></div>

        <div className="grid-item grid2">
          <button
            onClick={() => setSortRules([])}
            style={{backgroundColor: '#fb6a4a', color: 'white', marginTop: 24, width: '100%'}}
          >
            Clear Sort
          </button>
        </div>
      </div>

      <p>
        Sorting priority: {sortRules.length === 0
        ? 'None'
        : sortRules.map((rule, i) => `(${i + 1}) ${rule.key}`).join('; ')}
      </p>

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
                {Number(price.Close).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
