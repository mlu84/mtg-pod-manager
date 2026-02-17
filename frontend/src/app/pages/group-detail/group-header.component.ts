import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupDetail } from '../../models/group.model';

@Component({
  selector: 'app-group-header',
  standalone: true,
  imports: [CommonModule],
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
}
