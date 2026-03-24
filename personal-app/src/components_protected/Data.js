'use client';

import React, { useState } from 'react';
import Transactions from "@/components_protected/data_components/Transactions";
import Dividends from "@/components_protected/data_components/Dividends";
import CorporateActions from "@/components_protected/data_components/CorporateActions";

export default function Data() {


  const [showTab, setShowTab] = useState("Transactions");
  const tabs = [
    { key: "Transactions", label: "Transactions"},
    { key: "Dividends", label: "Dividends"},
    { key: "Corporate Actions", label: "Corporate Actions"},
  ];


  return (
    <>
      <div className="grid">
        {tabs.map((tab) => (
          <div key={tab.key} className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab(tab.key)}
              style={{
                backgroundColor: showTab === tab.key ? "#08519c" : undefined,
                color: showTab === tab.key ? "#f7fbff" : undefined
              }}
            >
              <div>{tab.label}</div>
            </button>
          </div>
        ))}
      </div>

      {showTab === 'Transactions' && <Transactions/>}
      {showTab === 'Dividends' && <Dividends/>}
      {showTab === 'Corporate Actions' && <CorporateActions/>}
    </>
  );
}
