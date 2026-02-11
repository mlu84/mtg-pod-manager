import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-group-actions-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-actions-card.component.html',
  styleUrl: './group-actions-card.component.scss',
})
export class GroupActionsCardComponent {
  @Input({ required: true }) isEmailVerified!: boolean;
  @Input({ required: true }) isAdmin!: boolean;
  @Input({ required: true }) isSeasonPaused!: boolean;
  @Input() seasonPauseUntil: string | null | undefined;
  @Input({ required: true }) formatDate!: (date: string) => string;
  @Input({ required: true }) isSmartphoneViewport!: boolean;
  @Input({ required: true }) canStartPlayGame!: boolean;
  @Input() playGameDisabledReason: string | null | undefined;

  @Output() playGame = new EventEmitter<void>();
  @Output() recordGame = new EventEmitter<void>();
}
