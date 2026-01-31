import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  email = '';
  inAppName = '';
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.error.set(null);

    if (!this.email || !this.inAppName || !this.password || !this.confirmPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.inAppName.length < 3 || this.inAppName.length > 20) {
      this.error.set('Display name must be between 3 and 20 characters');
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

    this.authService
      .register({
        email: this.email,
        inAppName: this.inAppName,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.success.set(response.message);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Registration failed');
        },
      });
  }
}
