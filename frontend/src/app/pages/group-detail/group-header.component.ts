import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupDetail } from '../../models/group.model';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { ProfileComponent } from '../profile/profile.component';

@Component({
  selector: 'app-group-header',
  standalone: true,
  imports: [CommonModule, ProfileComponent],
  templateUrl: './group-header.component.html',
  styleUrl: './group-header.component.scss',
})
export class GroupHeaderComponent {
  @Input({ required: true }) group!: GroupDetail;
  @Input({ required: true }) isAdmin!: boolean;
  @Input({ required: true }) defaultGroupImage!: string;

  @Output() back = new EventEmitter<void>();
  @Output() editGroup = new EventEmitter<void>();
  @Output() copyInviteCode = new EventEmitter<void>();
  @Output() regenerateInviteCode = new EventEmitter<void>();
  @Output() openMemberSettings = new EventEmitter<void>();
  @Output() openSeasonSettings = new EventEmitter<void>();
  @Output() openGroupSettings = new EventEmitter<void>();

  showMobileMenu = signal(false);
  showInviteCodeModal = signal(false);
  showProfileModal = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);

  toggleMobileMenu(): void {
    this.showMobileMenu.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }

  openInviteCodeDetails(): void {
    this.showInviteCodeModal.set(true);
    this.closeMobileMenu();
  }

  closeInviteCodeDetails(): void {
    this.showInviteCodeModal.set(false);
  }

  openProfileModal(): void {
    this.showProfileModal.set(true);
    this.closeMobileMenu();
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
  }

  navigateFromMobileMenu(path: string): void {
    this.closeMobileMenu();
    this.router.navigateByUrl(path);
  }

  openMemberSettingsFromMenu(): void {
    this.closeMobileMenu();
    this.openMemberSettings.emit();
  }

  openSeasonSettingsFromMenu(): void {
    this.closeMobileMenu();
    this.openSeasonSettings.emit();
  }

  openGroupSettingsFromMenu(): void {
    this.closeMobileMenu();
    this.openGroupSettings.emit();
  }

  logoutFromMobileMenu(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
