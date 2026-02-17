import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GroupsApiService } from '../../core/services/groups-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { formatLocalDate } from '../../core/utils/date-utils';
import {
  Group,
  GroupSearchResult,
  UserGroupApplication,
} from '../../models/group.model';

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
  memberGroupIds = computed(() => new Set(this.groups().map((g) => g.id)));

  // Modal states
  showCreateModal = signal(false);
  showJoinModal = signal(false);
  showSearchModal = signal(false);

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

  // Search groups
  searchQuery = '';
  searchResults = signal<GroupSearchResult[]>([]);
  searchLoading = signal(false);
  searchError = signal<string | null>(null);
  searchTotal = signal(0);
  searchPage = signal(1);
  readonly searchPageSize = 10;

  // Applications
  myApplications = signal<UserGroupApplication[]>([]);
  applicationsLoading = signal(false);
  applicationsError = signal<string | null>(null);
  applicationsPage = signal(1);
  readonly applicationsPageSize = 5;

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

  readonly defaultGroupImage = '/assets/images/deckBG_default.jpg';

  private groupsApiService = inject(GroupsApiService);
  private usersApiService = inject(UsersApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isEmailVerified = this.authService.isEmailVerified;
  isSysAdmin = this.authService.isSysAdmin;
  applicationsBadge = computed(() => this.myApplications().length);
  applicationsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.myApplications().length / this.applicationsPageSize))
  );
  paginatedApplications = computed(() => {
    const start = (this.applicationsPage() - 1) * this.applicationsPageSize;
    return this.myApplications().slice(start, start + this.applicationsPageSize);
  });

  constructor() {}

  ngOnInit(): void {
    this.loadGroups();
    this.loadMyApplications();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.error.set(null);

    this.groupsApiService.getGroups().subscribe({
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

    this.groupsApiService
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

    this.groupsApiService.joinGroup(this.inviteCode).subscribe({
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

  openSearchModal(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.searchError.set(null);
    this.searchTotal.set(0);
    this.searchPage.set(1);
    this.applicationsPage.set(1);
    this.showSearchModal.set(true);
  }

  closeSearchModal(): void {
    this.showSearchModal.set(false);
  }

  loadMyApplications(): void {
    this.applicationsLoading.set(true);
    this.applicationsError.set(null);

    this.usersApiService.getMyApplications().subscribe({
      next: (apps) => {
        this.myApplications.set(apps);
        this.applicationsLoading.set(false);
      },
      error: (err) => {
        this.applicationsError.set(err.error?.message || 'Failed to load applications');
        this.applicationsLoading.set(false);
      },
    });
  }

  searchGroups(page = 1): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchError.set('Please enter a search term');
      this.searchResults.set([]);
      this.searchTotal.set(0);
      return;
    }

    this.searchQuery = query;
    this.searchLoading.set(true);
    this.searchError.set(null);

    this.groupsApiService.searchGroups(query, page, this.searchPageSize).subscribe({
      next: (result) => {
        this.searchResults.set(result.items);
        this.searchTotal.set(result.total);
        this.searchPage.set(result.page);
        this.searchLoading.set(false);
      },
      error: (err) => {
        this.searchError.set(err.error?.message || 'Failed to search groups');
        this.searchLoading.set(false);
      },
    });
  }

  searchTotalPages(): number {
    return Math.max(1, Math.ceil(this.searchTotal() / this.searchPageSize));
  }

  setSearchPage(page: number): void {
    if (page < 1 || page > this.searchTotalPages()) return;
    this.searchGroups(page);
  }

  hasApplied(groupId: string): boolean {
    return this.myApplications().some((app) => app.group.id === groupId);
  }

  isMember(groupId: string): boolean {
    return this.memberGroupIds().has(groupId);
  }

  applyToGroup(groupId: string): void {
    if (this.isMember(groupId)) {
      return;
    }
    if (!this.isEmailVerified()) {
      this.searchError.set('Please verify your email to apply to groups');
      return;
    }

    this.searchLoading.set(true);
    this.searchError.set(null);

    this.groupsApiService.applyToGroup(groupId).subscribe({
      next: () => {
        this.searchLoading.set(false);
        this.loadMyApplications();
      },
      error: (err) => {
        this.searchLoading.set(false);
        this.searchError.set(err.error?.message || 'Failed to apply to group');
      },
    });
  }

  setApplicationsPage(page: number): void {
    if (page < 1 || page > this.applicationsTotalPages()) return;
    this.applicationsPage.set(page);
  }

  logout(): void {
    this.authService.logout();
  }

  goToArchidektTest(): void {
    this.router.navigate(['/archidekt-test']);
  }

  goToSysadminUsers(): void {
    this.router.navigate(['/sysadmin-users']);
  }

  formatDate(dateString: string): string {
    return formatLocalDate(dateString);
  }
}
