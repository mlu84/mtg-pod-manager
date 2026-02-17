import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  password = '';
  confirmPassword = '';
  token = '';
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('Missing reset token. Please request a new password reset link.');
    }
  }

  onSubmit(): void {
    if (!this.token) {
      this.error.set('Missing reset token. Please request a new password reset link.');
      return;
    }

    if (!this.password || !this.confirmPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.authService
      .resetPassword({
        token: this.token,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.success.set(response.message);
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Password reset failed');
        },
      });
  }
}
