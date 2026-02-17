import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonInterval } from '../../models/group.model';

@Component({
  selector: 'app-group-season-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-season-settings-modal.component.html',
  styleUrl: './group-season-settings-modal.component.scss',
})
export class GroupSeasonSettingsModalComponent {
  @Input({ required: true }) seasonSettingsError!: string | null;
  @Input({ required: true }) seasonSettingsLoading!: boolean;
  @Input({ required: true }) endSeasonLoading!: boolean;
  @Input({ required: true }) canEndSeason!: boolean;
  @Input({ required: true }) endSeasonHint!: string;
  @Input({ required: true }) editSeasonName!: string;
  @Input({ required: true }) editSeasonStartAt!: string;
  @Input({ required: true }) editSeasonEndsAt!: string;
  @Input({ required: true }) editSeasonPauseDays!: number;
  @Input({ required: true }) editNextSeasonName!: string;
  @Input({ required: true }) editNextSeasonStartsAt!: string;
  @Input({ required: true }) nextSeasonStartMin!: string;
  @Input({ required: true }) editNextSeasonEndsAt!: string;
  @Input({ required: true }) editNextSeasonIsSuccessive!: boolean;
  @Input({ required: true }) editNextSeasonInterval!: SeasonInterval | '';
  @Input({ required: true }) editNextSeasonIntermissionDays!: number;
  @Input({ required: true }) seasonIntervalOptions!: Array<{ value: SeasonInterval; label: string }>;
  @Input({ required: true }) seasonStartLocked!: boolean;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() editSeasonNameChange = new EventEmitter<string>();
  @Output() editSeasonStartAtChange = new EventEmitter<string>();
  @Output() editSeasonEndsAtChange = new EventEmitter<string>();
  @Output() editSeasonPauseDaysChange = new EventEmitter<number>();
  @Output() editNextSeasonNameChange = new EventEmitter<string>();
  @Output() editNextSeasonStartsAtChange = new EventEmitter<string>();
  @Output() editNextSeasonEndsAtChange = new EventEmitter<string>();
  @Output() nextSeasonSuccessiveChange = new EventEmitter<boolean>();
  @Output() editNextSeasonIntervalChange = new EventEmitter<SeasonInterval | ''>();
  @Output() editNextSeasonIntermissionDaysChange = new EventEmitter<number>();
  @Output() requestEndSeason = new EventEmitter<void>();
}
