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
  @Input({ required: true }) showFeatureMenuModal = false;
  @Input({ required: true }) featureMenuSlotIndex: number | null = null;
  @Input({ required: true }) isCommanderFormat = false;
  @Input({ required: true }) showCompactControls = false;
  @Input({ required: true }) playerCount = 4;
  @Input({ required: true }) mirroredTopHalf = false;
  @Input({ required: true }) confirmAbortActive = false;
  @Input({ required: true }) confirmResetActive = false;
  @Input({ required: true }) gameStarted = false;
  @Input({ required: true }) allDecksSelected = false;
  @Input({ required: true }) startingRoll = false;

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
  @Output() closeFeatureMenu = new EventEmitter<void>();
  @Output() openPoisonFromFeatureMenu = new EventEmitter<void>();
  @Output() openCommanderFromFeatureMenu = new EventEmitter<number>();
  @Output() closeCompactControls = new EventEmitter<void>();
  @Output() cyclePlayerCount = new EventEmitter<void>();
  @Output() rollD20 = new EventEmitter<void>();
  @Output() toggleTopHalfMirror = new EventEmitter<void>();
  @Output() toggleAbortConfirm = new EventEmitter<void>();
  @Output() confirmAbort = new EventEmitter<void>();
  @Output() startGame = new EventEmitter<void>();
  @Output() toggleResetConfirm = new EventEmitter<void>();
  @Output() confirmReset = new EventEmitter<void>();

  getOpponentSlot(index: number): PlaySlot | null {
    return this.activeSlots[index] || null;
  }

  getDeckImage(deckId: string | null): string {
    if (!deckId) return this.defaultDeckImage;
    const deck = this.decks.find((entry) => entry.id === deckId);
    return deck?.archidektImageUrl || this.defaultDeckImage;
  }

  getFeatureMenuOpponents(): Array<{ index: number; name: string }> {
    const slotIndex = this.featureMenuSlotIndex;
    if (slotIndex === null) return [];
    return this.activeSlots
      .map((slot, index) => ({ slot, index }))
      .filter((entry) => entry.index !== slotIndex)
      .map((entry) => ({
        index: entry.index,
        name: entry.slot.deckName || entry.slot.playerName || `Player ${entry.index + 1}`,
      }));
  }
}
