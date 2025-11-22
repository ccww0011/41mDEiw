'use client';
import React, { useMemo, useState } from "react";
import { usePrices } from "@/context/PriceContext";
import { useTransactions } from "@/context/TransactionContext";

import { getPrices } from "@/hooks/usePriceDatabase";
import Table from "@/protected_components/price_components/Table";
import Graph from "@/protected_components/price_components/Graph";

export default function Price() {
  // Table or Graph
  const [showTab, setShowTab] = useState("Holdings");

  const { tickers , tickerMap } = useTransactions();
  const { prices, setPrices } = usePrices();

  const [selectedTicker, setSelectedTicker] = useState('');
  const [range, setRange] = useState('');
  const [sortRules, setSortRules] = useState([]);

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);
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

  const sortedPrices = useMemo(() => {
    if (!prices || !selectedTicker || !prices[selectedTicker]) return [];


    console.log(prices)


    const [startDate, endDate] = getRangeDates(range);

    let entries = Object.entries(prices[selectedTicker])
      .filter(([date]) => !startDate || !endDate || (date >= startDate && date <= endDate))
      .map(([date, close]) => ({
        Ticker: selectedTicker,
        Date: date,
        Close: close,
      }));

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

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') {
        return filtered.length > 0 ? filtered : [];
      }
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Graph")}
            style={{
              backgroundColor: showTab === "Graph" ? "#08519c" : undefined,
              color: showTab === "Graph" ? "#f7fbff" : undefined
            }}
          >
            Graph
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Table")}
            style={{
              backgroundColor: showTab === "Table" ? "#08519c" : undefined,
              color: showTab === "Table" ? "#f7fbff" : undefined
            }}
          >
            Table
          </button>
        </div>
        <div className="grid-item grid8"></div>

        <div className="grid-item grid10" style={{padding: "5px 0"}}></div>
      </div>

      <div className="grid">
        <div className="grid-item grid3">
          <label>Description:</label>
        </div>
        <div className="grid-item grid1">
          <label>Ticker:</label>
        </div>
        <div className="grid-item grid1">
          <label>Dates:</label>
        </div>
        <div className="grid-item grid1">
          <label>Select:</label>
        </div>
        <div className="grid-item grid4"></div>
      </div>

      <div className="grid">
        <div className="grid-item grid3">
          <div>
            {selectedTicker ? tickerMap[selectedTicker] || 'No description' : '—'}
          </div>
        </div>
        <div className="grid-item grid1">
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
        <div className="grid-item grid1">
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
        <div className="grid-item grid1">
          <button onClick={loadPrices}>Load Prices</button>
        </div>
        <div className="grid-item grid4"></div>

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

      {showTab === 'Table' ? (
        <Table
          sortedPrices={sortedPrices}
          sortRules={sortRules}
          onSortClick={onSortClick}
        />
      ) : (
        <Graph
          prices={prices}
          selectedTicker={selectedTicker}
          range={range}
        />
      )}
    </>
  );
}
