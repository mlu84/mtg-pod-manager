import { describe, expect, it } from 'vitest';
import {
  buildBarChart,
  buildLineAndBarChart,
  buildLineChart,
  createBaseChartOptions,
} from './chart-utils';

describe('chart-utils', () => {
  it('creates default chart options', () => {
    const options = createBaseChartOptions();
    expect(options.responsive).toBe(true);
    expect(options.scales?.['x']).toBeDefined();
    expect(options.scales?.['y']).toBeDefined();
  });

  it('builds bar chart with optional custom colors', () => {
    const config = buildBarChart(['A'], [1], 'Test', {
      datasetColors: ['#fff'],
      tickColors: ['#111'],
    });
    expect(config.type).toBe('bar');
    expect(config.data.datasets[0].label).toBe('Test');
  });

  it('builds line chart', () => {
    const config = buildLineChart(['A', 'B'], [
      {
        label: 'Series',
        data: [1, 2],
        borderColor: '#000',
      },
    ]);
    expect(config.type).toBe('line');
    expect(config.data.datasets).toHaveLength(1);
  });

  it('builds line and bar chart combination', () => {
    const config = buildLineAndBarChart(['A', 'B'], [10, 20], 15);
    expect(config.type).toBe('bar');
    expect(config.data.datasets).toHaveLength(2);
  });
});
