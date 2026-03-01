import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { APP_VERSION } from '../../core/version/app-version.generated';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private authService = inject(AuthService);

  isAuthenticated = this.authService.isAuthenticated;
  appVersion = APP_VERSION.formatted;
  activeScreenshot = signal<{ src: string; alt: string } | null>(null);

  openScreenshotModal(src: string, alt: string): void {
    this.activeScreenshot.set({ src, alt });
  }

  closeScreenshotModal(): void {
    this.activeScreenshot.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activeScreenshot()) {
      this.closeScreenshotModal();
    }
  }
}
