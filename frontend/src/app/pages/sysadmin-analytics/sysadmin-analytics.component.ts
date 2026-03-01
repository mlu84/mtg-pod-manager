import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';

import { AdminApiService } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { AdminAnalyticsResponse } from '../../models/analytics.model';
import {
  APP_CHART_THEME_COLORS,
  createAppChartOptions,
  withChartAlpha,
} from '../../core/charts/app-chart-theme';

@Component({
  selector: 'app-sysadmin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sysadmin-analytics.component.html',
  styleUrl: './sysadmin-analytics.component.scss',
})
export class SysadminAnalyticsComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('chartCanvas') chartCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  from = '';
  to = '';
  readonly maxDateInput = this.getTodayDateInputValue();

  loading = signal(true);
  error = signal<string | null>(null);
  filterError = signal<string | null>(null);
  data = signal<AdminAnalyticsResponse | null>(null);

  private charts = new Map<string, Chart>();

  private adminApiService = inject(AdminApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  cards = computed(() => this.data()?.cards || null);

  ngAfterViewInit(): void {
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

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminApiService.getAnalytics(this.from || undefined, this.to || undefined).subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(), 0);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load analytics');
        this.loading.set(false);
      },
    });
  }

  private renderCharts(): void {
    const data = this.data();
    if (!data) return;

    this.destroyCharts();

    this.renderChart('usersHistory', 'line', data.range.labels, [
      {
        label: 'New users',
        data: data.series.usersHistory,
        borderColor: APP_CHART_THEME_COLORS.primary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.2),
      },
    ]);

    this.renderChart('groupsCreated', 'bar', data.range.labels, [
      {
        label: 'Groups created',
        data: data.series.groupsCreated,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);

    this.renderChart('decksCreated', 'bar', data.range.labels, [
      {
        label: 'Decks created',
        data: data.series.decksCreated,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);

    this.renderChart('recordedGames', 'bar', data.range.labels, [
      {
        label: 'Recorded games',
        data: data.series.recordedGames,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);

    this.renderChart('concurrentUsers', 'line', data.range.labels, [
      {
        label: 'Concurrent active users',
        data: data.series.concurrentActiveUsers,
        borderColor: APP_CHART_THEME_COLORS.primary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.2),
      },
    ]);

    this.renderChart('invites', 'line', data.range.labels, [
      {
        label: 'Invites total',
        data: data.series.invites.total,
        borderColor: APP_CHART_THEME_COLORS.primary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.2),
      },
      {
        label: 'Invites email',
        data: data.series.invites.email,
        borderColor: APP_CHART_THEME_COLORS.secondary,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.secondary, 0.2),
      },
      {
        label: 'Invites internal',
        data: data.series.invites.internal,
        borderColor: APP_CHART_THEME_COLORS.accent,
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.accent, 0.2),
      },
    ]);

    this.renderChart('popularColorCombos', 'bar', data.rankings.popularColorCombinations.map((entry) => entry.label), [
      {
        label: 'Deck count',
        data: data.rankings.popularColorCombinations.map((entry) => entry.count),
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);

    this.renderChart('playedColorCombos', 'bar', data.rankings.mostPlayedColorCombinations.map((entry) => entry.label), [
      {
        label: 'Played count',
        data: data.rankings.mostPlayedColorCombinations.map((entry) => entry.count),
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);

    this.renderChart('playedDeckTypes', 'bar', data.rankings.mostPlayedDeckTypes.map((entry) => entry.label), [
      {
        label: 'Played count',
        data: data.rankings.mostPlayedDeckTypes.map((entry) => entry.count),
        backgroundColor: withChartAlpha(APP_CHART_THEME_COLORS.primary, 0.65),
      },
    ]);
  }

  private renderChart(
    id: string,
    type: 'line' | 'bar',
    labels: string[],
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
    }>,
  ): void {
    const canvas = this.chartCanvases?.find((entry) => entry.nativeElement.dataset['chart'] === id)?.nativeElement;
    if (!canvas) return;

    const chartOptions = createAppChartOptions();
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
      options: {
        ...chartOptions,
        scales: {
          ...(chartOptions.scales ?? {}),
          y: {
            ...(chartOptions.scales?.['y'] ?? {}),
            beginAtZero: true,
          },
        },
      },
    });

    this.charts.set(id, chart);
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
