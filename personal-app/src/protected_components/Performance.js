import {useState} from "react";
import Summary from "@/protected_components/performance_components/Summary";
import TWR from "@/protected_components/performance_components/TWR";
import MWR from "@/protected_components/performance_components/MWR";

export default function Performance() {
  // Summary, TWR, MWR
  const [showTab, setShowTab] = useState("Summary");

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
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
        <div className="grid-item grid1">
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
        <div className="grid-item grid1">
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
        <div className="grid-item grid7"></div>

        <div className="grid-item grid10" style={{padding: "5px 0"}}></div>
      </div>
      {showTab === "Summary" ? <Summary/>
        : showTab === "TWR" ? <TWR/>
          : showTab === "MWR" ? <MWR/> : null}
    </>
  );
}
