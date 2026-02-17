import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  email = '';
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.email) {
      this.error.set('Please enter your email address');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set(response.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Request failed. Please try again later.');
      },
    });
  }
}
