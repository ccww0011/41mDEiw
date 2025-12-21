'use client';

import React, { useEffect, useMemo, useState } from "react";
import Table from "@/protected_components/market_components/market_subcomponents/Table";
import Graph from "@/protected_components/market_components/market_subcomponents/Graph";
import { useTransactions } from "@/context/TransactionContext";
import { useFxs } from "@/context/FxContext";
import { useValuationContext } from "@/context/ValuationContext";
import { getFxs } from "@/hooks/useFxDatabase";

export default function FX() {
  const { fxs, setFxs, loadingFxs, setLoadingFxs } = useFxs();
  const { currencies } = useTransactions();
  const { basis } = useValuationContext();

  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("USD");
  const [range, setRange] = useState("YTD");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Default base currency
  useEffect(() => {
    if (basis !== "Local") setC1(basis);
  }, [basis]);

  // ---------- Date helpers ----------
  const formatDate = (date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
      date.getDate()
    ).padStart(2, "0")}`;

  const getRangeDates = (range) => {
    const now = new Date();
    switch (range) {
      case "Last7Days":
        return [formatDate(new Date(now.setDate(now.getDate() - 6))), formatDate(new Date())];
      case "MTD":
        return [formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), formatDate(new Date())];
      case "YTD":
        return [formatDate(new Date(new Date().getFullYear(), 0, 1)), formatDate(new Date())];
      default:
        return [null, null];
    }
  };

  // ---------- Fetch FXs (ASYNC, awaited) ----------
  useEffect(() => {
    if (!c1 || !c2 || !range) return;

    const fetchFxs = async () => {
      const [start, end] = getRangeDates(range);
      if (!start || !end) return;

      setStartDate(start);
      setEndDate(end);

      const items = [c1, c2]
        .filter(c => c && c !== "USD")
        .map(currency => ({
          currency,
          startDate: start,
          endDate: end,
        }));

      if (items.length) {
        await getFxs(items, fxs, setFxs, setLoadingFxs);
      }
    };

    fetchFxs();
  }, [c1, c2, range]);

  // ---------- Compute FX pair ----------
  const pair = `${c1}/${c2}`;

  const filteredFxs = useMemo(() => {
    if (!c1 || !c2) return {};

    const fx1 = c1 === "USD" ? {} : fxs[c1] || {};
    const fx2 = c2 === "USD" ? {} : fxs[c2] || {};

    const allDates = new Set([...Object.keys(fx1), ...Object.keys(fx2)]);
    const result = {};

    allDates.forEach(date => {
      if (date < startDate || date > endDate) return;
      const v1 = c1 === "USD" ? 1 : fx1[date];
      const v2 = c2 === "USD" ? 1 : fx2[date];
      if (v1 == null || v2 == null) return;
      result[date] = v2 / v1;
    });

    return { [pair]: result };
  }, [fxs, c1, c2, startDate, endDate]);

  // ---------- Latest rate ----------
  const latestRate = useMemo(() => {
    const data = filteredFxs[pair];
    if (!data) return null;
    return data[Object.keys(data).sort().at(-1)];
  }, [filteredFxs, pair]);

  // ---------- Render ----------
  return (
    <>
      <h2>Forex</h2>

      <div className="grid">
        <div className="grid-item grid2">
          {c1 && c2 ? `${pair} = ${latestRate?.toFixed(6) ?? "?"}` : "—"}
        </div>

        <div className="grid-item grid1">
          <select value={c1} onChange={e => setC1(e.target.value)}>
            <option value="">Select</option>
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid-item grid1">
          <select value={c2} onChange={e => setC2(e.target.value)}>
            <option value="">Select</option>
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid-item grid2">
          <select value={range} onChange={e => setRange(e.target.value)}>
            <option value="Last7Days">Last 7 Days</option>
            <option value="MTD">Month to Date</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>

        <div className="grid-item grid1">
          <button onClick={() => ([setC1(c2), setC2(c1)])}>⇄</button>
        </div>

        <div className="grid-item grid1">
          <button
            disabled={loadingFxs}
            onClick={async () => {
              if (!startDate || !endDate) return;
              const items = [c1, c2]
                .filter(c => c && c !== "USD")
                .map(currency => ({ currency, startDate, endDate }));
              await getFxs(items, fxs, setFxs, setLoadingFxs);
            }}
          >
            {loadingFxs ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!filteredFxs[pair] || Object.keys(filteredFxs[pair]).length === 0 ? (
        <h3>No data. Select both currencies and dates.</h3>
      ) : loadingFxs ? (
        <div>Loading FX data...</div>
      ) : (
        <>
          <Graph prices={filteredFxs} selectedItem={pair} />
          <Table prices={filteredFxs} selectedItem={pair} digits={6} />
        </>
      )}
    </>
  );
}
