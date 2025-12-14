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

export default function Graph({ prices, selectedItem = '' }) {

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
      pointRadius: function(context) {
        const label = context.chart.data.labels[context.dataIndex];
        const year = parseInt(label.slice(0, 4));
        const month = parseInt(label.slice(4, 6)) - 1;
        const day = parseInt(label.slice(6, 8));
        const lastDay = new Date(year, month + 1, 0).getDate();
        return day === lastDay ? 4 : 0;  // bigger points for last day
      },
      pointStyle: function(context) {
        const label = context.chart.data.labels[context.dataIndex];
        const year = parseInt(label.slice(0, 4));
        const month = parseInt(label.slice(4, 6)) - 1;
        const day = parseInt(label.slice(6, 8));
        const lastDay = new Date(year, month + 1, 0).getDate();
        return day === lastDay ? 'cross' : 'circle'; // Use 'cross' for last day, 'circle' for others
      },
    };
  });

  const labels = [...new Set(flattened.map(d => d.Date))].sort();

  const data = { labels, datasets };

  const options = {
    responsive: true,
    plugins: {
      tooltip: { enabled: true }, // normal hover tooltip
      datalabels: {
        display: function(context) {
          const label = context.chart.data.labels[context.dataIndex];
          const year = parseInt(label.slice(0, 4));
          const month = parseInt(label.slice(4, 6)) - 1; // Months are 0-based
          const day = parseInt(label.slice(6, 8));
          const lastDay = new Date(year, month + 1, 0).getDate();
          return day === lastDay; // Only show for last day of month
        },
        anchor: 'end',
        align: 'top',
        offset: 10,
        backgroundColor: 'rgba(0,0,0,0.1)', // background color for the label
        color: '#08306b', // text color
        borderRadius: 4,
        padding: 4,
        font: { size: 12 },
        formatter: function(value, context) {
          const label = context.chart.data.labels[context.dataIndex];
          const month = label.slice(4, 6); // MM part of the date
          const day = label.slice(6, 8); // DD part of the date
          const price = value.toFixed(2); // Price value for that date
          return `${day}/${month} ${price}`; // Show MM/DD and price
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Close' } }
    }
  };

  return (
    <Line data={data} options={options} />
  );
}

