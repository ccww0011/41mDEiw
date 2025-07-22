'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { postCsvRows } from '@/hooks/useDatabase';

const REQUIRED_HEADERS = [
  'ClientAccount',
  'TradeDate',
  'AssetClass',
  'ListingExchange',
  'Symbol',
  'Description',
  'CurrencyPrimary',
  'Quantity',
  'NetCash',
];

// Minimal native CSV parser that handles quotes and commas
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const result = [];
  const headers = parseLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length === headers.length) {
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = row[j];
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

export default function UploadPage() {
  const [status, setStatus] = useState('idle');
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

        const result = await postCsvRows({ rows: data });
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
    <div>
      <h1>Upload CSV</h1>
      <p>Required headers: {REQUIRED_HEADERS.join(', ')}</p>

      <div {...getRootProps()} style={{border: '1px dashed black', padding: '2rem', margin: '1rem 0'}}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop your CSV here…</p>
        ) : (
          <p>Drag and drop a CSV file here, or click to select one</p>
        )}
      </div>

      {status === 'Loading' && <p>Uploading…</p>}
      {status === 'Success' && <p>{message}</p>}
      {status === 'Busy' && <p>{message}</p>}
      {status === 'Error' && <p>{message}</p>}
    </div>
  );
}
