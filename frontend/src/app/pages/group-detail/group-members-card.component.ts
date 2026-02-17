import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupMember } from '../../models/group.model';

@Component({
  selector: 'app-group-members-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-members-card.component.html',
  styleUrl: './group-members-card.component.scss',
})
export class GroupMembersCardComponent {
  @Input({ required: true }) membersCollapsed!: boolean;
  @Input({ required: true }) members!: GroupMember[];
  @Input({ required: true }) isAdmin!: boolean;
  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() inviteUser = new EventEmitter<void>();
}
