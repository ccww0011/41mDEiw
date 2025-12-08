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

export default function Graph({ prices, selectedItem = ''}) {

  // Flatten the prices for the selected ticker(s)
  const flattened = useMemo(() => {
    const arr = [];
    const targets = selectedItem ? [selectedItem] : Object.keys(prices);

    targets.forEach(ticker => {
      const data = prices[ticker] || {};
      for (const dateStr in data) {
        arr.push({
          Ticker: ticker,
          Date: dateStr,
          Close: data[dateStr]
        });
      }
    });

    return arr.sort((a, b) => a.Date.localeCompare(b.Date));
  }, [prices, selectedItem]);

  if (flattened.length === 0)
    return <h3>No data for selected ticker.</h3>;

  // Prepare datasets
  const tickers = [...new Set(flattened.map(d => d.Ticker))];
  const colorPalette = ['#08519c', '#fb6a4a', '#31a354', '#fdae6b', '#6a3d9a'];

  const datasets = tickers.map((ticker, idx) => {
    const d = flattened.filter(x => x.Ticker === ticker);
    return {
      label: ticker,
      data: d.map(x => x.Close),
      borderColor: colorPalette[idx % colorPalette.length],
      backgroundColor: colorPalette[idx % colorPalette.length],
      tension: 0.2,
      pointRadius: 0
    };
  });

  const labels = [...new Set(flattened.map(d => d.Date))].sort();

  const data = { labels, datasets };

  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Close' } }
    }
  };

  return (
    <div style={{ width: '100%', height: 500 }}>
      <Line data={data} options={options} />
    </div>
  );
}
