'use client';
import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function PieChart({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d[valueKey], 0);

  const chartData = {
    labels: data.map(d => d[labelKey]),
    datasets: [
      {
        data: data.map(d => d[valueKey]),
        backgroundColor: [
          "#6a3d9a", "#cab2d6", "#ff7f00", "#fdbf6f",
          "#e31a1c", "#fb9a99", "#33a02c", "#b2df8a",
          "#1f78b4", "#a6cee3"
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            const percent = ((value / total) * 100).toFixed(2);
            return `${tooltipItem.label}: ${percent}%`;
          }
        }
      },
      datalabels: {
        color: '#000',
        formatter: (value) => ((value / total) * 100).toFixed(2) + '%',
        anchor: 'center',
        align: 'center',
        font: { size: 12 }
      }
    }
  };

  return <div style={{ height: "90%" }}><Pie data={chartData} options={options} /></div>;
}
