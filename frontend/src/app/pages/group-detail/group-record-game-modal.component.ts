import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Deck } from '../../models/group.model';

type Placement = { deckId: string; rank: number; playerName: string };

@Component({
  selector: 'app-group-record-game-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-record-game-modal.component.html',
  styleUrl: './group-record-game-modal.component.scss',
})
export class GroupRecordGameModalComponent {
  @Input({ required: true }) gamePlacements!: Placement[];
  @Input({ required: true }) gameLoading!: boolean;
  @Input({ required: true }) gameError!: string | null;
  @Input({ required: true }) prefilledGame!: boolean;
  @Input({ required: true }) isSeasonPaused!: boolean;
  @Input() seasonPauseUntil: string | null | undefined;
  @Input({ required: true }) deckDropdownOpen!: boolean[];
  @Input({ required: true }) memberNames!: string[];
  @Input({ required: true }) allDecksSelected!: boolean;
  @Input({ required: true }) getAvailableRanksForSlot!: (index: number) => number[];
  @Input({ required: true }) getDeckNameById!: (deckId: string) => string;
  @Input({ required: true }) getFilteredDecksForSlot!: (index: number) => Deck[];
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() addPlayer = new EventEmitter<void>();
  @Output() removePlayer = new EventEmitter<number>();
  @Output() deckSearchInput = new EventEmitter<{ index: number; event: Event }>();
  @Output() openDeckDropdown = new EventEmitter<number>();
  @Output() closeDeckDropdownDelayed = new EventEmitter<number>();
  @Output() selectDeck = new EventEmitter<{ index: number; deckId: string; deckName: string }>();
  @Output() clearDeckSelection = new EventEmitter<number>();
  @Output() closeAllDeckDropdowns = new EventEmitter<void>();
}
