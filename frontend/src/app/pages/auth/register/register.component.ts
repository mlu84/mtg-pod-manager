import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  normalizeText,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../../../core/utils/input-validation';

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

    const normalizedEmail = normalizeText(this.email).toLowerCase();
    const normalizedInAppName = normalizeText(this.inAppName);

    if (!normalizedEmail || !normalizedInAppName || !this.password || !this.confirmPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      this.error.set(emailError);
      return;
    }

    const displayNameError = validateDisplayName(normalizedInAppName, {
      minLength: 3,
      maxLength: 20,
    });
    if (displayNameError) {
      this.error.set(displayNameError);
      return;
    }

    const passwordError = validatePassword(this.password);
    if (passwordError) {
      this.error.set(passwordError);
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);

    this.authService
      .register({
        email: normalizedEmail,
        inAppName: normalizedInAppName,
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
