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
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function LineChart({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d[labelKey]),
    datasets: [
      {
        label: 'Cumulative P/L',
        data: data.map(d => d[valueKey]),
        borderColor: '#6a3d9a',
        backgroundColor: 'rgba(106, 61, 154, 0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 0,        // hides the circles
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
            return `${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }
      },
      datalabels: {
        display: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(...data.map(d => d[valueKey])) * 1.1,
        ticks: {
          callback: val => `${val.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`
        }
      },
      x: {
        title: { display: false }
      }
    }
  };

  return <Line data={chartData} options={options} />;
}
