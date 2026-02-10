import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupDetail } from '../../models/group.model';

@Component({
  selector: 'app-group-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-settings-modal.component.html',
  styleUrl: './group-settings-modal.component.scss',
})
export class GroupSettingsModalComponent {
  @Input({ required: true }) group!: GroupDetail;
  @Input({ required: true }) defaultGroupImage!: string;
  @Input({ required: true }) groupSettingsError!: string | null;
  @Input({ required: true }) groupSettingsLoading!: boolean;
  @Input({ required: true }) groupImageError!: string | null;
  @Input({ required: true }) groupImageUploading!: boolean;
  @Input({ required: true }) groupImagePreview!: string | null;
  @Input({ required: true }) editHistoryRetentionDays!: number;
  @Input({ required: true }) editSeasonName!: string;
  @Input({ required: true }) editSeasonStartAt!: string;
  @Input({ required: true }) editSeasonEndsAt!: string;
  @Input({ required: true }) editSeasonPauseDays!: number;
  @Input({ required: true }) canResetSeason!: boolean;
  @Input({ required: true }) deleteGroupLoading!: boolean;
  @Input({ required: true }) confirmModalLoading!: boolean;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() groupImageSelected = new EventEmitter<Event>();
  @Output() uploadGroupImage = new EventEmitter<void>();
  @Output() editHistoryRetentionDaysChange = new EventEmitter<number>();
  @Output() editSeasonNameChange = new EventEmitter<string>();
  @Output() editSeasonStartAtChange = new EventEmitter<string>();
  @Output() editSeasonEndsAtChange = new EventEmitter<string>();
  @Output() editSeasonPauseDaysChange = new EventEmitter<number>();
  @Output() requestSeasonReset = new EventEmitter<void>();
  @Output() requestDeleteGroup = new EventEmitter<void>();
}
