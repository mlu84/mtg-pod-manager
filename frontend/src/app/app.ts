import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { NavigationHistoryService } from './core/services/navigation-history.service';
import { ProfileComponent } from './pages/profile/profile.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ProfileComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private document = inject(DOCUMENT);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private metaService = inject(Meta);
  private titleService = inject(Title);
  private navigationHistoryService = inject(NavigationHistoryService);
  private defaultTitle = 'MTG Pod-Manager';
  private defaultMetaDescription =
    'MTG Pod-Manager helps Magic: The Gathering playgroups organize players, decks, and game results in one place.';

  isAuthenticated = this.authService.isAuthenticated;
  showProfileModal = signal(false);
  hideGlobalHeader = signal(false);

  constructor() {
    this.navigationHistoryService.recordNavigation(this.router.url);
    this.updateLayoutForUrl(this.router.url);
    this.updateSeoTags(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.navigationHistoryService.recordNavigation(event.urlAfterRedirects);
        this.updateLayoutForUrl(event.urlAfterRedirects);
        this.updateSeoTags(event.urlAfterRedirects);
        this.showProfileModal.set(false);
      });
  }

  private updateLayoutForUrl(url: string): void {
    const tree = this.router.parseUrl(url);
    const primarySegments = tree.root.children['primary']?.segments.map((segment) => segment.path) || [];
    const isGroupPlayRoute =
      primarySegments.length === 3 &&
      primarySegments[0] === 'groups' &&
      primarySegments[2] === 'play';

    this.hideGlobalHeader.set(isGroupPlayRoute);
  }

  private updateSeoTags(url: string): void {
    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const routeTitle = currentRoute.snapshot.data['metaTitle'];
    const routeDescription = currentRoute.snapshot.data['metaDescription'];
    const routeCanonicalPath = currentRoute.snapshot.data['canonicalPath'];
    const title =
      typeof routeTitle === 'string' && routeTitle.trim()
        ? routeTitle.trim()
        : this.defaultTitle;
    const description =
      typeof routeDescription === 'string' && routeDescription.trim()
        ? routeDescription.trim()
        : this.defaultMetaDescription;

    this.titleService.setTitle(title);
    this.metaService.updateTag({
      name: 'description',
      content: description,
    });
    this.updateCanonicalTag(routeCanonicalPath, url);
  }

  private updateCanonicalTag(routeCanonicalPath: unknown, url: string): void {
    if (!this.document?.head) return;

    const hasCanonicalPath =
      typeof routeCanonicalPath === 'string' && routeCanonicalPath.trim().length > 0;
    const canonicalPath = hasCanonicalPath
      ? routeCanonicalPath.trim()
      : this.buildCanonicalPath(url);
    const href = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${this.document.location?.origin || ''}${canonicalPath}`;

    let canonicalLink = this.document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = this.document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', href);
  }

  private buildCanonicalPath(url: string): string {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children['primary']?.segments.map((segment) => segment.path) || [];
    return segments.length ? `/${segments.join('/')}` : '/';
  }

  openProfileModal(): void {
    this.showProfileModal.set(true);
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }
}
