import React, { useEffect, useMemo, useState } from "react";
import { useValuationContext } from "@/context/ValuationContext";
import { useUserSettings } from "@/context/UserSettingsContext";

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

function parseDateStr(dateStr) {
  return new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(4, 6)) - 1,
    Number(dateStr.slice(6, 8))
  );
}

function diffDays(startDateStr, endDateStr) {
  return Math.round((parseDateStr(endDateStr) - parseDateStr(startDateStr)) / (24 * 60 * 60 * 1000));
}

function solvePeriodIrr(cashFlows) {
  if (!cashFlows.length) return null;

  const mergedByDate = new Map();
  cashFlows.forEach(({ date, amount }) => {
    if (amount == null || !isFinite(amount) || Math.abs(amount) < 1e-12) return;
    mergedByDate.set(date, (mergedByDate.get(date) ?? 0) + amount);
  });

  const flows = Array.from(mergedByDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (flows.length < 2) return null;

  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const firstDate = flows[0].date;
  const lastDate = flows[flows.length - 1].date;
  const totalDays = Math.max(1, diffDays(firstDate, lastDate));

  const npv = (rate) => {
    if (rate <= -0.999999999) return NaN;
    return flows.reduce((sum, flow) => {
      const exponent = diffDays(firstDate, flow.date) / totalDays;
      return sum + flow.amount / Math.pow(1 + rate, exponent);
    }, 0);
  };

  const grid = [-0.9999, -0.99, -0.95, -0.9, -0.75, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  let lower = null;
  let upper = null;

  for (let i = 0; i < grid.length - 1; i++) {
    const left = grid[i];
    const right = grid[i + 1];
    const fLeft = npv(left);
    const fRight = npv(right);
    if (!isFinite(fLeft) || !isFinite(fRight)) continue;
    if (fLeft === 0) return left;
    if (fRight === 0) return right;
    if (fLeft * fRight < 0) {
      lower = left;
      upper = right;
      break;
    }
  }

  if (lower == null || upper == null) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (lower + upper) / 2;
    const fLower = npv(lower);
    const fMid = npv(mid);
    if (!isFinite(fMid)) return null;
    if (Math.abs(fMid) < 1e-10) return mid;
    if (fLower * fMid <= 0) upper = mid;
    else lower = mid;
  }

  return (lower + upper) / 2;
}

function calculatePeriodMwr({ startDateStr, endDateStr, bmv, emv, txByDate, divByDate, flowDates }) {
  const cashFlows = [];

  if (bmv != null && Math.abs(bmv) > 1e-12) {
    cashFlows.push({ date: startDateStr, amount: -bmv });
  }

  flowDates.forEach((date) => {
    const tx = txByDate[date] ?? 0;
    const div = divByDate[date] ?? 0;
    if (tx) cashFlows.push({ date, amount: tx });
    if (div) cashFlows.push({ date, amount: div });
  });

  if (emv != null && Math.abs(emv) > 1e-12) {
    cashFlows.push({ date: endDateStr, amount: emv });
  }

  return solvePeriodIrr(cashFlows);
}

function calculatePeriodMwrWithFallback({
  startDateStr,
  endDateStr,
  bmv,
  emv,
  txByDate,
  divByDate,
  flowDates,
  fallbackStartDateStr,
  fallbackBmv
}) {
  const direct = calculatePeriodMwr({
    startDateStr,
    endDateStr,
    bmv,
    emv,
    txByDate,
    divByDate,
    flowDates
  });
  if (direct != null) return direct;

  if (!fallbackStartDateStr || fallbackBmv == null || !isFinite(fallbackBmv) || Math.abs(fallbackBmv) < 1e-12) {
    return null;
  }

  return calculatePeriodMwr({
    startDateStr: fallbackStartDateStr,
    endDateStr,
    bmv: Math.abs(fallbackBmv),
    emv,
    txByDate,
    divByDate,
    flowDates: flowDates.filter((date) => date > fallbackStartDateStr)
  });
}

function toPercent(value, decimals = 2) {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export default function MWR({ viewMode = "Monthly" }) {
  const {
    tickerMap,
    latestValuationDate,
    getNormalizedValuationSeries,
  } = useValuationContext();
  const { basis } = useUserSettings();

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
  const getPlainHeaderLabel = (label) => String(label || "").replace(/\n/g, " ");

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
    backgroundColor: val == null || !isFinite(val) || Math.abs(val) < 1e-12 ? "#ffffff" : (val < 0 ? "#d73027" : "#1a9850"),
    color: val == null || !isFinite(val) ? "inherit" : (Math.abs(val) < 1e-12 ? "#d9d9d9" : "white")
  });
  const plainCellStyle = { backgroundColor: "#ffffff" };

  const { monthLabels, dayLabels, rows, portfolioRow } = useMemo(() => {
    if (!latestValuationDate) return { monthLabels: [], dayLabels: [], rows: [], portfolioRow: null };
    const {
      cumulativeMarketValueByTickerByDate,
      dividendByTickerByDate,
      transactionByTickerByDate,
    } = getNormalizedValuationSeries(latestValuationDate);
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
      ...Object.keys(dividendByTickerByDate || {}),
      ...Object.keys(transactionByTickerByDate || {}),
    ]);

    const buildRow = (ticker, mvByDate, divByDate, txByDate, info = {}) => {
      const dates = Object.keys(mvByDate)
        .filter((d) => d <= latestValuationDate)
        .sort();

      const monthlyReturns = {};

      monthLabels.forEach((monthKey) => {
        const monthDates = dates.filter((d) => getMonthKey(d) === monthKey);
        if (monthDates.length === 0) {
          monthlyReturns[monthKey] = null;
          return;
        }

        const monthStartDate = `${monthKey}01`;
        const prevDates = dates.filter((d) => d < monthStartDate);
        const startDate = prevDates.length ? prevDates[prevDates.length - 1] : null;
        const periodStartDateStr = startDate ?? monthDates[0];
        const periodEndDateStr = monthDates[monthDates.length - 1];
        const bmv = startDate == null ? 0 : (mvByDate[startDate] ?? 0);
        const emv = mvByDate[periodEndDateStr] ?? 0;
        monthlyReturns[monthKey] = calculatePeriodMwrWithFallback({
          startDateStr: periodStartDateStr,
          endDateStr: periodEndDateStr,
          bmv,
          emv,
          txByDate,
          divByDate,
          flowDates: monthDates,
          fallbackStartDateStr: monthDates[0],
          fallbackBmv: mvByDate[monthDates[0]] ?? null
        });
      });

      const yearDates = dates.filter((d) => d.startsWith(year));
      let ytd = null;
      if (yearDates.length) {
        const yearStart = `${year}0101`;
        const prevDates = dates.filter((d) => d < yearStart);
        const startDate = prevDates.length ? prevDates[prevDates.length - 1] : null;
        const periodStartDateStr = startDate ?? yearDates[0];
        const periodEndDateStr = yearDates[yearDates.length - 1];
        const bmv = startDate == null ? 0 : (mvByDate[startDate] ?? 0);
        const emv = mvByDate[periodEndDateStr] ?? 0;
        ytd = calculatePeriodMwrWithFallback({
          startDateStr: periodStartDateStr,
          endDateStr: periodEndDateStr,
          bmv,
          emv,
          txByDate,
          divByDate,
          flowDates: yearDates,
          fallbackStartDateStr: yearDates[0],
          fallbackBmv: mvByDate[yearDates[0]] ?? null
        });
      }

      const ttmStartMonth = monthLabels[0];
      const ttmStartDate = `${ttmStartMonth}01`;
      const ttmDates = dates.filter((d) => d >= ttmStartDate);
      const hasFull12MonthCoverage = monthLabels.every((m) => dates.some((d) => getMonthKey(d) === m));
      let ttm = null;
      if (ttmDates.length && hasFull12MonthCoverage) {
        const prevDates = dates.filter((d) => d < ttmStartDate);
        const startDate = prevDates.length ? prevDates[prevDates.length - 1] : null;
        const periodStartDateStr = startDate ?? ttmDates[0];
        const periodEndDateStr = ttmDates[ttmDates.length - 1];
        const bmv = startDate == null ? 0 : (mvByDate[startDate] ?? 0);
        const emv = mvByDate[periodEndDateStr] ?? 0;
        ttm = calculatePeriodMwrWithFallback({
          startDateStr: periodStartDateStr,
          endDateStr: periodEndDateStr,
          bmv,
          emv,
          txByDate,
          divByDate,
          flowDates: ttmDates,
          fallbackStartDateStr: ttmDates[0],
          fallbackBmv: mvByDate[ttmDates[0]] ?? null
        });
      }
      if (ttm == null && dates.length) {
        const periodStartDateStr = dates[0];
        const periodEndDateStr = dates[dates.length - 1];
        const bmv = 0;
        const emv = mvByDate[periodEndDateStr] ?? 0;
        ttm = calculatePeriodMwrWithFallback({
          startDateStr: periodStartDateStr,
          endDateStr: periodEndDateStr,
          bmv,
          emv,
          txByDate,
          divByDate,
          flowDates: dates,
          fallbackStartDateStr: dates[0],
          fallbackBmv: mvByDate[dates[0]] ?? null
        });
      }

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
        const mvPrev = mvByDate[prev] ?? 0;
        const mvCurr = mvByDate[curr] ?? 0;
        const r = calculatePeriodMwr({
          startDateStr: prev,
          endDateStr: curr,
          bmv: mvPrev,
          emv: mvCurr,
          txByDate,
          divByDate,
          flowDates: [curr]
        });
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
    };

    const rows = Array.from(tickerSet).map((ticker) => buildRow(
      ticker,
      cumulativeMarketValueByTickerByDate?.[ticker] ?? {},
      dividendByTickerByDate?.[ticker] ?? {},
      transactionByTickerByDate?.[ticker] ?? {},
      tickerMap?.[ticker] || {}
    ));

    const mergeByDate = (seriesByTicker) => {
      const merged = {};
      Object.values(seriesByTicker || {}).forEach((byDate) => {
        Object.entries(byDate || {}).forEach(([date, value]) => {
          merged[date] = (merged[date] ?? 0) + (value ?? 0);
        });
      });
      return merged;
    };

    const portfolioMvByDate = mergeByDate(cumulativeMarketValueByTickerByDate);
    const portfolioDivByDate = mergeByDate(dividendByTickerByDate);
    const portfolioTxByDate = mergeByDate(transactionByTickerByDate);
    const portfolioRow = buildRow(
      "Total",
      portfolioMvByDate,
      portfolioDivByDate,
      portfolioTxByDate,
      {
        description: "Portfolio Total",
        exchange: "",
        tradingCurrency: ""
      }
    );

    return { monthLabels, dayLabels, rows, portfolioRow };
  }, [
    latestValuationDate,
    getNormalizedValuationSeries,
    tickerMap,
    basis
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

  const showTotalRow = basis !== "Local" && portfolioRow != null;
  const totalCellStyle = {
    backgroundColor: "#08519c",
    color: "#f7fbff",
    verticalAlign: "middle"
  };

  return (
    <>
      <div className="grid">
        <div className="grid-item grid12" >
          Value Date: {latestValuationDate}
        </div>
      </div>

      {viewMode === "Monthly" && (
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
                if (!showTotalRow) {
                  return <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}></th>;
                }
                if (key === "ytd") {
                  return <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>{toPercent(portfolioRow.ytd, isNarrow ? 1 : 2)}</th>;
                }
                if (key === "ttm") {
                  return <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>{toPercent(portfolioRow.ttm, isNarrow ? 1 : 2)}</th>;
                }
                return (
                  <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>
                    {toPercent(portfolioRow.monthlyReturns?.[key], isNarrow ? 1 : 2)}
                  </th>
                );
              }
              const options = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
              return (
                <th
                  key={key}
                  className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                  style={showTotalRow && (key === "ticker" || key === "description" || key === "exchange" || key === "tradingCurrency") ? totalCellStyle : undefined}
                >
                  {showTotalRow && key === "ticker" ? "Total" : null}
                  {showTotalRow && key === "tradingCurrency" ? "" : null}
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
        <div className="grid-item grid12" style={{ paddingBottom: "10px", fontSize: "12px" }}>
          * Holding Period Yield is shown when 12M history is unavailable
        </div>
      </div>
      </>
      )}

      {viewMode === "Daily" && (
      <>
      <div className="grid">
        <div className="grid-item grid8">
          Sorting priority: {dailySortRules.length === 0 ? "" : dailySortRules.map((rule, i) => `(${i + 1}) ${getPlainHeaderLabel(DAILY_COLUMN_NAMES[rule.key])}`).join("; ")}
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
                if (!showTotalRow) {
                  return <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}></th>;
                }
                if (key === "l7d") {
                  return <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>{toPercent(portfolioRow.cumulative7d, isNarrow ? 1 : 2)}</th>;
                }
                if (key === "l14d") {
                  return <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>{toPercent(portfolioRow.cumulative14d, isNarrow ? 1 : 2)}</th>;
                }
                return (
                  <th key={key} style={{ ...totalCellStyle, textAlign: "right" }}>
                    {toPercent(portfolioRow.dailyReturns?.[key], isNarrow ? 1 : 2)}
                  </th>
                );
              }
              const options = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
              return (
                <th
                  key={key}
                  className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}
                  style={showTotalRow && (key === "ticker" || key === "description" || key === "exchange" || key === "tradingCurrency") ? totalCellStyle : undefined}
                >
                  {showTotalRow && key === "ticker" ? "Total" : null}
                  {showTotalRow && key === "tradingCurrency" ? "" : null}
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
