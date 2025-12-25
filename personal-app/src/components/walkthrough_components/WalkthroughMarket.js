'use client';
import React, { useState } from "react";
import WalkthroughStock from "@/components/walkthrough_components/walkthrough_market_components/WalkthroughStock";
import WalkthroughFX from "@/components/walkthrough_components/walkthrough_market_components/WalkthroughFX";

export default function WalkthroughMarket() {
  // Stock or FX
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

      <div className="grid"><div className="grid-item grid12" style={{padding: "5px 0"}}></div></div>

      {showTab === 'Stock' && <WalkthroughStock/>}
      {showTab === "FX" && <WalkthroughFX/>}
    </>
  );
}
