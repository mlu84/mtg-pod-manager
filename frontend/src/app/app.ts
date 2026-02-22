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
  private defaultMetaRobots = 'noindex,nofollow';
  private siteName = 'MTG Pod-Manager';
  private defaultOgImagePath = '/assets/images/mtg_pod_manager_logo.png';

  isAuthenticated = this.authService.isAuthenticated;
  showProfileModal = signal(false);
  hideGlobalHeader = signal(false);
  useLocalMobileNav = signal(false);

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
    const isGroupsAreaRoute = primarySegments[0] === 'groups' && !isGroupPlayRoute;

    this.hideGlobalHeader.set(isGroupPlayRoute);
    this.useLocalMobileNav.set(isGroupsAreaRoute);
  }

  private updateSeoTags(url: string): void {
    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const routeTitle = currentRoute.snapshot.data['metaTitle'];
    const routeDescription = currentRoute.snapshot.data['metaDescription'];
    const routeRobots = currentRoute.snapshot.data['metaRobots'];
    const routeCanonicalPath = currentRoute.snapshot.data['canonicalPath'];
    const title =
      typeof routeTitle === 'string' && routeTitle.trim()
        ? routeTitle.trim()
        : this.defaultTitle;
    const description =
      typeof routeDescription === 'string' && routeDescription.trim()
        ? routeDescription.trim()
        : this.defaultMetaDescription;
    const robots =
      typeof routeRobots === 'string' && routeRobots.trim()
        ? routeRobots.trim()
        : this.defaultMetaRobots;

    this.titleService.setTitle(title);
    this.metaService.updateTag({
      name: 'description',
      content: description,
    });
    this.metaService.updateTag({
      name: 'robots',
      content: robots,
    });
    const canonicalHref = this.buildCanonicalHref(routeCanonicalPath, url);
    this.updateCanonicalTag(canonicalHref);
    this.updateOpenGraphTags(title, description, canonicalHref);
    this.updateTwitterTags(title, description);
    this.updateWebsiteStructuredData();
  }

  private updateCanonicalTag(canonicalHref: string): void {
    if (!this.document?.head) return;

    let canonicalLink = this.document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = this.document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalHref);
  }

  private updateOpenGraphTags(title: string, description: string, canonicalHref: string): void {
    const imageUrl = this.buildAbsoluteUrl(this.defaultOgImagePath);
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: canonicalHref });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
  }

  private updateTwitterTags(title: string, description: string): void {
    const imageUrl = this.buildAbsoluteUrl(this.defaultOgImagePath);
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  private updateWebsiteStructuredData(): void {
    if (!this.document?.head) return;

    const rootUrl = this.buildAbsoluteUrl('/');
    const content = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName,
      url: rootUrl,
    });

    let script = this.document.head.querySelector(
      'script[data-seo-jsonld="website"]'
    ) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-jsonld', 'website');
      this.document.head.appendChild(script);
    }
    script.textContent = content;
  }

  private buildCanonicalHref(routeCanonicalPath: unknown, url: string): string {
    const hasCanonicalPath =
      typeof routeCanonicalPath === 'string' && routeCanonicalPath.trim().length > 0;
    const canonicalPath = hasCanonicalPath
      ? routeCanonicalPath.trim()
      : this.buildCanonicalPath(url);

    return this.buildAbsoluteUrl(canonicalPath);
  }

  private buildAbsoluteUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http')) {
      return pathOrUrl;
    }

    return `${this.document.location?.origin || ''}${pathOrUrl}`;
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
