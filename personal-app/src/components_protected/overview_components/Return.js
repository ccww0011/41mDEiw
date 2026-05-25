import React, {useState, useMemo} from "react";
import TWR from "@/components_protected/overview_components/performance_subcomponents/TWR";
import MWR from "@/components_protected/overview_components/performance_subcomponents/MWR";
import {useTransactions} from "@/context/TransactionContext";
import { useUserSettings } from "@/context/UserSettingsContext";
import { usePrices } from "@/context/PriceContext";
import { useFxs } from "@/context/FxContext";
import { useValuationDashboard } from "@/hooks_protected/useValuationDashboard";

export default function ReturnView() {
  const [showTab, setShowTab] = useState("TWR");
  const [viewMode, setViewMode] = useState("Monthly");
  const { basis, setBasis } = useUserSettings();
  const {transactionCurrencySet, loadingTransactions} = useTransactions();
  const { loadingPrices } = usePrices();
  const { loadingFxs } = useFxs();
  const { aggregates } = useValuationDashboard();
  const returnTabs = [
    { key: "TWR", label: "TWR" },
    { key: "MWR", label: "MWR" },
  ];

  const basisOptions = useMemo(() => {
    const opts = new Set(["Local", ...(transactionCurrencySet || [])]);
    if (basis) opts.add(basis);
    return Array.from(opts);
  }, [basis, transactionCurrencySet]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid2"><h2>Return</h2></div>
        <div className="grid-item grid10">
          {(loadingTransactions || loadingPrices || loadingFxs) && (
            <h3 style={{marginLeft: '20px', color: 'red'}}>
              {"Loading P/L data for tickers "}{aggregates.missingPLCurrencies?.join(", ")}
            </h3>
          )}
        </div>
      </div>

      <div className="grid">
        {returnTabs.map((tab) => (
          <div key={tab.key} className="grid-item grid2">
            <button
              type="button"
              onClick={() => setShowTab(tab.key)}
              style={{
                backgroundColor: showTab === tab.key ? "#08519c" : undefined,
                color: showTab === tab.key ? "#f7fbff" : undefined
              }}
            >
              {tab.label}
            </button>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setViewMode("Daily")}
            style={{
              backgroundColor: viewMode === "Daily" ? "#08519c" : undefined,
              color: viewMode === "Daily" ? "#f7fbff" : undefined
            }}
          >
            Daily
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setViewMode("Monthly")}
            style={{
              backgroundColor: viewMode === "Monthly" ? "#08519c" : undefined,
              color: viewMode === "Monthly" ? "#f7fbff" : undefined
            }}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid2">
          <label>
            Basis Currency
          </label>
        </div>
        <div className="grid-item grid2">
          <select
            value={basis || "Local"}
            onChange={(e) => setBasis(e.target.value)}
          >
            {basisOptions.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showTab === "TWR" && <TWR viewMode={viewMode}/>}
      {showTab === "MWR" && <MWR viewMode={viewMode}/>}
    </>
  );
}
