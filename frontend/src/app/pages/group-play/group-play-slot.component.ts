import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Deck } from '../../models/group.model';
import { PlaySlot } from './group-play.models';

@Component({
  selector: 'app-group-play-slot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-play-slot.component.html',
  styleUrl: './group-play-slot.component.scss',
})
export class GroupPlaySlotComponent {
  @Input({ required: true }) slot!: PlaySlot;
  @Input({ required: true }) index!: number;
  @Input({ required: true }) isWinner = false;
  @Input({ required: true }) isLocked = false;
  @Input({ required: true }) isEliminated = false;
  @Input({ required: true }) isMirrored = false;
  @Input({ required: true }) activeSlots: PlaySlot[] = [];
  @Input({ required: true }) decks: Deck[] = [];
  @Input({ required: true }) defaultDeckImage = '/assets/images/deckBG_default.jpg';
  @Input({ required: true }) lifeDelta = 0;
  @Input({ required: true }) lifeDeltaVisible = false;
  @Input({ required: true }) showCommanderDamage = true;
  @Input({ required: true }) showInlineCounters = true;

  @Output() openSlot = new EventEmitter<number>();
  @Output() incrementLife = new EventEmitter<number>();
  @Output() decrementLife = new EventEmitter<number>();
  @Output() startLifeHold = new EventEmitter<{ index: number; delta: number }>();
  @Output() cancelLifeHold = new EventEmitter<void>();
  @Output() incrementPoison = new EventEmitter<number>();
  @Output() startPoisonHold = new EventEmitter<number>();
  @Output() cancelHold = new EventEmitter<void>();
  @Output() incrementCommanderDamage = new EventEmitter<{ index: number; opponentIndex: number }>();
  @Output() startCommanderHold = new EventEmitter<{ index: number; opponentIndex: number }>();
  @Output() startFeatureHold = new EventEmitter<number>();
  @Output() cancelFeatureHold = new EventEmitter<void>();

  handleOpenSlot(): void {
    this.openSlot.emit(this.index);
  }

  handleIncrementLife(event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.incrementLife.emit(this.index);
  }

  handleDecrementLife(event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.decrementLife.emit(this.index);
  }

  handleStartLifeHold(delta: number, event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.startLifeHold.emit({ index: this.index, delta });
  }

  handleCancelLifeHold(event?: Event): void {
    event?.stopPropagation();
    this.cancelLifeHold.emit();
  }

  handleIncrementPoison(event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.incrementPoison.emit(this.index);
  }

  handleStartPoisonHold(event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.startPoisonHold.emit(this.index);
  }

  handleCancelHold(event?: Event): void {
    event?.stopPropagation();
    this.cancelHold.emit();
  }

  handleIncrementCommanderDamage(opponentIndex: number, event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.incrementCommanderDamage.emit({ index: this.index, opponentIndex });
  }

  handleStartCommanderHold(opponentIndex: number, event: Event): void {
    event.stopPropagation();
    if (!this.isLocked) return;
    this.startCommanderHold.emit({ index: this.index, opponentIndex });
  }

  handleStartFeatureHold(event: Event): void {
    event.stopPropagation();
    if (!this.isLocked || this.showInlineCounters) return;
    this.startFeatureHold.emit(this.index);
  }

  handleCancelFeatureHold(event?: Event): void {
    event?.stopPropagation();
    if (!this.isLocked || this.showInlineCounters) return;
    this.cancelFeatureHold.emit();
  }

  getOpponentIndices(): number[] {
    if (!this.showCommanderDamage) return [];
    return this.activeSlots.map((_, i) => i).filter((i) => i !== this.index);
  }

  getOpponentSlot(index: number): PlaySlot | null {
    return this.activeSlots[index] || null;
  }

  getDeckImage(deckId: string | null): string {
    if (!deckId) return this.defaultDeckImage;
    const deck = this.decks.find((entry) => entry.id === deckId);
    return deck?.archidektImageUrl || this.defaultDeckImage;
  }

  getDeckBackgroundImage(deckId: string | null): string {
    if (!deckId) return '';
    const deck = this.decks.find((entry) => entry.id === deckId);
    return deck?.archidektImageUrl || '';
  }

  getCommanderIconBackground(opponentIndex: number): string {
    const deck = this.getOpponentSlot(opponentIndex)?.deckId
      ? this.decks.find((entry) => entry.id === this.getOpponentSlot(opponentIndex)?.deckId)
      : null;
    if (!deck) return this.getSlotFallbackColor(opponentIndex);
    if (!deck.archidektImageUrl || deck.archidektImageUrl === this.defaultDeckImage) {
      return this.getSlotFallbackColor(opponentIndex);
    }
    return 'transparent';
  }

  shouldShowCommanderImage(opponentIndex: number): boolean {
    const deck = this.getOpponentSlot(opponentIndex)?.deckId
      ? this.decks.find((entry) => entry.id === this.getOpponentSlot(opponentIndex)?.deckId)
      : null;
    return Boolean(deck?.archidektImageUrl && deck.archidektImageUrl !== this.defaultDeckImage);
  }

  getSlotFallbackColor(index: number): string {
    const palette = ['#9b2c2c', '#b25c1a', '#b88a12', '#2f7a4f', '#2b5c8a', '#5b3c9b'];
    return palette[index] || '#2b5c8a';
  }
}
