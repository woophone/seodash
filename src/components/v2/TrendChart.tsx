import { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

interface DataPoint {
  date: string;
  clicks: number;
  impressions: number;
}

interface Props {
  data: DataPoint[];
  title?: string;
}

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
];

function filterByRange(data: DataPoint[], days: number): DataPoint[] {
  if (days === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return data.filter(d => d.date >= cutoffStr);
}

function rangeLabel(filtered: DataPoint[]): string {
  if (filtered.length === 0) return '';
  const first = filtered[0].date;
  const last = filtered[filtered.length - 1].date;
  const days = Math.round((new Date(last).getTime() - new Date(first).getTime()) / 86400000);
  if (days <= 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  if (months <= 12) return `${months} month${months > 1 ? 's' : ''}`;
  return `${Math.round(days / 365 * 10) / 10} years`;
}

export default function TrendChart({ data, title = 'Clicks & Impressions' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  // Default to 3 months
  const [activeDays, setActiveDays] = useState(90);

  const filtered = useMemo(() => filterByRange(data, activeDays), [data, activeDays]);
  const dynamicTitle = `${title} (${rangeLabel(filtered)})`;

  useEffect(() => {
    if (!canvasRef.current || filtered.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d')!;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filtered.map(d => d.date),
        datasets: [
          {
            type: 'bar',
            label: 'Clicks',
            data: filtered.map(d => d.clicks),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Impressions',
            data: filtered.map(d => d.impressions),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            pointRadius: filtered.length > 180 ? 1 : filtered.length > 60 ? 1.5 : 2,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: dynamicTitle,
            font: { size: 14, weight: 'bold' },
            color: '#1f2937',
          },
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#6b7280', font: { size: 11 }, usePointStyle: true },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: filtered.length > 180 ? 'month' : filtered.length > 30 ? 'week' : 'day',
              tooltipFormat: 'MMM d, yyyy',
            },
            grid: { display: false },
            ticks: { color: '#6b7280', font: { size: 11 } },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Clicks',
              color: '#3b82f6',
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#3b82f6', font: { size: 11 } },
            beginAtZero: true,
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Impressions',
              color: '#8b5cf6',
            },
            grid: { drawOnChartArea: false },
            ticks: { color: '#8b5cf6', font: { size: 11 } },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [filtered, dynamicTitle]);

  if (data.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No traffic data available</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {RANGES.map(r => (
          <button
            key={r.label}
            onClick={() => setActiveDays(r.days)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeDays === r.days
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ height: '300px', position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
