import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';

@Component({
  selector: 'app-impressum',
  standalone: true,
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss',
})
export class ImpressumComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(this.navigationHistoryService.getPreviousUrl() ?? fallback);
  }
}
