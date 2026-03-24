import React, { useEffect, useMemo, useState } from "react";
import { useValuationContext } from "@/context/ValuationContext";

function getMonthKey(dateStr) {
  return dateStr.slice(0, 6);
}

function buildRollingMonthLabels(latestDateStr) {
  const labels = [];
  const endYear = Number(latestDateStr.slice(0, 4));
  const endMonth = Number(latestDateStr.slice(4, 6));
  for (let i = 11; i >= 0; i--) {
    const d = new Date(endYear, endMonth - 1 - i, 1);
    labels.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return labels;
}

function toPercent(value, decimals = 2) {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

function getTwrStepReturn({ mvPrev, mvCurr, qtyPrev, qtyCurr, tx, div }) {
  const positionDirection = Math.sign(qtyPrev || qtyCurr);
  const tradeExposureFlow = positionDirection < 0 ? tx : -tx;
  const base = Math.abs(mvPrev) + Math.max(tradeExposureFlow, 0);
  if (!base) return 0;
  return (mvCurr - mvPrev + tx + div) / base;
}

export default function TWR({ viewMode = "Monthly" }) {
  const {
    tickerMap,
    cumulativeHoldingsByTickerByDate,
    cumulativeMarketValueByTickerByDate,
    cumulativeCostBasisByTickerByDate,
    dividendByTickerByDate,
    transactionByTickerByDate,
    latestValuationDate,
  } = useValuationContext();

  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});
  const [dailySortRules, setDailySortRules] = useState([]);
  const [dailyFilters, setDailyFilters] = useState({});
  const [isNarrow, setIsNarrow] = useState(false);
  const formatHeaderLabel = (key, label, isDateKey = false) => {
    if (!label) return label;
    const normalized = String(label).replace(/\n/g, " ").trim();
    const isSingleWord = !normalized.includes(" ");
    return isSingleWord || isDateKey ? `\n${label}` : label;
  };

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

  const onDailySortClick = (key, directionOrRemove) => {
    setDailySortRules((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      if (directionOrRemove === "remove") return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const renderDailySortControls = (key) => {
    const rule = dailySortRules.find((r) => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          onClick={() => onDailySortClick(key, "desc")}
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
          onClick={() => onDailySortClick(key, "asc")}
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
          onClick={() => onDailySortClick(key, "remove")}
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

  const { monthLabels, dayLabels, rows } = useMemo(() => {
    if (!latestValuationDate) return { monthLabels: [], rows: [] };
    const year = latestValuationDate.slice(0, 4);
    const monthLabels = buildRollingMonthLabels(latestValuationDate);
    const globalDates = Array.from(
      new Set(
        Object.values(cumulativeMarketValueByTickerByDate || {})
          .flatMap((mvByDate) => Object.keys(mvByDate || {}))
          .filter((d) => d <= latestValuationDate)
      )
    ).sort();
    const dayLabels = globalDates.slice(-14);
    const tickerSet = new Set([
      ...Object.keys(cumulativeMarketValueByTickerByDate || {}),
      ...Object.keys(cumulativeCostBasisByTickerByDate || {}),
      ...Object.keys(dividendByTickerByDate || {}),
      ...Object.keys(transactionByTickerByDate || {}),
    ]);

    const rows = Array.from(tickerSet).map((ticker) => {
      const holdingsByDate = cumulativeHoldingsByTickerByDate?.[ticker] ?? {};
      const mvByDate = cumulativeMarketValueByTickerByDate?.[ticker] ?? {};
      const divByDate = dividendByTickerByDate?.[ticker] ?? {};
      const txByDate = transactionByTickerByDate?.[ticker] ?? {};
      const dates = Object.keys(mvByDate)
        .filter((d) => d <= latestValuationDate)
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
          const qtyPrev = prev == null ? 0 : (holdingsByDate[prev] ?? 0);
          const qtyCurr = holdingsByDate[curr] ?? qtyPrev;
          const mvPrev = prev == null ? 0 : (mvByDate[prev] ?? 0);
          const mvCurr = mvByDate[curr] ?? 0;

          const div = divByDate[curr] ?? 0;
          const tx = txByDate[curr] ?? 0;
          const r = getTwrStepReturn({ mvPrev, mvCurr, qtyPrev, qtyCurr, tx, div });
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
        if (monthKey.startsWith(year)) {
          ytdMultiplier *= 1 + rMonth;
        }
      });

      const ytd = ytdMultiplier - 1;

      // TTM as a compounded return over the rolling 12-month window
      const ttmStartMonth = monthLabels[0];
      const ttmStartDate = `${ttmStartMonth}01`;
      const ttmDates = dates.filter((d) => d >= ttmStartDate);
      const hasFull12MonthCoverage = monthLabels.every((m) => dates.some((d) => getMonthKey(d) === m));
      let ttmMultiplier = 1;
      if (ttmDates.length && hasFull12MonthCoverage) {
        const allDates = [dates.filter((d) => d < ttmStartDate).at(-1), ...ttmDates].filter(Boolean);
        for (let i = 1; i < allDates.length; i++) {
          const prev = allDates[i - 1];
          const curr = allDates[i];
          const qtyPrev = holdingsByDate[prev] ?? 0;
          const qtyCurr = holdingsByDate[curr] ?? qtyPrev;
          const mvPrev = mvByDate[prev] ?? 0;
          const mvCurr = mvByDate[curr] ?? 0;
          const div = divByDate[curr] ?? 0;
          const tx = txByDate[curr] ?? 0;
          const r = getTwrStepReturn({ mvPrev, mvCurr, qtyPrev, qtyCurr, tx, div });
          if (!isFinite(r)) continue;
          ttmMultiplier *= 1 + r;
        }
      }
      let hpy = null;
      if (dates.length >= 2) {
        let hpyMultiplier = 1;
        let hasHpy = false;
        for (let i = 1; i < dates.length; i++) {
          const prev = dates[i - 1];
          const curr = dates[i];
          const qtyPrev = holdingsByDate[prev] ?? 0;
          const qtyCurr = holdingsByDate[curr] ?? qtyPrev;
          const mvPrev = mvByDate[prev] ?? 0;
          const mvCurr = mvByDate[curr] ?? 0;
          const div = divByDate[curr] ?? 0;
          const tx = txByDate[curr] ?? 0;
          const r = getTwrStepReturn({ mvPrev, mvCurr, qtyPrev, qtyCurr, tx, div });
          if (!isFinite(r)) continue;
          hpyMultiplier *= 1 + r;
          hasHpy = true;
        }
        hpy = hasHpy ? (hpyMultiplier - 1) : null;
      }
      const ttm = ttmDates.length && hasFull12MonthCoverage ? (ttmMultiplier - 1) : hpy;

      const dailyReturns = {};
      let dailyCumMultiplier = 1;
      let validDailyCount = 0;
      let dailyCum7Multiplier = 1;
      let validDaily7Count = 0;
      const last7Labels = dayLabels.slice(-7);
      dayLabels.forEach((curr) => {
        const prev = dates.filter((d) => d < curr).at(-1);
        if (!prev || mvByDate[curr] == null) {
          dailyReturns[curr] = null;
          return;
        }
        const qtyPrev = holdingsByDate[prev] ?? 0;
        const qtyCurr = holdingsByDate[curr] ?? qtyPrev;
        const mvPrev = mvByDate[prev] ?? 0;
        const mvCurr = mvByDate[curr] ?? 0;
        const div = divByDate[curr] ?? 0;
        const tx = txByDate[curr] ?? 0;
        const r = getTwrStepReturn({ mvPrev, mvCurr, qtyPrev, qtyCurr, tx, div });
        if (!isFinite(r)) {
          dailyReturns[curr] = null;
          return;
        }
        dailyReturns[curr] = r;
        dailyCumMultiplier *= 1 + r;
        validDailyCount += 1;
        if (last7Labels.includes(curr)) {
          dailyCum7Multiplier *= 1 + r;
          validDaily7Count += 1;
        }
      });
      const cumulative7d = last7Labels.length === 7 && validDaily7Count === 7 ? dailyCum7Multiplier - 1 : null;
      const cumulative14d = dayLabels.length === 14 && validDailyCount === 14 ? dailyCumMultiplier - 1 : null;

      const info = tickerMap?.[ticker] || {};
      return {
        ticker,
        description: info.description ?? "",
        exchange: info.exchange ?? "",
        tradingCurrency: info.tradingCurrency ?? "",
        monthlyReturns,
        ytd,
        ttm,
        dailyReturns,
        cumulative7d,
        cumulative14d
      };
    });

    return { monthLabels, dayLabels, rows };
  }, [
    cumulativeHoldingsByTickerByDate,
    cumulativeMarketValueByTickerByDate,
    cumulativeCostBasisByTickerByDate,
    dividendByTickerByDate,
    transactionByTickerByDate,
    latestValuationDate,
    tickerMap
  ]);

  const COLUMN_ORDER = ["ticker", "description", "exchange", "tradingCurrency", ...monthLabels, "ytd", "ttm"];
  const DAILY_COLUMN_ORDER = ["ticker", "description", "exchange", "tradingCurrency", ...dayLabels, "l7d", "l14d"];
  const COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    tradingCurrency: "Trading\nCurrency",
    ytd: `\nYTD ${latestValuationDate ? latestValuationDate.slice(2, 4) : ""}`,
    ttm: "TTM*"
  };
  monthLabels.forEach((m) => {
    COLUMN_NAMES[m] = `${m.slice(4, 6)}/${m.slice(2, 4)}`;
  });
  const DAILY_COLUMN_NAMES = {
    ticker: "Ticker",
    description: "Description",
    exchange: "Exchange",
    tradingCurrency: "Trading\nCurrency",
    l7d: "L7D",
    l14d: "L14D"
  };
  dayLabels.forEach((d) => {
    DAILY_COLUMN_NAMES[d] = `${d.slice(6, 8)}/${d.slice(4, 6)}`;
  });
  const hideOnMobileColumns = ["ticker", "exchange"];

  const sortedRows = useMemo(() => {
    let array = [...rows];
    const valueForKey = (row, key) => {
      if (key === "ytd") return row.ytd;
      if (key === "ttm") return row.ttm;
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

  const dailySortedRows = useMemo(() => {
    let array = [...rows];
    const valueForKey = (row, key) => {
      if (key === "l7d") return row.cumulative7d;
      if (key === "l14d") return row.cumulative14d;
      if (key in row) return row[key];
      return row.dailyReturns?.[key] ?? null;
    };

    Object.entries(dailyFilters).forEach(([key, value]) => {
      if (value && value !== "All") {
        array = array.filter((item) => item[key] === value);
      }
    });

    if (dailySortRules.length > 0) {
      for (let i = dailySortRules.length - 1; i >= 0; i--) {
        const { key, direction } = dailySortRules[i];
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
      array.sort((a, b) => (b.cumulative14d || 0) - (a.cumulative14d || 0));
    }
    return array;
  }, [rows, dailySortRules, dailyFilters]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid12">
          Value Date: {latestValuationDate}
        </div>
      </div>

      {viewMode === "Monthly" && (
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
              <th
                key={key}
                className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                style={{ verticalAlign: "top", textAlign: "center" }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                  {renderSortControls(key)}
                </div>
                <span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(key, COLUMN_NAMES[key], monthLabels.includes(key))}</span>
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
              <td style={getPercentStyle(row.ttm)}>{toPercent(row.ttm, isNarrow ? 1 : 2)}</td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={monthLabels.length + 6}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
        <div className="grid">
          <div className="grid-item grid12" style={{paddingBottom: "10px", fontSize: "12px"}}>
            * Holding Period Yield is shown when 12M history is unavailable
          </div>
        </div>
      </>
      )}

      {viewMode === "Daily" && (
        <>
          <div className="grid">
            <div className="grid-item grid8">
              Sorting priority: {dailySortRules.length === 0 ? "" : dailySortRules.map((rule, i) => `(${i + 1}) ${DAILY_COLUMN_NAMES[rule.key]}`).join("; ")}
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setDailySortRules([])} style={{backgroundColor: "#fb6a4a", color: "white"}}>Clear Sort</button>
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setDailyFilters({})} style={{backgroundColor: "#969696", color: "white", marginRight: 8}}>Clear Filter</button>
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {DAILY_COLUMN_ORDER.map((key) => (
              <th
                key={key}
                className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                style={{ verticalAlign: "top", textAlign: "center" }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                  {renderDailySortControls(key)}
                </div>
                <span style={{ whiteSpace: "pre-line" }}>{formatHeaderLabel(key, DAILY_COLUMN_NAMES[key], dayLabels.includes(key))}</span>
              </th>
            ))}
          </tr>
          <tr>
            {DAILY_COLUMN_ORDER.map((key) => {
              const filterableKeys = ["ticker", "description", "exchange", "tradingCurrency"];
              if (!filterableKeys.includes(key)) {
                return <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}></th>;
              }
              const options = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
              return (
                <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}>
                  <select
                    value={dailyFilters[key] || "All"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDailyFilters((prev) => ({ ...prev, [key]: value === "All" ? undefined : value }));
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
          </tr>
        </thead>
        <tbody>
          {dailySortedRows.map((row) => (
            <tr key={`${row.ticker}-14d`}>
              <td className={hideOnMobileColumns.includes("ticker") ? "hide-on-mobile" : ""} style={plainCellStyle}>{row.ticker}</td>
              <td style={plainCellStyle}>{row.description}</td>
              <td className={hideOnMobileColumns.includes("exchange") ? "hide-on-mobile" : ""} style={plainCellStyle}>{row.exchange}</td>
              <td style={plainCellStyle}>{row.tradingCurrency}</td>
              {dayLabels.map((d) => (
                <td key={d} style={getPercentStyle(row.dailyReturns?.[d])}>
                  {toPercent(row.dailyReturns?.[d], isNarrow ? 1 : 2)}
                </td>
              ))}
              <td style={getPercentStyle(row.cumulative7d)}>{toPercent(row.cumulative7d, isNarrow ? 1 : 2)}</td>
              <td style={getPercentStyle(row.cumulative14d)}>{toPercent(row.cumulative14d, isNarrow ? 1 : 2)}</td>
            </tr>
          ))}
          {dailySortedRows.length === 0 && (
            <tr>
              <td colSpan={dayLabels.length + 6}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
      </>
      )}
    </>
  );
}
