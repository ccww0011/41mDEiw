'use client';

import React, { useMemo, useState } from "react";
import { useValuationContext } from "@/context/ValuationContext";
import { useUserSettings } from "@/context/UserSettingsContext";

function getSnapshotValue(byDate, targetDate) {
  if (!byDate || !targetDate) return 0;
  if (Object.prototype.hasOwnProperty.call(byDate, targetDate)) return byDate[targetDate] ?? 0;
  let latestDate = null;
  let latestValue = 0;
  Object.entries(byDate).forEach(([date, value]) => {
    if (date <= targetDate && (latestDate == null || date > latestDate)) {
      latestDate = date;
      latestValue = value ?? 0;
    }
  });
  return latestValue;
}

function getMonthEnd(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0));
  return (
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function getMonthStart(year, monthIndex) {
  return `${year}${String(monthIndex + 1).padStart(2, "0")}01`;
}

function buildMonthWindows(latestValuationDate) {
  if (!latestValuationDate || latestValuationDate.length !== 8) return [];
  const endYear = Number(latestValuationDate.slice(0, 4));
  const endMonth = Number(latestValuationDate.slice(4, 6)) - 1;
  const windows = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(endYear, endMonth - i, 1));
    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth();
    windows.push({
      key: `${year}${String(monthIndex + 1).padStart(2, "0")}`,
      label: `${String(monthIndex + 1).padStart(2, "0")}/${String(year).slice(2)}`,
      start: getMonthStart(year, monthIndex),
      end: getMonthEnd(year, monthIndex),
      prevEnd: getMonthEnd(year, monthIndex - 1)
    });
  }
  return windows;
}

function formatNumber(num) {
  return num === null || num === undefined || Math.abs(Number(num) || 0) < 1e-10
    ? "—"
    : Number(num).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
}

function getStyle(num) {
  return {
    textAlign: "right",
    color: num < 0 ? "red" : "black"
  };
}

export default function RealisedSchedule() {
  const { latestValuationDate, tickerMap, getNormalizedValuationSeries } = useValuationContext();
  const { basis } = useUserSettings();
  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});
  const formatHeaderLabel = (label, isDateKey = false) => {
    if (!label) return label;
    const normalized = String(label).replace(/\n/g, " ").trim();
    const isSingleWord = !normalized.includes(" ");
    return isSingleWord || isDateKey ? `\n${label}` : label;
  };

  const { months, ytdLabel, rows } = useMemo(() => {
    const monthWindows = buildMonthWindows(latestValuationDate);
    const normalized = getNormalizedValuationSeries(latestValuationDate);
    const realisedByTicker = normalized.cumulativeRealisedPLByTickerByDate || {};
    const dividendByTicker = normalized.dividendByTickerByDate || {};
    const currentYear = latestValuationDate?.slice(0, 4);
    const ytdLabelValue = currentYear ? `YTD ${currentYear.slice(2)}` : "YTD";

    const builtRows = Object.keys(realisedByTicker).map((ticker) => {
      const monthValues = {};
      let total = 0;
      let ytd = 0;
      monthWindows.forEach((month) => {
        const endValue = getSnapshotValue(realisedByTicker[ticker], month.end);
        const prevValue = getSnapshotValue(realisedByTicker[ticker], month.prevEnd);
        const realisedDelta = endValue - prevValue;
        const dividendEnd = getSnapshotValue(dividendByTicker[ticker], month.end);
        const dividendPrev = getSnapshotValue(dividendByTicker[ticker], month.prevEnd);
        const dividendDelta = dividendEnd - dividendPrev;
        const delta = realisedDelta - dividendDelta;
        monthValues[month.key] = delta;
        total += delta;
        if (month.key.slice(0, 4) === currentYear) ytd += delta;
      });
      const meta = tickerMap?.[ticker] ?? {};
      return {
        ticker,
        description: meta.description ?? "",
        exchange: meta.exchange ?? "",
        tradingCurrency: meta.tradingCurrency ?? "",
        months: monthValues,
        ytd,
        total
      };
    }).filter((row) => monthWindows.some((month) => Math.abs(row.months[month.key] ?? 0) > 1e-10));

    builtRows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    return { months: monthWindows, ytdLabel: ytdLabelValue, rows: builtRows };
  }, [latestValuationDate, tickerMap, getNormalizedValuationSeries]);

  const COLUMN_NAMES = useMemo(() => {
    const monthCols = Object.fromEntries(months.map((month) => [month.key, month.label]));
    return {
      ticker: "Ticker",
      description: "Description",
      exchange: "Exchange",
      tradingCurrency: "Trading\nCurrency",
      ...monthCols,
      ytd: ytdLabel,
      total: "TTM"
    };
  }, [months, ytdLabel]);

  const onSortClick = (key, directionOrRemove) => {
    setSortRules((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
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

  const displayedRows = useMemo(() => {
    let array = [...rows];

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") {
        array = array.filter((item) => item[key] === value);
      }
    });

    if (sortRules.length > 0) {
      for (let i = sortRules.length - 1; i >= 0; i -= 1) {
        const { key, direction } = sortRules[i];
        array.sort((a, b) => {
          const valA = key in (a.months || {}) ? a.months[key] : a[key];
          const valB = key in (b.months || {}) ? b.months[key] : b[key];
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
    }

    return array;
  }, [rows, filters, sortRules]);

  const totals = useMemo(() => {
    return displayedRows.reduce((acc, row) => {
      months.forEach((month) => {
        acc.months[month.key] = (acc.months[month.key] ?? 0) + (row.months[month.key] ?? 0);
      });
      acc.ytd += row.ytd ?? 0;
      acc.total += row.total ?? 0;
      return acc;
    }, { months: {}, ytd: 0, total: 0 });
  }, [displayedRows, months]);

  const showTotalsRow = useMemo(() => {
    if (basis !== "Local") return true;
    const currencies = new Set(
      displayedRows
        .map((row) => (row.tradingCurrency || "").trim().toUpperCase())
        .filter(Boolean)
    );
    return currencies.size <= 1;
  }, [basis, displayedRows]);

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
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("ticker")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(COLUMN_NAMES.ticker)}</span></th>
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("description")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(COLUMN_NAMES.description)}</span></th>
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("exchange")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(COLUMN_NAMES.exchange)}</span></th>
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("tradingCurrency")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(COLUMN_NAMES.tradingCurrency)}</span></th>
          {months.map((month) => (
            <th key={month.key} style={{ verticalAlign: "top", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls(month.key)}</div>
              <span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(month.label, true)}</span>
            </th>
          ))}
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("ytd")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(ytdLabel, true)}</span></th>
          <th style={{ verticalAlign: "top", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>{renderSortControls("total")}</div><span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel("TTM", true)}</span></th>
        </tr>
        <tr>
          {["ticker", "description", "exchange", "tradingCurrency"].map((key) => {
            const options = Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort();
            return (
              <th key={key} style={{ verticalAlign: "middle" }}>
                <select
                  value={filters[key] || "All"}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters((prev) => ({ ...prev, [key]: value === "All" ? undefined : value }));
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="All">All</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </th>
            );
          })}
            {months.map((month) => (
              <th key={month.key} style={{ ...getStyle(totals.months[month.key] ?? 0), backgroundColor: "#08519c", color: "#f7fbff", verticalAlign: "middle" }}>
                {showTotalsRow ? formatNumber(totals.months[month.key] ?? 0) : ""}
              </th>
            ))}
            <th style={{ ...getStyle(totals.ytd), backgroundColor: "#08519c", color: "#f7fbff", verticalAlign: "middle" }}>
              {showTotalsRow ? formatNumber(totals.ytd) : ""}
            </th>
            <th style={{ ...getStyle(totals.total), backgroundColor: "#08519c", color: "#f7fbff", verticalAlign: "middle" }}>
              {showTotalsRow ? formatNumber(totals.total) : ""}
            </th>
          </tr>
      </thead>
      <tbody>
        {displayedRows.map((row) => (
          <tr key={`${row.ticker}|${row.exchange}`}>
            <td>{row.ticker}</td>
            <td>{row.description}</td>
            <td>{row.exchange}</td>
            <td>{row.tradingCurrency}</td>
            {months.map((month) => (
              <td key={month.key} style={getStyle(row.months[month.key] ?? 0)}>
                {formatNumber(row.months[month.key] ?? 0)}
              </td>
            ))}
            <td style={getStyle(row.ytd)}>{formatNumber(row.ytd)}</td>
            <td style={getStyle(row.total)}>{formatNumber(row.total)}</td>
          </tr>
        ))}
      </tbody>
      </table>
    </>
  );
}
