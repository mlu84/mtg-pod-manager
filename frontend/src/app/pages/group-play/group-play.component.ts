import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { Deck, GroupDetail } from '../../models/group.model';

type PlaySlot = {
  deckId: string | null;
  deckName: string;
  playerName: string;
  life: number;
  poison: number;
  commanderDamage: number[];
};

@Component({
  selector: 'app-group-play',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-play.component.html',
  styleUrl: './group-play.component.scss',
})
export class GroupPlayComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  readonly defaultDeckImage = '/assets/images/deckBG_default.jpg';

  groupId = '';
  group = signal<GroupDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  playerCount = signal(4);
  slots = signal<PlaySlot[]>([]);

  showSlotModal = signal(false);
  activeSlotIndex = signal<number | null>(null);
  deckSearchTerm = signal('');
  confirmAbortActive = signal(false);
  rollVisible = signal(false);
  confirmResetActive = signal(false);
  private resetConfirmTimer: ReturnType<typeof setTimeout> | null = null;

  rolling = signal(false);
  rollResult = signal<number | null>(null);
  startingRoll = signal(false);
  startingWinnerIndex = signal<number | null>(null);
  gameStarted = signal(false);
  confirmEndActive = signal(false);
  isCompactViewport = signal(false);
  isPortraitViewport = signal(false);
  viewportWidth = signal(0);
  viewportHeight = signal(0);
  mirroredTopHalf = signal(false);
  private orientationLocked = false;
  private endConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  private eliminationOrder: number[] = [];
  lifeDelta = signal<number[]>(Array.from({ length: 6 }).map(() => 0));
  lifeDeltaVisible = signal<boolean[]>(Array.from({ length: 6 }).map(() => false));
  private lifeDeltaTimers: (ReturnType<typeof setTimeout> | null)[] = Array.from({ length: 6 }).map(
    () => null
  );

  showCommanderModal = signal(false);
  commanderModalSlotIndex = signal<number | null>(null);
  commanderModalOpponentIndex = signal<number | null>(null);
  showPoisonModal = signal(false);
  poisonModalSlotIndex = signal<number | null>(null);
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private holdTriggered = false;
  private lifeHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private lifeHoldInterval: ReturnType<typeof setInterval> | null = null;
  private lifeHoldTriggered = false;

  activeDecks = computed(() => (this.group()?.decks || []).filter((d) => d.isActive));
  activeSlots = computed(() => this.slots().slice(0, this.playerCount()));
  allDecksSelected = computed(() =>
    this.activeSlots().every((slot) => Boolean(slot.deckId))
  );
  leftSlots = computed(() => {
    const count = this.playerCount();
    const slots = this.activeSlots();
    const leftIndices =
      count === 2
        ? [0]
        : count === 3
        ? [0, 1]
        : count === 4
        ? [0, 1]
        : count === 5
        ? [0, 1, 2, 3]
        : [0, 1, 2, 3];
    return leftIndices.map((index) => ({ slot: slots[index], index }));
  });
  rightSlots = computed(() => {
    const count = this.playerCount();
    const slots = this.activeSlots();
    const rightIndices =
      count === 2
        ? [1]
        : count === 3
        ? [2]
        : count === 4
        ? [2, 3]
        : count === 5
        ? [4]
        : [4, 5];
    return rightIndices.map((index) => ({ slot: slots[index], index }));
  });

  ngOnInit(): void {
    this.updateViewportState();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('orientationchange', this.onViewportChange);
    }
    this.tryLockLandscape();
    this.groupId = this.route.snapshot.params['id'];
    this.loadGroup();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onViewportChange);
      window.removeEventListener('orientationchange', this.onViewportChange);
    }
    if (this.orientationLocked && typeof screen !== 'undefined' && screen.orientation?.unlock) {
      screen.orientation.unlock();
      this.orientationLocked = false;
    }
  }

  private onViewportChange = (): void => {
    const wasCompact = this.isCompactViewport();
    this.updateViewportState();
    if (!wasCompact && this.isCompactViewport()) {
      this.tryLockLandscape();
    }
  };

  private updateViewportState(): void {
    if (typeof window === 'undefined') return;
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
    this.isCompactViewport.set(window.innerWidth < 1200);
    this.isPortraitViewport.set(window.innerHeight > window.innerWidth);
  }

  private async tryLockLandscape(): Promise<void> {
    if (!this.isCompactViewport()) return;
    if (typeof screen === 'undefined' || !screen.orientation) return;
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };
    if (!orientation.lock) return;
    try {
      await orientation.lock('landscape');
      this.orientationLocked = true;
    } catch {
      this.orientationLocked = false;
    }
  }

  private loadGroup(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getGroup(this.groupId).subscribe({
      next: (group) => {
        this.group.set(group);
        this.initializeSlots();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load group');
        this.loading.set(false);
      },
    });
  }

  private initializeSlots(): void {
    const baseLife = this.getStartingLife();
    const next: PlaySlot[] = Array.from({ length: 6 }).map(() => ({
      deckId: null,
      deckName: '',
      playerName: '',
      life: baseLife,
      poison: 0,
      commanderDamage: Array.from({ length: 6 }).map(() => 0),
    }));
    this.slots.set(next);
  }

  private getStartingLife(): number {
    return this.group()?.format?.toLowerCase() === 'commander' ? 40 : 20;
  }

  setPlayerCount(count: number): void {
    if (count < 2 || count > 6) return;
    this.playerCount.set(count);
  }

  cyclePlayerCount(): void {
    const next = this.playerCount() >= 6 ? 2 : this.playerCount() + 1;
    this.setPlayerCount(next);
  }

  toggleTopHalfMirror(): void {
    this.mirroredTopHalf.update((value) => !value);
  }

  isSlotMirrored(column: 'left' | 'right', rowIndex: number): boolean {
    if (!this.mirroredTopHalf()) return false;
    const columnSize = column === 'left' ? this.leftSlots().length : this.rightSlots().length;
    return rowIndex < Math.ceil(columnSize / 2);
  }

  incrementLife(index: number): void {
    if (this.lifeHoldTriggered) {
      this.lifeHoldTriggered = false;
      return;
    }
    const next = [...this.slots()];
    next[index] = { ...next[index], life: next[index].life + 1 };
    this.slots.set(next);
    this.updateLifeDelta(index, 1);
    this.updateEliminations();
  }

  decrementLife(index: number): void {
    if (this.lifeHoldTriggered) {
      this.lifeHoldTriggered = false;
      return;
    }
    const next = [...this.slots()];
    next[index] = { ...next[index], life: Math.max(0, next[index].life - 1) };
    this.slots.set(next);
    this.updateLifeDelta(index, -1);
    this.updateEliminations();
  }

  private adjustLife(index: number, delta: number): void {
    const next = [...this.slots()];
    next[index] = { ...next[index], life: Math.max(0, next[index].life + delta) };
    this.slots.set(next);
    this.updateLifeDelta(index, delta);
    this.updateEliminations();
  }

  startLifeHold(index: number, delta: number, event: Event): void {
    event.stopPropagation();
    if (this.lifeHoldTimer) clearTimeout(this.lifeHoldTimer);
    if (this.lifeHoldInterval) clearInterval(this.lifeHoldInterval);
    this.lifeHoldTriggered = false;
    this.lifeHoldTimer = setTimeout(() => {
      this.lifeHoldTriggered = true;
      this.adjustLife(index, delta * 10);
      this.lifeHoldInterval = setInterval(() => {
        this.adjustLife(index, delta * 10);
      }, 700);
    }, 700);
  }

  cancelLifeHold(): void {
    if (this.lifeHoldTimer) {
      clearTimeout(this.lifeHoldTimer);
      this.lifeHoldTimer = null;
    }
    if (this.lifeHoldInterval) {
      clearInterval(this.lifeHoldInterval);
      this.lifeHoldInterval = null;
    }
  }

  openSlotModal(index: number): void {
    if (this.gameStarted()) return;
    this.deckSearchTerm.set('');
    this.activeSlotIndex.set(index);
    this.showSlotModal.set(true);
  }

  closeSlotModal(): void {
    this.showSlotModal.set(false);
    this.activeSlotIndex.set(null);
  }

  selectDeck(deck: Deck): void {
    const index = this.activeSlotIndex();
    if (index === null) return;
    const next = [...this.slots()];
    next[index] = { ...next[index], deckId: deck.id, deckName: deck.name };
    this.slots.set(next);
    this.closeSlotModal();
  }

  setPlayerName(name: string): void {
    const index = this.activeSlotIndex();
    if (index === null) return;
    const next = [...this.slots()];
    next[index] = { ...next[index], playerName: name };
    this.slots.set(next);
  }

  rollD20(): void {
    if (this.rolling()) return;
    const animationDuration = 1000;
    this.rolling.set(true);
    this.rollVisible.set(true);
    this.rollResult.set(null);
    const result = Math.floor(Math.random() * 20) + 1;
    setTimeout(() => {
      this.rolling.set(false);
      this.rollResult.set(result);
      setTimeout(() => {
        if (!this.rollVisible()) return;
        this.rollResult.set(null);
        this.rollVisible.set(false);
      }, 2000);
    }, animationDuration);
  }

  closeRollModal(): void {
    this.rollVisible.set(false);
    this.rollResult.set(null);
    this.rolling.set(false);
  }

  startGame(): void {
    if (this.startingRoll() || !this.allDecksSelected()) return;
    const slotCount = this.playerCount();
    const duration = 2100;
    const interval = 90;
    const maxIndex = slotCount - 1;
    let currentIndex = 0;

    this.startingRoll.set(true);
    this.startingWinnerIndex.set(null);

    const timer = setInterval(() => {
      this.startingWinnerIndex.set(currentIndex);
      currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    }, interval);

    setTimeout(() => {
      clearInterval(timer);
      const finalIndex = Math.floor(Math.random() * slotCount);
      this.startingWinnerIndex.set(finalIndex);
      this.startingRoll.set(false);
      this.gameStarted.set(true);
    }, duration);
  }

  resetGame(): void {
    const baseLife = this.getStartingLife();
    const next = [...this.slots()].map((slot) => ({
      ...slot,
      life: baseLife,
      poison: 0,
      commanderDamage: Array.from({ length: 6 }).map(() => 0),
    }));
    this.slots.set(next);
    this.startingWinnerIndex.set(null);
    this.gameStarted.set(false);
    this.eliminationOrder = [];
  }

  toggleAbortConfirm(): void {
    const next = !this.confirmAbortActive();
    this.confirmAbortActive.set(next);
    if (next) {
      if (this.endConfirmTimer) clearTimeout(this.endConfirmTimer);
      this.endConfirmTimer = setTimeout(() => {
        this.confirmAbortActive.set(false);
      }, 3000);
    }
  }

  confirmAbort(): void {
    if (this.endConfirmTimer) clearTimeout(this.endConfirmTimer);
    this.confirmAbortActive.set(false);
    this.endGame();
  }

  toggleResetConfirm(): void {
    const next = !this.confirmResetActive();
    this.confirmResetActive.set(next);
    if (next) {
      if (this.resetConfirmTimer) clearTimeout(this.resetConfirmTimer);
      this.resetConfirmTimer = setTimeout(() => {
        this.confirmResetActive.set(false);
      }, 3000);
    }
  }

  confirmReset(): void {
    if (this.resetConfirmTimer) clearTimeout(this.resetConfirmTimer);
    this.confirmResetActive.set(false);
    this.resetGame();
  }

  goBack(): void {
    this.router.navigate(['/groups', this.groupId]);
  }

  getDeckImage(deckId: string | null): string {
    if (!deckId) return '';
    const deck = this.group()?.decks?.find((d) => d.id === deckId);
    return deck?.archidektImageUrl || '/assets/images/deckBG_default.jpg';
  }

  getDeckBackgroundImage(deckId: string | null): string {
    if (!deckId) return '';
    const deck = this.group()?.decks?.find((d) => d.id === deckId);
    return deck?.archidektImageUrl || '';
  }

  getCommanderIconBackground(opponentIndex: number): string {
    const deck = this.getOpponentSlot(opponentIndex)?.deckId
      ? this.group()?.decks?.find((d) => d.id === this.getOpponentSlot(opponentIndex)?.deckId)
      : null;
    if (!deck) return this.getSlotFallbackColor(opponentIndex);
    if (!deck.archidektImageUrl || deck.archidektImageUrl === this.defaultDeckImage) {
      return this.getSlotFallbackColor(opponentIndex);
    }
    return 'transparent';
  }

  shouldShowCommanderImage(opponentIndex: number): boolean {
    const deck = this.getOpponentSlot(opponentIndex)?.deckId
      ? this.group()?.decks?.find((d) => d.id === this.getOpponentSlot(opponentIndex)?.deckId)
      : null;
    return Boolean(deck?.archidektImageUrl && deck.archidektImageUrl !== this.defaultDeckImage);
  }

  getSlotFallbackColor(index: number): string {
    const palette = ['#9b2c2c', '#b25c1a', '#b88a12', '#2f7a4f', '#2b5c8a', '#5b3c9b'];
    return palette[index] || '#2b5c8a';
  }

  getAvailableDecksForSlot(index: number): Deck[] {
    const selected = new Set(
      this.activeSlots()
        .map((slot, i) => (i === index ? null : slot.deckId))
        .filter(Boolean) as string[]
    );
    return this.activeDecks().filter((deck) => !selected.has(deck.id));
  }

  getFilteredAvailableDecksForSlot(index: number): Deck[] {
    const term = this.deckSearchTerm().trim().toLowerCase();
    const decks = this.getAvailableDecksForSlot(index);
    if (!term) return decks;
    return decks.filter((deck) => deck.name.toLowerCase().includes(term));
  }

  getOpponentIndices(index: number): number[] {
    return this.activeSlots()
      .map((_, i) => i)
      .filter((i) => i !== index);
  }

  getOpponentSlot(index: number): PlaySlot | null {
    const slots = this.activeSlots();
    return slots[index] || null;
  }

  incrementCommanderDamage(slotIndex: number, opponentIndex: number): void {
    if (this.holdTriggered) {
      this.holdTriggered = false;
      return;
    }
    const next = [...this.slots()];
    const slot = next[slotIndex];
    const updatedDamage = [...slot.commanderDamage];
    updatedDamage[opponentIndex] = (updatedDamage[opponentIndex] || 0) + 1;
    next[slotIndex] = {
      ...slot,
      commanderDamage: updatedDamage,
      life: Math.max(0, slot.life - 1),
    };
    this.slots.set(next);
    this.updateLifeDelta(slotIndex, -1);
    this.updateEliminations();
  }

  decrementCommanderDamage(slotIndex: number, opponentIndex: number): void {
    const next = [...this.slots()];
    const slot = next[slotIndex];
    const updatedDamage = [...slot.commanderDamage];
    const current = updatedDamage[opponentIndex] || 0;
    if (current === 0) return;
    updatedDamage[opponentIndex] = current - 1;
    next[slotIndex] = {
      ...slot,
      commanderDamage: updatedDamage,
      life: slot.life + 1,
    };
    this.slots.set(next);
    this.updateLifeDelta(slotIndex, 1);
    this.updateEliminations();
  }

  private updateLifeDelta(index: number, delta: number): void {
    if (!delta) return;
    const nextDelta = [...this.lifeDelta()];
    nextDelta[index] = (nextDelta[index] || 0) + delta;
    this.lifeDelta.set(nextDelta);

    const nextVisible = [...this.lifeDeltaVisible()];
    nextVisible[index] = true;
    this.lifeDeltaVisible.set(nextVisible);

    if (this.lifeDeltaTimers[index]) {
      clearTimeout(this.lifeDeltaTimers[index]!);
    }
    this.lifeDeltaTimers[index] = setTimeout(() => {
      const resetDelta = [...this.lifeDelta()];
      resetDelta[index] = 0;
      this.lifeDelta.set(resetDelta);
      const resetVisible = [...this.lifeDeltaVisible()];
      resetVisible[index] = false;
      this.lifeDeltaVisible.set(resetVisible);
      this.lifeDeltaTimers[index] = null;
    }, 3000);
  }

  incrementPoison(slotIndex: number): void {
    if (this.holdTriggered) {
      this.holdTriggered = false;
      return;
    }
    const next = [...this.slots()];
    const slot = next[slotIndex];
    next[slotIndex] = { ...slot, poison: slot.poison + 1 };
    this.slots.set(next);
    this.updateEliminations();
  }

  decrementPoison(slotIndex: number): void {
    const next = [...this.slots()];
    const slot = next[slotIndex];
    next[slotIndex] = { ...slot, poison: Math.max(0, slot.poison - 1) };
    this.slots.set(next);
    this.updateEliminations();
  }

  startCommanderHold(slotIndex: number, opponentIndex: number, event: Event): void {
    event.stopPropagation();
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTriggered = false;
    this.holdTimer = setTimeout(() => {
      this.holdTriggered = true;
      this.openCommanderModal(slotIndex, opponentIndex);
    }, 450);
  }

  cancelCommanderHold(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  openCommanderModal(slotIndex: number, opponentIndex: number): void {
    this.commanderModalSlotIndex.set(slotIndex);
    this.commanderModalOpponentIndex.set(opponentIndex);
    this.showCommanderModal.set(true);
  }

  closeCommanderModal(): void {
    this.showCommanderModal.set(false);
    this.commanderModalSlotIndex.set(null);
    this.commanderModalOpponentIndex.set(null);
  }

  startPoisonHold(slotIndex: number, event: Event): void {
    event.stopPropagation();
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTriggered = false;
    this.holdTimer = setTimeout(() => {
      this.holdTriggered = true;
      this.openPoisonModal(slotIndex);
    }, 450);
  }

  openPoisonModal(slotIndex: number): void {
    this.poisonModalSlotIndex.set(slotIndex);
    this.showPoisonModal.set(true);
  }

  closePoisonModal(): void {
    this.showPoisonModal.set(false);
    this.poisonModalSlotIndex.set(null);
  }

  isEliminated(index: number): boolean {
    const slot = this.activeSlots()[index];
    if (!slot) return false;
    const commanderMax = Math.max(...slot.commanderDamage);
    return slot.life <= 0 || slot.poison >= 10 || commanderMax >= 21;
  }

  private updateEliminations(): void {
    if (!this.gameStarted()) return;
    const slots = this.activeSlots();
    slots.forEach((_, index) => {
      if (this.isEliminated(index) && !this.eliminationOrder.includes(index)) {
        this.eliminationOrder.push(index);
      }
    });
  }

  private buildPlacementDraft() {
    const slots = this.activeSlots();
    const total = slots.length;
    const eliminated = [...this.eliminationOrder];
    const remaining = slots
      .map((slot, index) => ({ slot, index }))
      .filter((entry) => !eliminated.includes(entry.index));
    const remainingSorted = remaining.sort((a, b) => b.slot.life - a.slot.life);

    const placements: { deckId: string; rank: number; playerName?: string }[] = [];
    let currentRank = 1;
    for (const entry of remainingSorted) {
      if (entry.slot.deckId) {
        placements.push({
          deckId: entry.slot.deckId,
          rank: currentRank,
          playerName: entry.slot.playerName || undefined,
        });
        currentRank += 1;
      }
    }
    let lastRank = total;
    for (const index of eliminated) {
      const slot = slots[index];
      if (!slot?.deckId) continue;
      placements.push({
        deckId: slot.deckId,
        rank: lastRank,
        playerName: slot.playerName || undefined,
      });
      lastRank -= 1;
    }
    return placements;
  }

  private endGame(): void {
    const placements = this.buildPlacementDraft();
    const payload = {
      groupId: this.groupId,
      placements,
    };
    sessionStorage.setItem('playGameRecordDraft', JSON.stringify(payload));
    this.router.navigate(['/groups', this.groupId], {
      queryParams: { openRecordGame: '1' },
    });
  }
}
