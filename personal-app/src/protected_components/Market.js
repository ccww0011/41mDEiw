'use client';
import React, { useState } from "react";
import Equity from "@/protected_components/market_components/Equity";
import Cash from "@/protected_components/market_components/Cash";

export default function Market() {
  // Equity or Cash
  const [showTab, setShowTab] = useState("Equity");

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Equity")}
            style={{
              backgroundColor: showTab === "Equity" ? "#08519c" : undefined,
              color: showTab === "Equity" ? "#f7fbff" : undefined
            }}
          >
            Equity
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Cash")}
            style={{
              backgroundColor: showTab === "Cash" ? "#08519c" : undefined,
              color: showTab === "Cash" ? "#f7fbff" : undefined
            }}
          >
            Cash
          </button>
        </div>
        <div className="grid-item grid8"></div>

        <div className="grid-item grid10" style={{padding: "5px 0"}}></div>
      </div>

      {(showTab === 'Equity') ? (
        <Equity/>
      ) : (showTab === "Cash") ? (
        <Cash/>
      ) : null}
    </>
  );
}
