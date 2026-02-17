import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavigationHistoryService {
  private currentUrlSignal = signal<string | null>(null);
  private previousUrlSignal = signal<string | null>(null);

  recordNavigation(url: string): void {
    const normalized = this.normalizeUrl(url);
    const current = this.currentUrlSignal();

    if (!normalized || current === normalized) {
      return;
    }

    if (current) {
      this.previousUrlSignal.set(current);
    }

    this.currentUrlSignal.set(normalized);
  }

  getPreviousUrl(): string | null {
    return this.previousUrlSignal();
  }

  private normalizeUrl(url: string): string {
    const normalized = url.trim();
    return normalized || '/';
  }
}
