'use client';

import Table from "@/protected_components/market_components/market_subcomponents/Table";
import Graph from "@/protected_components/market_components/market_subcomponents/Graph";
import React, { useMemo, useState, useEffect } from "react";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";
import { getPrices } from "@/hooks/usePriceDatabase";

export default function Stock() {
  const { prices, setPrices, loadingPrices,setLoadingPrices } = usePrices();
  const { tickers, tickerMap } = useTransactions();

  const [selectedTicker, setSelectedTicker] = useState();
  const [range, setRange] = useState('YTD');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    if (tickers?.size !== 0)
      setSelectedTicker(tickers[0]);
  }, [tickers])

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
    return [start, end]
  };

  // Fetch prices whenever ticker or range changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingPrices(true);
        const[start, end] = getRangeDates(range);
        await getPrices(selectedTicker, start, end, prices, setPrices);
      } catch (err) {

      } finally {
        setLoadingPrices(false);
      }
    };
    fetchData();
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
      <h2>Stock</h2>
      <div className="grid">
        <div className="grid-item grid3">
          <div>{selectedTicker ? tickerMap[selectedTicker] || 'No description' : '—'}</div>
        </div>
        <div className="grid-item grid2">
          <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)} style={{width: '100%'}}>
            <option value="">Select Ticker</option>
            {tickers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid-item grid2">
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{width: '100%'}}>
            <option value="">Select Range</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>
        <div className="grid-item grid1">
          <button onClick={() => {
            setLoadingPrices(true);
            getPrices(selectedTicker, startDate, endDate, prices, setPrices)
            setLoadingPrices(false);
          }}>
            Refresh
          </button>
        </div>
      </div>

      {(!filteredPrices || !range || Object.keys(filteredPrices[selectedTicker] || {}).length === 0) ?
        <h3>No data. Select both ticker and dates.</h3>
        :
        (loadingPrices ?
            <div>Loading prices...</div>
            : <>
              <Graph prices={filteredPrices} selectedItem={selectedTicker}/>
              <Table prices={filteredPrices} selectedItem={selectedTicker} digits={2}/>
            </>
        )}
    </>
  );
}
