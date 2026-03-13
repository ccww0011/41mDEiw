'use client';

import React, { useMemo, useState } from "react";
import { usePrices } from "@/context/PriceContext";

const RENDERED_HEADERS = [
  "ticker",
  "actionDate",
  "type",
  "summary",
  "child_ticker",
  "ratio",
];

const COLUMN_NAMES = {
  ticker: "Ticker",
  actionDate: "Action Date",
  type: "Type",
  summary: "Summary",
  child_ticker: "Child Ticker",
  ratio: "Ratio",
};

const HIDE_ON_MOBILE_COLUMNS = ["summary", "child_ticker"];

const NUMERIC_KEYS = ["ratio"];

function CorporateActionsTable({ title, rows }) {
  const [filters, setFilters] = useState({});
  const [sortRules, setSortRules] = useState([{ key: "actionDate", direction: "desc" }]);

  const sortedRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    let filtered = [...rows];
    Object.entries(filters).forEach(([key, value]) => {
      if (!NUMERIC_KEYS.includes(key) && value && value !== "All") {
        filtered = filtered.filter((item) => item[key] === value);
      }
    });

    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      filtered.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothNumbers = !isNaN(numA) && !isNaN(numB);

        if (bothNumbers) return direction === "asc" ? numA - numB : numB - numA;

        const strA = valA?.toString().toLowerCase() ?? "";
        const strB = valB?.toString().toLowerCase() ?? "";
        if (strA < strB) return direction === "asc" ? -1 : 1;
        if (strA > strB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [rows, filters, sortRules]);

  const onSortClick = (key, directionOrRemove) => {
    setSortRules((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      if (directionOrRemove === "remove") return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const renderSortControls = (key) => {
    const rule = sortRules.find((r) => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => onSortClick(key, "desc")}
          title="Sort Descending"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "desc" ? "#fb6a4a" : "#f7fbff",
          }}
        >
          ▼
        </button>
        <button
          onClick={() => onSortClick(key, "asc")}
          title="Sort Ascending"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: rule?.direction === "asc" ? "#fb6a4a" : "#f7fbff",
          }}
        >
          ▲
        </button>
        <button
          onClick={() => onSortClick(key, "remove")}
          title="Remove Sort"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08519c",
            color: "#f7fbff",
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  const formatNumber = (num) =>
    num === null || num === undefined || num === ""
      ? "—"
      : Number(num).toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 8,
        });

  const getStyle = (num) => ({
    textAlign: "right",
    color: Number(num) < 0 ? "red" : "black",
  });

  return (
    <>
      <div className="grid">
        <div className="grid-item grid12">
          <h3>{title}</h3>
        </div>
      </div>

      <div className="grid">
        <div className="grid-item grid8">
          Sorting priority:{" "}
          {sortRules.length === 0
            ? "None"
            : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join("; ")}
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setSortRules([])} style={{ backgroundColor: "#fb6a4a", color: "white" }}>
            Clear Sort
          </button>
        </div>
        <div className="grid-item grid2">
          <button onClick={() => setFilters({})} style={{ backgroundColor: "#969696", color: "white" }}>
            Clear Filter
          </button>
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {RENDERED_HEADERS.map((header) => (
              <th
                key={header}
                className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? "hide-on-mobile" : ""}
                style={{ verticalAlign: "top" }}
              >
                {renderSortControls(header)} {COLUMN_NAMES[header]}
              </th>
            ))}
          </tr>

          <tr>
            {RENDERED_HEADERS.map((header) => {
              if (NUMERIC_KEYS.includes(header)) return <th key={header}></th>;
              const options = Array.from(new Set(rows.map((row) => row[header]).filter(Boolean))).sort();
              return (
                <th key={header} className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? "hide-on-mobile" : ""}>
                  <select
                    value={filters[header] || "All"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        [header]: value === "All" ? undefined : value,
                      }));
                    }}
                    style={{ width: "100%" }}
                  >
                    <option value="All">All</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={idx}>
              {RENDERED_HEADERS.map((header) => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? "hide-on-mobile" : ""}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(row[header]) : {}}
                >
                  {NUMERIC_KEYS.includes(header) ? formatNumber(row[header]) : row[header] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function CorporateActions() {
  const { corporateActions } = usePrices();

  const rows = useMemo(() => {
    const output = [];
    if (!corporateActions || typeof corporateActions !== "object") return output;

    Object.entries(corporateActions).forEach(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return;
      Object.entries(actions).forEach(([actionDate, details]) => {
        output.push({
          ticker,
          actionDate,
          type: details?.type ?? "",
          summary: details?.summary ?? "",
          child_ticker: details?.child_ticker ?? "",
          ratio: details?.ratio ?? details?.factor ?? "",
        });
      });
    });

    return output;
  }, [corporateActions]);

  const actionsWithRatio = useMemo(
    () => rows.filter((row) => !isNaN(parseFloat(row.ratio)) && Number(row.ratio) > 0),
    [rows]
  );

  const suggestions = useMemo(
    () => rows.filter((row) => isNaN(parseFloat(row.ratio)) || Number(row.ratio) <= 0),
    [rows]
  );

  return (
    <>
      <div>
        <h2>Corporate Actions</h2>
        <CorporateActionsTable title="Applied" rows={actionsWithRatio} />
        <div className="grid">
          <div className="grid-item grid12" style={{ padding: "10px 0 0 0" }}></div>
        </div>
        <CorporateActionsTable title="Suggestions" rows={suggestions} />
      </div>
    </>
  );
}
