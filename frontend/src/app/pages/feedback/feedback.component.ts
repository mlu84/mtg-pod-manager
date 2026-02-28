import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersApiService } from '../../core/services/users-api.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { AuthService } from '../../core/services/auth.service';
import { normalizeText, validateEmail, validateOptionalText } from '../../core/utils/input-validation';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
  text = '';
  contactEmail = '';
  rating = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  private usersApiService = inject(UsersApiService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  selectRating(value: number): void {
    this.rating.set(value);
  }

  submitFeedback(): void {
    const trimmedText = normalizeText(this.text);
    const trimmedEmail = normalizeText(this.contactEmail);

    const textError = validateOptionalText(trimmedText, 'Feedback', { maxLength: 4000 });
    if (!trimmedText || textError) {
      this.error.set(textError || 'Feedback text is required');
      return;
    }

    if (trimmedText.length < 3) {
      this.error.set('Feedback must be at least 3 characters long');
      return;
    }

    if (trimmedEmail) {
      const emailError = validateEmail(trimmedEmail);
      if (emailError) {
        this.error.set(emailError);
        return;
      }
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.usersApiService
      .submitFeedback({
        text: trimmedText,
        rating: this.rating(),
        contactEmail: trimmedEmail || null,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.success.set(response.message || 'Feedback submitted successfully');
          this.text = '';
          this.contactEmail = '';
          this.rating.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Failed to submit feedback');
        },
      });
  }

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(
      this.navigationHistoryService.getBackTarget(this.router.url, fallback),
    );
  }
}

