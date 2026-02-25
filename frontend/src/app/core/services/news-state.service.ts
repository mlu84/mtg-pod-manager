import { Injectable, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { UsersApiService } from './users-api.service';

@Injectable({ providedIn: 'root' })
export class NewsStateService {
  private authService = inject(AuthService);
  private usersApiService = inject(UsersApiService);

  private _hasUnreadNews = signal(false);
  readonly hasUnreadNews = this._hasUnreadNews.asReadonly();

  private isRefreshing = false;
  private isMarkingRead = false;

  constructor() {
    effect(() => {
      if (!this.authService.isAuthenticated()) {
        this._hasUnreadNews.set(false);
        return;
      }
      this.refresh();
    });
  }

  refresh(): void {
    if (!this.authService.isAuthenticated()) return;
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    this.usersApiService.getNewsStatus().subscribe({
      next: (status) => {
        this._hasUnreadNews.set(Boolean(status.hasUnreadNews));
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
      },
    });
  }

  markAsReadOnVisit(): void {
    if (!this.authService.isAuthenticated()) return;
    if (this.isMarkingRead) return;

    this.isMarkingRead = true;
    this.usersApiService.markNewsAsRead().subscribe({
      next: (status) => {
        this._hasUnreadNews.set(Boolean(status.hasUnreadNews));
        this.isMarkingRead = false;
        this.refresh();
      },
      error: () => {
        this.isMarkingRead = false;
      },
    });
  }
}
