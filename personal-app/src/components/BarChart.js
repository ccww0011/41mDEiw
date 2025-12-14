'use client';
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

export default function BarChart({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d[labelKey]),
    datasets: [
      {
        data: data.map(d => d[valueKey]),
        backgroundColor: [
          "#6a3d9a", "#cab2d6", "#ff7f00", "#fdbf6f",
          "#e31a1c", "#fb9a99", "#33a02c", "#b2df8a",
          "#1f78b4", "#a6cee3"
        ]
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            return `${(value * 100).toFixed(2)}%`;
          }
        }
      },
      datalabels: {
        color: '#000',
        anchor: 'end',
        align: 'end',
        font: { size: 12 },
        formatter: value => `${(value * 100).toFixed(2)}%`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(...data.map(d => d[valueKey])) * 1.15, // add 15% space on top
        ticks: {
          callback: val => `${(val * 100).toFixed(0)}%`
        }
      }
    }
  };

  return <Bar data={chartData} options={options} />;
}
