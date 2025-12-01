'use client';

import {useEffect, useState} from "react";
import Input from "@/protected_components/overview_components/Input";
import Transactions from "@/protected_components/overview_components/Transactions";
import Holdings from "@/protected_components/overview_components/Holdings";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holdings");
  const { transactions, loadingTransactions } = useTransactions();
  const [sortedTransactions, setSortedTransactions] = useState([]);
  const { prices, loadingPrices } = usePrices();

  useEffect(() => {
    setSortedTransactions([...transactions].sort((a, b) => parseInt(a["TradeDate"]) - parseInt(b["TradeDate"])));
  }, [transactions]);

  if (loadingTransactions || loadingPrices) {
    return <div>Loading data...</div>;
  }

  const today = new Date();
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${d}`;
  };
  const todayStr = formatDate(today);

  // Aggregate transactions by Ticker + Exchange
  const holdingsMap = {};
  console.log("sortedTransactions", sortedTransactions);
  sortedTransactions.forEach(tx => {
    if (tx.AssetClass !== "STK") return;

    const key = `${tx.Ticker}|${tx.ListingExchange}`;
    const quantity = parseFloat(tx.Quantity);
    const netCash = parseFloat(tx.NetCash);
    const currency = tx.CurrencyPrimary;

    if (!holdingsMap[key]) {
      holdingsMap[key] = {
        ticker: tx.Ticker,
        description: tx.Description,
        exchange: tx.ListingExchange,
        totalQuantity: 0,
        totalProceeds: 0,
        realisedPL: 0,
        currency: currency,
      };
    }

    const totalProceeds = holdingsMap[key].totalProceeds;
    if ((totalProceeds >= 0 && netCash > 0) || ( totalProceeds <= 0 && netCash < 0)) {
      holdingsMap[key].totalProceeds += netCash;
    } else {
      let avgCost = totalProceeds / holdingsMap[key].totalQuantity; // Negative for long position
      let avgPrice = netCash / quantity // Always negative
      if (netCash > 0) {
        avgPrice *= -1; // If it is selling, positive avgPrice
      }
      holdingsMap[key].realisedPL -= (avgPrice + avgCost) * quantity
      holdingsMap[key].totalProceeds += avgCost * quantity;
    }
    holdingsMap[key].totalQuantity += quantity;
  });

  // Convert to array and compute price, value, P/L, avg cost
  const holdingsArray = Object.values(holdingsMap).map(h => {
    const tickerPrices = prices[h.ticker];

    // If no price data exists for this ticker → no market data
    if (!tickerPrices) {
      const avgCost = h.totalQuantity !== 0 ? h.totalProceeds / h.totalQuantity : null;

      return {
        ...h,
        price: null,
        value: null,
        avgCost,
        unrealisedPL: null,
        realisedPL: h.realisedPL,
        pl: null   // <<-- NEW FIELD
      };
    }

    // Normal price extraction
    const availableDates = Object.keys(tickerPrices)
      .filter(date => date <= todayStr)
      .sort();

    const price =
      availableDates.length > 0
        ? tickerPrices[availableDates[availableDates.length - 1]]
        : null;

    const value = price !== null ? price * h.totalQuantity : null;
    const avgCost =
      h.totalQuantity !== 0 ? h.totalProceeds / h.totalQuantity : null;
    const unrealisedPL =
      price !== null ? value + h.totalProceeds : null;

    return {
      ...h,
      price,
      value,
      avgCost,
      unrealisedPL,
      realisedPL: h.realisedPL,
      pl: unrealisedPL !== null ? h.realisedPL + unrealisedPL : null  // <<-- NEW FIELD
    };
  });


  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Holdings")}
            style={{
              backgroundColor: showTab === "Holdings" ? "#08519c" : undefined,
              color: showTab === "Holdings" ? "#f7fbff" : undefined
            }}
          >
            Holdings
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Transactions")}
            style={{
              backgroundColor: showTab === "Transactions" ? "#08519c" : undefined,
              color: showTab === "Transactions" ? "#f7fbff" : undefined
            }}
          >
            Transactions
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Input")}
            style={{
              backgroundColor: showTab === "Input" ? "#08519c" : undefined,
              color: showTab === "Input" ? "#f7fbff" : undefined
            }}
          >
            Input
          </button>
        </div>
        <div className="grid-item grid7"></div>
        <div className="grid-item grid10" style={{ padding: "5px 0" }}></div>
      </div>

      {showTab === "Holdings" && <Holdings holdingsArray={holdingsArray} />}
      {showTab === "Transactions" && <Transactions />}
      {showTab === "Input" && <Input />}
    </>
  );
}

