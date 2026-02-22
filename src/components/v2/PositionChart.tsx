import { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

interface DataPoint {
  date: string;
  position: number;
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

export default function PositionChart({ data, title = 'Position Over Time' }: Props) {
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

    // Color based on position value
    const pointColors = filtered.map(d => {
      if (d.position <= 5) return '#22c55e';   // green
      if (d.position <= 10) return '#f59e0b';  // amber
      return '#ef4444';                         // red
    });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filtered.map(d => d.date),
        datasets: [{
          label: 'Position',
          data: filtered.map(d => d.position),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: filtered.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
          borderWidth: 2,
        }],
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
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Position: ${ctx.parsed.y.toFixed(1)}`,
            },
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
            reverse: true, // Position 1 at top
            min: 0,
            title: {
              display: true,
              text: 'Position',
              color: '#6b7280',
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#6b7280', font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [filtered, dynamicTitle]);

  if (data.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No position data available</div>;
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
