'use client';

import React, { useState } from 'react';
import AddTransactionsAI from "@/components_protected/data_components/transactions_subcomponents/transactions_ai_subcomponents/AddTransactionsAI";

export default function TransactionsAI() {
  const [showTab, setShowTab] = useState("Add");
  const tabs = ["Add", "Delete"];

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

      {showTab === 'Add' && <AddTransactionsAI/>}
      {showTab === 'Delete' && <AddTransactionsAI/>}
    </>
  );
}
