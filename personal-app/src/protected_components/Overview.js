'use client';

import {useState} from "react";
import Performance from "@/protected_components/overview_components/Performance";
import Transaction from "@/protected_components/overview_components/Transaction";
import Holding from "@/protected_components/overview_components/Holding";
import {useTransactions} from "@/context/TransactionContext";
import {useAggregates} from "@/context/AggregateContext";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holding");
  const {currencies} = useTransactions();
  const {basis, setBasis} = useAggregates();

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
      </div>

      <div className="grid">
        <div className="grid-item grid2">
          <label>
            Basis Currency
          </label>
        </div>
        <div className="grid-item grid2">
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
          >
            <option key="Local" value="Local">Local</option>
            {currencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showTab === "Holding" && <Holding/>}
      {showTab === "Transaction" && <Transaction/>}
      {showTab === "Performance" && <Performance/>}
    </>
  );
}

