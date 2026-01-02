'use client';

import React, { useState } from 'react';
import TransactionsAll from "@/components_protected/transaction_components/TransactionsAll";

export default function Transaction() {


  const [showTab, setShowTab] = useState("All");
  const tabs = ["All"];


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

      {showTab === 'All' && <TransactionsAll/>}
    </>
  );
}
