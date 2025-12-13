import React, {useState} from "react";
import Summary from "@/protected_components/overview_components/performance_subcomponents/Summary";
import TWR from "@/protected_components/overview_components/performance_subcomponents/TWR";
import MWR from "@/protected_components/overview_components/performance_subcomponents/MWR";
import {useAggregates} from "@/context/AggregateContext";
import {useTransactions} from "@/context/TransactionContext";

export default function Performance() {
  // Summary, TWR, MWR
  const [showTab, setShowTab] = useState("Summary");
  const {basis, setBasis} = useAggregates();
  const {currencies} = useTransactions();

  return (
    <>
      <div className="grid">
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Summary")}
            style={{
              backgroundColor: showTab === "Summary" ? "#08519c" : undefined,
              color: showTab === "Summary" ? "#f7fbff" : undefined
            }}
          >
            Summary
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("TWR")}
            style={{
              backgroundColor: showTab === "TWR" ? "#08519c" : undefined,
              color: showTab === "TWR" ? "#f7fbff" : undefined
            }}
          >
            Return-TWR
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("MWR")}
            style={{
              backgroundColor: showTab === "MWR" ? "#08519c" : undefined,
              color: showTab === "MWR" ? "#f7fbff" : undefined
            }}
          >
            Return-MWR
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

      {showTab === "Summary" && <Summary/>}
      {showTab === "TWR" && <TWR/>}
      {showTab === "MWR" && <MWR/>}
    </>
  );
}
