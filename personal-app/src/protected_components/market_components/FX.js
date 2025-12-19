'use client';

import Table from "@/protected_components/market_components/market_subcomponents/Table";
import Graph from "@/protected_components/market_components/market_subcomponents/Graph";
import React, {useEffect, useMemo, useState} from "react";
import {useTransactions} from "@/context/TransactionContext";
import {useFxs} from "@/context/FxContext";
import {getFxs} from "@/hooks/useFxDatabase";
import {useValuationContext} from "@/context/ValuationContext";

export default function FX() {
  const {fxs, setFxs, loadingFxs, setLoadingFxs} = useFxs();
  const {currencies} = useTransactions();
  const {basis} = useValuationContext();

  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('USD');
  const [range, setRange] = useState('YTD');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    if (basis !== "Local")
      setC1(basis);
  }, [basis]);

  // Format date YYYYMMDD
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);
  const subDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() - n);
    return d;
  };

  // Date range based on selected period
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

  // Fetch FX for both currencies whenever range/currency changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingFxs(true);
        if (!c1 || !c2 || !range) return;
        const [start, end] = getRangeDates(range);
        await getFxs(c1, start, end, fxs, setFxs);
        await getFxs(c2, start, end, fxs, setFxs);
      } catch (err) {

      } finally {
        setLoadingFxs(false);
      }
    }
    fetchData();
  }, [c1, c2, range]);

  // Compute currency pair: FX = FX[c2] / FX[c1]
  // Compute currency pair FX, handle USD properly
  const filteredFxs = useMemo(() => {
    if (!c1 || !c2) return {};
    const fx1 = c1 === "USD" ? {} : fxs[c1] || {};
    const fx2 = c2 === "USD" ? {} : fxs[c2] || {};
    // Collect all dates from both currencies (or generate from fx)
    const allDates = new Set([
      ...Object.keys(fx1),
      ...Object.keys(fx2),
    ]);
    // If both USD, synthesize some dates (last 30 days as example)
    if (c1 === "USD" && c2 === "USD" && allDates.size === 0) {
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        allDates.add(formatDate(d));
      }
    }
    const result = {};
    allDates.forEach(date => {
      if (startDate && endDate) {
        if (date < startDate || date > endDate) return;
      }
      const v1 = c1 === "USD" ? 1 : fx1[date];
      const v2 = c2 === "USD" ? 1 : fx2[date];
      if (v1 == null || v2 == null) return; // skip missing
      result[date] = v2 / v1;
    });
    return { [`${c1}/${c2}`]: result };
  }, [fxs, c1, c2, startDate, endDate]);

  const pair = `${c1}/${c2}`;

  const latestRate = useMemo(() => {
    const data = filteredFxs[pair];
    if (!data) return null;

    // Get the latest date
    const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));
    const latestDate = dates[0];
    return data[latestDate];
  }, [filteredFxs, pair]);

  return (
    <>
      <h2>Forex</h2>
      <div className="grid">
        {/* Description */}
        <div className="grid-item grid2">
          {c1 && c2
            ? <div>{pair} = {latestRate ? latestRate.toFixed(2) : '?'}</div>
            : <div>—</div>}
        </div>

        {/* Currency 1 */}
        <div className="grid-item grid1">
          <select value={c1} onChange={(e) => setC1(e.target.value)}>
            <option value="">Select</option>
            {currencies.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Currency 2 */}
        <div className="grid-item grid1">
          <select value={c2} onChange={(e) => setC2(e.target.value)}>
            <option value="">Select</option>
            {currencies.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Range */}
        <div className="grid-item grid2">
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="">Select Range</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>

        {/* Swap button */}
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => {
              setC1(prev => {
                setC2(prev); // swap
                return c2;
              });
            }}
          >
            ⇄
          </button>
        </div>

        {/* Refresh */}
        <div className="grid-item grid1">
          <button onClick={async () => {
            try {
              setLoadingFxs(true);
              await Promise.all([
                getFxs(c1, startDate, endDate, fxs, setFxs),
                getFxs(c2, startDate, endDate, fxs, setFxs),
              ]);
            } finally {
              setLoadingFxs(false); // ensures loading stops even if there's an error
            }
          }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Chart + table */}
      {!filteredFxs[pair] || !range || Object.keys(filteredFxs[pair]).length === 0 ?
        <h3>No data. Select both currencies and dates.</h3>
        : (loadingFxs ?
            <div>Loading FX data...</div>
            : <>
              <Graph prices={filteredFxs} selectedItem={pair}/>
              <Table prices={filteredFxs} selectedItem={pair} digits={6}/>
            </>
        )}
    </>
  );
}
