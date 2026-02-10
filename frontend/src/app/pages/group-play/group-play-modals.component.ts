import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Deck } from '../../models/group.model';
import { PlaySlot } from './group-play.models';

@Component({
  selector: 'app-group-play-modals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-play-modals.component.html',
  styleUrl: './group-play-modals.component.scss',
})
export class GroupPlayModalsComponent {
  @Input({ required: true }) showSlotModal = false;
  @Input({ required: true }) activeSlotIndex: number | null = null;
  @Input({ required: true }) slots: PlaySlot[] = [];
  @Input({ required: true }) deckSearchTerm = '';
  @Input({ required: true }) filteredDecks: Deck[] = [];
  @Input({ required: true }) showRollModal = false;
  @Input({ required: true }) rolling = false;
  @Input({ required: true }) rollResult: number | null = null;
  @Input({ required: true }) showPoisonModal = false;
  @Input({ required: true }) poisonSlotIndex: number | null = null;
  @Input({ required: true }) showCommanderModal = false;
  @Input({ required: true }) commanderSlotIndex: number | null = null;
  @Input({ required: true }) commanderOpponentIndex: number | null = null;
  @Input({ required: true }) activeSlots: PlaySlot[] = [];
  @Input({ required: true }) decks: Deck[] = [];
  @Input({ required: true }) defaultDeckImage = '/assets/images/deckBG_default.jpg';

  @Output() closeSlotModal = new EventEmitter<void>();
  @Output() selectDeck = new EventEmitter<Deck>();
  @Output() playerNameChange = new EventEmitter<string>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() closeRollModal = new EventEmitter<void>();
  @Output() incrementPoison = new EventEmitter<number>();
  @Output() decrementPoison = new EventEmitter<number>();
  @Output() closePoisonModal = new EventEmitter<void>();
  @Output() incrementCommanderDamage = new EventEmitter<{
    slotIndex: number;
    opponentIndex: number;
  }>();
  @Output() decrementCommanderDamage = new EventEmitter<{
    slotIndex: number;
    opponentIndex: number;
  }>();
  @Output() closeCommanderModal = new EventEmitter<void>();

  getOpponentSlot(index: number): PlaySlot | null {
    return this.activeSlots[index] || null;
  }

  getDeckImage(deckId: string | null): string {
    if (!deckId) return this.defaultDeckImage;
    const deck = this.decks.find((entry) => entry.id === deckId);
    return deck?.archidektImageUrl || this.defaultDeckImage;
  }
}
