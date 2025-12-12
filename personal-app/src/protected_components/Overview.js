'use client';

import {useState} from "react";
import Performance from "@/protected_components/overview_components/Performance";
import Transaction from "@/protected_components/overview_components/Transaction";
import Holding from "@/protected_components/overview_components/Holding";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holding");

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

      {showTab === "Holding" && <Holding />}
      {showTab === "Transaction" && <Transaction />}
      {showTab === "Performance" && <Performance />}
    </>
  );
}

