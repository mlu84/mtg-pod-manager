import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { GroupDetail, Deck } from '../../models/group.model';
import { Game, RankingEntry, RankingEntryWithTrend, GroupEvent } from '../../models/game.model';
import { VALID_COLORS, VALID_DECK_TYPES } from './deck-constants';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit {
  groupId = '';
  group = signal<GroupDetail | null>(null);
  ranking = signal<RankingEntryWithTrend[]>([]);
  games = signal<Game[]>([]);
  events = signal<GroupEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // For trend calculation: baseline = positions before last game, current = positions after last game
  private baselinePositions = new Map<string, number>();
  private storedCurrentPositions = new Map<string, number>();

  // Modal states
  showDeckModal = signal(false);
  showEditDeckModal = signal(false);
  showGameModal = signal(false);
  showEditGroupModal = signal(false);

  // Deck form (create)
  deckName = '';
  deckColors = '';
  deckType = '';
  deckLoading = signal(false);
  deckError = signal<string | null>(null);

  // Edit deck form
  editingDeck: Deck | null = null;
  editDeckName = '';
  editDeckColors = '';
  editDeckType = '';
  editDeckIsActive = true;
  editDeckLoading = signal(false);
  editDeckError = signal<string | null>(null);
  confirmDelete = signal(false);

  // Delete group
  confirmDeleteGroup = signal(false);
  deleteGroupLoading = signal(false);

  // Edit group form
  editGroupName = '';
  editGroupFormat = '';
  editGroupDescription = '';
  editGroupLoading = signal(false);
  editGroupError = signal<string | null>(null);

  // Format options
  formats = [
    'Commander',
    'Standard',
    'Modern',
    'Pioneer',
    'Legacy',
    'Vintage',
    'Pauper',
    'Draft',
    'Sealed',
    'Other',
  ];

  // Confirmation modal
  showConfirmModal = signal(false);
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalAction: (() => void) | null = null;
  confirmModalLoading = signal(false);

  // Alert modal
  showAlertModal = signal(false);
  alertModalTitle = '';
  alertModalMessage = '';
  alertModalType: 'error' | 'success' | 'info' = 'error';

  // Member to remove (for confirmation)
  memberToRemove: { userId: string; user: { inAppName: string } } | null = null;

  // Game form
  gamePlacements: { deckId: string; rank: number; playerName: string }[] = [];
  gameLoading = signal(false);
  gameError = signal<string | null>(null);

  // Constants
  colorOptions = VALID_COLORS;
  typeOptions = VALID_DECK_TYPES;

  // Dynamic rank options based on number of players
  getAvailableRanks(): number[] {
    const count = this.gamePlacements.length;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  // Get available decks for a placement slot (excludes already selected decks)
  getAvailableDecksForSlot(slotIndex: number): { id: string; name: string }[] {
    const selectedDeckIds = this.gamePlacements
      .filter((_, i) => i !== slotIndex)
      .map((p) => p.deckId)
      .filter((id) => id !== '');

    return this.activeDecks().filter((deck) => !selectedDeckIds.includes(deck.id));
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  isAdmin = computed(() => this.group()?.userRole === 'ADMIN');
  currentUserId = this.authService.currentUserId;
  isEmailVerified = this.authService.isEmailVerified;
  activeDecks = computed(() =>
    this.group()?.decks.filter((d) => d.isActive) || []
  );

  // Combined history of games and events, sorted by date
  history = computed(() => {
    const items: { type: 'game' | 'event'; date: Date; data: Game | GroupEvent }[] = [];

    // Add games
    for (const game of this.games()) {
      items.push({
        type: 'game',
        date: new Date(game.playedAt),
        data: game,
      });
    }

    // Add events (exclude GAME_RECORDED and GAME_UNDONE since games are shown separately)
    for (const event of this.events()) {
      if (event.type !== 'GAME_RECORDED' && event.type !== 'GAME_UNDONE') {
        items.push({
          type: 'event',
          date: new Date(event.createdAt),
          data: event,
        });
      }
    }

    // Sort by date descending
    items.sort((a, b) => b.date.getTime() - a.date.getTime());

    return items;
  });

  constructor() {}

  ngOnInit(): void {
    this.groupId = this.route.snapshot.params['id'];
    this.loadStoredPositions();
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.apiService.getGroup(this.groupId).toPromise(),
      this.apiService.getRanking(this.groupId).toPromise(),
      this.apiService.getGames(this.groupId).toPromise(),
      this.apiService.getEvents(this.groupId).toPromise(),
    ])
      .then(([group, ranking, games, events]) => {
        this.group.set(group!);
        this.games.set(games!);
        this.events.set(events!);

        const isFirstLoad = this.storedCurrentPositions.size === 0;
        const rankingChanged = !isFirstLoad && this.hasRankingChanged(ranking!);

        // If ranking changed (new game recorded), shift: old current becomes new baseline
        if (rankingChanged) {
          this.baselinePositions = new Map(this.storedCurrentPositions);
        }

        // Calculate trends based on baseline positions
        const rankingWithTrends: RankingEntryWithTrend[] = ranking!.map((entry) => {
          // On first load, show no trends (all "same")
          if (isFirstLoad) {
            return { ...entry, trend: 'same' as const, positionChange: 0 };
          }

          const baselinePosition = this.baselinePositions.get(entry.id);
          let trend: 'up' | 'down' | 'same' | 'new' = 'same';
          let positionChange = 0;

          if (baselinePosition === undefined) {
            // New deck (not in baseline) - show as "new" if it has played games
            trend = 'new';
          } else if (entry.position < baselinePosition) {
            trend = 'up';
            positionChange = baselinePosition - entry.position;
          } else if (entry.position > baselinePosition) {
            trend = 'down';
            positionChange = baselinePosition - entry.position;
          }

          return { ...entry, trend, positionChange };
        });

        // Save positions:
        // - On first load: initialize both baseline and current with same positions
        // - On ranking change: save shifted baseline and new current
        if (isFirstLoad || rankingChanged) {
          this.savePositions(ranking!, isFirstLoad);
        }

        this.ranking.set(rankingWithTrends);
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(err.error?.message || 'Failed to load group');
        this.loading.set(false);
      });
  }

  private getStorageKey(): string {
    return `ranking-positions-${this.groupId}`;
  }

  private loadStoredPositions(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const data = JSON.parse(stored);
        if (data.baseline) {
          this.baselinePositions = new Map(Object.entries(data.baseline).map(
            ([k, v]) => [k, v as number]
          ));
        }
        if (data.current) {
          this.storedCurrentPositions = new Map(Object.entries(data.current).map(
            ([k, v]) => [k, v as number]
          ));
        }
      }
    } catch {
      this.baselinePositions = new Map();
      this.storedCurrentPositions = new Map();
    }
  }

  private savePositions(ranking: RankingEntry[], isFirstLoad: boolean): void {
    const currentPositions: Record<string, number> = {};
    ranking.forEach((entry) => {
      currentPositions[entry.id] = entry.position;
    });

    let baselineToSave: Record<string, number>;

    if (isFirstLoad) {
      // On first load, baseline = current (so no trends are shown initially)
      baselineToSave = { ...currentPositions };
      this.baselinePositions = new Map(
        Object.entries(baselineToSave).map(([k, v]) => [k, v as number])
      );
    } else {
      // On subsequent saves (ranking changed), use the in-memory baseline
      baselineToSave = {};
      this.baselinePositions.forEach((pos, id) => {
        baselineToSave[id] = pos;
      });
    }

    localStorage.setItem(this.getStorageKey(), JSON.stringify({
      baseline: baselineToSave,
      current: currentPositions,
      timestamp: Date.now(),
    }));

    // Update in-memory current positions
    this.storedCurrentPositions = new Map(
      Object.entries(currentPositions).map(([k, v]) => [k, v as number])
    );
  }

  private hasRankingChanged(ranking: RankingEntry[]): boolean {
    // If no stored current positions, this is first load - initialize but don't show trends
    if (this.storedCurrentPositions.size === 0) {
      return true;
    }

    // Check if any position changed compared to stored current
    if (ranking.length !== this.storedCurrentPositions.size) {
      return true;
    }

    for (const entry of ranking) {
      const storedPos = this.storedCurrentPositions.get(entry.id);
      if (storedPos === undefined || storedPos !== entry.position) {
        return true;
      }
    }

    return false;
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  copyInviteCode(): void {
    const code = this.group()?.inviteCode;
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  // Deck Modal
  openDeckModal(): void {
    this.deckName = '';
    this.deckColors = '';
    this.deckType = '';
    this.deckError.set(null);
    this.showDeckModal.set(true);
  }

  closeDeckModal(): void {
    this.showDeckModal.set(false);
  }

  createDeck(): void {
    if (!this.deckName || !this.deckColors) {
      this.deckError.set('Name and color are required');
      return;
    }

    this.deckLoading.set(true);
    this.deckError.set(null);

    this.apiService
      .createDeck({
        name: this.deckName,
        colors: this.deckColors,
        type: this.deckType || undefined,
        groupId: this.groupId,
      })
      .subscribe({
        next: () => {
          this.deckLoading.set(false);
          this.showDeckModal.set(false);
          this.loadData();
        },
        error: (err) => {
          this.deckLoading.set(false);
          this.deckError.set(err.error?.message || 'Failed to create deck');
        },
      });
  }

  // Game Modal
  openGameModal(): void {
    this.gamePlacements = [];
    this.gameError.set(null);
    this.showGameModal.set(true);
  }

  closeGameModal(): void {
    this.showGameModal.set(false);
  }

  addPlayer(): void {
    if (this.gamePlacements.length < 6) {
      // Default rank is next position, but user can change it for ties
      const nextRank = this.gamePlacements.length + 1;
      this.gamePlacements.push({
        deckId: '',
        rank: nextRank,
        playerName: '',
      });
    }
  }

  removePlayer(index: number): void {
    this.gamePlacements.splice(index, 1);
    // Adjust any ranks that are now out of bounds
    const maxRank = this.gamePlacements.length;
    this.gamePlacements.forEach((p) => {
      if (Number(p.rank) > maxRank) {
        p.rank = maxRank;
      }
    });
  }

  createGame(): void {
    if (this.gamePlacements.length < 2) {
      this.gameError.set('At least 2 players are required');
      return;
    }

    const invalidPlacements = this.gamePlacements.filter((p) => !p.deckId);
    if (invalidPlacements.length > 0) {
      this.gameError.set('Please select a deck for each player');
      return;
    }

    this.gameLoading.set(true);
    this.gameError.set(null);

    this.apiService
      .createGame({
        groupId: this.groupId,
        placements: this.gamePlacements.map((p) => ({
          deckId: p.deckId,
          rank: Number(p.rank), // Convert to number (dropdown returns string)
          playerName: p.playerName || undefined,
        })),
      })
      .subscribe({
        next: () => {
          this.gameLoading.set(false);
          this.showGameModal.set(false);
          this.loadData();
        },
        error: (err) => {
          this.gameLoading.set(false);
          this.gameError.set(err.error?.message || 'Failed to record game');
        },
      });
  }

  undoLastGame(): void {
    this.showConfirmation(
      'Undo Last Game',
      'Are you sure you want to undo the last game? This will revert all rating changes.',
      () => this.executeUndoLastGame()
    );
  }

  private executeUndoLastGame(): void {
    this.confirmModalLoading.set(true);

    this.apiService.undoLastGame(this.groupId).subscribe({
      next: () => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.loadData();
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', err.error?.message || 'Failed to undo game');
      },
    });
  }

  // Edit Deck Modal
  openEditDeckModal(deck: Deck): void {
    this.editingDeck = deck;
    this.editDeckName = deck.name;
    this.editDeckColors = deck.colors;
    this.editDeckType = deck.type || '';
    this.editDeckIsActive = deck.isActive;
    this.editDeckError.set(null);
    this.confirmDelete.set(false);
    this.showEditDeckModal.set(true);
  }

  closeEditDeckModal(): void {
    this.showEditDeckModal.set(false);
    this.editingDeck = null;
    this.confirmDelete.set(false);
  }

  canEditDeck(deck: Deck): boolean {
    return this.isAdmin() || deck.owner.id === this.currentUserId();
  }

  updateDeck(): void {
    if (!this.editingDeck || !this.editDeckName || !this.editDeckColors) {
      this.editDeckError.set('Name and color are required');
      return;
    }

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.apiService
      .updateDeck(this.editingDeck.id, {
        name: this.editDeckName,
        colors: this.editDeckColors,
        type: this.editDeckType || undefined,
        isActive: this.editDeckIsActive,
      })
      .subscribe({
        next: () => {
          this.editDeckLoading.set(false);
          this.showEditDeckModal.set(false);
          this.editingDeck = null;
          this.loadData();
        },
        error: (err) => {
          this.editDeckLoading.set(false);
          this.editDeckError.set(err.error?.message || 'Failed to update deck');
        },
      });
  }

  requestDeleteDeck(): void {
    this.confirmDelete.set(true);
  }

  cancelDeleteDeck(): void {
    this.confirmDelete.set(false);
  }

  confirmDeleteDeck(): void {
    if (!this.editingDeck) return;

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.apiService.deleteDeck(this.editingDeck.id).subscribe({
      next: () => {
        this.editDeckLoading.set(false);
        this.showEditDeckModal.set(false);
        this.editingDeck = null;
        this.confirmDelete.set(false);
        this.loadData();
      },
      error: (err) => {
        this.editDeckLoading.set(false);
        this.confirmDelete.set(false);
        this.editDeckError.set(err.error?.message || 'Failed to delete deck');
      },
    });
  }

  // Member Management
  removeMember(member: { userId: string; user: { inAppName: string } }): void {
    this.memberToRemove = member;
    this.showConfirmation(
      'Remove Member',
      `Are you sure you want to remove "${member.user.inAppName}" from the group?`,
      () => this.executeRemoveMember()
    );
  }

  private executeRemoveMember(): void {
    if (!this.memberToRemove) return;

    this.confirmModalLoading.set(true);

    this.apiService.removeMember(this.groupId, this.memberToRemove.userId).subscribe({
      next: () => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.loadData();
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', err.error?.message || 'Failed to remove member');
      },
    });
  }

  // Invite Code Management
  regenerateInviteCode(): void {
    this.showConfirmation(
      'Regenerate Invite Code',
      'Generate a new invite code? The old code will stop working immediately.',
      () => this.executeRegenerateInviteCode()
    );
  }

  private executeRegenerateInviteCode(): void {
    this.confirmModalLoading.set(true);

    this.apiService.regenerateInviteCode(this.groupId).subscribe({
      next: (result) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        const currentGroup = this.group();
        if (currentGroup) {
          this.group.set({ ...currentGroup, inviteCode: result.inviteCode });
        }
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', err.error?.message || 'Failed to regenerate invite code');
      },
    });
  }

  // Edit Group Modal
  openEditGroupModal(): void {
    const group = this.group();
    if (!group) return;

    this.editGroupName = group.name;
    this.editGroupFormat = group.format;
    this.editGroupDescription = group.description || '';
    this.editGroupError.set(null);
    this.showEditGroupModal.set(true);
  }

  closeEditGroupModal(): void {
    this.showEditGroupModal.set(false);
  }

  updateGroup(): void {
    if (!this.editGroupName || !this.editGroupFormat) {
      this.editGroupError.set('Name and format are required');
      return;
    }

    this.editGroupLoading.set(true);
    this.editGroupError.set(null);

    this.apiService
      .updateGroup(this.groupId, {
        name: this.editGroupName,
        format: this.editGroupFormat,
        description: this.editGroupDescription || undefined,
      })
      .subscribe({
        next: () => {
          this.editGroupLoading.set(false);
          this.showEditGroupModal.set(false);
          this.loadData();
        },
        error: (err) => {
          this.editGroupLoading.set(false);
          this.editGroupError.set(err.error?.message || 'Failed to update group');
        },
      });
  }

  // Delete Group
  requestDeleteGroup(): void {
    this.confirmDeleteGroup.set(true);
  }

  cancelDeleteGroup(): void {
    this.confirmDeleteGroup.set(false);
  }

  confirmDeleteGroupAction(): void {
    this.deleteGroupLoading.set(true);

    this.apiService.deleteGroup(this.groupId).subscribe({
      next: () => {
        this.deleteGroupLoading.set(false);
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        this.deleteGroupLoading.set(false);
        this.confirmDeleteGroup.set(false);
        this.showAlert('Error', err.error?.message || 'Failed to delete group');
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Confirmation Modal helpers
  showConfirmation(title: string, message: string, action: () => void): void {
    this.confirmModalTitle = title;
    this.confirmModalMessage = message;
    this.confirmModalAction = action;
    this.confirmModalLoading.set(false);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmModalAction = null;
    this.memberToRemove = null;
  }

  executeConfirmAction(): void {
    if (this.confirmModalAction) {
      this.confirmModalAction();
    }
  }

  // Alert Modal helpers
  showAlert(title: string, message: string, type: 'error' | 'success' | 'info' = 'error'): void {
    this.alertModalTitle = title;
    this.alertModalMessage = message;
    this.alertModalType = type;
    this.showAlertModal.set(true);
  }

  closeAlertModal(): void {
    this.showAlertModal.set(false);
  }
}
