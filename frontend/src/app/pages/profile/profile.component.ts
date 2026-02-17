import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { UserProfile } from '../../models/user.model';
import { formatLocalDate } from '../../core/utils/date-utils';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  editMode = signal(false);
  editName = '';
  editLoading = signal(false);
  editError = signal<string | null>(null);
  editSuccess = signal(false);

  avatarPreview = signal<string | null>(null);
  avatarUploading = signal(false);
  avatarError = signal<string | null>(null);
  avatarSuccess = signal(false);
  deleteConfirmOpen = signal(false);
  deleteLoading = signal(false);
  deleteError = signal<string | null>(null);

  private readonly maxAvatarBytes = 2 * 1024 * 1024;
  private selectedAvatarFile: File | null = null;
  private avatarObjectUrl: string | null = null;

  private usersApiService = inject(UsersApiService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.revokeAvatarObjectUrl();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersApiService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.editName = profile.inAppName;
        this.avatarPreview.set(null);
        this.avatarError.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  closeModal(): void {
    this.close.emit();
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

  onAvatarSelected(event: Event): void {
    this.avatarError.set(null);
    this.avatarSuccess.set(false);

    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      this.clearAvatarSelection();
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.avatarError.set('Unsupported image type. Allowed: JPEG, PNG, WebP.');
      this.clearAvatarSelection();
      return;
    }

    if (file.size > this.maxAvatarBytes) {
      this.avatarError.set('Image is too large. Maximum size is 2 MB.');
      this.clearAvatarSelection();
      return;
    }

    this.selectedAvatarFile = file;
    this.revokeAvatarObjectUrl();
    this.avatarObjectUrl = URL.createObjectURL(file);
    this.avatarPreview.set(this.avatarObjectUrl);
  }

  uploadAvatar(): void {
    if (!this.selectedAvatarFile) {
      this.avatarError.set('Please select an image first.');
      return;
    }

    this.avatarUploading.set(true);
    this.avatarError.set(null);
    this.avatarSuccess.set(false);

    this.usersApiService.uploadAvatar(this.selectedAvatarFile).subscribe({
      next: ({ avatarUrl }) => {
        const current = this.profile();
        if (current) {
          this.profile.set({
            ...current,
            avatarUrl,
          });
        }

        this.avatarUploading.set(false);
        this.clearAvatarSelection();
        this.avatarSuccess.set(true);
        setTimeout(() => this.avatarSuccess.set(false), 3000);
      },
      error: (err) => {
        this.avatarUploading.set(false);
        this.avatarError.set(err.error?.message || 'Failed to upload avatar');
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.closeModal();
  }

  openDeleteConfirm(): void {
    this.deleteError.set(null);
    this.deleteConfirmOpen.set(true);
  }

  closeDeleteConfirm(): void {
    if (this.deleteLoading()) return;
    this.deleteConfirmOpen.set(false);
  }

  confirmDeleteAccount(): void {
    this.deleteLoading.set(true);
    this.deleteError.set(null);

    this.usersApiService.deleteOwnAccount().subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.deleteConfirmOpen.set(false);
        this.authService.logout();
        this.closeModal();
      },
      error: (err) => {
        this.deleteLoading.set(false);
        this.deleteError.set(err.error?.message || 'Failed to delete account');
      },
    });
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Not verified';
    return formatLocalDate(dateString);
  }

  private clearAvatarSelection(): void {
    this.selectedAvatarFile = null;
    this.revokeAvatarObjectUrl();
    this.avatarPreview.set(null);
  }

  private revokeAvatarObjectUrl(): void {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }
}
