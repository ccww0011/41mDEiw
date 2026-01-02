'use client';

import {useState} from "react";
import Performance from "@/components_protected/overview_components/Performance";
import Holding from "@/components_protected/overview_components/Holding";

export default function Overview() {
  const [showTab, setShowTab] = useState("Holding");
  const tabs = ["Holding", "Performance"];

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

      {showTab === "Holding" && <Holding />}
      {showTab === "Performance" && <Performance />}
    </>
  );
}

