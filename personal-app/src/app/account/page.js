"use client"

import ProtectedLayout from "@/app/protected-layout";
import {useState} from "react";
import Market from "@/components_protected/Market";
import Overview from "@/components_protected/Overview";
import Transaction from "@/components_protected/Transaction";

export default function LoginPage() {
  // DemoOverview, DemoMarket, DemoTransaction
  const [showTab, setShowTab] = useState("DemoOverview");

  return (
    <ProtectedLayout>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid12" style={{padding: "20px 0 0 0"}}></div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("DemoOverview")}
              style={{
                backgroundColor: showTab === "DemoOverview" ? "#08519c" : undefined,
                color: showTab === "DemoOverview" ? "#f7fbff" : undefined
              }}
            >
              Overview
            </button>
          </div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("DemoMarket")}
              style={{
                backgroundColor: showTab === "DemoMarket" ? "#08519c" : undefined,
                color: showTab === "DemoMarket" ? "#f7fbff" : undefined
              }}
            >
              Market
            </button>
          </div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("DemoTransaction")}
              style={{
                backgroundColor: showTab === "DemoTransaction" ? "#08519c" : undefined,
                color: showTab === "DemoTransaction" ? "#f7fbff" : undefined
              }}
            >
              Transaction
            </button>
          </div>
        </div>

        {showTab === "DemoOverview" && <Overview/>}
        {showTab === "DemoMarket" && <Market/>}
        {showTab === "DemoTransaction" && <Transaction/>}
      </div>
    </ProtectedLayout>
  );
}
