import React, {useMemo, useState} from "react";
import {useTransactions} from "@/context/TransactionContext";
import TransactionsUpload from "@/components_protected/data_components/transactions_subcomponents/TransactionsUpload";
import TransactionsAI from "@/components_protected/data_components/transactions_subcomponents/TransactionsAI";

const RENDERED_HEADERS = [
  'tradeDate',
  'clientAccountID',
  'assetClass',
  'underlyingSymbol',
  'description',
  'listingExchange',
  'currencyPrimary',
  'quantity',
  'netCash',
  'tradeID',
];

const COLUMN_NAMES = {
  tradeDate: "Trade Date",
  clientAccountID: "Client ID",
  assetClass: "Asset Class",
  underlyingSymbol: "Ticker",
  description: "Description",
  listingExchange: "Exchange",
  currencyPrimary: "Trading Currency",
  quantity: "Quantity",
  netCash: "Net Cash",
  tradeID: "Trade ID",
};

const HIDE_ON_MOBILE_COLUMNS = [
  'clientAccountID',
  'underlyingSymbol',
  'listingExchange',
  'tradeID'
];

const NUMERIC_KEYS = ['quantity', 'netCash'];
const DATE_KEYS = ['tradeDate'];
const DATE_REGEX = /^\d{8}$/;
const ASSET_CLASS_OPTIONS = ['STK', 'CASH'];
const EXCHANGE_OPTIONS = ['SBF', 'AEB', 'IBIS', 'LSE', 'TSX', 'ASX', 'SWX', 'MI', 'SGX', 'NSE', 'SSE', 'SZSE', 'HKEX', 'NYSE', 'NASDAQ', 'EBS'];

const isValidYYYYMMDD = (value) => {
  if (!DATE_REGEX.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};


export default function Transactions() {
  const {transactions, putTransactions, deleteTransactions, loadingTransactions} = useTransactions();

  const [showTab, setShowTab] = useState("AI");
  const tabs = ["AI", "Upload"];

  // Multi-sort & filters
  const [filters, setFilters] = useState({});
  const [sortRules, setSortRules] = useState([{ key: 'tradeID', direction: 'desc' }]);
  const [editingTradeID, setEditingTradeID] = useState(null);
  const [draft, setDraft] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState({});

  const sortedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];

    // Filter non-numeric fields only
    let filtered = [...transactions];
    Object.entries(filters).forEach(([key, value]) => {
      if (!NUMERIC_KEYS.includes(key) && value && value !== 'All') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });

    // Apply sorting
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      filtered.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothNumbers = !isNaN(numA) && !isNaN(numB);

        if (bothNumbers) return direction === 'asc' ? numA - numB : numB - numA;

        const strA = valA?.toString().toLowerCase() ?? '';
        const strB = valB?.toString().toLowerCase() ?? '';
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, filters, sortRules]);

  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') return filtered;
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  const renderSortControls = (key) => {
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => onSortClick(key, 'desc')}
          title="Sort Descending"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: rule?.direction === 'desc' ? '#fb6a4a' : '#f7fbff'
          }}
        >▼</button>
        <button
          onClick={() => onSortClick(key, 'asc')}
          title="Sort Ascending"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: rule?.direction === 'asc' ? '#fb6a4a' : '#f7fbff'
          }}
        >▲</button>
        <button
          onClick={() => onSortClick(key, 'remove')}
          title="Remove Sort"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08519c',
            color: '#f7fbff'
          }}
        >✕</button>
      </div>
    );
  };

  const formatNumber = (num) =>
    num === null || num === undefined
      ? "—"
      : Number(num).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

  const getStyle = (num) => ({
    textAlign: "right",
    color: num < 0 ? "red" : "black"
  });

  const actionLinkStyle = {
    color: "#08519c",
    textDecoration: "underline",
    cursor: "pointer",
    marginRight: 8
  };

  const stripTicker = (row) => {
    if (!row || typeof row !== "object") return row;
    const { ticker, ...rest } = row;
    return rest;
  };

  const validateRow = (row) => {
    const errors = [];
    DATE_KEYS.forEach((field) => {
      const value = row[field];
      if (!value || !isValidYYYYMMDD(value)) {
        errors.push(`Invalid ${field} (YYYYMMDD)`);
      }
    });
    NUMERIC_KEYS.forEach((field) => {
      const value = row[field];
      if (value !== undefined && value !== null && value !== "" && isNaN(Number(value))) {
        errors.push(`${field} must be numeric`);
      }
    });
    if (row.underlyingSymbol && !/^[A-Z]+$/.test(row.underlyingSymbol)) {
      errors.push("underlyingSymbol must be uppercase letters only");
    }
    if (!row.tradeID) errors.push("tradeID is required");
    return errors;
  };


  return (
    <>
      <div>
        <h2>Transactions</h2>

        <div className="grid">
          {tabs.map((tab) => (
            <div key={tab} className="grid-item grid2">
              <button
                type="button"
                onClick={() => {
                  if (tab === showTab)
                    setShowTab("");
                  else
                    setShowTab(tab);
                }}
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

        {showTab === "AI" && <TransactionsAI/>}
        {showTab === 'Upload' && <TransactionsUpload/>}

        <div className="grid">
          <div className="grid-item grid12" style={{padding: "10px 0 0 0"}}></div>
        </div>

        <div className="grid">
          <div className="grid-item grid8">Sorting
            priority: {sortRules.length === 0 ? 'None' : sortRules.map((rule, i) => `(${i + 1}) ${COLUMN_NAMES[rule.key]}`).join('; ')}</div>
          <div className="grid-item grid2">
            <button onClick={() => setSortRules([])} style={{backgroundColor: '#fb6a4a', color: 'white'}}>Clear Sort</button>
          </div>
          <div className="grid-item grid2">
            <button onClick={() => setFilters({})} style={{backgroundColor: '#969696', color: 'white'}}>Clear Filter</button>
          </div>
        </div>

        <table border="1" cellPadding="8" style={{borderCollapse: 'collapse', width: '100%'}}>
          <thead>
          <tr>
            {RENDERED_HEADERS.map(header => (
              <th
                key={header}
                className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? 'hide-on-mobile' : ''}
                style={{verticalAlign: 'top'}}
              >
                {renderSortControls(header)}{' '}
                {COLUMN_NAMES[header]}
              </th>
            ))}
            <th style={{verticalAlign: 'bottom'}}>Actions</th>
          </tr>

          {/* Filter row */}
          <tr>
            {RENDERED_HEADERS.map(header => {
              if (NUMERIC_KEYS.includes(header)) return <th key={header}></th>; // no filter for numeric fields

              // Get unique options for this column
              const options = Array.from(
                new Set(transactions.map(tx => tx[header]).filter(Boolean))
              ).sort();

              return (
                <th key={header} className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? 'hide-on-mobile' : ''}>
                  <select
                    value={filters[header] || 'All'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        [header]: value === 'All' ? undefined : value
                      }));
                    }}
                    style={{width: '100%'}}
                  >
                    <option value="All">All</option>
                    {options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </th>
              );
            })}
            <th style={{verticalAlign: 'bottom'}}>
              <span
                style={{ ...actionLinkStyle, color: "#f7fbff" }}
                onClick={() => {
                  if (loadingTransactions) return;
                  setAddingNew(true);
                  setNewDraft({});
                }}
              >
                Add
              </span>
            </th>
          </tr>
          </thead>

          <tbody>
          {addingNew && (
            <tr>
              {RENDERED_HEADERS.map(header => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? 'hide-on-mobile' : ''}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(newDraft[header]) : {}}
                >
                  {header === "assetClass" ? (
                    <select
                      value={newDraft[header] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewDraft(prev => ({ ...prev, [header]: value }));
                      }}
                      style={{ width: "100%" }}
                    >
                      <option value=""></option>
                      {ASSET_CLASS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : header === "listingExchange" ? (
                    <select
                      value={newDraft[header] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewDraft(prev => ({ ...prev, [header]: value }));
                      }}
                      style={{ width: "100%" }}
                    >
                      <option value=""></option>
                      {EXCHANGE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={NUMERIC_KEYS.includes(header) ? "number" : "text"}
                      value={newDraft[header] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const value = header === "underlyingSymbol" ? raw.toUpperCase() : raw;
                        setNewDraft(prev => ({ ...prev, [header]: value }));
                      }}
                      style={{ width: "100%" }}
                    />
                  )}
                </td>
              ))}
              <td>
                <span
                  style={actionLinkStyle}
                  onClick={async () => {
                    if (loadingTransactions) return;
                    const errors = validateRow(newDraft);
                    if (errors.length) {
                      window.alert(errors.join("; "));
                      return;
                    }
                    const result = await putTransactions({ items: JSON.stringify([stripTicker(newDraft)]) });
                    if (result?.status === 'Success') {
                      setAddingNew(false);
                      setNewDraft({});
                    }
                  }}
                >
                  Save
                </span>
                <span
                  style={actionLinkStyle}
                  onClick={() => {
                    if (loadingTransactions) return;
                    setAddingNew(false);
                    setNewDraft({});
                  }}
                >
                  Cancel
                </span>
              </td>
            </tr>
          )}
          {sortedTransactions.map((tx, idx) => (
            <tr key={idx}>
              {RENDERED_HEADERS.map(header => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? 'hide-on-mobile' : ''}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(tx[header]) : {}}
                >
                  {editingTradeID === tx.tradeID ? (
                    header === "assetClass" ? (
                      <select
                        value={draft[header] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDraft(prev => ({ ...prev, [header]: value }));
                        }}
                        style={{ width: "100%" }}
                      >
                        <option value=""></option>
                        {ASSET_CLASS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : header === "listingExchange" ? (
                      <select
                        value={draft[header] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDraft(prev => ({ ...prev, [header]: value }));
                        }}
                        style={{ width: "100%" }}
                      >
                        <option value=""></option>
                        {EXCHANGE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={NUMERIC_KEYS.includes(header) ? "number" : "text"}
                        value={draft[header] ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const value = header === "underlyingSymbol" ? raw.toUpperCase() : raw;
                          setDraft(prev => ({ ...prev, [header]: value }));
                        }}
                        style={{ width: "100%" }}
                      />
                    )
                  ) : (
                    NUMERIC_KEYS.includes(header) ? formatNumber(tx[header]) : tx[header] || '-'
                  )}
                </td>
              ))}
              <td>
                {editingTradeID === tx.tradeID ? (
                  <>
                    <span
                      style={actionLinkStyle}
                      onClick={async () => {
                        if (loadingTransactions) return;
                        const errors = validateRow(draft);
                        if (errors.length) {
                          window.alert(errors.join("; "));
                          return;
                        }
                        const result = await putTransactions({ items: JSON.stringify([stripTicker(draft)]) });
                        if (result?.status === 'Success') {
                          setEditingTradeID(null);
                          setDraft({});
                        }
                      }}
                    >
                      Save
                    </span>
                    <span
                      style={actionLinkStyle}
                      onClick={() => {
                        if (loadingTransactions) return;
                        setEditingTradeID(null);
                        setDraft({});
                      }}
                    >
                      Cancel
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={actionLinkStyle}
                      onClick={() => {
                        if (loadingTransactions) return;
                        setEditingTradeID(tx.tradeID);
                        setDraft({ ...tx });
                      }}
                    >
                      Edit
                    </span>
                    <span
                      style={{ ...actionLinkStyle, color: "#fb6a4a" }}
                      onClick={async () => {
                        if (loadingTransactions) return;
                        if (!window.confirm("Delete this transaction?")) return;
                        await deleteTransactions({ items: JSON.stringify([tx.tradeID]) });
                      }}
                    >
                      Delete
                    </span>
                  </>
                )}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
