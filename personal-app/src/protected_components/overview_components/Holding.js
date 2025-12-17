'use client';
import React, { useState, useMemo } from "react";
import {useTransactions} from "@/context/TransactionContext";
import PieChart from "@/components/PieChart";
import BarChart from "@/components/BarChart";
import {useValuationContext} from "@/context/ValuationContext";
import {useFxs} from "@/context/FxContext";
import {usePrices} from "@/context/PriceContext";
import {useValuation} from "@/hooks/useValuation";

export default function Holding() {
  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});

  const {currencies, transactions, loadingTransactions} = useTransactions();
  const {prices, loadingPrices} = usePrices();
  const {fxs, setFxs, loadingFxs, setLoadingFxs} = useFxs();
  const {basis, setBasis, endDate} = useValuationContext();

  const {holdings, aggregates, marketValueByTicker, marketValueByTradingCurrency}
    = useValuation(transactions, prices, fxs, setFxs, setLoadingFxs, basis, endDate);

  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    tradingCurrency: "Trading Currency",
    totalQuantity: "Quantity",
    avgCost: "Average Cost",
    price: "Last Price",
    costBasis: "Cost Basis",
    value: "Market Value",
    unrealisedPL: "Unrealised P/L",
    realisedPL: "Realised P/L",
    pL: "P/L",
  };

  const hideOnMobileColumns = ["ticker", "exchange", "avgCost", "realisedPL", "pL"];

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  // ---------------------------
  //     SORT + FILTER LOGIC
  // ---------------------------
  const sortedHoldings = useMemo(() => {
    let array = [...holdings];

    // compute combined P/L
    array = array.map(h => ({
      ...h,
      pL:
        h.unrealisedPL !== null && h.realisedPL !== null
          ? h.unrealisedPL + h.realisedPL
          : null
    }));

    // ----- APPLY FILTERS -----
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") {
        array = array.filter(item => item[key] === value);
      }
    });

    // ----- APPLY SORTS -----
    if (sortRules.length > 0) {
      for (let i = sortRules.length - 1; i >= 0; i--) {
        const { key, direction } = sortRules[i];
        array.sort((a, b) => {
          const valA = a[key],
            valB = b[key];
          const numA = parseFloat(valA),
            numB = parseFloat(valB);
          const bothNumbers = !isNaN(numA) && !isNaN(numB);

          if (bothNumbers) return direction === "asc" ? numA - numB : numB - numA;

          const strA = valA?.toString().toLowerCase() ?? "";
          const strB = valB?.toString().toLowerCase() ?? "";

          if (strA < strB) return direction === "asc" ? -1 : 1;
          if (strA > strB) return direction === "asc" ? 1 : -1;
          return 0;
        });
      }
    } else {
      // default sort by descending market value
      array.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    return array;
  }, [holdings, sortRules, filters]);
  // ---------------------------

  const formatNumber = (num) =>
    num === null || num === undefined
      ? "—"
      : Number(num).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

  const getStyle = (num) => ({
    textAlign: "right",
    color: num < 0 ? "red" : "black"
  });

  const renderSortControls = (key) => {
    const rule = sortRules.find((r) => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => onSortClick(key, "desc")}
          title="Sort Descending"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "desc" ? "#fb6a4a" : "#f7fbff"
          }}
        >
          ▼
        </button>
        <button
          onClick={() => onSortClick(key, "asc")}
          title="Sort Ascending"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "asc" ? "#fb6a4a" : "#f7fbff"
          }}
        >
          ▲
        </button>
        <button
          onClick={() => onSortClick(key, "remove")}
          title="Remove Sort"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: "#f7fbff"
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="grid">
        <div className="grid-item grid12" style={{padding: "25px 0 0 0"}}></div>
      </div>
      <div className="grid">
        <div className="grid-item grid2">
          <label>
            Basis Currency
          </label>
        </div>
        <div className="grid-item grid2">
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
          >
            <option key="Local" value="Local">Local</option>
            {currencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid2">
          <h2>Holding</h2>
        </div>
        <div className="grid-item grid10">
          {(loadingTransactions || loadingPrices || loadingFxs) && (
            <h3 style={{marginLeft: '20px', color: 'red'}}>
              {"Loading P/L data for tickers "}
              {aggregates.missingPLCurrencies.join(", ")}
            </h3>
          )}
        </div>
      </div>

      {(aggregates.missingPLCurrencies?.length === 0 || (loadingTransactions && loadingPrices && loadingFxs)) &&
        <div className="grid">
          <div className="grid-item grid6" style={{ flex: "1 1 300px", display: "flex", alignItems: "center" }}>
            <p>Market Value by Trading Currency</p>
            <div style={{width: "100%", maxWidth: 400, height: 200}}>
              <PieChart
                data={marketValueByTradingCurrency.sort((a, b) => b.percent - a.percent)}
                labelKey="tradingCurrency"
                valueKey="marketValue"
              />
            </div>
          </div>
          <div className="grid-item grid6" style={{ flex: "1 1 300px", display: "flex", alignItems: "center" }}>
            <p>Top 10 Market Value by Stock</p>
            <div style={{width: "100%", maxWidth: 400, height: 200}}>
              <BarChart
                data={marketValueByTicker.sort((a, b) => b.percent - a.percent)}
                labelKey="ticker"
                valueKey="percent"
              />
            </div>
          </div>
        </div>
      }

      {/* Aggregate table (unchanged) */}
      <table>
        <thead>
        <tr>
          <th>Currency</th>
          <th>Cost Basis</th>
          <th>Market Value</th>
          <th>Unrealised P/L</th>
          <th>Realised P/L</th>
          <th>Total P/L</th>
        </tr>
        </thead>

        <tbody>
        {Object.entries(aggregates.aggMap).map(([tradingCurrency, agg]) => (
          <tr key={tradingCurrency}>
            <td>{tradingCurrency}</td>

            <td style={getStyle(agg.costBasis)}>
              {formatNumber(agg.costBasis)}
            </td>

            <td style={getStyle(agg.marketValue)}>
              {formatNumber(agg.marketValue)}
            </td>

            <td style={getStyle(agg.unrealisedPL)}>
              {formatNumber(agg.unrealisedPL)}
            </td>

            <td style={getStyle(agg.realisedPL)}>
              {formatNumber(agg.realisedPL)}
            </td>

            <td style={getStyle(agg.pL)}>{formatNumber(agg.pL)}</td>
          </tr>
        ))}
        </tbody>
      </table>

      {/* Sorting info */}
      <div className="grid">
        <div className="grid-item grid8">
          Sorting priority:{" "}
          {sortRules.length === 0
            ? ""
            : sortRules
              .map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`)
              .join("; ")}
        </div>
        <div className="grid-item grid2">
          <button
            onClick={() => setSortRules([])}
            style={{backgroundColor: "#fb6a4a", color: "white"}}
          >
            Clear Sort
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            onClick={() => setFilters({})}
            style={{backgroundColor: "#969696", color: "white", marginRight: 8}}
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* Holding table */}
      <table
        border="1"
        cellPadding="8"
        style={{borderCollapse: "collapse", width: "100%"}}
      >
        <thead>
        {/* Header row with sort buttons */}
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => (
            <th
              key={key}
              className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
            >
              {renderSortControls(key)} {COLUMN_NAMES[key]}
            </th>
          ))}
        </tr>

        {/* Filter row */}
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => {
            const numericKeys = [
              "totalQuantity",
              "avgCost",
              "price",
              "costBasis",
              "value",
              "unrealisedPL",
              "realisedPL",
              "pL"
            ];

            if (numericKeys.includes(key)) {
              return <th
                key={key}
                className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
              ></th>; // empty cell for numeric fields
            }

            const options = Array.from(
              new Set(holdings.map((h) => h[key]).filter(Boolean))
            ).sort();

            return (
              <th
                key={key}
                className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
              >
                <select
                  value={filters[key] || "All"}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      [key]: value === "All" ? undefined : value
                    }));
                  }}
                  style={{width: "100%"}}
                >
                  <option value="All">All</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </th>
            );
          })}
        </tr>
        </thead>

        <tbody>
        {sortedHoldings.map((h) => (
          <tr key={`${h.ticker}|${h.exchange}`}>
            {Object.keys(COLUMN_NAMES).map((key) => (
              <td
                key={key}
                className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                style={["totalQuantity", "avgCost", "price", "costBasis", "value", "unrealisedPL", "realisedPL", "pL"].includes(key) ? getStyle(h[key]) : {}}
              >
                {["totalQuantity", "avgCost", "price", "costBasis", "value", "unrealisedPL", "realisedPL", "pL"].includes(key)
                  ? formatNumber(h[key])
                  : h[key]}
              </td>
            ))}
          </tr>
        ))}
        </tbody>
      </table>
    </>
  );
}
