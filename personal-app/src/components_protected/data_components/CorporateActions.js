'use client';

import React, { useMemo, useState } from "react";
import { usePrices } from "@/context/PriceContext";
import { useUserSettings } from "@/context/UserSettingsContext";

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
const ALLOWED_ADD_TYPES = ["STOCK_SPLIT", "REVERSE_SPLIT", "SPIN_OFF"];

const ACTION_LINK_STYLE = {
  color: "#08519c",
  textDecoration: "underline",
  cursor: "pointer",
  marginRight: 8,
};

function CorporateActionsTable({
  title,
  rows,
  actionLabel,
  onAction,
  showAdd,
  onAdd,
  addingRow,
  onAddChange,
  onAddSave,
  onAddCancel,
  editableKeys = [],
  editingKey,
  editDraft,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}) {
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
            <th style={{ verticalAlign: "bottom" }}>Actions</th>
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
            <th style={{ verticalAlign: "bottom" }}>
              {showAdd && (
                <span
                  style={{ ...ACTION_LINK_STYLE, color: "#f7fbff" }}
                  onClick={onAdd}
                >
                  Add
                </span>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {addingRow && (
            <tr>
              {RENDERED_HEADERS.map((header) => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? "hide-on-mobile" : ""}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(addingRow[header]) : {}}
                >
                  {header === "type" ? (
                    <select
                      value={addingRow[header] ?? ""}
                      onChange={(e) => onAddChange(header, e.target.value)}
                      style={{ width: "100%" }}
                    >
                      {ALLOWED_ADD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={NUMERIC_KEYS.includes(header) ? "number" : "text"}
                      value={addingRow[header] ?? ""}
                      onChange={(e) => onAddChange(header, e.target.value)}
                      style={{ width: "100%" }}
                    />
                  )}
                </td>
              ))}
              <td>
                <span style={ACTION_LINK_STYLE} onClick={onAddSave}>Save</span>
                <span style={ACTION_LINK_STYLE} onClick={onAddCancel}>Cancel</span>
              </td>
            </tr>
          )}
          {sortedRows.map((row, idx) => (
            <tr key={idx}>
              {RENDERED_HEADERS.map((header) => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? "hide-on-mobile" : ""}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(row[header]) : {}}
                >
                  {editingKey === row.actionKey && editableKeys.includes(header) ? (
                    <input
                      type={NUMERIC_KEYS.includes(header) ? "number" : "text"}
                      value={editDraft?.[header] ?? ""}
                      onChange={(e) => onEditChange?.(header, e.target.value)}
                      style={{ width: "100%" }}
                    />
                  ) : NUMERIC_KEYS.includes(header) ? (
                    formatNumber(row[header])
                  ) : (
                    row[header] || "-"
                  )}
                </td>
              ))}
              <td>
                {editableKeys.length > 0 && (
                  editingKey === row.actionKey ? (
                    <>
                      <span style={ACTION_LINK_STYLE} onClick={() => onEditSave?.(row)}>Save</span>
                      <span style={ACTION_LINK_STYLE} onClick={onEditCancel}>Cancel</span>
                    </>
                  ) : (
                    <span style={ACTION_LINK_STYLE} onClick={() => onEditStart?.(row)}>Edit</span>
                  )
                )}
                {editingKey === row.actionKey ? null : (
                  <span
                    style={{ ...ACTION_LINK_STYLE, color: actionLabel === "Unapply" ? "#fb6a4a" : "#08519c" }}
                    onClick={() => onAction(row)}
                  >
                    {actionLabel}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={RENDERED_HEADERS.length + 1}>No rows</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default function CorporateActions() {
  const { corporateActions, loadingCorporateActions } = usePrices();
  const { userCorporateActionsMask, setUserCorporateActionsMask } = useUserSettings();
  const [addingRow, setAddingRow] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const appliedMask = userCorporateActionsMask?.applied ?? {};
  const excludedMask = userCorporateActionsMask?.excluded ?? [];
  const addedMask = userCorporateActionsMask?.added ?? {};

  const rows = useMemo(() => {
    const output = [];
    if (!corporateActions || typeof corporateActions !== "object") return output;

    Object.entries(corporateActions).forEach(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return;
      Object.entries(actions).forEach(([actionDate, details]) => {
        const type = details?.type ?? "UNKNOWN";
        const actionKey = `${ticker}#${type}#${actionDate}`;
        output.push({
          ticker,
          actionDate,
          type,
          summary: details?.summary ?? "",
          child_ticker: details?.child_ticker ?? "",
          ratio: details?.ratio ?? details?.factor ?? "",
          actionKey,
        });
      });
    });

    return output;
  }, [corporateActions]);

  const appliedRows = useMemo(() => {
    const appliedSet = new Set(Object.keys(appliedMask));
    const excludedSet = new Set(excludedMask);
    const added = addedMask;
    const addedKeySet = new Set(
      Object.entries(added).flatMap(([ticker, actions]) => {
        if (!actions || typeof actions !== "object") return [];
        return Object.entries(actions).map(([actionDate, details]) => {
          const type = details?.type ?? "UNKNOWN";
          return `${ticker}#${type}#${actionDate}`;
        });
      })
    );

    const baseApplied = rows
      .filter((row) => {
        const ratioNum = Number(row.ratio);
        const hasPositiveRatio = !isNaN(ratioNum) && ratioNum > 0;
        if (excludedSet.has(row.actionKey)) return false;
        if (addedKeySet.has(row.actionKey)) return false;
        if (appliedSet.has(row.actionKey)) return true;
        return hasPositiveRatio;
      })
      .map((row) => {
        const overrides = appliedMask[row.actionKey] ?? {};
        return {
          ...row,
          summary: overrides.summary ?? row.summary ?? "",
          child_ticker: overrides.child_ticker ?? row.child_ticker ?? "",
          ratio: overrides.ratio ?? row.ratio ?? "",
        };
      });

    const addedRows = Object.entries(added).flatMap(([ticker, actions]) => {
      if (!actions || typeof actions !== "object") return [];
      return Object.entries(actions).map(([actionDate, details]) => {
        const type = details?.type ?? "UNKNOWN";
        const actionKey = `${ticker}#${type}#${actionDate}`;
        return {
          ticker,
          actionDate,
          type,
          summary: details?.summary ?? "",
          child_ticker: details?.child_ticker ?? "",
          ratio: details?.ratio ?? details?.factor ?? "",
          actionKey,
        };
      });
    });

    return [...baseApplied, ...addedRows];
  }, [rows, appliedMask, excludedMask, addedMask]);

  const suggestionRows = useMemo(() => {
    const appliedSet = new Set(Object.keys(appliedMask));
    const excludedSet = new Set(excludedMask);
    return rows.filter((row) => {
      const ratioNum = Number(row.ratio);
      const isZeroRatio = !isNaN(ratioNum) && ratioNum === 0;
      if (appliedSet.has(row.actionKey)) return false;
      if (excludedSet.has(row.actionKey)) return true;
      return isZeroRatio;
    });
  }, [rows, appliedMask, excludedMask]);

  const handleApply = async (row) => {
    const key = row.actionKey;
    const prevExcluded = excludedMask;
    if (prevExcluded.includes(key)) {
      await setUserCorporateActionsMask({
        excluded: prevExcluded.filter((k) => k !== key),
      });
      return;
    }
    const nextApplied = { ...appliedMask };
    if (!nextApplied[key]) {
      nextApplied[key] = {
        summary: row.summary ?? "",
        child_ticker: row.child_ticker ?? "",
        ratio: row.ratio ?? "",
      };
    }
    await setUserCorporateActionsMask({
      applied: nextApplied,
    });
  };

  const handleUnapply = async (row) => {
    const key = row.actionKey;
    const nextApplied = { ...appliedMask };
    delete nextApplied[key];
    const prevExcluded = excludedMask;
    const wasApplied = Object.prototype.hasOwnProperty.call(appliedMask ?? {}, key);
    const nextAdded = { ...addedMask };
    const isAdded = !!(nextAdded?.[row.ticker]?.[row.actionDate]);
    if (isAdded) {
      nextAdded[row.ticker] = { ...(nextAdded[row.ticker] ?? {}) };
      delete nextAdded[row.ticker][row.actionDate];
      if (Object.keys(nextAdded[row.ticker]).length === 0) delete nextAdded[row.ticker];
    }
    const nextExcluded = wasApplied
      ? prevExcluded
      : isAdded
        ? prevExcluded
        : Array.from(new Set([...(prevExcluded ?? []), key]));
    await setUserCorporateActionsMask({
      applied: nextApplied,
      excluded: nextExcluded,
      added: nextAdded,
    });
  };

  const handleAddStart = () => {
    setAddingRow({
      ticker: "",
      actionDate: "",
      type: ALLOWED_ADD_TYPES[0],
      summary: "",
      child_ticker: "",
      ratio: "",
    });
  };

  const handleAddChange = (key, value) => {
    setAddingRow((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddSave = async () => {
    if (!addingRow?.ticker || !addingRow?.actionDate) return;
    const ticker = addingRow.ticker;
    const actionDate = addingRow.actionDate;
    const type = addingRow.type || "UNKNOWN";
    const nextAdded = { ...addedMask };
    const existingAdded = nextAdded?.[ticker]?.[actionDate];
    const existingAddedType = existingAdded?.type ?? "UNKNOWN";
    const hasAddedDuplicate = !!existingAdded && existingAddedType === type;
    const existingDb = corporateActions?.[ticker]?.[actionDate];
    const existingDbType = existingDb?.type ?? "UNKNOWN";
    const hasDbDuplicate = !!existingDb && existingDbType === type;
    if (hasAddedDuplicate) {
      window?.alert?.("Corporate action already exists in added list for this key.");
      return;
    }
    if (!nextAdded[ticker]) nextAdded[ticker] = {};
    nextAdded[ticker][actionDate] = {
      type,
      summary: addingRow.summary,
      child_ticker: addingRow.child_ticker,
      ratio: addingRow.ratio,
    };
    const actionKey = `${ticker}#${type}#${actionDate}`;
    const nextApplied = { ...appliedMask };
    if (!nextApplied[actionKey]) {
      nextApplied[actionKey] = {
        summary: addingRow.summary ?? "",
        child_ticker: addingRow.child_ticker ?? "",
        ratio: addingRow.ratio ?? "",
      };
    }
    const nextExcludedBase = (excludedMask ?? []).filter((k) => k !== actionKey);
    const nextExcluded = hasDbDuplicate
      ? Array.from(new Set([...nextExcludedBase, actionKey]))
      : nextExcludedBase;
    await setUserCorporateActionsMask({
      applied: nextApplied,
      excluded: nextExcluded,
      added: nextAdded,
    });
    setAddingRow(null);
  };

  const handleAddCancel = () => setAddingRow(null);

  const handleEditStart = (row) => {
    setEditingKey(row.actionKey);
    setEditDraft({
      summary: row.summary ?? "",
      child_ticker: row.child_ticker ?? "",
      ratio: row.ratio ?? "",
    });
  };

  const handleEditChange = (key, value) => {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditCancel = () => {
    setEditingKey(null);
    setEditDraft(null);
  };

  const handleEditSave = async (row) => {
    if (!editingKey) return;
    const nextApplied = { ...appliedMask };
    delete nextApplied[editingKey];
    const nextAdded = { ...addedMask };
    const ticker = row?.ticker ?? editingKey.split("#")[0] ?? "";
    const actionDate = row?.actionDate ?? editingKey.split("#")[2] ?? "";
    const type = row?.type ?? editingKey.split("#")[1] ?? "";
    const existingDb = corporateActions?.[ticker]?.[actionDate];
    if (ticker && actionDate) {
      if (!nextAdded[ticker]) nextAdded[ticker] = {};
      nextAdded[ticker][actionDate] = {
        type,
        summary: editDraft?.summary ?? "",
        child_ticker: editDraft?.child_ticker ?? "",
        ratio: editDraft?.ratio ?? "",
      };
    }
    const wasApplied = Object.prototype.hasOwnProperty.call(appliedMask ?? {}, editingKey);
    const nextExcluded = wasApplied
      ? (excludedMask ?? [])
      : Array.from(new Set([...(excludedMask ?? []), editingKey]));
    await setUserCorporateActionsMask({
      applied: nextApplied,
      excluded: nextExcluded,
      added: nextAdded,
    });
    setEditingKey(null);
    setEditDraft(null);
  };

  return (
    <>
      <div>
        <h2>Corporate Actions</h2>
        {loadingCorporateActions ? (
          <h3>Loading corporate actions...</h3>
        ) : (
          <>
            <CorporateActionsTable
              title="Applied"
              rows={appliedRows}
              actionLabel="Unapply"
              onAction={handleUnapply}
              showAdd
              onAdd={handleAddStart}
              addingRow={addingRow}
              onAddChange={handleAddChange}
              onAddSave={handleAddSave}
              onAddCancel={handleAddCancel}
              editableKeys={["summary", "child_ticker", "ratio"]}
              editingKey={editingKey}
              editDraft={editDraft}
              onEditStart={handleEditStart}
              onEditChange={handleEditChange}
              onEditSave={handleEditSave}
              onEditCancel={handleEditCancel}
            />
            <div className="grid">
              <div className="grid-item grid12" style={{ padding: "10px 0 0 0" }}></div>
            </div>
            <CorporateActionsTable
              title="Suggestions"
              rows={suggestionRows}
              actionLabel="Apply"
              onAction={handleApply}
              showAdd={false}
            />
          </>
        )}
      </div>
    </>
  );
}
