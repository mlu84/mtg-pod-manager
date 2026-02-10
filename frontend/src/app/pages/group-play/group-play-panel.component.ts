import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-group-play-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-play-panel.component.html',
  styleUrl: './group-play-panel.component.scss',
})
export class GroupPlayPanelComponent {
  @Input({ required: true }) playerCount = 4;
  @Input({ required: true }) rolling = false;
  @Input({ required: true }) isCompactViewport = false;
  @Input({ required: true }) mirroredTopHalf = false;
  @Input({ required: true }) confirmAbortActive = false;
  @Input({ required: true }) confirmResetActive = false;
  @Input({ required: true }) gameStarted = false;
  @Input({ required: true }) allDecksSelected = false;
  @Input({ required: true }) startingRoll = false;

  @Output() cyclePlayerCount = new EventEmitter<void>();
  @Output() rollD20 = new EventEmitter<void>();
  @Output() toggleTopHalfMirror = new EventEmitter<void>();
  @Output() toggleAbortConfirm = new EventEmitter<void>();
  @Output() confirmAbort = new EventEmitter<void>();
  @Output() startGame = new EventEmitter<void>();
  @Output() toggleResetConfirm = new EventEmitter<void>();
  @Output() confirmReset = new EventEmitter<void>();
}
