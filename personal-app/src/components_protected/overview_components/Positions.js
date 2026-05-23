'use client';

import React, { useMemo, useState } from "react";
import { useValuationContext } from "@/context/ValuationContext";
import { useTransactions } from "@/context/TransactionContext";
import { useUserSettings } from "@/context/UserSettingsContext";
import { useValuationPositions } from "@/hooks_protected/useValuationPositions";
import RealisedSchedule from "@/components_protected/overview_components/positions_subcomponents/RealisedSchedule";
import DividendSchedule from "@/components_protected/overview_components/positions_subcomponents/DividendSchedule";

export default function Positions() {
  const { latestValuationDate, tickerMap } = useValuationContext();
  const allTimeHoldings = useValuationPositions(latestValuationDate);
  const { transactionCurrencySet } = useTransactions();
  const { basis, setBasis } = useUserSettings();

  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});
  const [showTab, setShowTab] = useState("holdings");
  const positionTabs = [
    { key: "holdings", label: "Holdings", width: "grid2" },
    { key: "realised", label: "Realised Schedule", width: "grid2" },
    { key: "dividend", label: "Dividend Schedule", width: "grid2" },
  ];

  const basisOptions = useMemo(() => {
    const opts = new Set(["Local", ...(transactionCurrencySet || [])]);
    if (basis) opts.add(basis);
    return Array.from(opts);
  }, [basis, transactionCurrencySet]);

  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    tradingCurrency: "Trading\nCurrency",
    totalQuantity: "Quantity",
    avgCost: "Average\nCost",
    price: "Last\nPrice",
    costBasis: "Cost\nBasis",
    value: "Market\nValue",
    unrealisedPL: "Unrealised\nP/L",
    realisedPL: "Realised\nP/L",
    pL: "All-time\nP/L",
  };

  const hideOnMobileColumns = ["ticker", "exchange", "avgCost", "realisedPL", "pL"];
  const formatHeaderLabel = (label) => {
    if (!label) return label;
    const normalized = String(label).replace(/\n/g, " ").trim();
    const isSingleWord = !normalized.includes(" ");
    return isSingleWord ? `\n${label}` : label;
  };
  const getPlainHeaderLabel = (label) => String(label || "").replace(/\n/g, " ");

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === "remove") return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const sortedHoldings = useMemo(() => {
    let array = [...allTimeHoldings];

    array = array.map(h => {
      const meta = tickerMap?.[h.ticker] ?? {};
      return {
        ...h,
        description: meta.description ?? h.description ?? "",
        exchange: meta.exchange ?? h.exchange ?? "",
        tradingCurrency: meta.tradingCurrency ?? h.tradingCurrency ?? "",
        pL:
          h.unrealisedPL !== null && h.realisedPL !== null
            ? h.unrealisedPL + h.realisedPL
            : null
      };
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") {
        array = array.filter(item => item[key] === value);
      }
    });

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
      array.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    return array;
  }, [allTimeHoldings, tickerMap, sortRules, filters]);

  const totals = useMemo(() => {
    return sortedHoldings.reduce((acc, h) => ({
      costBasis: acc.costBasis + (h.costBasis ?? 0),
      value: acc.value + (h.value ?? 0),
      unrealisedPL: acc.unrealisedPL + (h.unrealisedPL ?? 0),
      realisedPL: acc.realisedPL + (h.realisedPL ?? 0),
      pL: acc.pL + (h.pL ?? 0),
    }), {
      costBasis: 0,
      value: 0,
      unrealisedPL: 0,
      realisedPL: 0,
      pL: 0,
    });
  }, [sortedHoldings]);

  const showTotalsRow = useMemo(() => {
    if (basis !== "Local") return true;
    const currencies = new Set(
      sortedHoldings
        .map((h) => (h.tradingCurrency || "").trim().toUpperCase())
        .filter(Boolean)
    );
    return currencies.size <= 1;
  }, [basis, sortedHoldings]);

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
        <div className="grid-item grid2"><h2>Positions</h2></div>
      </div>

      <div className="grid">
        <div className="grid-item grid2">
          <label>Basis Currency</label>
        </div>
        <div className="grid-item grid2">
          <select value={basis || "Local"} onChange={(e) => setBasis(e.target.value)}>
            {basisOptions.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid12">
          Value Date: {latestValuationDate}
        </div>
      </div>

      <div className="grid">
        {positionTabs.map((tab) => (
          <div key={tab.key} className={`grid-item ${tab.width}`}>
            <button
              type="button"
              onClick={() => setShowTab(tab.key)}
              style={{
                backgroundColor: showTab === tab.key ? "#08519c" : undefined,
                color: showTab === tab.key ? "#f7fbff" : undefined
              }}
            >
              {tab.label}
            </button>
          </div>
        ))}
      </div>

      {showTab === "holdings" && (
        <>
          <div className="grid">
            <div className="grid-item grid8">
              Sorting priority: {sortRules.length === 0 ? "" : sortRules.map((rule, i) => `(${i + 1}) ${getPlainHeaderLabel(COLUMN_NAMES[rule.key])}`).join("; ")}
            </div>
            <div className="grid-item grid2">
              <button onClick={() => setSortRules([])} style={{backgroundColor: "#fb6a4a", color: "white"}}>Clear Sort</button>
            </div>
            <div className="grid-item grid2">
              <button onClick={() => setFilters({})} style={{backgroundColor: "#969696", color: "white", marginRight: 8}}>Clear Filter</button>
            </div>
          </div>

          <table border="1" cellPadding="8" style={{borderCollapse: "collapse", width: "100%"}}>
            <thead>
            <tr>
              {Object.keys(COLUMN_NAMES).map((key) => (
                <th
                  key={key}
                  className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                  style={{ verticalAlign: "top", textAlign: "center" }}
                >
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                    {renderSortControls(key)}
                  </div>
                  <span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(COLUMN_NAMES[key])}</span>
                </th>
              ))}
            </tr>
            <tr>
              {Object.keys(COLUMN_NAMES).map((key) => {
                const totalMap = {
                  costBasis: totals.costBasis,
                  value: totals.value,
                  unrealisedPL: totals.unrealisedPL,
                  realisedPL: totals.realisedPL,
                  pL: totals.pL,
                };
                const totalValue = totalMap[key];
                const numericKeys = ["totalQuantity", "avgCost", "price", "costBasis", "value", "unrealisedPL", "realisedPL", "pL"];
                if (numericKeys.includes(key)) {
                  return (
                    <th
                      key={key}
                      className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                      style={{
                        backgroundColor: "#08519c",
                        color: "#f7fbff",
                        textAlign: ["costBasis", "value", "unrealisedPL", "realisedPL", "pL"].includes(key) ? "right" : "center",
                        verticalAlign: "middle"
                      }}
                    >
                      {!showTotalsRow || totalValue == null ? "" : formatNumber(totalValue)}
                    </th>
                  );
                }
                const options = Array.from(new Set(allTimeHoldings.map((h) => h[key]).filter(Boolean))).sort();
                return (
                  <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}>
                    <select
                      value={filters[key] || "All"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters((prev) => ({...prev, [key]: value === "All" ? undefined : value}));
                      }}
                      style={{width: "100%"}}
                    >
                      <option value="All">All</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
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
                  <td key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                      style={["totalQuantity", "avgCost", "price", "costBasis", "value", "unrealisedPL", "realisedPL", "pL"].includes(key) ? getStyle(h[key]) : {}}>
                    {["totalQuantity", "avgCost", "price", "costBasis", "value", "unrealisedPL", "realisedPL", "pL"].includes(key) ? formatNumber(h[key]) : h[key]}
                  </td>
                ))}
              </tr>
            ))}
            </tbody>
          </table>
        </>
      )}

      {showTab === "realised" && <RealisedSchedule />}
      {showTab === "dividend" && <DividendSchedule />}
    </>
  );
}
