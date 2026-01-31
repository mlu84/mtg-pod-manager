import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
})
export class GroupsComponent implements OnInit {
  groups = signal<Group[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Modal states
  showCreateModal = signal(false);
  showJoinModal = signal(false);

  // Create group form
  newGroupName = '';
  newGroupFormat = '';
  newGroupDescription = '';
  createLoading = signal(false);
  createError = signal<string | null>(null);

  // Join group form
  inviteCode = '';
  joinLoading = signal(false);
  joinError = signal<string | null>(null);

  // Format options
  formats = [
    'Commander',
    'Standard',
    'Modern',
    'Pioneer',
    'Legacy',
    'Vintage',
    'Pauper',
    'Draft',
    'Sealed',
    'Other',
  ];

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isEmailVerified = this.authService.isEmailVerified;

  constructor() {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load groups');
        this.loading.set(false);
      },
    });
  }

  openGroup(group: Group): void {
    this.router.navigate(['/groups', group.id]);
  }

  openCreateModal(): void {
    this.newGroupName = '';
    this.newGroupFormat = '';
    this.newGroupDescription = '';
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  createGroup(): void {
    if (!this.newGroupName || !this.newGroupFormat) {
      this.createError.set('Name and format are required');
      return;
    }

    this.createLoading.set(true);
    this.createError.set(null);

    this.apiService
      .createGroup({
        name: this.newGroupName,
        format: this.newGroupFormat,
        description: this.newGroupDescription || undefined,
      })
      .subscribe({
        next: (group) => {
          this.createLoading.set(false);
          this.showCreateModal.set(false);
          this.router.navigate(['/groups', group.id]);
        },
        error: (err) => {
          this.createLoading.set(false);
          this.createError.set(err.error?.message || 'Failed to create group');
        },
      });
  }

  openJoinModal(): void {
    this.inviteCode = '';
    this.joinError.set(null);
    this.showJoinModal.set(true);
  }

  closeJoinModal(): void {
    this.showJoinModal.set(false);
  }

  joinGroup(): void {
    if (!this.inviteCode) {
      this.joinError.set('Please enter an invite code');
      return;
    }

    this.joinLoading.set(true);
    this.joinError.set(null);

    this.apiService.joinGroup(this.inviteCode).subscribe({
      next: (result) => {
        this.joinLoading.set(false);
        this.showJoinModal.set(false);
        this.router.navigate(['/groups', result.groupId]);
      },
      error: (err) => {
        this.joinLoading.set(false);
        this.joinError.set(err.error?.message || 'Failed to join group');
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
