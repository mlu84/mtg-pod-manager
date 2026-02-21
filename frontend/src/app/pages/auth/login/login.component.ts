import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  normalizeText,
  validateEmail,
  validatePassword,
} from '../../../core/utils/input-validation';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Check for verification success
    if (this.route.snapshot.queryParams['verified'] === 'true') {
      this.success.set('Email verified successfully! You can now log in.');
    }
  }

  onSubmit(): void {
    const normalizedEmail = normalizeText(this.email).toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      this.error.set(emailError);
      return;
    }
    const passwordError = validatePassword(this.password);
    if (passwordError) {
      this.error.set(passwordError);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login({ email: normalizedEmail, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        const serverMessage = err?.error?.message;

        if (status === 401) {
          this.error.set(serverMessage || 'Invalid credentials');
          return;
        }

        if (status === 0) {
          this.error.set(
            'Backend not reachable. Please start backend and database, then try again.',
          );
          return;
        }

        this.error.set(
          serverMessage ||
            'Login failed due to a server error. Check backend logs and DB/migrations.',
        );
      },
    });
  }
}
