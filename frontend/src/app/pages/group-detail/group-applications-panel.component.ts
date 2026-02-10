import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupApplication } from '../../models/group.model';

@Component({
  selector: 'app-group-applications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-applications-panel.component.html',
  styleUrl: './group-applications-panel.component.scss',
})
export class GroupApplicationsPanelComponent {
  @Input({ required: true }) members!: Array<{
    userId: string;
    role: 'ADMIN' | 'MEMBER';
    user: { inAppName: string };
  }>;
  @Input({ required: true }) adminCount!: number;
  @Input({ required: true }) currentUserId!: string | null;
  @Input({ required: true }) applications!: GroupApplication[];
  @Input({ required: true }) applicationsLoading!: boolean;
  @Input({ required: true }) applicationsError!: string | null;
  @Input({ required: true }) applicationActionLoading!: boolean;

  @Output() promote = new EventEmitter<string>();
  @Output() demote = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() accept = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
}
