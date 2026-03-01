import { ChartOptions } from 'chart.js';

export const APP_CHART_THEME_COLORS = {
  legendText: '#e2e2ef',
  axisText: '#b6b6c9',
  grid: 'rgba(255,255,255,0.05)',
  primary: '#7f5af0',
  secondary: '#00b5a8',
  accent: '#ff6b35',
  sky: '#38bdf8',
  amber: '#f59e0b',
  green: '#22c55e',
  violet: '#a855f7',
  teal: '#4bc0c0',
  yellow: '#facc15',
  orange: '#f97316',
  blue: '#60a5fa',
  red: '#ef4444',
  neutral: '#94a3b8',
  mana: {
    W: '#f9faf4',
    U: '#0e68ab',
    B: '#150b00',
    R: '#d3202a',
    G: '#00733e',
    C: '#ccc2c0',
  },
} as const;

export function withChartAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hexColor;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createAppChartOptions(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: APP_CHART_THEME_COLORS.legendText,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: APP_CHART_THEME_COLORS.axisText },
        grid: { color: APP_CHART_THEME_COLORS.grid },
      },
      y: {
        ticks: { color: APP_CHART_THEME_COLORS.axisText },
        grid: { color: APP_CHART_THEME_COLORS.grid },
      },
    },
  };
}
