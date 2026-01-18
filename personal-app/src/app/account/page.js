"use client"

import ProtectedLayout from "@/app/protected-layout";
import React, {useState} from "react";
import Market from "@/components_protected/Market";
import Overview from "@/components_protected/Overview";
import Data from "@/components_protected/Data";

export default function LoginPage() {
  // WalkthroughOverview, WalkthroughMarket, WalkthroughTransaction
  const [showTab, setShowTab] = useState("Overview");
  const tabs = ["Overview", "Market", "Data"];

  return (
    <ProtectedLayout>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid12" style={{padding: "10px 0 0 0"}}></div>
        </div>

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

        {showTab === "Overview" && <Overview/>}
        {showTab === "Market" && <Market/>}
        {showTab === "Data" && <Data/>}
      </div>
    </ProtectedLayout>
  );
}
