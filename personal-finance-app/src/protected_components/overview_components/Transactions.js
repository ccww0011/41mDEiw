'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import {useTransactions} from "@/context/TransactionContext";
import {putTransactions} from '@/hooks/useTransactionDatabase';

const REQUIRED_HEADERS = [
  'TradeID',
  'ClientAccountID',
  'TradeDate',
  'AssetClass',
  'ListingExchange',
  'UnderlyingSymbol',
  'Description',
  'CurrencyPrimary',
  'Quantity',
  'NetCash',
];

// Minimal native CSV parser that handles quotes and commas
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
        const result = await putTransactions({rows: data}, setTransactions);
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
  });

  return (
    <>
      <div className="grid">
        <div className="grid-item grid1">
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
        <table border="1" cellPadding="8">
          <thead>
          <tr>
            <th>Trade Date</th>
            <th>Client Account</th>
            <th>Asset Class</th>
            <th>Symbol</th>
            <th>Description</th>
            <th>Currency</th>
            <th>Quantity</th>
            <th>Net Cash</th>
            <th>Trade ID</th>
          </tr>
          </thead>
          <tbody>
          {transactions.map((tx, idx) => (
            <tr key={idx}>
              <td>{tx.TradeDate}</td>

              <td>{tx.ClientAccountID}</td>
              <td>{tx.AssetClass}</td>
              <td>{tx.UnderlyingSymbol || '-'}</td>
              <td>{tx.Description}</td>
              <td>{tx.CurrencyPrimary}</td>
              <td>{tx.Quantity}</td>
              <td>{tx.NetCash}</td>
              <td>{tx.SK}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  );
}