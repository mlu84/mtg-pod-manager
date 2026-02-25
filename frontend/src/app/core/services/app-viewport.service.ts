import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';

import {
  isAppCompactWidth,
  isSmartphoneWidth,
} from '../config/viewport-breakpoints';

@Injectable({ providedIn: 'root' })
export class AppViewportService implements OnDestroy {
  private document = inject(DOCUMENT);
  private started = false;
  private viewportTimers: ReturnType<typeof setTimeout>[] = [];
  private visualViewportRef: VisualViewport | null = null;

  private _viewportWidth = signal(0);
  private _viewportHeight = signal(0);
  readonly viewportWidth = this._viewportWidth.asReadonly();
  readonly viewportHeight = this._viewportHeight.asReadonly();

  constructor() {
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    this.syncViewportState();
    this.scheduleViewportResync();

    window.addEventListener('resize', this.onViewportEvent);
    window.addEventListener('orientationchange', this.onViewportEvent);
    window.addEventListener('pageshow', this.onViewportEvent);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (window.visualViewport) {
      this.visualViewportRef = window.visualViewport;
      this.visualViewportRef.addEventListener('resize', this.onViewportEvent);
      this.visualViewportRef.addEventListener('scroll', this.onViewportEvent);
    }
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') return;
    this.started = false;
    this.clearViewportResyncTimers();

    window.removeEventListener('resize', this.onViewportEvent);
    window.removeEventListener('orientationchange', this.onViewportEvent);
    window.removeEventListener('pageshow', this.onViewportEvent);
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.visualViewportRef) {
      this.visualViewportRef.removeEventListener('resize', this.onViewportEvent);
      this.visualViewportRef.removeEventListener('scroll', this.onViewportEvent);
      this.visualViewportRef = null;
    }
  }

  private onVisibilityChange = (): void => {
    if (this.document.visibilityState !== 'visible') return;
    this.syncViewportState();
    this.scheduleViewportResync();
  };

  private onViewportEvent = (): void => {
    this.syncViewportState();
    this.scheduleViewportResync();
  };

  private clearViewportResyncTimers(): void {
    for (const timer of this.viewportTimers) {
      clearTimeout(timer);
    }
    this.viewportTimers = [];
  }

  private scheduleViewportResync(): void {
    if (typeof window === 'undefined') return;
    this.clearViewportResyncTimers();
    window.requestAnimationFrame(() => this.syncViewportState());
    for (const delay of [110, 260]) {
      const timer = setTimeout(() => this.syncViewportState(), delay);
      this.viewportTimers.push(timer);
    }
  }

  private syncViewportState(): void {
    if (typeof window === 'undefined') return;
    const width = Math.round(window.visualViewport?.width ?? window.innerWidth);
    const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
    if (width <= 0 || height <= 0) return;

    this._viewportWidth.set(width);
    this._viewportHeight.set(height);
    this.applyRootViewportState(width, height);
  }

  private applyRootViewportState(width: number, height: number): void {
    const root = this.document.documentElement;
    const isPortrait = height > width;
    const isSmartphone = isSmartphoneWidth(width);
    const isTablet = !isSmartphone && isAppCompactWidth(width);
    const isDesktop = !isAppCompactWidth(width);

    root.style.setProperty('--app-viewport-width', `${width}px`);
    root.style.setProperty('--app-viewport-height', `${height}px`);

    root.classList.toggle('app-orientation-portrait', isPortrait);
    root.classList.toggle('app-orientation-landscape', !isPortrait);
    root.classList.toggle('app-viewport-smartphone', isSmartphone);
    root.classList.toggle('app-viewport-tablet', isTablet);
    root.classList.toggle('app-viewport-desktop', isDesktop);
  }
}
