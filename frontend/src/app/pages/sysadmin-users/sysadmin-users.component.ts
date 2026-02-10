import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService } from '../../core/services/admin-api.service';
import { AdminGroup, AdminGroupMember } from '../../models/group.model';

@Component({
  selector: 'app-sysadmin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sysadmin-users.component.html',
  styleUrl: './sysadmin-users.component.scss',
})
export class SysadminUsersComponent implements OnInit {
  groups = signal<AdminGroup[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchQuery = '';
  page = signal(1);
  total = signal(0);
  readonly pageSize = 5;
  collapsedGroups = signal<Set<string>>(new Set());

  // Rename modal
  showRenameModal = signal(false);
  renameTarget: { userId: string; currentName: string } | null = null;
  renameValue = '';
  renameLoading = signal(false);
  renameError = signal<string | null>(null);

  // Confirm modal
  showConfirmModal = signal(false);
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  confirmLoading = signal(false);

  private adminApiService = inject(AdminApiService);
  private router = inject(Router);

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize))
  );

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(page = 1): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminApiService.getAdminGroups(this.searchQuery, page, this.pageSize).subscribe({
      next: (result) => {
        this.groups.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
        this.collapsedGroups.set(new Set(result.items.map((group) => group.id)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load groups');
        this.loading.set(false);
      },
    });
  }

  search(): void {
    this.loadGroups(1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadGroups(page);
  }

  isGroupCollapsed(groupId: string): boolean {
    return this.collapsedGroups().has(groupId);
  }

  toggleGroup(groupId: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    this.collapsedGroups.set(next);
  }

  openRenameModal(member: AdminGroupMember): void {
    this.renameTarget = { userId: member.userId, currentName: member.user.inAppName };
    this.renameValue = member.user.inAppName;
    this.renameError.set(null);
    this.showRenameModal.set(true);
  }

  closeRenameModal(): void {
    this.showRenameModal.set(false);
    this.renameTarget = null;
    this.renameValue = '';
    this.renameError.set(null);
  }

  confirmRename(): void {
    if (!this.renameTarget || !this.renameValue.trim()) {
      this.renameError.set('Name is required');
      return;
    }

    this.renameLoading.set(true);
    this.renameError.set(null);

    this.adminApiService.adminRenameUser(this.renameTarget.userId, this.renameValue.trim()).subscribe({
      next: () => {
        this.renameLoading.set(false);
        this.closeRenameModal();
        this.loadGroups(this.page());
      },
      error: (err) => {
        this.renameLoading.set(false);
        this.renameError.set(err.error?.message || 'Failed to rename user');
      },
    });
  }

  promoteMember(groupId: string, member: AdminGroupMember): void {
    this.adminApiService.adminUpdateMemberRole(groupId, member.userId, 'ADMIN').subscribe({
      next: () => this.loadGroups(this.page()),
      error: (err) => this.showConfirmError(err),
    });
  }

  demoteMember(groupId: string, member: AdminGroupMember): void {
    this.adminApiService.adminUpdateMemberRole(groupId, member.userId, 'MEMBER').subscribe({
      next: () => this.loadGroups(this.page()),
      error: (err) => this.showConfirmError(err),
    });
  }

  removeMember(groupId: string, member: AdminGroupMember): void {
    this.showConfirmation(
      'Remove member',
      `Remove ${member.user.inAppName} from this group?`,
      () => this.executeRemoveMember(groupId, member.userId)
    );
  }

  private executeRemoveMember(groupId: string, userId: string): void {
    this.confirmLoading.set(true);
    this.adminApiService.adminRemoveMember(groupId, userId).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        this.closeConfirmModal();
        this.loadGroups(this.page());
      },
      error: (err) => {
        this.confirmLoading.set(false);
        this.showConfirmError(err);
      },
    });
  }

  deleteUser(member: AdminGroupMember): void {
    this.showConfirmation(
      'Delete user account',
      `Delete account for ${member.user.inAppName}? This cannot be undone.`,
      () => this.executeDeleteUser(member.userId)
    );
  }

  private executeDeleteUser(userId: string): void {
    this.confirmLoading.set(true);
    this.adminApiService.adminDeleteUser(userId).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        this.closeConfirmModal();
        this.loadGroups(this.page());
      },
      error: (err) => {
        this.confirmLoading.set(false);
        this.showConfirmError(err);
      },
    });
  }

  deleteGroup(group: AdminGroup): void {
    this.showConfirmation(
      'Delete group',
      `Delete group "${group.name}"? This cannot be undone.`,
      () => this.executeDeleteGroup(group.id)
    );
  }

  private executeDeleteGroup(groupId: string): void {
    this.confirmLoading.set(true);
    this.adminApiService.adminDeleteGroup(groupId).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        this.closeConfirmModal();
        this.loadGroups(this.page());
      },
      error: (err) => {
        this.confirmLoading.set(false);
        this.showConfirmError(err);
      },
    });
  }

  private showConfirmation(title: string, message: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal.set(true);
    this.confirmLoading.set(false);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmAction = null;
  }

  executeConfirmAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
  }

  private showConfirmError(err: unknown): void {
    const message =
      typeof err === 'object' &&
      err !== null &&
      'error' in err &&
      typeof (err as { error?: { message?: string } }).error?.message === 'string'
        ? (err as { error?: { message?: string } }).error!.message!
        : 'Action failed';
    this.confirmTitle = 'Error';
    this.confirmMessage = message;
    this.confirmAction = null;
    this.showConfirmModal.set(true);
    this.confirmLoading.set(false);
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
}
