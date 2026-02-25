import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { NewsStateService } from '../../core/services/news-state.service';
import { ProfileComponent } from '../profile/profile.component';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, ProfileComponent],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
})
export class NewsComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);
  private newsStateService = inject(NewsStateService);
  showMobileMenu = signal(false);
  showProfileModal = signal(false);
  readonly lastUpdated = 'February 2026';

  ngOnInit(): void {
    this.newsStateService.markAsReadOnVisit();
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }

  openProfileFromMenu(): void {
    this.closeMobileMenu();
    if (this.authService.isAuthenticated()) {
      this.showProfileModal.set(true);
      return;
    }
    this.router.navigateByUrl('/login');
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }

  navigateFromMobileMenu(path: string): void {
    this.closeMobileMenu();
    this.router.navigateByUrl(path);
  }

  logoutFromMobileMenu(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(
      this.navigationHistoryService.getBackTarget(this.router.url, fallback),
    );
  }
}
