import React, { useEffect, useMemo, useState } from "react";
import { useValuationContext } from "@/context/ValuationContext";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";

function getMonthKey(dateStr) {
  return dateStr.slice(0, 6);
}

function buildMonthLabels(year) {
  const labels = [];
  for (let m = 1; m <= 12; m++) {
    labels.push(`${year}${String(m).padStart(2, "0")}`);
  }
  return labels;
}

function toPercent(value, decimals = 2) {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export default function TWR() {
  const { tickerMap } = useTransactions();
  const { tickerMap: priceTickerMap } = usePrices();
  const {
    cumulativeMarketValueByTickerByDate,
    cumulativeCostBasisByTickerByDate,
    cumulativeDividendByTickerByDate,
    transactionByTickerByDate,
    endDateDisplay,
  } = useValuationContext();

  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = (e) => setIsNarrow(e.matches);
    setIsNarrow(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === "remove") return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const renderSortControls = (key) => {
    const rule = sortRules.find((r) => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          onClick={() => onSortClick(key, "desc")}
          title="Sort Descending"
          style={{
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "desc" ? "#fb6a4a" : "#f7fbff",
            fontSize: 10,
            padding: 0,
            lineHeight: 1
          }}
        >
          ▼
        </button>
        <button
          onClick={() => onSortClick(key, "asc")}
          title="Sort Ascending"
          style={{
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "asc" ? "#fb6a4a" : "#f7fbff",
            fontSize: 10,
            padding: 0,
            lineHeight: 1
          }}
        >
          ▲
        </button>
        <button
          onClick={() => onSortClick(key, "remove")}
          title="Remove Sort"
          style={{
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: "#f7fbff",
            fontSize: 10,
            padding: 0,
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
    );
  };
  const getPercentStyle = (val) => ({
    textAlign: "right",
    backgroundColor: val == null || !isFinite(val) ? "#ffffff" : (val < 0 ? "#d73027" : "#1a9850"),
    color: val == null || !isFinite(val) ? "inherit" : "white"
  });
  const plainCellStyle = { backgroundColor: "#ffffff" };

  const { monthLabels, rows } = useMemo(() => {
    if (!endDateDisplay) return { monthLabels: [], rows: [] };
    const year = endDateDisplay.slice(0, 4);
    const monthLabels = buildMonthLabels(year);
    const tickerSet = new Set([
      ...Object.keys(cumulativeMarketValueByTickerByDate || {}),
      ...Object.keys(cumulativeCostBasisByTickerByDate || {}),
      ...Object.keys(cumulativeDividendByTickerByDate || {}),
      ...Object.keys(transactionByTickerByDate || {}),
    ]);

    const rows = Array.from(tickerSet).map((ticker) => {
      const mvByDate = cumulativeMarketValueByTickerByDate?.[ticker] ?? {};
      const divByDate = cumulativeDividendByTickerByDate?.[ticker] ?? {};
      const txByDate = transactionByTickerByDate?.[ticker] ?? {};
      const dates = Object.keys(mvByDate)
        .filter((d) => d.startsWith(year) || d === `${Number(year) - 1}1231`)
        .sort();

      const monthlyReturns = {};
      let ytdMultiplier = 1;

      monthLabels.forEach((monthKey) => {
        const monthDates = dates.filter((d) => getMonthKey(d) === monthKey);
        if (monthDates.length === 0) {
          monthlyReturns[monthKey] = null;
          return;
        }

        const monthStartDate = `${monthKey}01`;
        const prevDates = dates.filter((d) => d < monthStartDate);
        const startDate = prevDates.length ? prevDates[prevDates.length - 1] : null;

        let monthMultiplier = 1;
        let hasAny = false;

        const allDates = startDate ? [startDate, ...monthDates] : [null, ...monthDates];
        for (let i = 1; i < allDates.length; i++) {
          const prev = allDates[i - 1];
          const curr = allDates[i];
          const mvPrev = prev == null ? 0 : (mvByDate[prev] ?? 0);
          const mvCurr = mvByDate[curr] ?? 0;

          const div = divByDate[curr] ?? 0;
          const tx = txByDate[curr] ?? 0;
          const cf = (-tx) + div;
          const denom = mvPrev + cf;
          let r;
          if (!denom) {
            // No base to compute return; treat as 0% for this step.
            r = 0;
          } else {
            r = (mvCurr - mvPrev - cf) / denom;
          }
          if (!isFinite(r)) continue;
          monthMultiplier *= 1 + r;
          hasAny = true;
        }

        if (!hasAny) {
          monthlyReturns[monthKey] = null;
          return;
        }

        const rMonth = monthMultiplier - 1;
        monthlyReturns[monthKey] = rMonth;
        ytdMultiplier *= 1 + rMonth;
      });

      const ytd = ytdMultiplier - 1;
      const info = tickerMap?.[ticker] || priceTickerMap?.[ticker] || {};
      return {
        ticker,
        description: info.description ?? "",
        exchange: info.exchange ?? "",
        tradingCurrency: info.tradingCurrency ?? "",
        monthlyReturns,
        ytd
      };
    });

    return { monthLabels, rows };
  }, [
    cumulativeMarketValueByTickerByDate,
    cumulativeCostBasisByTickerByDate,
    cumulativeDividendByTickerByDate,
    transactionByTickerByDate,
    endDateDisplay,
    tickerMap
  ]);

  const COLUMN_ORDER = ["ticker", "description", "exchange", "tradingCurrency", ...monthLabels, "ytd"];
  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    tradingCurrency: "Trading Currency",
    ytd: `YTD ${endDateDisplay ? endDateDisplay.slice(0, 4) : ""}`
  };
  monthLabels.forEach((m) => {
    COLUMN_NAMES[m] = m.slice(4, 6);
  });
  const hideOnMobileColumns = ["ticker", "exchange"];

  const sortedRows = useMemo(() => {
    let array = [...rows];
    const valueForKey = (row, key) => {
      if (key === "ytd") return row.ytd;
      if (key in row) return row[key];
      return row.monthlyReturns?.[key] ?? null;
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") {
        array = array.filter(item => item[key] === value);
      }
    });

    if (sortRules.length > 0) {
      for (let i = sortRules.length - 1; i >= 0; i--) {
        const { key, direction } = sortRules[i];
        array.sort((a, b) => {
          const valA = valueForKey(a, key);
          const valB = valueForKey(b, key);
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
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
      array.sort((a, b) => (b.ytd || 0) - (a.ytd || 0));
    }
    return array;
  }, [rows, sortRules, filters]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid8">
          Sorting priority: {sortRules.length === 0 ? "" : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join("; ")}
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setSortRules([])} style={{backgroundColor: "#fb6a4a", color: "white"}}>Clear Sort</button>
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setFilters({})} style={{backgroundColor: "#969696", color: "white", marginRight: 8}}>Clear Filter</button>
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {COLUMN_ORDER.map((key) => (
              <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}>
                {renderSortControls(key)} {COLUMN_NAMES[key]}
              </th>
            ))}
          </tr>
          <tr>
            {COLUMN_ORDER.map((key) => {
              const filterableKeys = ["ticker", "description", "exchange", "tradingCurrency"];
              if (!filterableKeys.includes(key)) {
                return <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}></th>;
              }
              const options = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
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
          {sortedRows.map((row) => (
            <tr key={row.ticker}>
              <td className={hideOnMobileColumns.includes("ticker") ? "hide-on-mobile" : ""} style={plainCellStyle}>{row.ticker}</td>
              <td style={plainCellStyle}>{row.description}</td>
              <td className={hideOnMobileColumns.includes("exchange") ? "hide-on-mobile" : ""} style={plainCellStyle}>{row.exchange}</td>
              <td style={plainCellStyle}>{row.tradingCurrency}</td>
              {monthLabels.map((monthKey) => (
                <td key={monthKey} style={getPercentStyle(row.monthlyReturns[monthKey])}>
                  {toPercent(row.monthlyReturns[monthKey], isNarrow ? 1 : 2)}
                </td>
              ))}
              <td style={getPercentStyle(row.ytd)}>{toPercent(row.ytd, isNarrow ? 1 : 2)}</td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={monthLabels.length + 5}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
