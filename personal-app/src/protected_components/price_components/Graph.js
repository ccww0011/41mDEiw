'use client';

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// Helper: filter by range
function filterByRange(dates, range) {
  if (!range) return dates; // no filtering

  const today = new Date();
  const formatDate = (str) => new Date(`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`);

  if (range === 'Last7Days') {
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);
    return dates.filter(d => formatDate(d.Date) >= past7);
  }
  if (range === 'MTD') {
    return dates.filter(d => formatDate(d.Date).getMonth() === today.getMonth() && formatDate(d.Date).getFullYear() === today.getFullYear());
  }
  if (range === 'YTD') {
    return dates.filter(d => formatDate(d.Date).getFullYear() === today.getFullYear());
  }
  return dates;
}

export default function Graph({ prices, selectedTicker = '', range = '', loadingPrices }) {

  if (!prices || !selectedTicker || !range || Object.keys(prices).length === 0) return <div>No data. Select ticker and dates, then press Load Prices button.</div>;
  if (loadingPrices) return <div>Loading prices...</div>

  // Flatten selected ticker (or all if empty)
  const flattened = useMemo(() => {
    const arr = [];
    const tickers = selectedTicker ? [selectedTicker] : Object.keys(prices);

    tickers.forEach(ticker => {
      const data = prices[ticker];
      for (const dateStr in data) {
        arr.push({ Ticker: ticker, Date: dateStr, Close: data[dateStr] });
      }
    });

    // Sort by date string ascending
    return arr.sort((a, b) => a.Date.localeCompare(b.Date));
  }, [prices, selectedTicker]);

  // Apply range filter
  const filtered = useMemo(() => filterByRange(flattened, range), [flattened, range]);

  if (filtered.length === 0) return <div>No data for selected ticker/range, please press Load Prices button</div>;

  // Prepare chart datasets (one line per ticker)
  const tickersToPlot = Array.from(new Set(filtered.map(d => d.Ticker)));
  const datasets = tickersToPlot.map((ticker, idx) => {
    const colorPalette = ['#08519c', '#fb6a4a', '#31a354', '#fdae6b', '#6a3d9a'];
    const tickerData = filtered.filter(d => d.Ticker === ticker);
    return {
      label: ticker,
      data: tickerData.map(d => d.Close),
      borderColor: colorPalette[idx % colorPalette.length],
      backgroundColor: colorPalette[idx % colorPalette.length],
      tension: 0.2,
      pointRadius: 0
    };
  });

  const labels = Array.from(new Set(filtered.map(d => d.Date))).sort();

  const data = { labels, datasets };

  const options = {
    responsive: true,
    scales: {
      x: {
        title: { display: true, text: 'Date' }
      },
      y: {
        title: { display: true, text: 'Close' }
      }
    }
  };

  return (
    <div style={{ width: '100%', height: 500 }}>
      <Line data={data} options={options} />
    </div>
  );
}



