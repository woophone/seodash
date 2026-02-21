import { useEffect, useRef } from 'react';
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

export default function TrendChart({ data, title = 'Traffic Trend' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d')!;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            type: 'bar',
            label: 'Clicks',
            data: data.map(d => d.clicks),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Impressions',
            data: data.map(d => d.impressions),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            pointRadius: data.length > 60 ? 0 : 2,
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
            text: title,
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
              unit: data.length > 180 ? 'month' : data.length > 30 ? 'week' : 'day',
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
  }, [data, title]);

  if (data.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No traffic data available</div>;
  }

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
