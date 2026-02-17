import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private authService = inject(AuthService);
  private router = inject(Router);
  private navigationHistoryService = inject(NavigationHistoryService);

  isAuthenticated = this.authService.isAuthenticated;
  showProfileModal = signal(false);

  constructor() {
    this.navigationHistoryService.recordNavigation(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.navigationHistoryService.recordNavigation(event.urlAfterRedirects);
        this.showProfileModal.set(false);
      });
  }

  openProfileModal(): void {
    this.showProfileModal.set(true);
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }
}
