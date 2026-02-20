import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

@Component({
  standalone: true,
  template: '',
})
class TestPageComponent {}

describe('App', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isAuthenticated = signal(true);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: TestPageComponent },
          { path: 'groups', component: TestPageComponent },
          {
            path: 'legal',
            component: TestPageComponent,
            data: {
              metaTitle: 'Legal | MTG Pod-Manager',
              metaDescription: 'Legal information for MTG Pod-Manager.',
              canonicalPath: '/legal',
              metaRobots: 'index,follow',
            },
          },
          { path: 'groups/:id/play', component: TestPageComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render global header links', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      compiled.querySelectorAll('.meta-header__nav a, .meta-header__nav button')
    ).map((el) => el.textContent?.trim());

    expect(links).toContain('Profile');
    expect(links).toContain('Legal');
    expect(links).toContain('Contact');
  });

  it('should hide profile action for guests', async () => {
    isAuthenticated.set(false);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      compiled.querySelectorAll('.meta-header__nav a, .meta-header__nav button')
    ).map((el) => el.textContent?.trim());

    expect(links).not.toContain('Profile');
  });

  it('should hide global header on group-play route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/groups/test-id/play');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.meta-header')).toBeNull();
    expect(compiled.querySelector('.app-shell')?.classList.contains('app-shell--play')).toBe(true);
  });

  it('should set title, description, robots and canonical from route data', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/legal');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.title).toBe('Legal | MTG Pod-Manager');
    const metaDescription = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content');
    expect(metaDescription).toBe('Legal information for MTG Pod-Manager.');
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content');
    expect(robots).toBe('index,follow');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    expect(ogTitle).toBe('Legal | MTG Pod-Manager');
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
    expect(ogUrl?.endsWith('/legal')).toBe(true);
    const twitterCard = document
      .querySelector('meta[name="twitter:card"]')
      ?.getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
    const canonicalHref = document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href');
    expect(canonicalHref?.endsWith('/legal')).toBe(true);
  });

  it('should default robots to noindex,nofollow when route data is missing', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/groups');
    await fixture.whenStable();
    fixture.detectChanges();

    const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content');
    expect(robots).toBe('noindex,nofollow');
  });

  it('should render website structured data', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const structuredDataContent = document
      .querySelector('script[data-seo-jsonld="website"]')
      ?.textContent;
    expect(structuredDataContent).toBeTruthy();
    const structuredData = JSON.parse(structuredDataContent || '{}');
    expect(structuredData['@type']).toBe('WebSite');
    expect(structuredData['name']).toBe('MTG Pod-Manager');
  });
});
