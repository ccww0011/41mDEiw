'use client';

import {useState} from "react";
import Dashboard from "@/components_protected/overview_components/Dashboard";
import Positions from "@/components_protected/overview_components/Positions";
import ReturnView from "@/components_protected/overview_components/Return";

export default function Overview() {
  const [showTab, setShowTab] = useState("Dashboard");
  const tabs = ["Dashboard", "Positions", "Return"];

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

      {showTab === "Dashboard" && <Dashboard />}
      {showTab === "Positions" && <Positions />}
      {showTab === "Return" && <ReturnView />}
    </>
  );
}

