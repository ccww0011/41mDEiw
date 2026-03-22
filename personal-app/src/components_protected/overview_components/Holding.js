'use client';
import React, {useState, useMemo, useEffect} from "react";
import {useTransactions} from "@/context/TransactionContext";
import PieChart from "@/components_protected/overview_components/holding_subcomponents/PieChart";
import BarChart from "@/components/BarChart";
import {useValuationContext} from "@/context/ValuationContext";
import {useFxs} from "@/context/FxContext";
import {usePrices} from "@/context/PriceContext";
 
import LineChart from "@/components_protected/overview_components/holding_subcomponents/LineChart";
import {News} from "@/components_protected/overview_components/holding_subcomponents/News";
import { useUserSettings } from "@/context/UserSettingsContext";

export default function Holding() {
  const {transactionCurrencySet, loadingTransactions, firstTransactionDate} = useTransactions();
  const { loadingPrices, lastPriceDate} = usePrices();
  const {loadingFxs, lastFxDate} = useFxs();
  const {
    startDateDisplay,
    endDateDisplay,
    setStartDateDisplay,
    setEndDateDisplay,
    aggregates,
    allTimeAggregates,
    latestValuationDate,
    marketValueByTicker,
    marketValueByTradingCurrency,
    cumulativePLByDate,
  } = useValuationContext();
  const { basis, setBasis } = useUserSettings();

  const [showTab, setShowTab] = useState(0);
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [inputError, setInputError] = useState('')

 
  const getPrevDateStr = (yyyymmdd) => {
    if (!yyyymmdd || yyyymmdd.length !== 8) return null;
    const year = Number(yyyymmdd.slice(0, 4));
    const month = Number(yyyymmdd.slice(4, 6)) - 1;
    const day = Number(yyyymmdd.slice(6, 8));
    const date = new Date(year, month, day);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() - 1);
    return (
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0")
    );
  };

  const cumulativePLArray = useMemo(() => {
    if (!cumulativePLByDate || !startDateDisplay) return [];
    const prevStartDate = getPrevDateStr(startDateDisplay);
    const base = prevStartDate ? (cumulativePLByDate[prevStartDate] ?? 0) : 0;
    return Object.entries(cumulativePLByDate)
      .filter(([d]) => d >= startDateDisplay && d <= endDateDisplay)
      .map(([d, v]) => ({ date: d, cumulativePLUSD: (v ?? 0) - base }));
  }, [cumulativePLByDate, startDateDisplay, endDateDisplay]);

  const profit = useMemo(() => {
    if (!startDateDisplay || !endDateDisplay) return 0;
    const prevStartDate = getPrevDateStr(startDateDisplay);
    const endValue = cumulativePLByDate[endDateDisplay] ?? 0;
    const startValue = prevStartDate ? (cumulativePLByDate[prevStartDate] ?? 0) : 0;
    return endValue - startValue;
  }, [cumulativePLByDate, startDateDisplay, endDateDisplay]);


  useEffect(() => {
    if (endDateDisplay !== "") {
      setStartDateInput(startDateDisplay);
      setEndDateInput(endDateDisplay);
    }
  }, [startDateDisplay, endDateDisplay]);


  const handleApply = () => {
    if (!firstTransactionDate || !lastPriceDate || !lastFxDate) return;

    const s = new Date(+startDateInput.slice(0, 4), +startDateInput.slice(4, 6) - 1, +startDateInput.slice(6, 8));
    const e = new Date(+endDateInput.slice(0, 4), +endDateInput.slice(4, 6) - 1, +endDateInput.slice(6, 8));
    const first = new Date(+firstTransactionDate.slice(0, 4), +firstTransactionDate.slice(4, 6) - 1, +firstTransactionDate.slice(6, 8));
    const last = new Date(+lastPriceDate.slice(0, 4), +lastPriceDate.slice(4, 6) - 1, +lastPriceDate.slice(6, 8));
    const maxEnd = lastPriceDate > lastFxDate ? new Date(+lastFxDate.slice(0, 4), +lastFxDate.slice(4, 6) - 1, +lastFxDate.slice(6, 8)) : last;
    if (isNaN(s) || isNaN(e)) {
      setInputError("Invalid date! Use YYYYMMDD.");
      return;
    }

    const newStart = s < first ? first : s;
    const newEnd = e > maxEnd ? maxEnd : e;
    if (newStart > newEnd) {
      setInputError("The start date must be earlier than the end date!");
      return;
    }
    const newStartStr = `${newStart.getFullYear()}${String(
      newStart.getMonth() + 1
    ).padStart(2, "0")}${String(newStart.getDate()).padStart(2, "0")}`;
    const newEndStr = `${newEnd.getFullYear()}${String(
      newEnd.getMonth() + 1
    ).padStart(2, "0")}${String(newEnd.getDate()).padStart(2, "0")}`;
    setStartDateDisplay(newStartStr);
    setStartDateInput(newStartStr);
    setEndDateDisplay(newEndStr);
    setEndDateInput(newEndStr);
    setInputError("");
  };



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


  const basisOptions = useMemo(() => {
    const opts = new Set(["Local", ...(transactionCurrencySet || [])]);
    if (basis) opts.add(basis);
    return Array.from(opts);
  }, [basis, transactionCurrencySet]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid2"><h2>Holding</h2></div>
        <div className="grid-item grid10">
          {(loadingTransactions || loadingPrices || loadingFxs) && (
            <h3 style={{marginLeft: '20px', color: 'red'}}>
              {"Loading P/L data for tickers "}{aggregates.missingPLCurrencies?.join(", ")}
            </h3>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid2"><label>Basis Currency</label></div>
        <div className="grid-item grid2">
          <select value={basis || "Local"} onChange={(e) => setBasis(e.target.value)}>
            {basisOptions.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleApply();
        }}
      >
        <div className="grid">
          <div className="grid-item grid2">
            <label>Start Date</label>
          </div>
          <div className="grid-item grid2">
            <input
              type="text"
              placeholder="YYYYMMDD"
              value={startDateInput ?? ""}
              onChange={(e) =>
                setStartDateInput(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
          </div>
          <div className="grid-item grid1">
            <button
              type="button"
              onClick={() => {
                setStartDateInput(firstTransactionDate);
                setInputError("");
              }}
            >
              Earliest
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="grid-item grid2">
            <label>End Date</label>
          </div>
          <div className="grid-item grid2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYYMMDD"
              value={endDateInput ?? ""}
              onChange={(e) =>
                setEndDateInput(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
          </div>
          <div className="grid-item grid1">
            <button
              type="button"
              onClick={() => {
                setEndDateInput(
                  lastPriceDate > lastFxDate ? lastFxDate : lastPriceDate
                );
                setInputError("");
              }}
            >
              Latest
            </button>
          </div>

          <div className="grid-item grid1">
            <button type="submit">
              Apply
            </button>
          </div>

          <div className="grid-item grid6" style={{color: "red"}}>
            {inputError}
          </div>
        </div>
      </form>

      <div className="grid">
        <div className="grid-item grid12" style={{padding: "10px 0 0 0"}}></div>
      </div>

      {(aggregates.missingPLCurrencies?.length === 0 || (!loadingTransactions && !loadingPrices && !loadingFxs)) && (
        <div className="grid">
          <div className="grid-item grid6">
            <div className="grid">
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(0)}
                        style={{backgroundColor: showTab === 0 ? "#08519c" : undefined, color: showTab === 0 ? "#f7fbff" : undefined}}>Profit
                  - {basis === "Local" ? "USD" : basis}</button>
              </div>
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(1)}
                        style={{backgroundColor: showTab === 1 ? "#08519c" : undefined, color: showTab === 1 ? "#f7fbff" : undefined}}>Value - Top 10
                </button>
              </div>
              <div className="grid-item grid3">
                <button onClick={() => setShowTab(2)}
                        style={{backgroundColor: showTab === 2 ? "#08519c" : undefined, color: showTab === 2 ? "#f7fbff" : undefined}}>Value - FX
                </button>
              </div>
            </div>

            {showTab === 0 && (
              <>
                <h4>Profit ({startDateDisplay}-{endDateDisplay}) in {basis === "Local" ? "USD" : basis} = {profit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</h4>
                <div style={{width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <LineChart data={cumulativePLArray} labelKey="date" valueKey="cumulativePLUSD"/>
                </div>
              </>
            )}

            {showTab === 1 && (
              <>
                <h4>Market Value by Stock - Top 10</h4>
                <div style={{width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <BarChart data={[...marketValueByTicker].sort((a, b) => b.percent - a.percent)} labelKey="ticker" valueKey="percent"/>
                </div>
              </>
            )}

            {showTab === 2 && (
              <>
                <h4>Market Value by Trading Currency</h4>
                <div style={{width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <PieChart data={[...marketValueByTradingCurrency].sort((a, b) => b.percent - a.percent)} labelKey="tradingCurrency" valueKey="marketValue"/>
                </div>
              </>
            )}
          </div>

          <div className="grid-item grid6">
            <News/>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="grid-item grid12" style={{padding: "10px 0 0 0"}}></div>
      </div>

      <div className="grid">
        <div className="grid-item grid10">
          <h3>Aggregates</h3>
        </div>
        <div className="grid-item grid2" style={{ paddingTop: "10px", textAlign: "right" }}>
          Value Date: {latestValuationDate}
        </div>
      </div>

      <div>
        <table>
          <thead>
          <tr>
            <th>Currency</th>
            <th>Cost Basis</th>
            <th>Market Value</th>
            <th>Unrealised P/L</th>
            <th>Realised P/L</th>
            <th>All-time P/L</th>
          </tr>
          </thead>
          <tbody>
          {Object.entries((allTimeAggregates || aggregates).aggMap || {}).map(([tradingCurrency, agg]) => (
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
        <div className="grid-item grid12" style={{padding: "10px 0 0 0"}}></div>
      </div>

    </>
  );
}
