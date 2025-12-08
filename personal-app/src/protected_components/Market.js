'use client';
import React, { useState } from "react";
import Stock from "@/protected_components/market_components/Stock";
import FX from "@/protected_components/market_components/FX";

export default function Market() {
  // Stock or FX
  const [showTab, setShowTab] = useState("Stock");

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Stock")}
            style={{
              backgroundColor: showTab === "Stock" ? "#08519c" : undefined,
              color: showTab === "Stock" ? "#f7fbff" : undefined
            }}
          >
            Stock
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("FX")}
            style={{
              backgroundColor: showTab === "FX" ? "#08519c" : undefined,
              color: showTab === "FX" ? "#f7fbff" : undefined
            }}
          >
            FX
          </button>
        </div>
        <div className="grid-item grid8"></div>

        <div className="grid-item grid10" style={{padding: "5px 0"}}></div>
      </div>

      {showTab === 'Stock' && <Stock/>}
      {showTab === "FX" && <FX/>}
    </>
  );
}
