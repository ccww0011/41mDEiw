import React, {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useDividends} from "@/context/DividendContext";
import {putDividends} from "@/utils_protected/dividendApi";

const REQUIRED_HEADERS = [
  'ReportDate',
  'ExDate',
  'PayDate',
  'ClientAccountID',
  'AssetClass',
  'UnderlyingSymbol',
  'Description',
  'ListingExchange',
  'CurrencyPrimary',
  'NetAmount',
  'ActionID',
];

const DATE_FIELDS = ['reportDate', 'exDate', 'payDate'];
const NUMERIC_FIELDS = ['netAmount'];
const DATE_REGEX = /^\d{8}$/;

function isValidYYYYMMDD(value) {
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
}

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

function validateRows(rows) {
  const errors = [];
  rows.forEach((row, idx) => {
    DATE_FIELDS.forEach((field) => {
      const value = row[field];
      if (!value || !isValidYYYYMMDD(value)) {
        errors.push(`Row ${idx + 1}: invalid ${field} (expected YYYYMMDD)`);
      }
    });
    NUMERIC_FIELDS.forEach((field) => {
      const value = row[field];
      if (value !== undefined && value !== null && value !== "" && isNaN(Number(value))) {
        errors.push(`Row ${idx + 1}: ${field} must be numeric`);
      }
    });
    if (row.underlyingSymbol && !/^[A-Z]+$/.test(row.underlyingSymbol)) {
      errors.push(`Row ${idx + 1}: underlyingSymbol must be uppercase letters only`);
    }
    if (!row.actionID) errors.push(`Row ${idx + 1}: missing actionID`);
  });
  return errors;
}

function normalizeRows(rows) {
  return rows.map(row => {
    if (!row || typeof row !== "object") return row;
    const underlyingSymbol = row.underlyingSymbol ? row.underlyingSymbol.toUpperCase() : row.underlyingSymbol;
    return { ...row, underlyingSymbol };
  });
}


export default function DividendsUpload() {

  const router = useRouter();
  const {setDividends} = useDividends();

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
        const {headers, data} = parseCSV(text);

        const hasAllHeaders = REQUIRED_HEADERS.every(h => headers.includes(h));
        if (!hasAllHeaders) {
          setStatus('Error');
          setMessage('CSV is missing required headers.');
          return;
        }

        const normalizedData = normalizeRows(data);
        const validationErrors = validateRows(normalizedData);
        if (validationErrors.length > 0) {
          setStatus('Error');
          setMessage(validationErrors.slice(0, 5).join('; '));
          return;
        }

        const transformedData = Object.values(
          normalizedData
            .map(row => {
              let netAmount = Number(row.netAmount || 0);
              if (Math.abs(netAmount) < 1e-10) netAmount = 0;
              return { ...row, netAmount };
            })
            .filter(row => row.netAmount > 0 && row.reportDate < row.payDate) // your condition
            .reduce((acc, row) => {
              const actionID = row.actionID;
              if (!acc[actionID]) {
                acc[actionID] = { ...row, netAmount: 0 };
              }
              acc[actionID].netAmount += row.netAmount;
              return acc;
            }, {})
        ).map(({ reportDate, ...rest }) => ({
          ...rest,
          netAmount: rest.netAmount.toString(), // string, no rounding
        }));

        const result = await putDividends({ items: JSON.stringify(transformedData) }, setDividends);
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
  }, [router, setDividends]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
  });

  return (
    <>
      <h2>Upload CSV</h2>
      <p>Required headers: {REQUIRED_HEADERS.join(', ')}</p>
      <h4>Sample:</h4>
      <Image
        alt="Upload Dividend Sample"
        src="/UploadDividendSample.jpg"
        width={400}
        height={100}
        style={{height: '100%', width: 'auto'}}
      />
      <p>Note: ClientAccountID and ActionID should be unique.</p>

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
      {status === 'Success' && <p style={{color: 'green'}}>{message}</p>}
      {status === 'Error' && <p style={{color: 'red'}}>{message}</p>}
    </>
  )
}
