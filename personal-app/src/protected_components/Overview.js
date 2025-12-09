'use client';

import {useEffect, useMemo, useState} from "react";
import Performance from "@/protected_components/overview_components/Performance";
import Transaction from "@/protected_components/overview_components/Transaction";
import Holding from "@/protected_components/overview_components/Holding";
import { useTransactions } from "@/context/TransactionContext";
import { usePrices } from "@/context/PriceContext";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holding");
  const { transactions, loadingTransactions } = useTransactions();
  const [sortedTransactions, setSortedTransactions] = useState([]);
  const { prices } = usePrices();

  useEffect(() => {
    setSortedTransactions([...transactions].sort((a, b) => parseInt(a["TradeDate"]) - parseInt(b["TradeDate"])));
  }, [transactions]);

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

  //console.log("sortedTransactions", sortedTransactions);

  sortedTransactions.forEach(tx => {
    if (tx["AssetClass"] !== "STK") return;

    const key = `${tx.Ticker}|${tx["ListingExchange"]}`;
    const quantity = parseFloat(tx["Quantity"]);
    const netCash = parseFloat(tx["NetCash"]);
    const currency = tx["CurrencyPrimary"];

    if (!holdingsMap[key]) {
      holdingsMap[key] = {
        ticker: tx.Ticker,
        description: tx["Description"],
        exchange: tx["ListingExchange"],
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

  const aggregates = useMemo(() => {
    const map = {};
    const missingPLCurrencies = new Set();
    holdingsArray.forEach(h => {
      const curr = h.currency || "N/A";
      if (!map[curr]) {
        map[curr] = {
          costBasis: 0,
          marketValue: 0,
          unrealisedPL: 0,
          realisedPL: 0,
          pl: 0
        };
      }
      // ----- COST BASIS -----
      // totalProceeds is your cost basis (negative for long positions)
      if (h.totalProceeds !== null && !isNaN(h.totalProceeds)) {
        map[curr].costBasis += h.totalProceeds;
      }
      // ----- MARKET VALUE -----
      if (h.value !== null) {
        map[curr].marketValue += h.value;
      } else {
        missingPLCurrencies.add(curr);
      }
      // ----- UNREALISED P/L -----
      if (h.unrealisedPL !== null) {
        map[curr].unrealisedPL += h.unrealisedPL;
      } else {
        missingPLCurrencies.add(curr);
      }
      // ----- REALISED P/L -----
      if (h.realisedPL !== null) {
        map[curr].realisedPL += h.realisedPL;
      } else {
        missingPLCurrencies.add(curr);
      }
      // ----- TOTAL P/L -----
      if (h.pl !== null) {
        map[curr].pl += h.pl;
      } else {
        missingPLCurrencies.add(curr);
      }
    });
    return { map, missingPLCurrencies: Array.from(missingPLCurrencies) };
  }, [holdingsArray]);


  return (
    <>
      <div className="grid">
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Holding")}
            style={{
              backgroundColor: showTab === "Holding" ? "#08519c" : undefined,
              color: showTab === "Holding" ? "#f7fbff" : undefined
            }}
          >
            Holding
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Transaction")}
            style={{
              backgroundColor: showTab === "Transaction" ? "#08519c" : undefined,
              color: showTab === "Transaction" ? "#f7fbff" : undefined
            }}
          >
            Transaction
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Performance")}
            style={{
              backgroundColor: showTab === "Performance" ? "#08519c" : undefined,
              color: showTab === "Performance" ? "#f7fbff" : undefined
            }}
          >
            Performance
          </button>
        </div>
        <div className="grid-item grid6"></div>
      </div>

      {showTab === "Holding" && <Holding holdingsArray={holdingsArray} aggregates={aggregates} />}
      {showTab === "Transaction" && <Transaction />}
      {showTab === "Performance" && <Performance />}
      {(loadingTransactions) && <div><h3>Loading holdings...</h3></div>}
    </>
  );
}

