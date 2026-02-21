import { useEffect, useRef } from 'react';
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

export default function PositionChart({ data, title = 'Position Over Time' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d')!;

    // Color based on position value
    const pointColors = data.map(d => {
      if (d.position <= 5) return '#22c55e';   // green
      if (d.position <= 10) return '#f59e0b';  // amber
      return '#ef4444';                         // red
    });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Position',
          data: data.map(d => d.position),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: data.length > 60 ? 0 : 3,
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
            text: title,
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
              unit: data.length > 180 ? 'month' : data.length > 30 ? 'week' : 'day',
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
  }, [data, title]);

  if (data.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No position data available</div>;
  }

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
