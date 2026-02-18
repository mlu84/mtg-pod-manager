import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavigationHistoryService {
  private currentUrlSignal = signal<string | null>(null);
  private previousUrlSignal = signal<string | null>(null);
  private pendingSecondBackUrlSignal = signal<string | null>(null);

  recordNavigation(url: string): void {
    const normalized = this.normalizeUrl(url);
    const pendingSecondBackUrl = this.pendingSecondBackUrlSignal();
    if (pendingSecondBackUrl && normalized !== pendingSecondBackUrl) {
      this.pendingSecondBackUrlSignal.set(null);
    }

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

  getBackTarget(currentUrl: string, fallbackUrl: string): string {
    const normalizedCurrent = this.normalizeUrl(currentUrl);
    const normalizedFallback = this.normalizeUrl(fallbackUrl);
    const pendingSecondBackUrl = this.pendingSecondBackUrlSignal();

    if (pendingSecondBackUrl && pendingSecondBackUrl === normalizedCurrent) {
      this.pendingSecondBackUrlSignal.set(null);
      return normalizedFallback;
    }

    const target = this.previousUrlSignal() ?? normalizedFallback;
    this.pendingSecondBackUrlSignal.set(target);
    return target;
  }

  private normalizeUrl(url: string): string {
    const normalized = url.trim();
    return normalized || '/';
  }
}
