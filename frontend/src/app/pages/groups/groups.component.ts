import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GroupsApiService } from '../../core/services/groups-api.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { formatLocalDate } from '../../core/utils/date-utils';
import {
  normalizeText,
  validateInviteCode,
} from '../../core/utils/input-validation';
import {
  validateCreateGroupFormInput,
  validateGroupSearchInput,
} from './groups-form-validation';
import {
  Group,
  IncomingGroupApplication,
  GroupSearchResult,
  IncomingGroupInvite,
  SentGroupInvite,
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
  showRequestsModal = signal(false);

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
  incomingApplications = signal<IncomingGroupApplication[]>([]);
  incomingInvites = signal<IncomingGroupInvite[]>([]);
  sentInvites = signal<SentGroupInvite[]>([]);
  requestsLoading = signal(false);
  requestsError = signal<string | null>(null);
  requestsActionLoading = signal(false);

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
  requestsBadge = computed(
    () =>
      this.myApplications().length +
      this.incomingApplications().length +
      this.incomingInvites().length +
      this.sentInvites().length,
  );

  constructor() {}

  ngOnInit(): void {
    this.loadGroups();
    this.loadRequestCenterData(false);
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
    const validation = validateCreateGroupFormInput(
      this.newGroupName,
      this.newGroupFormat,
      this.newGroupDescription,
    );
    if (validation.error || !validation.value) {
      this.createError.set(validation.error ?? 'Invalid group input');
      return;
    }
    const { name, format, description } = validation.value;

    this.createLoading.set(true);
    this.createError.set(null);

    this.groupsApiService
      .createGroup({
        name,
        format,
        description: description || undefined,
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
    const inviteCodeError = validateInviteCode(this.inviteCode);
    if (inviteCodeError) {
      this.joinError.set(inviteCodeError);
      return;
    }
    const inviteCode = normalizeText(this.inviteCode);

    this.joinLoading.set(true);
    this.joinError.set(null);

    this.groupsApiService.joinGroup(inviteCode).subscribe({
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
    this.showSearchModal.set(true);
  }

  closeSearchModal(): void {
    this.showSearchModal.set(false);
  }

  openRequestsModal(): void {
    this.requestsError.set(null);
    this.showRequestsModal.set(true);
    this.loadRequestCenterData(true);
  }

  closeRequestsModal(): void {
    this.showRequestsModal.set(false);
  }

  loadRequestCenterData(showError = true): void {
    this.requestsLoading.set(true);
    if (showError) {
      this.requestsError.set(null);
    }

    forkJoin({
      applications: this.usersApiService.getMyApplications(),
      incomingApplications: this.groupsApiService.getIncomingApplications(),
      incomingInvites: this.groupsApiService.getIncomingInvites(),
      sentInvites: this.groupsApiService.getSentInvites(),
    }).subscribe({
      next: (result) => {
        this.myApplications.set(result.applications);
        this.incomingApplications.set(result.incomingApplications);
        this.incomingInvites.set(result.incomingInvites);
        this.sentInvites.set(result.sentInvites);
        this.requestsLoading.set(false);
      },
      error: (err) => {
        this.requestsLoading.set(false);
        if (showError) {
          this.requestsError.set(err.error?.message || 'Failed to load requests');
        }
      },
    });
  }

  searchGroups(page = 1): void {
    const validation = validateGroupSearchInput(this.searchQuery);
    if (validation.error || !validation.value) {
      this.searchError.set(validation.error ?? 'Invalid search input');
      this.searchResults.set([]);
      this.searchTotal.set(0);
      return;
    }
    const query = validation.value;

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
        this.loadRequestCenterData(false);
      },
      error: (err) => {
        this.searchLoading.set(false);
        this.searchError.set(err.error?.message || 'Failed to apply to group');
      },
    });
  }

  acceptInvite(inviteId: string): void {
    if (this.requestsActionLoading()) return;

    this.requestsActionLoading.set(true);
    this.requestsError.set(null);
    this.groupsApiService.acceptInvite(inviteId).subscribe({
      next: () => {
        this.requestsActionLoading.set(false);
        this.loadGroups();
        this.loadRequestCenterData(true);
      },
      error: (err) => {
        this.requestsActionLoading.set(false);
        this.requestsError.set(err.error?.message || 'Failed to accept invite');
      },
    });
  }

  rejectInvite(inviteId: string): void {
    if (this.requestsActionLoading()) return;

    this.requestsActionLoading.set(true);
    this.requestsError.set(null);
    this.groupsApiService.rejectInvite(inviteId).subscribe({
      next: () => {
        this.requestsActionLoading.set(false);
        this.loadRequestCenterData(true);
      },
      error: (err) => {
        this.requestsActionLoading.set(false);
        this.requestsError.set(err.error?.message || 'Failed to reject invite');
      },
    });
  }

  acceptIncomingApplication(groupId: string, userId: string): void {
    if (this.requestsActionLoading()) return;

    this.requestsActionLoading.set(true);
    this.requestsError.set(null);
    this.groupsApiService.acceptGroupApplication(groupId, userId).subscribe({
      next: () => {
        this.requestsActionLoading.set(false);
        this.loadGroups();
        this.loadRequestCenterData(true);
      },
      error: (err) => {
        this.requestsActionLoading.set(false);
        this.requestsError.set(err.error?.message || 'Failed to accept request');
      },
    });
  }

  rejectIncomingApplication(groupId: string, userId: string): void {
    if (this.requestsActionLoading()) return;

    this.requestsActionLoading.set(true);
    this.requestsError.set(null);
    this.groupsApiService.rejectGroupApplication(groupId, userId).subscribe({
      next: () => {
        this.requestsActionLoading.set(false);
        this.loadRequestCenterData(true);
      },
      error: (err) => {
        this.requestsActionLoading.set(false);
        this.requestsError.set(err.error?.message || 'Failed to reject request');
      },
    });
  }

  cancelSentInvite(inviteId: string): void {
    if (this.requestsActionLoading()) return;

    this.requestsActionLoading.set(true);
    this.requestsError.set(null);
    this.groupsApiService.cancelSentInvite(inviteId).subscribe({
      next: () => {
        this.requestsActionLoading.set(false);
        this.loadRequestCenterData(true);
      },
      error: (err) => {
        this.requestsActionLoading.set(false);
        this.requestsError.set(err.error?.message || 'Failed to cancel invite');
      },
    });
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
