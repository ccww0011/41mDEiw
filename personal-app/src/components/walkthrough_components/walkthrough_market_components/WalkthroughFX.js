'use client';

import React, { useEffect, useMemo, useState } from "react";
import WalkthroughTable from "@/components/walkthrough_components/walkthrough_market_components/walkthrough_market_subcomponents/WalkthroughTable";
import WalkthroughGraph from "@/components/walkthrough_components/walkthrough_market_components/walkthrough_market_subcomponents/WalkthroughGraph";
import {useWalkthroughContext} from "@/context/WalkthroughContext";
import {getWalkthroughFxs} from "@/hooks/useWalkthroughFx";

export default function WalkthroughFX() {

  const {
    currencies,
    fxs,
    setFxs,
    loadingFxs,
    setLoadingFxs,
    basis
  } = useWalkthroughContext()

  const [c1, setC1] = useState(currencies[0]);
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
        await getWalkthroughFxs(items, fxs, setFxs, setLoadingFxs);
      }
    };

    fetchFxs();
  }, [c1, c2, range]);

  // ---------- Compute FX pair ----------
  const pair = `${c1}/${c2}`;

  const filteredFxs = useMemo(() => {
    if (!c1 || !c2 || !startDate || !endDate) return {};
    const pair = `${c1}/${c2}`;

    if (c1 === "USD" && c2 === "USD") {
      const result = {};
      let d = new Date(Number(startDate.slice(0, 4)), Number(startDate.slice(4, 6)) - 1, Number(startDate.slice(6, 8)));
      const end = new Date(Number(endDate.slice(0, 4)), Number(endDate.slice(4, 6)) - 1, Number(endDate.slice(6, 8)));
      while (d <= end) {
        const key = formatDate(d);
        result[key] = 1;
        d.setDate(d.getDate() + 1);
      }
      return { [pair]: result };
    }

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

  const latestRate = useMemo(() => {
    const data = filteredFxs[pair];
    if (!data) return null;
    return data[Object.keys(data).sort().at(-1)];
  }, [filteredFxs, pair]);


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
              await getWalkthroughFxs(items, fxs, setFxs, setLoadingFxs);
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
          <WalkthroughGraph prices={filteredFxs} selectedItem={pair} />
          <WalkthroughTable prices={filteredFxs} selectedItem={pair} digits={6} />
        </>
      )}
    </>
  );
}
