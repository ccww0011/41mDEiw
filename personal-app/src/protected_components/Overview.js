import {useState} from "react";
import Input from "@/protected_components/overview_components/Input";
import Transactions from "@/protected_components/overview_components/Transactions";
import Holdings from "@/protected_components/overview_components/Holdings";

export default function Overview() {
  // Holdings, Transactions, Input
  const [showTab, setShowTab] = useState("Holdings");

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Holdings")}
            style={{
              backgroundColor: showTab === "Holdings" ? "#08519c" : undefined,
              color: showTab === "Holdings" ? "#f7fbff" : undefined
            }}
          >
            Holdings
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Transactions")}
            style={{
              backgroundColor: showTab === "Transactions" ? "#08519c" : undefined,
              color: showTab === "Transactions" ? "#f7fbff" : undefined
            }}
          >
            Transactions
          </button>
        </div>
        <div className="grid-item grid1">
          <button
            type="button"
            onClick={() => setShowTab("Input")}
            style={{
              backgroundColor: showTab === "Input" ? "#08519c" : undefined,
              color: showTab === "Input" ? "#f7fbff" : undefined
            }}
          >
            Input
          </button>
        </div>
        <div className="grid-item grid7"></div>

        <div className="grid-item grid10" style={{padding: "5px 0"}}></div>
      </div>
      {showTab === "Holdings" ? <Holdings/>
        : showTab === "Transactions" ? <Transactions/>
          : showTab === "Input" ? <Input/> : null}
    </>
  );
}
