import React, {useState, useMemo} from "react";
import Summary from "@/components_protected/overview_components/performance_subcomponents/Summary";
import TWR from "@/components_protected/overview_components/performance_subcomponents/TWR";
import MWR from "@/components_protected/overview_components/performance_subcomponents/MWR";
import {useTransactions} from "@/context/TransactionContext";
import { useUserSettings } from "@/context/UserSettingsContext";

export default function Performance() {
  // Summary, TWR, MWR
  const [showTab, setShowTab] = useState("Summary");
  const { basis, setBasis } = useUserSettings();
  const {currencies} = useTransactions();

  const basisOptions = useMemo(() => {
    const opts = new Set(["Local", ...(currencies || [])]);
    if (basis) opts.add(basis);
    return Array.from(opts);
  }, [basis, currencies]);

  return (
    <>
      <div className="grid">
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("Summary")}
            style={{
              backgroundColor: showTab === "Summary" ? "#08519c" : undefined,
              color: showTab === "Summary" ? "#f7fbff" : undefined
            }}
          >
            Summary
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("TWR")}
            style={{
              backgroundColor: showTab === "TWR" ? "#08519c" : undefined,
              color: showTab === "TWR" ? "#f7fbff" : undefined
            }}
          >
            Return-TWR
          </button>
        </div>
        <div className="grid-item grid2">
          <button
            type="button"
            onClick={() => setShowTab("MWR")}
            style={{
              backgroundColor: showTab === "MWR" ? "#08519c" : undefined,
              color: showTab === "MWR" ? "#f7fbff" : undefined
            }}
          >
            Return-MWR
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

      {showTab === "Summary" && <Summary/>}
      {showTab === "TWR" && <TWR/>}
      {showTab === "MWR" && <MWR/>}
    </>
  );
}
