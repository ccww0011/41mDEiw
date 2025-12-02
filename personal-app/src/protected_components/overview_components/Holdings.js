'use client';
import React, { useState, useMemo } from "react";

export default function Holdings({ holdingsArray = [], aggregates }) {
  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});   // <<< ADDED

  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    currency: "Currency",
    totalQuantity: "Quantity",
    avgCost: "Average Cost",
    price: "Last Price",
    totalProceeds: "Cost Basis",
    value: "Market Value",
    unrealisedPL: "Unrealised P/L",
    realisedPL: "Realised P/L",
    pl: "P/L",
  };

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
    let array = [...holdingsArray];

    // compute combined P/L
    array = array.map(h => ({
      ...h,
      pl:
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
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      array.sort((a, b) => {
        const valA = a[key],
          valB = b[key];
        const numA = parseFloat(valA),
          numB = parseFloat(valB);
        const bothNumbers = !isNaN(numA) && !isNaN(numB);

        if (bothNumbers)
          return direction === "asc" ? numA - numB : numB - numA;

        const strA = valA?.toString().toLowerCase() ?? "";
        const strB = valB?.toString().toLowerCase() ?? "";

        if (strA < strB) return direction === "asc" ? -1 : 1;
        if (strA > strB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return array;
  }, [holdingsArray, sortRules, filters]);
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
    <div>
      <h2>Holdings</h2>

      {aggregates.missingPLCurrencies.length > 0 && (
        <p style={{ color: "red" }}>
          P/L data missing for tickers in:{" "}
          {aggregates.missingPLCurrencies.join(", ")}
        </p>
      )}

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
        {Object.entries(aggregates.map).map(([currency, agg]) => (
          <tr key={currency}>
            <td>{currency}</td>

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

            <td style={getStyle(agg.pl)}>{formatNumber(agg.pl)}</td>
          </tr>
        ))}
        </tbody>
      </table>

      {/* Sorting info */}
      <p>
        Sorting priority:{" "}
        {sortRules.length === 0
          ? "None"
          : sortRules
            .map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`)
            .join("; ")}
      </p>

      <div className="grid">
        <div className="grid-item grid8"></div>
        <div className="grid-item grid1">
          <button
            onClick={() => setSortRules([])}
            style={{backgroundColor: "#fb6a4a", color: "white"}}
          >
            Clear Sort
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            onClick={() => setFilters({})}
            style={{backgroundColor: "#969696", color: "white", marginRight: 8}}
          >
            Clear Filter
          </button>
        </div>

      </div>

      {/* Holdings table */}
      <table border="1" cellPadding="8" style={{borderCollapse: "collapse", width: "100%"}}>
        <thead>
        {/* Header row with sort buttons */}
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => (
            <th key={key}>
              {renderSortControls(key)} {COLUMN_NAMES[key]}
            </th>
          ))}
        </tr>

        {/* Filter row */}
        {/* Filter row */}
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => {
            // Only show dropdown for non-numeric fields
            const numericKeys = [
              "totalQuantity",
              "avgCost",
              "price",
              "totalProceeds",
              "value",
              "unrealisedPL",
              "realisedPL",
              "pl"
            ];

            if (numericKeys.includes(key)) {
              return <th key={key}></th>; // empty cell for numeric fields
            }

            // For non-numeric fields, compute options
            const options = Array.from(
              new Set(holdingsArray.map((h) => h[key]).filter(Boolean))
            ).sort();

            return (
              <th key={key}>
                <select
                  value={filters[key] || "All"}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      [key]: value === "All" ? undefined : value
                    }));
                  }}
                  style={{ width: "100%" }}
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

        {/* Body */}
        <tbody>
        {sortedHoldings.map((h) => (
          <tr key={`${h.ticker}|${h.exchange}`}>
            <td>{h.ticker}</td>
            <td>{h.description}</td>
            <td>{h.exchange}</td>
            <td>{h.currency}</td>
            <td style={getStyle(h.totalQuantity)}>
              {formatNumber(h.totalQuantity)}
            </td>
            <td style={getStyle(h.avgCost)}>{formatNumber(h.avgCost)}</td>
            <td style={getStyle(h.price)}>{formatNumber(h.price)}</td>
            <td style={getStyle(h.totalProceeds)}>
              {formatNumber(h.totalProceeds)}
            </td>
            <td style={getStyle(h.value)}>{formatNumber(h.value)}</td>
            <td style={getStyle(h.unrealisedPL)}>
              {formatNumber(h.unrealisedPL)}
            </td>
            <td style={getStyle(h.realisedPL)}>
              {formatNumber(h.realisedPL)}
            </td>
            <td style={getStyle(h.pl)}>{formatNumber(h.pl)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
