"use client"

import ProtectedLayout from "@/app/protected-layout";
import {useState} from "react";
import Price from "@/protected_components/Price";
import Overview from "@/protected_components/Overview";
import Performance from "@/protected_components/Performance";

export default function LoginPage() {
  // Overview, Upload, Performance
  const [showTab, setShowTab] = useState("Overview");

  return (
    <ProtectedLayout>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid10" style={{padding: "20px 0 0 0"}}></div>

          <div className="grid-item grid1">
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
          <div className="grid-item grid1">
            <button
              type="button"
              onClick={() => setShowTab("Price")}
              style={{
                backgroundColor: showTab === "Price" ? "#08519c" : undefined,
                color: showTab === "Price" ? "#f7fbff" : undefined
              }}
            >
              Price
            </button>
          </div>
          <div className="grid-item grid1">
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
          <div className="grid-item grid7"></div>
      </div>

      {showTab === "Overview" ? <Overview/>
        : showTab === "Price" ? <Price/>
          : showTab === "Performance" ? <Performance/> : null}
    </div>
    </ProtectedLayout>
  );
}
