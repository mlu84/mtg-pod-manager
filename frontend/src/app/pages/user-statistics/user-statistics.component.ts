import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';

import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { UserStatisticsResponse } from '../../models/analytics.model';
import { getColorComboName } from '../group-detail/color-utils';

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

  private usersApiService = inject(UsersApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  performance = computed(() => this.stats()?.performance || null);

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

    this.renderChart('decks', 'line', stats.range.labels, [
      {
        label: 'Your decks',
        data: stats.decks.series.user,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
      },
      {
        label: 'Average all users',
        data: stats.decks.series.average,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
      },
    ]);

    this.renderChart('games', 'line', stats.range.labels, [
      {
        label: 'Your games',
        data: stats.games.series.user,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
      },
      {
        label: 'Average all users',
        data: stats.games.series.average,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
      },
    ]);

    this.renderChart('colors', 'bar', stats.colors.labels.map((label) => getColorComboName(label, false)), [
      {
        label: 'Used in your decks',
        data: stats.colors.values,
        backgroundColor: [
          'rgba(245, 245, 220, 0.75)',
          'rgba(59, 130, 246, 0.75)',
          'rgba(107, 114, 128, 0.75)',
          'rgba(239, 68, 68, 0.75)',
          'rgba(34, 197, 94, 0.75)',
          'rgba(161, 161, 170, 0.75)',
        ],
      },
    ]);

    this.renderChart(
      'favoriteCombos',
      'bar',
      stats.favoriteColorCombinations.map((entry) => entry.label),
      [
        {
          label: 'Deck count',
          data: stats.favoriteColorCombinations.map((entry) => entry.count),
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
        },
      ],
    );
  }

  private renderChart(
    id: string,
    type: 'line' | 'bar',
    labels: string[],
    datasets: Array<{ label: string; data: number[]; borderColor?: string; backgroundColor?: string | string[] }>,
  ): void {
    const canvas = this.chartsRef?.find((entry) => entry.nativeElement.dataset['chart'] === id)?.nativeElement;
    if (!canvas) return;

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
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#cbd5e1' },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
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
