import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  verifying = signal(false);
  verified = signal(false);
  error = signal<string | null>(null);
  token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const tokenFromQuery = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (!tokenFromQuery) {
      this.error.set('Verification token is missing. Please open the latest verification email.');
      return;
    }

    this.token = tokenFromQuery;
  }

  verifyEmail(): void {
    if (!this.token || this.verifying() || this.verified()) {
      return;
    }

    this.verifying.set(true);
    this.error.set(null);

    this.authService.verifyEmailToken(this.token).subscribe({
      next: () => {
        this.verifying.set(false);
        this.verified.set(true);
        this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
      },
      error: (err) => {
        this.verifying.set(false);
        this.error.set(err.error?.message || 'Verification failed. Please request a new email.');
      },
    });
  }
}
