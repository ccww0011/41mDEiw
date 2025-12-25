"use client"

import React, {useState} from "react";
import WalkthroughMarket from "@/components/walkthrough_components/WalkthroughMarket";
import WalkthroughOverview from "@/components/walkthrough_components/WalkthroughOverview";
import WalkthroughTransaction from "@/components/walkthrough_components/WalkthroughTransaction";
import {WalkthroughProvider} from "@/context/WalkthroughContext";

export default function Tutorial() {
  const TABS = ["Transaction", "Market", "Overview"];
  const [showTabIndex, setShowTabIndex] = useState(0);
  const [locked, setLocked] = useState(true);
  const [completed, setCompleted] = useState(false);

  return (
    <>
    {!completed && showTabIndex === 0 && locked && (
      <div className="gate-box">
        <h4>A set of sample transactions has been loaded for you. (1/3)</h4>
        <button onClick={() => setLocked(false)}>
          Reveal transactions
        </button>
      </div>
    )}

    {!completed && showTabIndex === 0 && !locked && (
      <div className="gate-box gate-box-next">
        <h4>Continue to Market</h4>
        <button onClick={() => {
          setShowTabIndex(1);
          setLocked(true);
        }}>
          Next
        </button>
      </div>
    )}

    {!completed && showTabIndex === 1 && locked && (
      <div className="gate-box">
        <h4>You can find information of your stocks and exchange rates in this tab. (2/3)</h4>
        <button onClick={() => setLocked(false)}>
          Reveal markets
        </button>
      </div>
    )}

    {!completed && showTabIndex === 1 && !locked && (
      <div className="gate-box gate-box-next">
        <h4>Continue to Overview</h4>
        <button onClick={() => {
          setShowTabIndex(2);
          setLocked(true);
        }}>
          Next
        </button>
      </div>
    )}

      {!completed && showTabIndex === 2 && locked && (
        <div className="gate-box">
          <h4>This is the overview of your holdings. (3/3)</h4>
          <button onClick={() => {
            setLocked(false);
            setCompleted(true);
          }}>
            Complete walkthrough
          </button>
        </div>
      )}

      <div className="container">
        <div className="grid">
          <div className="grid-item grid12" style={{padding: "20px 0 0 0"}}></div>
        </div>

        <div className="grid">
          {TABS.map((tab, index) => {
            const isLocked = (!completed && index > showTabIndex);

            return (
              <div key={tab} className="grid-item grid2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isLocked) {
                      setShowTabIndex(index);
                      setLocked(false);
                    }
                  }}
                  style={{
                    backgroundColor: showTabIndex === index ? "#08519c" : undefined,
                    color: showTabIndex === index ? "#f7fbff" : undefined,
                    filter: isLocked ? "blur(2px)" : "none",
                    pointerEvents: isLocked ? "none" : "auto",
                    userSelect: isLocked ? "none" : "auto"
                  }}
                >
                  {index + 1}. {tab}
                </button>
              </div>
            );
          })}
        </div>

        <div className={`content-gated ${locked ? "is-locked" : ""}`}>
          <WalkthroughProvider>
            {showTabIndex === 0 && <WalkthroughTransaction/>}
            {showTabIndex === 1 && <WalkthroughMarket/>}
            {showTabIndex === 2 && <WalkthroughOverview/>}
          </WalkthroughProvider>
        </div>
      </div>
    </>
  );
}