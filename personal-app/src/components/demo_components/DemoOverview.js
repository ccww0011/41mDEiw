'use client';

import {useState} from "react";
import DemoHolding from "@/components/demo_components/DemoHolding";

export default function DemoOverview() {
  const [showTab, setShowTab] = useState("Holding");

  return (
    <>
      <div className="grid">
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Holding")}
            style={{
              backgroundColor: showTab === "Holding" ? "#08519c" : undefined,
              color: showTab === "Holding" ? "#f7fbff" : undefined
            }}
          >
            Holding
          </button>
        </div>
        <div className="grid-item grid2">
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
      </div>

      {showTab === "Holding" && <DemoHolding/>}
    </>
  );
}

