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
  'NetCash',
  'TradeID',
];

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
          obj[h] = row[j];
        }
      });
      result.push(obj);
    }
  }
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

export default function Transactions() {
  const router = useRouter();
  const { setTransactions, transactions } = useTransactions();
  const [showUpload, setShowUpload] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [message, setMessage] = useState('');

  // Multi-sort state: array of {key, direction}
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
        const result = await putTransactions({ rows: data }, setTransactions);
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

  // Sorting
  const sortedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];

    // Filter first
    let filtered = [...transactions];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });

    // Then sort
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { key, direction } = sortRules[i];
      filtered.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        const bothAreNumbers = !isNaN(numA) && !isNaN(numB);
        if (bothAreNumbers) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        const strA = valA?.toString().toLowerCase() ?? '';
        const strB = valB?.toString().toLowerCase() ?? '';
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, sortRules, filters]);


  // Handler for clicking Asc, Desc, Remove buttons
  const onSortClick = (key, directionOrRemove) => {
    setSortRules(prev => {
      const filtered = prev.filter(r => r.key !== key);
      if (directionOrRemove === 'remove') {
        return filtered.length > 0 ? filtered : [];
      }
      return [{ key, direction: directionOrRemove }, ...filtered];
    });
  };

  // Render sort control buttons for each column
  const renderSortControls = (key) => {
    // Check current rule direction for this key if exists
    const rule = sortRules.find(r => r.key === key);
    return (
      <div style={{display: "flex", alignItems: "center"}}>
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
        >
          ▼
        </button>
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
        >
          ▲
        </button>
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
            color: rule?.direction === 'remove' ? '#fb6a4a' : '#f7fbff'
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="grid">
        <div className="grid-item grid3">
          <button onClick={() => setShowUpload(prev => !prev)}>
            {showUpload ? 'Hide Upload' : 'Upload CSV'}
          </button>
        </div>
        <div className="grid-item grid7"></div>
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
            style={{height: '100%', width: 'auto'}}
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
            {isDragActive ? (
              <p>Drop your CSV here…</p>
            ) : (
              <p>Drag and drop a CSV file here, or click to select one</p>
            )}
          </div>

          {status === 'Loading' && <p>Uploading…</p>}
          {status === 'Success' && <p style={{color: 'green'}}>{message}</p>}
          {status === 'Error' && <p style={{color: 'red'}}>{message}</p>}
          {status === 'Busy' && <p>{message}</p>}
        </div>
      )}

      <div>
        <h2>Transactions</h2>
        <p>
          Sorting priority: {sortRules.length === 0
          ? 'None'
          : sortRules
            .map((rule, i) => `(${i + 1}) ${rule.key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}`)
            .join('; ')}
        </p>

        <div className="grid">
          <div className="grid-item grid1">
            <button
              onClick={() => setSortRules([])}
              style={{backgroundColor: '#fb6a4a', color: 'white'}}
            >
              Clear Sort
            </button>
          </div>
          <div className="grid-item grid1">
            <button
              onClick={() => setFilters({})}
              style={{backgroundColor: '#969696', color: 'white'}}
            >
              Clear Filter
            </button>
          </div>
          <div className="grid-item grid8"></div>
        </div>

        <table border="1" cellPadding="8" style={{borderCollapse: 'collapse', width: '100%'}}>
          <thead>
          <tr>
            {REQUIRED_HEADERS.map((header) => (
              <th key={header} style={{verticalAlign: 'top'}}>
                {renderSortControls(header)} {header.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}
              </th>
            ))}
          </tr>

          <tr>
            {REQUIRED_HEADERS.map((header) => {
              const options = Array.from(
                new Set(transactions.map(tx => tx[header]).filter(Boolean))
              ).sort();

              return (
                <th key={header}>
                  <select
                    value={filters[header] || 'All'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        [header]: value === 'All' ? undefined : value,
                      }));
                    }}
                    style={{width: '100%'}}
                  >
                    <option value="All">All</option>
                    {options.map((opt) => (
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
              <td>{tx.TradeDate}</td>
              <td>{tx.ClientAccountID}</td>
              <td>{tx.AssetClass}</td>
              <td>{tx.UnderlyingSymbol || '-'}</td>
              <td>{tx.Description}</td>
              <td>{tx.ListingExchange}</td>
              <td>{tx.CurrencyPrimary}</td>
              <td style={{textAlign: 'right'}}>{Number(tx.Quantity).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td style={{textAlign: 'right'}}>{Number(tx.NetCash).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td>{tx.TradeID}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
