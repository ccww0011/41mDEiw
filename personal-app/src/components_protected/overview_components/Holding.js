'use client';
import React, {useState, useMemo, useEffect} from "react";
import {useTransactions} from "@/context/TransactionContext";
import PieChart from "@/components_protected/overview_components/holding_subcomponents/PieChart";
import BarChart from "@/components/BarChart";
import {useValuationContext} from "@/context/ValuationContext";
import {useFxs} from "@/context/FxContext";
import {usePrices} from "@/context/PriceContext";
import {usePL, useValuation} from "@/hooks/useValuation";
import LineChart from "@/components_protected/overview_components/holding_subcomponents/LineChart";
import {News} from "@/components_protected/overview_components/holding_subcomponents/News";

export default function Holding() {
  const {currencies, transactions, loadingTransactions, firstTransactionDate} = useTransactions();
  const {prices, setPrices, loadingPrices, setLoadingPrices, lastPriceDate} = usePrices();
  const {fxs, setFxs, loadingFxs, setLoadingFxs, lastFxDate} = useFxs();
  const {basis, setBasis, startDateDisplay, endDateDisplay, setStartDateDisplay, setEndDateDisplay} = useValuationContext();

  const [showTab, setShowTab] = useState(0);
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [inputError, setInputError] = useState('')

  const [sortRules, setSortRules] = useState([]);
  const [filters, setFilters] = useState({});

  const {holdings, aggregates, marketValueByTicker, marketValueByTradingCurrency}
    = useValuation(transactions, prices, fxs, setFxs, setLoadingFxs, basis, endDateDisplay);
  const { cumulativePLByDate } = usePL(transactions, prices, setPrices, setLoadingPrices, fxs, basis, startDateDisplay, endDateDisplay);
  const cumulativePLArray = Object.entries(cumulativePLByDate).map(
    ([date, cumulativePLUSD]) => ({ date, cumulativePLUSD })
  );

  const profit = useMemo(() => {
    // compute (startDateDisplay - 1 day)
    const year = Number(startDateDisplay.slice(0, 4));
    const month = Number(startDateDisplay.slice(4, 6)) - 1;
    const day = Number(startDateDisplay.slice(6, 8));

    const date = new Date(year, month, day);
    date.setDate(date.getDate() - 1);

    const prevStartDate =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
    const endValue = cumulativePLByDate[endDateDisplay] ?? 0;
    const startValue = cumulativePLByDate[prevStartDate] ?? 0;

    return endValue - startValue;
  }, [cumulativePLByDate, startDateDisplay, endDateDisplay]);

  useEffect(() => {
    if (endDateDisplay !== "") {
      setStartDateInput(startDateDisplay);
      setEndDateInput(endDateDisplay);
    }
  }, [startDateDisplay, endDateDisplay]);


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
        <div className="grid-item grid12" style={{ padding: "25px 0 0 0" }}></div>
      </div>

      <div className="grid">
        <div className="grid-item grid2"><label>Basis Currency</label></div>
        <div className="grid-item grid2">
          <select value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option key="Local" value="Local">Local</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid2"><label>Start Date</label></div>
        <div className="grid-item grid2">
          <input
            type="text"
            placeholder="YYYYMMDD"
            value={startDateInput ?? ""}
            onChange={(e) => setStartDateInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid2"><label>End Date</label></div>
        <div className="grid-item grid2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="YYYYMMDD"
            value={endDateInput ?? ""}
            onChange={(e) => setEndDateInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>
        <div className="grid-item grid1">
          <button onClick={() => {
            if (!firstTransactionDate || !lastPriceDate || !lastFxDate) return;
            const s = new Date(+startDateInput.slice(0, 4), +startDateInput.slice(4, 6) - 1, +startDateInput.slice(6, 8));
            const e = new Date(+endDateInput.slice(0, 4), +endDateInput.slice(4, 6) - 1, +endDateInput.slice(6, 8));
            const first = new Date(+firstTransactionDate.slice(0, 4), +firstTransactionDate.slice(4, 6) - 1, +firstTransactionDate.slice(6, 8));
            const last = new Date(+lastPriceDate.slice(0, 4), +lastPriceDate.slice(4, 6) - 1, +lastPriceDate.slice(6, 8));
            const maxEnd = lastPriceDate > lastFxDate ? new Date(+lastFxDate.slice(0, 4), +lastFxDate.slice(4, 6) - 1, +lastFxDate.slice(6, 8)) : last;
            if (isNaN(s) || isNaN(e)) return setInputError("Invalid date! Use YYYYMMDD.");
            const newStart = s < first ? first : s;
            const newEnd = e > maxEnd ? maxEnd : e;
            if (newStart > newEnd) return setInputError("The start date must be earlier than the end date!");
            setStartDateDisplay(`${newStart.getFullYear()}${String(newStart.getMonth() + 1).padStart(2, "0")}${String(newStart.getDate()).padStart(2, "0")}`);
            setEndDateDisplay(`${newEnd.getFullYear()}${String(newEnd.getMonth() + 1).padStart(2, "0")}${String(newEnd.getDate()).padStart(2, "0")}`);
            setInputError("");
          }}>
            Apply
          </button>
        </div>
        <div className="grid-item grid1">
          <button onClick={() => {
            setEndDateDisplay(lastPriceDate > lastFxDate ? lastFxDate : lastPriceDate);
            setInputError("");
          }}>
            Latest
          </button>
        </div>
        <div className="grid-item grid6" style={{ color: "red" }}>{inputError}</div>
      </div>

      <div className="grid">
        <div className="grid-item grid2"><h2>Holding</h2></div>
        <div className="grid-item grid10">
          {(loadingTransactions || loadingPrices || loadingFxs) && (
            <h3 style={{ marginLeft: '20px', color: 'red' }}>
              {"Loading P/L data for tickers "}{aggregates.missingPLCurrencies?.join(", ")}
            </h3>
          )}
        </div>
      </div>

      {(aggregates.missingPLCurrencies?.length === 0 || (!loadingTransactions && !loadingPrices && !loadingFxs)) && (
        <div className="grid">
          <div className="grid-item grid6">
            <div className="grid">
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(0)} style={{ backgroundColor: showTab === 0 ? "#08519c" : undefined, color: showTab === 0 ? "#f7fbff" : undefined }}>Profit - {basis === "Local" ? "USD" : basis}</button>
              </div>
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(1)} style={{ backgroundColor: showTab === 1 ? "#08519c" : undefined, color: showTab === 1 ? "#f7fbff" : undefined }}>Value - Top 10</button>
              </div>
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(2)} style={{ backgroundColor: showTab === 2 ? "#08519c" : undefined, color: showTab === 2 ? "#f7fbff" : undefined }}>Value - FX</button>
              </div>
            </div>

            {showTab === 0 && (
              <>
                <h4>Profit - {basis === "Local" ? "USD" : basis} {profit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</h4>
                <div style={{ width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LineChart data={cumulativePLArray} labelKey="date" valueKey="cumulativePLUSD" />
                </div>
              </>
            )}

            {showTab === 1 && (
              <>
                <h4>Market Value by Stock - Top 10</h4>
                <div style={{ width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BarChart data={[...marketValueByTicker].sort((a, b) => b.percent - a.percent)} labelKey="ticker" valueKey="percent" />
                </div>
              </>
            )}

            {showTab === 2 && (
              <>
                <h4>Market Value by Trading Currency</h4>
                <div style={{ width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PieChart data={[...marketValueByTradingCurrency].sort((a, b) => b.percent - a.percent)} labelKey="tradingCurrency" valueKey="marketValue" />
                </div>
              </>
            )}
          </div>

          <div className="grid-item grid6">
            <News />
          </div>
        </div>
      )}

      <div>
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
              <td style={getStyle(agg.costBasis)}>{formatNumber(agg.costBasis)}</td>
              <td style={getStyle(agg.marketValue)}>{formatNumber(agg.marketValue)}</td>
              <td style={getStyle(agg.unrealisedPL)}>{formatNumber(agg.unrealisedPL)}</td>
              <td style={getStyle(agg.realisedPL)}>{formatNumber(agg.realisedPL)}</td>
              <td style={getStyle(agg.pL)}>{formatNumber(agg.pL)}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <div className="grid">
        <div className="grid-item grid8">
          Sorting priority: {sortRules.length === 0 ? "" : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join("; ")}
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setSortRules([])} style={{ backgroundColor: "#fb6a4a", color: "white" }}>Clear Sort</button>
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setFilters({})} style={{ backgroundColor: "#969696", color: "white", marginRight: 8 }}>Clear Filter</button>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid12" style={{ paddingTop: "10px", textAlign: "right" }}>
          Value Date: {endDateDisplay}
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => (
            <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}>
              {renderSortControls(key)} {COLUMN_NAMES[key]}
            </th>
          ))}
        </tr>
        <tr>
          {Object.keys(COLUMN_NAMES).map((key) => {
            const numericKeys = ["totalQuantity","avgCost","price","costBasis","value","unrealisedPL","realisedPL","pL"];
            if (numericKeys.includes(key)) return <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}></th>;
            const options = Array.from(new Set(holdings.map((h) => h[key]).filter(Boolean))).sort();
            return (
              <th key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""}>
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
        </tr>
        </thead>
        <tbody>
        {sortedHoldings.map((h) => (
          <tr key={`${h.ticker}|${h.exchange}`}>
            {Object.keys(COLUMN_NAMES).map((key) => (
              <td key={key} className={hideOnMobileColumns.includes(key) ? "hide-on-mobile" : ""} style={["totalQuantity","avgCost","price","costBasis","value","unrealisedPL","realisedPL","pL"].includes(key) ? getStyle(h[key]) : {}}>
                {["totalQuantity","avgCost","price","costBasis","value","unrealisedPL","realisedPL","pL"].includes(key) ? formatNumber(h[key]) : h[key]}
              </td>
            ))}
          </tr>
        ))}
        </tbody>
      </table>
    </>
  );
}
