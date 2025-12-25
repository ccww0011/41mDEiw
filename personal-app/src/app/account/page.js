"use client"

import ProtectedLayout from "@/app/protected-layout";
import {useState} from "react";
import Market from "@/components_protected/Market";
import Overview from "@/components_protected/Overview";
import Transaction from "@/components_protected/Transaction";

export default function LoginPage() {
  // WalkthroughOverview, WalkthroughMarket, WalkthroughTransaction
  const [showTab, setShowTab] = useState("WalkthroughOverview");

  return (
    <ProtectedLayout>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid12" style={{padding: "20px 0 0 0"}}></div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("WalkthroughOverview")}
              style={{
                backgroundColor: showTab === "WalkthroughOverview" ? "#08519c" : undefined,
                color: showTab === "WalkthroughOverview" ? "#f7fbff" : undefined
              }}
            >
              Overview
            </button>
          </div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("WalkthroughMarket")}
              style={{
                backgroundColor: showTab === "WalkthroughMarket" ? "#08519c" : undefined,
                color: showTab === "WalkthroughMarket" ? "#f7fbff" : undefined
              }}
            >
              Market
            </button>
          </div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("WalkthroughTransaction")}
              style={{
                backgroundColor: showTab === "WalkthroughTransaction" ? "#08519c" : undefined,
                color: showTab === "WalkthroughTransaction" ? "#f7fbff" : undefined
              }}
            >
              Transaction
            </button>
          </div>
        </div>

        {showTab === "WalkthroughOverview" && <Overview/>}
        {showTab === "WalkthroughMarket" && <Market/>}
        {showTab === "WalkthroughTransaction" && <Transaction/>}
      </div>
    </ProtectedLayout>
  );
}
