import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { UserProfile } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Edit form
  editMode = signal(false);
  editName = '';
  editLoading = signal(false);
  editError = signal<string | null>(null);
  editSuccess = signal(false);

  private usersApiService = inject(UsersApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApiService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.editName = profile.inAppName;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  startEditing(): void {
    this.editMode.set(true);
    this.editError.set(null);
    this.editSuccess.set(false);
  }

  cancelEditing(): void {
    this.editMode.set(false);
    this.editName = this.profile()?.inAppName || '';
    this.editError.set(null);
  }

  saveProfile(): void {
    if (!this.editName.trim()) {
      this.editError.set('Display name is required');
      return;
    }

    if (this.editName.length < 2) {
      this.editError.set('Display name must be at least 2 characters');
      return;
    }

    this.editLoading.set(true);
    this.editError.set(null);
    this.editSuccess.set(false);

    this.usersApiService.updateProfile({ inAppName: this.editName.trim() }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.editLoading.set(false);
        this.editMode.set(false);
        this.editSuccess.set(true);
        setTimeout(() => this.editSuccess.set(false), 3000);
      },
      error: (err) => {
        this.editLoading.set(false);
        this.editError.set(err.error?.message || 'Failed to update profile');
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Not verified';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
