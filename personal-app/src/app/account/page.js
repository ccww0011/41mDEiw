"use client"

import ProtectedLayout from "@/app/protected-layout";
import {useState} from "react";
import Market from "@/protected_components/Market";
import Overview from "@/protected_components/Overview";

export default function LoginPage() {
  // Overview, Upload, Performance
  const [showTab, setShowTab] = useState("Overview");

  return (
    <ProtectedLayout>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid12" style={{padding: "20px 0 0 0"}}></div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("Overview")}
              style={{
                backgroundColor: showTab === "Overview" ? "#08519c" : undefined,
                color: showTab === "Overview" ? "#f7fbff" : undefined
              }}
            >
              Overview
            </button>
          </div>
          <div className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab("Market")}
              style={{
                backgroundColor: showTab === "Market" ? "#08519c" : undefined,
                color: showTab === "Market" ? "#f7fbff" : undefined
              }}
            >
              Market
            </button>
          </div>
          <div className="grid-item grid8"></div>
        </div>

        {showTab === "Overview" && <Overview/>}
        {showTab === "Market" && <Market/>}
      </div>
    </ProtectedLayout>
  );
}
