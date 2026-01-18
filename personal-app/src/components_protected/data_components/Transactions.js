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


export default function Transactions() {
  const {transactions} = useTransactions();

  const [showTab, setShowTab] = useState("AI");
  const tabs = ["AI", "Upload"];

  // Multi-sort & filters
  const [filters, setFilters] = useState({});
  const [sortRules, setSortRules] = useState([{ key: 'tradeID', direction: 'desc' }]);

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
          </tr>
          </thead>

          <tbody>
          {sortedTransactions.map((tx, idx) => (
            <tr key={idx}>
              {RENDERED_HEADERS.map(header => (
                <td
                  key={header}
                  className={HIDE_ON_MOBILE_COLUMNS.includes(header) ? 'hide-on-mobile' : ''}
                  style={NUMERIC_KEYS.includes(header) ? getStyle(tx[header]) : {}}
                >
                  {NUMERIC_KEYS.includes(header) ? formatNumber(tx[header]) : tx[header] || '-'}
                </td>
              ))}
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  );
}