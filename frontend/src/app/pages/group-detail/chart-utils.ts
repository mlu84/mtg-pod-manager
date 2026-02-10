import { ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';

export function createBaseChartOptions(): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e2e2ef',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#b6b6c9' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#b6b6c9' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };
}

export function buildBarChart(
  labels: string[],
  data: number[],
  label: string,
  options?: { datasetColors?: string[]; tickColors?: string[] },
): ChartConfiguration {
  const chartOptions = createBaseChartOptions();
  if (options?.tickColors && chartOptions.scales && chartOptions.scales['x']) {
    chartOptions.scales['x'].ticks = {
      ...chartOptions.scales['x'].ticks,
      color: (ctx: { index: number }) => options.tickColors?.[ctx.index] || '#b6b6c9',
    };
  }

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: options?.datasetColors || '#7f5af0',
        },
      ],
    },
    options: chartOptions,
  };
}

export function buildLineChart(
  labels: string[],
  datasets: ChartDataset<'line', number[]>[],
  overrides: ChartOptions = {},
): ChartConfiguration {
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...createBaseChartOptions(),
      elements: {
        line: { tension: 0.2 },
      },
      ...overrides,
    },
  };
}

export function buildLineAndBarChart(
  labels: string[],
  data: number[],
  avg: number,
): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg performance',
          data,
          backgroundColor: '#7f5af0',
        } as ChartDataset<'bar', number[]>,
        {
          type: 'line',
          label: 'Group average',
          data: labels.map(() => Number(avg.toFixed(1))),
          borderColor: '#00b5a8',
          backgroundColor: 'rgba(0,181,168,0.2)',
        } as ChartDataset<'line', number[]>,
      ],
    },
    options: createBaseChartOptions(),
  };
}
