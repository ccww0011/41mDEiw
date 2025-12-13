'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { useTransactions } from "@/context/TransactionContext";
import { putTransactions } from '@/hooks/useTransactionDatabase';

const REQUIRED_HEADERS = [
  'TradeDate',
  'ClientAccountID',
  'AssetClass',
  'UnderlyingSymbol',
  'Description',
  'ListingExchange',
  'CurrencyPrimary',
  'Quantity',
  'Proceeds',
  'Commission',
  'TradeID',
];

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

const HIDE_ON_MOBILE_COLUMNS = [
  'clientAccountID',
  'underlyingSymbol',
  'listingExchange',
  'tradeID'
];

const NUMERIC_KEYS = ['quantity', 'netCash'];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseLine(lines[0]);

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length === headers.length) {
      const obj = {};
      headers.forEach((h, j) => {
        if (REQUIRED_HEADERS.includes(h)) {
          obj[h.substring(0, 1).toLowerCase() + h.substring(1, h.length)] = row[j];
        }
      });
      result.push(obj);
    }
  }
  console.log(result)
  return { headers, data: result };
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(cell => cell.trim());
}

export default function Transaction() {
  const router = useRouter();
  const { transactions, setTransactions } = useTransactions();
  const [showUpload, setShowUpload] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [message, setMessage] = useState('');

  // Multi-sort & filters
  const [filters, setFilters] = useState({});
  const [sortRules, setSortRules] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !file.name.endsWith('.csv')) {
      setMessage('Please upload a valid .csv file.');
      return;
    }

    setStatus('Loading');
    setMessage('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const { headers, data } = parseCSV(text);

        const hasAllHeaders = REQUIRED_HEADERS.every(h => headers.includes(h));
        if (!hasAllHeaders) {
          setStatus('Error');
          setMessage('CSV is missing required headers.');
          return;
        }

        const transformedData = data.map(row => {
          const proceeds_ = parseFloat(row['proceeds']) || 0;
          const commission_ = parseFloat(row['commission']) || 0;
          const { proceeds, commission, ...rest } = row;
          return {
            ...rest,
            netCash: (proceeds_ + commission_).toString()
          };
        });

        const result = await putTransactions({ rows: transformedData }, setTransactions);
        if (result.status === 'Unauthorised') {
          router.push('/logout');
          return;
        }

        setStatus(result.status);
        setMessage(result.message);
      } catch {
        setStatus('Error');
        setMessage('Failed to parse file.');
      }
    };

    reader.readAsText(file);
  }, [router, setTransactions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
  });

  const sortedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];

    // Filter non-numeric fields only
    let filtered = [...transactions];
    Object.entries(filters).forEach(([key, value]) => {
      if (!numericKeys.includes(key) && value && value !== 'All') {
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
      <div className="grid">
        <div className="grid-item grid12" style={{padding: "5px 0"}}></div>
        <div className="grid-item grid2">
          <button onClick={() => setShowUpload(prev => !prev)}>
            {showUpload ? 'Hide Upload' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={{marginTop: '1rem'}}>
        <h1>Upload CSV</h1>
          <p>Required headers: {REQUIRED_HEADERS.join(', ')}</p>
          <h4>Sample:</h4>
          <Image
            alt="Upload Sample"
            src="/UploadSample.jpg"
            width={400}
            height={100}
            style={{ height: '100%', width: 'auto' }}
          />
          <p>Note: ClientAccountID and TradeID should be unique.</p>

          <div
            {...getRootProps()}
            style={{
              border: '1px dashed black',
              padding: '2rem',
              margin: '1rem 0',
              cursor: 'pointer',
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? <p>Drop your CSV here…</p> : <p>Drag and drop a CSV file here, or click to select one</p>}
          </div>

          {status === 'Loading' && <p>Uploading…</p>}
          {status === 'Success' && <p style={{ color: 'green' }}>{message}</p>}
          {status === 'Error' && <p style={{ color: 'red' }}>{message}</p>}
        </div>
      )}

      <div>
        <h2>Transactions</h2>

        <div className="grid">
          <div className="grid-item grid8">Sorting priority: {sortRules.length === 0 ? 'None' : sortRules.map((rule, i) => `(${i + 1}) ${rule.key}`).join('; ')}</div>
          <div className="grid-item grid2">
            <button onClick={() => setSortRules([])} style={{ backgroundColor: '#fb6a4a', color: 'white' }}>Clear Sort</button>
          </div>
          <div className="grid-item grid2">
            <button onClick={() => setFilters({})} style={{ backgroundColor: '#969696', color: 'white' }}>Clear Filter</button>
          </div>
        </div>

        <table border="1" cellPadding="8" style={{borderCollapse: 'collapse', width: '100%'}}>
          <thead>
          <tr>
            {RENDERED_HEADERS.map(header => (
              <th
                key={header}
                className={hideOnMobileColumns.includes(header) ? 'hide-on-mobile' : ''}
                style={{ verticalAlign: 'top' }}
              >
                {renderSortControls(header)}{' '}
                {header
                  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                  .replace(/^(.)/, (match) => match.toUpperCase())}
              </th>
            ))}
          </tr>

          {/* Filter row */}
          <tr>
            {RENDERED_HEADERS.map(header => {
              if (numericKeys.includes(header)) return <th key={header}></th>; // no filter for numeric fields

              // Get unique options for this column
              const options = Array.from(
                new Set(transactions.map(tx => tx[header]).filter(Boolean))
              ).sort();

              return (
                <th key={header} className={hideOnMobileColumns.includes(header) ? 'hide-on-mobile' : ''}>
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
