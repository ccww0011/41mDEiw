'use client';

import Table from "@/protected_components/price_components/Table";
import Graph from "@/protected_components/price_components/Graph";
import React, { useMemo, useState, useEffect } from "react";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";
import { getPrices } from "@/hooks/usePriceDatabase";

export default function Equity() {
  const { prices, setPrices, loadingPrices } = usePrices();
  const { tickers, tickerMap } = useTransactions();

  const [selectedTicker, setSelectedTicker] = useState('');
  const [range, setRange] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

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

  // Calculate start/end dates from selected range
  const getRangeDates = (range) => {
    const now = new Date();
    let start, end;
    switch (range) {
      case 'Last7Days':
        start = formatDate(subDays(now, 6));
        end = formatDate(now);
        break;
      case 'MTD':
        start = formatDate(startOfMonth(now));
        end = formatDate(now);
        break;
      case 'YTD':
        start = formatDate(startOfYear(now));
        end = formatDate(now);
        break;
      default:
        start = null;
        end = null;
    }
    setStartDate(start);
    setEndDate(end);
    return [start, end];
  };

  // Fetch prices whenever ticker or range changes
  useEffect(() => {
    if (!selectedTicker || !range) return;
    const [start, end] = getRangeDates(range);
    getPrices(selectedTicker, start, end, prices, setPrices);
  }, [selectedTicker, range]);

  // Filter prices for selected ticker and date range
  const filteredPrices = useMemo(() => {
    if (!selectedTicker || !prices[selectedTicker]) return {};
    if (!startDate || !endDate) return { [selectedTicker]: prices[selectedTicker] };

    const tickerPrices = prices[selectedTicker];
    const filtered = Object.fromEntries(
      Object.entries(tickerPrices).filter(([date]) => date >= startDate && date <= endDate)
    );
    return { [selectedTicker]: filtered };
  }, [prices, selectedTicker, startDate, endDate]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid3"><label>Description:</label></div>
        <div className="grid-item grid1"><label>Ticker:</label></div>
        <div className="grid-item grid1"><label>Dates:</label></div>
        <div className="grid-item grid1"><label>Select:</label></div>
        <div className="grid-item grid4"></div>
      </div>

      <div className="grid">
        <div className="grid-item grid3">
          <div>{selectedTicker ? tickerMap[selectedTicker] || 'No description' : '—'}</div>
        </div>
        <div className="grid-item grid1">
          <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Ticker</option>
            {tickers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid-item grid1">
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Range</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>
        <div className="grid-item grid1">
          <button onClick={() => getPrices(selectedTicker, startDate, endDate, prices, setPrices)}>
            Load Prices
          </button>
        </div>
        <div className="grid-item grid4"></div>
        <div className="grid-item grid10"></div>
      </div>

      {loadingPrices
        ? <div>Loading prices...</div>
        : (!filteredPrices || Object.keys(filteredPrices[selectedTicker] || {}).length === 0)
          ? <div>No data. Select ticker and dates, then press Load Prices button.</div>
          : <>
            <Graph prices={filteredPrices} selectedTicker={selectedTicker} />
            <Table prices={filteredPrices} selectedTicker={selectedTicker} />
          </>
      }
    </>
  );
}
