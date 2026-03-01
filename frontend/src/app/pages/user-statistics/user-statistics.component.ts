import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { Plugin } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { UserStatisticsResponse } from '../../models/analytics.model';
import { getColorComboName, getManaIconPath, getSortedColors } from '../group-detail/color-utils';
import {
  APP_CHART_THEME_COLORS,
  createAppChartOptions,
  withChartAlpha,
} from '../../core/charts/app-chart-theme';

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-statistics.component.html',
  styleUrl: './user-statistics.component.scss',
})
export class UserStatisticsComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('statsChart') chartsRef!: QueryList<ElementRef<HTMLCanvasElement>>;

  from = '';
  to = '';
  readonly maxDateInput = this.getTodayDateInputValue();

  loading = signal(true);
  error = signal<string | null>(null);
  filterError = signal<string | null>(null);
  stats = signal<UserStatisticsResponse | null>(null);

  private charts = new Map<string, Chart>();
  private manaIconCache = new Map<string, HTMLImageElement>();

  private usersApiService = inject(UsersApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  performance = computed(() => this.stats()?.performance || null);

  private readonly axisIconPlugin: Plugin = {
    id: 'user-stats-axis-icons',
    afterDraw: (chart) => {
      const pluginOptions = (
        chart.options.plugins as Record<string, unknown> | undefined
      )?.['userStatsAxisIcons'] as { enabled?: boolean; stackCombos?: boolean } | undefined;
      if (!pluginOptions?.enabled) return;
      const xScale = chart.scales?.['x'];
      if (!xScale) return;

      const labels = (chart.data.labels as string[] | undefined) || [];
      const ctx = chart.ctx;
      const iconSize = 14;
      const iconGap = 2;
      const baseY = xScale.bottom + 4;
      const stackCombos = Boolean(pluginOptions.stackCombos);

      labels.forEach((rawLabel, index) => {
        const colors = this.resolveManaColorsForLabel(rawLabel);
        const isCombo = stackCombos && colors.length > 1;
        const verticalStep = iconSize * 0.5;
        const totalWidth = isCombo
          ? iconSize
          : colors.length * iconSize + Math.max(0, colors.length - 1) * iconGap;
        const startX = xScale.getPixelForTick(index) - totalWidth / 2;
        colors.forEach((color, colorIndex) => {
          const icon = this.getManaIcon(color);
          if (!icon.complete) {
            icon.onload = () => chart.draw();
          }
          if (!icon.complete) return;
          const x = isCombo ? startX : startX + colorIndex * (iconSize + iconGap);
          const y = isCombo ? baseY + colorIndex * verticalStep : baseY;
          ctx.drawImage(icon, x, y, iconSize, iconSize);
        });
      });
    },
  };

  ngAfterViewInit(): void {
    this.setDefaultDateRange();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  applyFilters(): void {
    this.normalizeDateFilters();
    const filterError = this.validateDateFilters();
    if (filterError) {
      this.filterError.set(filterError);
      return;
    }
    this.filterError.set(null);
    this.load();
  }

  resetFilters(): void {
    this.setDefaultDateRange();
    this.filterError.set(null);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApiService.getUserStatistics(this.from || undefined, this.to || undefined).subscribe({
      next: (response) => {
        this.stats.set(response);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(), 0);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load statistics');
        this.loading.set(false);
      },
    });
  }

  private renderCharts(): void {
    const stats = this.stats();
    if (!stats) return;

    this.destroyCharts();
    const localizedRangeLabels = this.localizeRangeLabels(stats.range);

    this.renderChart('decks', 'line', localizedRangeLabels, [
      {
        label: 'Your decks',
        data: stats.decks.series.user,
        borderColor: APP_CHART_THEME_COLORS.primary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.2),
      },
      {
        label: 'Average all users',
        data: stats.decks.series.average,
        borderColor: APP_CHART_THEME_COLORS.secondary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.secondary, 0.2),
      },
    ]);

    this.renderChart('games', 'line', localizedRangeLabels, [
      {
        label: 'Your games',
        data: stats.games.series.user,
        borderColor: APP_CHART_THEME_COLORS.primary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.2),
      },
      {
        label: 'Average all users',
        data: stats.games.series.average,
        borderColor: APP_CHART_THEME_COLORS.secondary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.secondary, 0.2),
      },
    ]);

    this.renderChart(
      'colors',
      'bar',
      stats.colors.labels,
      [
        {
          label: 'Used in your decks (all time)',
          data: stats.colors.values,
          backgroundColor: [
            withChartAlpha(APP_CHART_THEME_COLORS.mana.W, 0.75),
            withChartAlpha(APP_CHART_THEME_COLORS.mana.U, 0.75),
            withChartAlpha(APP_CHART_THEME_COLORS.mana.B, 0.75),
            withChartAlpha(APP_CHART_THEME_COLORS.mana.R, 0.75),
            withChartAlpha(APP_CHART_THEME_COLORS.mana.G, 0.75),
            withChartAlpha(APP_CHART_THEME_COLORS.mana.C, 0.75),
          ],
        },
      ],
      {
        enableColorAxisIcons: true,
        tooltipTitleFormatter: (label) => getColorComboName(label, false),
      },
    );

    this.renderChart(
      'favoriteCombos',
      'bar',
      stats.favoriteColorCombinations.map((entry) => entry.label),
      [
        {
          label: 'Deck count (all time)',
          data: stats.favoriteColorCombinations.map((entry) => entry.count),
          backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.7),
        },
      ],
      {
        enableColorAxisIcons: true,
        stackColorCombosOnAxis: true,
        tooltipTitleFormatter: (label) => getColorComboName(label, false),
      },
    );
  }

  private renderChart(
    id: string,
    type: 'line' | 'bar',
    labels: string[],
    datasets: Array<{ label: string; data: number[]; borderColor?: string; backgroundColor?: string | string[] }>,
    options?: {
      enableColorAxisIcons?: boolean;
      stackColorCombosOnAxis?: boolean;
      tooltipTitleFormatter?: (label: string) => string;
    },
  ): void {
    const canvas = this.chartsRef?.find((entry) => entry.nativeElement.dataset['chart'] === id)?.nativeElement;
    if (!canvas) return;

    const decimals = this.resolveAxisDecimals(datasets);
    const numberFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const formatNumericValue = (value: number) =>
      numberFormatter.format(Number(value.toFixed(decimals)));

    const chartOptions = createAppChartOptions();
    const xTickBase = chartOptions.scales?.['x']?.ticks ?? {};
    const yTickBase = chartOptions.scales?.['y']?.ticks ?? {};
    const tooltipBase =
      (chartOptions.plugins as { tooltip?: Record<string, unknown> } | undefined)?.tooltip ?? {};

    const yTickCallback = (tickValue: string | number): string => {
      const numericValue = Number(tickValue);
      if (!Number.isFinite(numericValue)) return String(tickValue ?? '');
      return formatNumericValue(numericValue);
    };

    const tooltipLabel = (context: {
      dataset: { label?: string };
      parsed?: { y?: number };
      raw?: unknown;
    }): string => {
      const rawValue =
        typeof context.parsed?.y === 'number'
          ? context.parsed.y
          : typeof context.raw === 'number'
          ? context.raw
          : Number(context.raw);
      const valueLabel = Number.isFinite(rawValue) ? formatNumericValue(rawValue) : String(context.raw ?? '');
      return context.dataset?.label ? `${context.dataset.label}: ${valueLabel}` : valueLabel;
    };

    const useColorAxisIcons = Boolean(options?.enableColorAxisIcons);
    const maxIconsPerLabel = useColorAxisIcons
      ? Math.max(...labels.map((label) => this.resolveManaColorsForLabel(label).length), 1)
      : 1;
    const axisBottomPadding = useColorAxisIcons ? Math.max(22, maxIconsPerLabel * 14 + 8) : 0;

    const runtimeOptions: any = {
      ...chartOptions,
      layout: {
        ...(chartOptions.layout ?? {}),
        padding: {
          ...(typeof chartOptions.layout?.padding === 'object' ? chartOptions.layout.padding : {}),
          bottom: axisBottomPadding,
        },
      },
      plugins: {
        ...(chartOptions.plugins ?? {}),
        tooltip: {
          ...tooltipBase,
          callbacks: {
            label: tooltipLabel,
            ...(options?.tooltipTitleFormatter
              ? {
                  title: (items: Array<{ label?: string }>) =>
                    items.length ? options.tooltipTitleFormatter!(String(items[0].label ?? '')) : '',
                }
              : {}),
          },
        },
        userStatsAxisIcons: {
          enabled: useColorAxisIcons,
          stackCombos: Boolean(options?.stackColorCombosOnAxis),
        },
      },
      scales: {
        ...(chartOptions.scales ?? {}),
        x: {
          ...(chartOptions.scales?.['x'] ?? {}),
          ticks: {
            ...xTickBase,
            ...(useColorAxisIcons ? { callback: () => '' } : {}),
          },
        },
        y: {
          ...(chartOptions.scales?.['y'] ?? {}),
          beginAtZero: true,
          ticks: {
            ...yTickBase,
            callback: yTickCallback,
            ...(decimals === 0 ? { precision: 0 } : {}),
          },
        },
      },
    };

    const chart = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: datasets.map((set) => ({
          ...set,
          fill: type === 'line',
          tension: 0.25,
        })),
      },
      options: runtimeOptions,
      plugins: useColorAxisIcons ? [this.axisIconPlugin] : [],
    });

    this.charts.set(id, chart);
  }

  private resolveAxisDecimals(
    datasets: Array<{ data: number[] }>,
  ): 0 | 1 {
    for (const dataset of datasets) {
      for (const value of dataset.data) {
        if (Number.isFinite(value) && !Number.isInteger(value)) {
          return 1;
        }
      }
    }
    return 0;
  }

  private resolveManaColorsForLabel(label: string): string[] {
    const normalized = label.trim();
    if (!normalized) return ['C'];
    const sorted = getSortedColors(normalized);
    return sorted.length > 0 ? sorted : ['C'];
  }

  private getManaIcon(color: string): HTMLImageElement {
    const normalized = color.trim().toUpperCase();
    const cacheKey = normalized || 'C';
    let icon = this.manaIconCache.get(cacheKey);
    if (icon) return icon;

    icon = new Image();
    icon.src = getManaIconPath(cacheKey);
    this.manaIconCache.set(cacheKey, icon);
    return icon;
  }

  private localizeRangeLabels(range: UserStatisticsResponse['range']): string[] {
    if (range.bucket === 'hour') {
      const hourFormatter = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        hour12: false,
      });
      return range.labels.map((entry) => {
        const hour = Number.parseInt((entry || '0').split(':')[0] || '0', 10);
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
          return entry;
        }
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        return `${hourFormatter.format(date)} Uhr`;
      });
    }

    const parsedDays = range.labels
      .map((entry) => this.parseUtcDateLabel(entry))
      .filter((value): value is Date => value !== null);
    if (parsedDays.length !== range.labels.length) {
      return range.labels;
    }

    const years = new Set(parsedDays.map((date) => date.getUTCFullYear()));
    const currentYear = new Date().getFullYear();
    const onlyYear = years.size === 1 ? parsedDays[0].getUTCFullYear() : null;
    const showYear = years.size > 1 || (onlyYear !== null && onlyYear !== currentYear);
    const dayFormatter = new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: '2-digit',
      ...(showYear ? { year: 'numeric' as const } : {}),
    });
    return parsedDays.map((date) => dayFormatter.format(date));
  }

  private parseUtcDateLabel(value: string): Date | null {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private destroyCharts(): void {
    for (const chart of this.charts.values()) {
      chart.destroy();
    }
    this.charts.clear();
  }

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(this.navigationHistoryService.getBackTarget(this.router.url, fallback));
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 6);
    this.from = this.toDateInputValue(fromDate);
    this.to = this.toDateInputValue(today);
  }

  private normalizeDateFilters(): void {
    const normalizedFrom = this.from?.trim() || '';
    const normalizedTo = this.to?.trim() || '';

    if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
      this.from = normalizedTo;
      this.to = normalizedFrom;
      return;
    }

    this.from = normalizedFrom;
    this.to = normalizedTo;
  }

  private validateDateFilters(): string | null {
    if (this.from && this.from > this.maxDateInput) {
      return 'From date must not be in the future.';
    }
    if (this.to && this.to > this.maxDateInput) {
      return 'To date must not be in the future.';
    }
    return null;
  }

  private getTodayDateInputValue(): string {
    return this.toDateInputValue(new Date());
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
