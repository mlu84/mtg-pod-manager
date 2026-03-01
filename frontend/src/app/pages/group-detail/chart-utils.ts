import { ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';
import {
  APP_CHART_THEME_COLORS,
  createAppChartOptions,
  withChartAlpha,
} from '../../core/charts/app-chart-theme';

export function createBaseChartOptions(): ChartOptions {
  return createAppChartOptions();
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
      color: (ctx: { index: number }) =>
        options.tickColors?.[ctx.index] || APP_CHART_THEME_COLORS.axisText,
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
          backgroundColor: options?.datasetColors || APP_CHART_THEME_COLORS.primary,
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
          backgroundColor: APP_CHART_THEME_COLORS.primary,
        } as ChartDataset<'bar', number[]>,
        {
          type: 'line',
          label: 'Group average',
          data: labels.map(() => Number(avg.toFixed(1))),
          borderColor: APP_CHART_THEME_COLORS.secondary,
          backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.secondary, 0.2),
        } as ChartDataset<'line', number[]>,
      ],
    },
    options: createBaseChartOptions(),
  };
}
