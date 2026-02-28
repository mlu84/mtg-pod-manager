import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminApiService } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { FeedbackEntry } from '../../models/feedback.model';

@Component({
  selector: 'app-feedback-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-management.component.html',
  styleUrl: './feedback-management.component.scss',
})
export class FeedbackManagementComponent {
  entries = signal<FeedbackEntry[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  unreadCount = signal(0);

  query = '';
  from = '';
  to = '';
  status = signal<'all' | 'unread' | 'read'>('all');

  page = signal(1);
  total = signal(0);
  readonly pageSize = 20;

  selection = signal<Set<string>>(new Set());
  actionLoading = signal(false);
  showDeleteConfirmModal = signal(false);

  private adminApiService = inject(AdminApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  selectedCount = computed(() => this.selection().size);
  selectedEntries = computed(() => {
    const selectedIds = this.selection();
    return this.entries().filter((entry) => selectedIds.has(entry.id));
  });
  allOnPageSelected = computed(() => {
    const ids = this.entries().map((entry) => entry.id);
    if (ids.length === 0) return false;
    const selected = this.selection();
    return ids.every((id) => selected.has(id));
  });

  ngOnInit(): void {
    this.load();
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminApiService
      .getFeedbackEntries({
        query: this.query,
        from: this.from,
        to: this.to,
        status: this.status(),
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.entries.set(result.items);
          this.total.set(result.total);
          this.page.set(result.page);
          this.unreadCount.set(result.unreadCount);
          this.selection.set(new Set());
          this.showDeleteConfirmModal.set(false);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to load feedback');
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.load(1);
  }

  setStatus(value: 'all' | 'unread' | 'read'): void {
    this.status.set(value);
    this.load(1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.load(page);
  }

  toggleSelection(id: string): void {
    const next = new Set(this.selection());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selection.set(next);
  }

  toggleSelectionPage(): void {
    const next = new Set(this.selection());
    const ids = this.entries().map((entry) => entry.id);
    if (this.allOnPageSelected()) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    this.selection.set(next);
  }

  markSelectedRead(): void {
    const ids = [...this.selection()];
    if (ids.length === 0 || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.adminApiService.markFeedbackAsRead(ids).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.load(this.page());
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err.error?.message || 'Failed to mark feedback as read');
      },
    });
  }

  deleteSelected(): void {
    if (this.selectedCount() === 0 || this.actionLoading()) return;
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirmModal(): void {
    if (this.actionLoading()) return;
    this.showDeleteConfirmModal.set(false);
  }

  confirmDeleteSelected(): void {
    const ids = [...this.selection()];
    if (ids.length === 0 || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.adminApiService.deleteFeedback(ids).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showDeleteConfirmModal.set(false);
        this.load(this.page());
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err.error?.message || 'Failed to delete feedback');
      },
    });
  }

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(this.navigationHistoryService.getBackTarget(this.router.url, fallback));
  }
}
