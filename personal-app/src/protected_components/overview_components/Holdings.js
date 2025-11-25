'use client';

import React from 'react';
import { useTransactions } from "@/context/TransactionContext";

export default function Holdings() {
  const { transactions, loadingTransactions } = useTransactions();

  if (loadingTransactions) {
    return <div>Loading holdings...</div>;
  }

  // Aggregate holdings by unique ticker + exchange
  const holdingsMap = {};
  transactions.forEach(tx => {
    if (tx.AssetClass === "STK") {
      const key = `${tx.Ticker}|${tx.ListingExchange}`;
      const quantity = parseFloat(tx.Quantity);

      if (!holdingsMap[key]) {
        holdingsMap[key] = { ticker: tx.Ticker, exchange: tx.ListingExchange, quantity: 0 };
      }
      holdingsMap[key].quantity += quantity;
    }
  });

  const holdingsArray = Object.values(holdingsMap);

  return (
    <div>
      <h2>Holdings</h2>
      <table>
        <thead>
        <tr>
          <th>Ticker</th>
          <th>Exchange</th>
          <th>Quantity</th>
        </tr>
        </thead>
        <tbody>
        {holdingsArray.map(h => (
          <tr key={`${h.ticker}|${h.exchange}`}>
            <td>{h.ticker}</td>
            <td>{h.exchange}</td>
            <td>{h.quantity.toLocaleString()}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}


