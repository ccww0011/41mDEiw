'use client';

import { useState } from "react";
import Input from "@/protected_components/overview_components/Input";
import Transactions from "@/protected_components/overview_components/Transactions";
import Holdings from "@/protected_components/overview_components/Holdings";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holdings");
  const { transactions, loadingTransactions } = useTransactions();
  const { prices, loadingPrices } = usePrices();

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
  transactions.forEach(tx => {
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
        totalCost: 0,
        currency: currency,
      };
    }

    holdingsMap[key].totalQuantity += quantity;
    holdingsMap[key].totalCost += netCash;
  });

  // Convert to array and compute price, value, P/L, avg cost
  const holdingsArray = Object.values(holdingsMap).map(h => {
    const tickerPrices = prices[h.ticker] || {};
    const availableDates = Object.keys(tickerPrices)
      .filter(date => date <= todayStr)
      .sort();

    const price = availableDates.length > 0
      ? tickerPrices[availableDates[availableDates.length - 1]]
      : 0;

    const value = price * h.totalQuantity;
    const avgCost = h.totalQuantity !== 0 ? h.totalCost / h.totalQuantity : 0;
    const pl = value + h.totalCost; // essential

    return { ...h, price, value, avgCost, pl };
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

