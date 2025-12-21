'use client';

import React, { useEffect, useMemo, useState } from "react";
import Table from "@/protected_components/market_components/market_subcomponents/Table";
import Graph from "@/protected_components/market_components/market_subcomponents/Graph";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";
import { getPrices } from "@/hooks/usePriceDatabase";

export default function Stock() {
  const { prices, setPrices, loadingPrices, setLoadingPrices } = usePrices();
  const { tickers, tickerMap } = useTransactions();

  const [selectedTicker, setSelectedTicker] = useState("");
  const [range, setRange] = useState("YTD");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Default ticker
  useEffect(() => {
    if (tickers?.length && !selectedTicker) {
      setSelectedTicker(tickers[0]);
    }
  }, [tickers, selectedTicker]);

  // ---------- Date helpers ----------
  const formatDate = (date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
      date.getDate()
    ).padStart(2, "0")}`;

  const subDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() - n);
    return d;
  };

  const getRangeDates = (range) => {
    const now = new Date();
    switch (range) {
      case "Last7Days":
        return [formatDate(subDays(now, 6)), formatDate(now)];
      case "MTD":
        return [formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), formatDate(now)];
      case "YTD":
        return [formatDate(new Date(now.getFullYear(), 0, 1)), formatDate(now)];
      default:
        return [null, null];
    }
  };

  // ---------- Fetch prices (async, awaited) ----------
  useEffect(() => {
    if (!selectedTicker || !range) return;

    const fetchPrices = async () => {
      const [start, end] = getRangeDates(range);
      if (!start || !end) return;

      setStartDate(start);
      setEndDate(end);

      await getPrices(
        [{ ticker: selectedTicker, startDate: start, endDate: end }],
        prices,
        setPrices,
        setLoadingPrices
      );
    };

    fetchPrices();
  }, [selectedTicker, range]);

  // ---------- Filter prices ----------
  const filteredPrices = useMemo(() => {
    if (!selectedTicker || !prices[selectedTicker]) return null;

    const data = Object.fromEntries(
      Object.entries(prices[selectedTicker]).filter(
        ([date]) => date >= startDate && date <= endDate
      )
    );

    return { [selectedTicker]: data };
  }, [prices, selectedTicker, startDate, endDate]);

  // ---------- Render ----------
  return (
    <>
      <h2>Stock</h2>

      <div className="grid">
        <div className="grid-item grid3">
          {selectedTicker ? tickerMap[selectedTicker] || "No description" : "—"}
        </div>

        <div className="grid-item grid2">
          <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}>
            {tickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid-item grid2">
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>

        <div className="grid-item grid1">
          <button
            disabled={loadingPrices}
            onClick={async () => {
              if (!selectedTicker || !startDate || !endDate) return;
              await getPrices(
                [{ ticker: selectedTicker, startDate, endDate }],
                prices,
                setPrices,
                setLoadingPrices
              );
            }}
          >
            {loadingPrices ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!filteredPrices || Object.keys(filteredPrices[selectedTicker] || {}).length === 0 ? (
        <h3>No data. Select both ticker and dates.</h3>
      ) : loadingPrices ? (
        <div>Loading prices...</div>
      ) : (
        <>
          <Graph prices={filteredPrices} selectedItem={selectedTicker} />
          <Table prices={filteredPrices} selectedItem={selectedTicker} digits={2} />
        </>
      )}
    </>
  );
}
