'use client';
import React, { useState } from "react";
import Stock from "@/components_protected/market_components/Stock";
import FX from "@/components_protected/market_components/FX";

export default function Market() {
  const [showTab, setShowTab] = useState("Stock");
  const tabs = ["Stock", "FX"];

  return (
    <>
      <div className="grid">
        {tabs.map((tab) => (
          <div key={tab} className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab(tab)}
              style={{
                backgroundColor: showTab === tab ? "#08519c" : undefined,
                color: showTab === tab ? "#f7fbff" : undefined
              }}
            >
              {tab}
            </button>
          </div>
        ))}
      </div>

      {showTab === 'Stock' && <Stock/>}
      {showTab === "FX" && <FX/>}
    </>
  );
}
