'use client';

import React, { useState } from 'react';
import Transactions from "@/components_protected/data_components/Transactions";
import Dividends from "@/components_protected/data_components/Dividends";

export default function Data() {


  const [showTab, setShowTab] = useState("Transactions");
  const tabs = ["Transactions", "Dividends"];


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

      {showTab === 'Transactions' && <Transactions/>}
      {showTab === 'Dividends' && <Dividends/>}
    </>
  );
}
