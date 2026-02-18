import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GroupDetailApiService } from '../../core/services/group-detail-api.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { GroupHistoryCardComponent } from './group-history-card.component';
import { GroupRankingCardComponent } from './group-ranking-card.component';
import { GroupWinnersBannerComponent } from './group-winners-banner.component';
import { GroupActionsCardComponent } from './group-actions-card.component';
import { GroupStatsCardComponent } from './group-stats-card.component';
import { GroupDecksCardComponent } from './group-decks-card.component';
import { GroupMembersCardComponent } from './group-members-card.component';
import { GroupApplicationsPanelComponent } from './group-applications-panel.component';
import { GroupHeaderComponent } from './group-header.component';
import { GroupDeckCreateModalComponent } from './group-deck-create-modal.component';
import { GroupDeckEditModalComponent } from './group-deck-edit-modal.component';
import { GroupRecordGameModalComponent } from './group-record-game-modal.component';
import { GroupSettingsModalComponent } from './group-settings-modal.component';
import { GroupSeasonSettingsModalComponent } from './group-season-settings-modal.component';
import {
  GroupDetail,
  Deck,
  GroupApplication,
  InvitableUser,
  SeasonInterval,
} from '../../models/group.model';
import { Game, RankingEntry, RankingEntryWithTrend, GroupEvent } from '../../models/game.model';
import { VALID_COLORS, VALID_DECK_TYPES } from './deck-constants';
import { isValidRankConfiguration } from './rank-utils';
import {
  buildBarChart,
  buildLineAndBarChart,
  buildLineChart,
  createBaseChartOptions,
} from './chart-utils';
import { buildHistoryItems, filterHistoryItems } from './history-utils';
import { getDeckRankSeries, getDeckSeries } from './stats-series-utils';
import {
  buildRankingWithTrends,
  hasRankingChanged,
  mapToPositionRecord,
  toPositionMap,
  toPositionRecord,
} from './ranking-trend-utils';
import {
  getRankingStorageKey,
  loadRankingStoredState,
  saveRankingStoredState,
} from './ranking-storage-utils';
import {
  getColorComboName,
  getColorGradient as toColorGradient,
  getManaIconPath,
  getManaSymbols as toManaSymbols,
  getSortedColors as toSortedColors,
} from './color-utils';
import {
  filterDecks,
  filterStatsDecks,
  getDeckTypeLabel as toDeckTypeLabel,
  getDecksTotalPages,
  paginateDecks,
  sortDecks,
} from './deck-list-utils';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { formatLocalDate } from '../../core/utils/date-utils';
import {
  validateDeckFormInput,
  validateDeckOwnerAssignmentInput,
  validateGamePlacementsInput,
  validateGroupEditInput,
  validateGroupImageSelection,
  validateInviteEmailInput,
  validateInviteSearchQuery,
  validateSeasonDayInputs,
} from './group-detail-form-validation';
import { resolveApiErrorMessage } from './group-detail-error.util';
import {
  getNextSeasonStartMinDate as getNextSeasonStartMinDateFromState,
  hasActiveSeasonData,
  hasNextSeasonData,
} from './group-detail-season-state.util';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GroupHistoryCardComponent,
    GroupRankingCardComponent,
    GroupWinnersBannerComponent,
    GroupActionsCardComponent,
    GroupStatsCardComponent,
    GroupDecksCardComponent,
    GroupMembersCardComponent,
    GroupApplicationsPanelComponent,
    GroupHeaderComponent,
    GroupDeckCreateModalComponent,
    GroupDeckEditModalComponent,
    GroupRecordGameModalComponent,
    GroupSettingsModalComponent,
    GroupSeasonSettingsModalComponent,
  ],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private statsChartRef?: ElementRef<HTMLCanvasElement>;
  private statsChart: Chart | null = null;
  private viewInitialized = false;
  private colorIconCache = new Map<string, HTMLImageElement>();
  private pendingRecordGameFromDraft = false;
  private colorIconPlugin = {
    id: 'colorIconPlugin',
    afterDraw: (chart: Chart) => {
      if (!chart?.scales?.['x']) return;
      const xScale = chart.scales['x'];
      const ctx = chart.ctx;
      const labels = chart.data.labels || [];

      labels.forEach((label: unknown, index: number) => {
        const labelText = String(label);
        const colors = labelText === 'Colorless' || labelText === 'C'
          ? ['C']
          : labelText.split('');
        const iconSize = 16;
        const verticalStep = iconSize * 0.5;
        const isCombo = colors.length > 1;
        const totalWidth = isCombo ? iconSize : colors.length * iconSize;
        const totalHeight = isCombo ? iconSize + (colors.length - 1) * verticalStep : iconSize;
        const startX = xScale.getPixelForTick(index) - totalWidth / 2;
        const startY = xScale.bottom + 4;

        colors.forEach((c, i) => {
          const icon = this.getColorIcon(c);
          if (!icon?.complete) {
            icon.onload = () => chart.draw();
          }
          if (icon?.complete) {
            const x = startX;
            const y = isCombo ? startY + i * verticalStep : startY;
            ctx.drawImage(icon, x, y, iconSize, iconSize);
          }
        });
      });
    },
  };
  groupId = '';
  group = signal<GroupDetail | null>(null);
  ranking = signal<RankingEntryWithTrend[]>([]);
  games = signal<Game[]>([]);
  events = signal<GroupEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  rankingMode = signal<'current' | 'previous'>('current');
  showRankingTrends = computed(() =>
    this.ranking().some((entry) => entry.performanceRating > 0)
  );

  // For trend calculation: baseline = positions before last game, current = positions after last game
  private baselinePositions = new Map<string, number>();
  private storedCurrentPositions = new Map<string, number>();

  // Modal states
  showDeckModal = signal(false);
  showEditDeckModal = signal(false);
  showGameModal = signal(false);
  showEditGroupModal = signal(false);
  showMemberSettingsModal = signal(false);
  showGroupSettingsModal = signal(false);
  showSeasonSettingsModal = signal(false);
  showInviteUserModal = signal(false);

  // Deck form (create)
  deckName = '';
  deckColors = '';
  deckType = '';
  deckArchidektUrl = '';
  deckLoading = signal(false);
  deckError = signal<string | null>(null);
  colorDropdownOpen = false;

  // Edit deck form color dropdown
  editColorDropdownOpen = false;

  // Edit deck form
  editingDeck: Deck | null = null;
  editDeckName = '';
  editDeckColors = '';
  editDeckType = '';
  editDeckOwnerId = '';
  editDeckIsActive = true;
  editDeckArchidektUrl = '';
  editDeckLoading = signal(false);
  editDeckError = signal<string | null>(null);

  // Delete group
  deleteGroupLoading = signal(false);

  // Edit group form
  editGroupName = '';
  editGroupDescription = '';
  editGroupLoading = signal(false);
  editGroupError = signal<string | null>(null);

  // Group settings form
  editHistoryRetentionDays = 30;
  groupSettingsLoading = signal(false);
  groupSettingsError = signal<string | null>(null);
  seasonSettingsLoading = signal(false);
  seasonSettingsError = signal<string | null>(null);
  groupImageUploading = signal(false);
  groupImageError = signal<string | null>(null);
  groupImagePreview: string | null = null;
  private groupImageFile: File | null = null;
  editSeasonName = '';
  editSeasonEndsAt = '';
  editSeasonStartAt = '';
  editSeasonPauseDays = 0;
  editNextSeasonName = '';
  editNextSeasonStartsAt = '';
  editNextSeasonEndsAt = '';
  editNextSeasonIsSuccessive = false;
  editNextSeasonInterval: SeasonInterval | '' = '';
  editNextSeasonIntermissionDays = 0;
  readonly seasonIntervalOptions: Array<{ value: SeasonInterval; label: string }> = [
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BI_WEEKLY', label: 'Bi-weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'HALF_YEARLY', label: 'Half-yearly' },
    { value: 'YEARLY', label: 'Yearly' },
  ];
  seasonResetLoading = signal(false);

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
  isSmartphoneViewport = signal(false);
  showScrollTop = signal(false);
  viewportWidth = signal(0);
  viewportHeight = signal(0);

  // History filter
  historyFilter = signal<'all' | 'games' | 'events'>('all');

  // Collapsible cards
  decksCollapsed = signal(true);
  membersCollapsed = signal(true);

  // Statistics
  statsCategory = signal<'colors' | 'decks' | 'players'>('colors');
  statsOption = signal<string>('colors_perf_combo');
  statsDeckId = signal<string | null>(null);
  statsMessage = signal<string | null>(null);
  statsCollapsed = signal(false);
  statsDeckSearch = signal('');
  statsDeckDropdownOpen = signal(false);
  private statsDeckDropdownCloseTimer: ReturnType<typeof setTimeout> | null = null;

  // Member to remove (for confirmation)
  memberToRemove: { userId: string; user: { inAppName: string } } | null = null;

  // Applications (admin)
  groupApplications = signal<GroupApplication[]>([]);
  applicationsLoading = signal(false);
  applicationsError = signal<string | null>(null);
  applicationActionLoading = signal(false);

  // User invites (admin)
  inviteUserSearchQuery = '';
  inviteUserSearchResults = signal<InvitableUser[]>([]);
  inviteUserSearchLoading = signal(false);
  inviteUserSearchError = signal<string | null>(null);
  inviteUserSearchInfo = signal<string | null>(null);
  inviteUserActionLoading = signal(false);
  inviteUserActionError = signal<string | null>(null);
  inviteUserActionSuccess = signal<string | null>(null);
  inviteEmailAddress = '';
  inviteEmailLoading = signal(false);
  inviteEmailError = signal<string | null>(null);
  inviteEmailSuccess = signal<string | null>(null);

  // Game form
  gamePlacements: { deckId: string; rank: number; playerName: string }[] = [];
  gameLoading = signal(false);
  gameError = signal<string | null>(null);
  prefilledGame = signal(false);

  // Deck search
  deckDropdownOpen: boolean[] = [];
  deckSearchTerms: string[] = [];
  private dropdownCloseTimers: (ReturnType<typeof setTimeout> | null)[] = [];

  // Constants
  colorOptions = VALID_COLORS;
  typeOptions = VALID_DECK_TYPES;

  // Dynamic rank options based on number of players and existing ties
  getAvailableRanksForSlot(slotIndex: number): number[] {
    const count = this.gamePlacements.length;
    const otherRanks = this.gamePlacements
      .filter((_, i) => i !== slotIndex)
      .map((p) => Number(p.rank));

    const availableRanks: number[] = [];

    for (let testRank = 1; testRank <= count; testRank++) {
      const allRanks = [...otherRanks, testRank].sort((a, b) => a - b);
      if (isValidRankConfiguration(allRanks)) {
        availableRanks.push(testRank);
      }
    }

    return availableRanks;
  }

  // Get available decks for a placement slot (excludes already selected decks)
  getAvailableDecksForSlot(slotIndex: number): Deck[] {
    const selectedDeckIds = this.gamePlacements
      .filter((_, i) => i !== slotIndex)
      .map((p) => p.deckId)
      .filter((id) => id !== '');

    return this.activeDecks().filter((deck) => !selectedDeckIds.includes(deck.id));
  }

  // Get filtered decks based on search term
  getFilteredDecksForSlot(slotIndex: number): Deck[] {
    const availableDecks = this.getAvailableDecksForSlot(slotIndex);
    const searchTerm = (this.deckSearchTerms[slotIndex] || '').toLowerCase().trim();

    if (!searchTerm) {
      return availableDecks;
    }

    return availableDecks.filter((deck) =>
      deck.name.toLowerCase().includes(searchTerm)
    );
  }

  // Check if all deck slots have a deck selected
  allDecksSelected(): boolean {
    return this.gamePlacements.every((p) => !!p.deckId);
  }

  // Get deck name by ID
  getDeckNameById(deckId: string): string {
    if (!deckId) return '';
    const deck = this.activeDecks().find((d) => d.id === deckId);
    return deck?.name || '';
  }

  // Deck search handlers
  onDeckSearchInput(slotIndex: number, event: Event): void {
    if (this.prefilledGame()) return;
    const input = event.target as HTMLInputElement;
    this.deckSearchTerms[slotIndex] = input.value;
    // Clear selection when user starts typing
    if (this.gamePlacements[slotIndex].deckId) {
      this.gamePlacements[slotIndex].deckId = '';
    }
    this.deckDropdownOpen[slotIndex] = true;
  }

  openDeckDropdown(slotIndex: number): void {
    if (this.prefilledGame()) return;
    // Cancel any pending close
    if (this.dropdownCloseTimers[slotIndex]) {
      clearTimeout(this.dropdownCloseTimers[slotIndex]!);
      this.dropdownCloseTimers[slotIndex] = null;
    }
    this.deckDropdownOpen[slotIndex] = true;
  }

  closeDeckDropdownDelayed(slotIndex: number): void {
    if (this.prefilledGame()) return;
    // Delay close to allow click on dropdown item
    this.dropdownCloseTimers[slotIndex] = setTimeout(() => {
      this.deckDropdownOpen[slotIndex] = false;
      // Reset search term to selected deck name if one is selected
      if (this.gamePlacements[slotIndex].deckId) {
        this.deckSearchTerms[slotIndex] = '';
      }
    }, 200);
  }

  selectDeck(slotIndex: number, deckId: string, deckName: string): void {
    if (this.prefilledGame()) return;
    // Cancel any pending close timer
    if (this.dropdownCloseTimers[slotIndex]) {
      clearTimeout(this.dropdownCloseTimers[slotIndex]!);
      this.dropdownCloseTimers[slotIndex] = null;
    }
    this.gamePlacements[slotIndex].deckId = deckId;
    this.deckSearchTerms[slotIndex] = '';
    this.deckDropdownOpen[slotIndex] = false;
  }

  clearDeckSelection(slotIndex: number): void {
    if (this.prefilledGame()) return;
    this.gamePlacements[slotIndex].deckId = '';
    this.deckSearchTerms[slotIndex] = '';
  }

  // Close all deck dropdowns (called when clicking outside)
  closeAllDeckDropdowns(): void {
    for (let i = 0; i < this.deckDropdownOpen.length; i++) {
      this.deckDropdownOpen[i] = false;
    }
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private groupDetailApiService = inject(GroupDetailApiService);
  private authService = inject(AuthService);
  private navigationHistoryService = inject(NavigationHistoryService);

  isAdmin = computed(() => this.group()?.userRole === 'ADMIN');
  currentUserId = this.authService.currentUserId;
  isEmailVerified = this.authService.isEmailVerified;
  activeDecks = computed(() =>
    this.group()?.decks.filter((d) => d.isActive) || []
  );
  memberNames = computed(() =>
    this.group()?.members.map((m) => m.user.inAppName) || []
  );
  adminCount = computed(
    () => this.group()?.members.filter((m) => m.role === 'ADMIN').length || 0
  );
  deckOwnerOptions = computed(() =>
    (this.group()?.members || [])
      .map((member) => ({
        id: member.user.id,
        inAppName: member.user.inAppName,
      }))
      .sort((a, b) => a.inAppName.localeCompare(b.inAppName))
  );
  isSeasonPaused = computed(() => {
    const pauseUntil = this.group()?.seasonPauseUntil;
    if (!pauseUntil) return false;
    return new Date() < new Date(pauseUntil);
  });
  snapshotAvailable = computed(() => {
    return !!this.group()?.lastSeasonId;
  });
  endSeasonHint = computed(() => {
    const group = this.group();
    if (hasActiveSeasonData(group)) {
      return 'Ends current league immediately and creates a ranking snapshot.';
    }
    if (hasNextSeasonData(group)) {
      return 'Removes the planned next season and clears the active pause.';
    }
    return 'Ends current league immediately and creates a ranking snapshot.';
  });
  canResetSeason = computed(() => {
    const group = this.group();
    if (!group) return false;
    return hasActiveSeasonData(group) || hasNextSeasonData(group);
  });
  seasonCountdown = computed(() => {
    const endsAt = this.group()?.activeSeasonEndsAt;
    if (!endsAt) return null;
    const now = new Date();
    const end = new Date(endsAt);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 'Season ending now';
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `Ends in ${days}d ${hours}h`;
  });
  seasonCountdownState = computed(() => {
    const endsAt = this.group()?.activeSeasonEndsAt;
    if (!endsAt) return 'normal';
    const diffDays = (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) return 'critical';
    if (diffDays <= 7) return 'warning';
    return 'normal';
  });
  // Default deck image when no Archidekt image is available
  readonly defaultDeckImage = '/assets/images/deckBG_default.jpg';
  readonly defaultGroupImage = '/assets/images/deckBG_default.jpg';

  // Get sorted colors in WUBRG order
  getSortedColors(colors: string): string[] {
    return toSortedColors(colors);
  }

  // Get CSS gradient for deck border based on colors
  getColorGradient(colors: string): string {
    return toColorGradient(colors);
  }

  // Get mana symbol paths for display
  getManaSymbols(colors: string): string[] {
    return toManaSymbols(colors);
  }

  // Get normalized deck type label (falls back to Unknown)
  getDeckTypeLabel(type: string | undefined): string {
    return toDeckTypeLabel(type);
  }

  // Ranking pagination
  readonly rankingPageSize = 10;
  rankingPage = signal(1);

  rankingTotalPages = computed(() =>
    Math.ceil(this.ranking().length / this.rankingPageSize)
  );

  paginatedRanking = computed(() => {
    const start = (this.rankingPage() - 1) * this.rankingPageSize;
    return this.ranking().slice(start, start + this.rankingPageSize);
  });

  setRankingPage(page: number): void {
    if (page >= 1 && page <= this.rankingTotalPages()) {
      this.rankingPage.set(page);
    }
  }

  // Decks search and pagination
  readonly decksPageSize = 10;
  decksPage = signal(1);
  decksSearchTerm = signal('');
  deckSortMode = signal<'name' | 'type' | 'colors'>('name');

  filteredDecks = computed(() => {
    const decks = this.sortedDecks();
    return filterDecks(decks, this.decksSearchTerm());
  });

  decksTotalPages = computed(() =>
    getDecksTotalPages(this.filteredDecks().length, this.decksPageSize)
  );

  paginatedDecks = computed(() => {
    return paginateDecks(this.filteredDecks(), this.decksPage(), this.decksPageSize);
  });

  setDecksPage(page: number): void {
    if (page >= 1 && page <= this.decksTotalPages()) {
      this.decksPage.set(page);
    }
  }

  setDecksSearch(term: string): void {
    this.decksSearchTerm.set(term);
    this.decksPage.set(1); // Reset to first page when search changes
  }

  setDeckSortMode(mode: 'name' | 'type' | 'colors'): void {
    this.deckSortMode.set(mode);
    this.decksPage.set(1);
  }

  sortedDecks = computed(() => {
    const decks = this.group()?.decks || [];
    return sortDecks(decks, this.deckSortMode());
  });

  filteredStatsDecks = computed(() => {
    return filterStatsDecks(this.sortedDecks(), this.statsDeckSearch());
  });

  // History pagination
  readonly historyPageSize = 10;
  historyPage = signal(1);

  historyTotalPages = computed(() =>
    Math.ceil(this.filteredHistory().length / this.historyPageSize)
  );

  paginatedHistory = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize;
    return this.filteredHistory().slice(start, start + this.historyPageSize);
  });

  setHistoryPage(page: number): void {
    if (page >= 1 && page <= this.historyTotalPages()) {
      this.historyPage.set(page);
    }
  }

  // Get deck image URL by deck ID (for ranking display)
  getDeckImageUrl(deckId: string): string | null {
    const deck = this.group()?.decks.find((d) => d.id === deckId);
    return deck?.archidektImageUrl || null;
  }

  // Get Archidekt URL by deck ID
  getArchidektUrl(deckId: string): string | null {
    const deck = this.group()?.decks.find((d) => d.id === deckId);
    return deck?.archidektId ? `https://archidekt.com/decks/${deck.archidektId}` : null;
  }

  // Combined history of games and events, sorted by date
  history = computed(() =>
    buildHistoryItems(
      this.games(),
      this.events(),
      this.group()?.historyRetentionDays ?? 30,
    )
  );

  // Filtered history based on selected filter
  filteredHistory = computed(() => {
    const filter = this.historyFilter();
    const items = this.history();

    return filterHistoryItems(items, filter);
  });

  constructor() {}

  ngOnInit(): void {
    this.updateViewportState();
    this.updateScrollTopVisibility();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('orientationchange', this.onViewportChange);
      window.addEventListener('scroll', this.onScrollChange);
      window.visualViewport?.addEventListener('resize', this.onViewportChange);
      window.visualViewport?.addEventListener('scroll', this.onViewportChange);
    }
    this.groupId = this.route.snapshot.params['id'];
    this.pendingRecordGameFromDraft =
      this.route.snapshot.queryParamMap.get('openRecordGame') === '1';
    this.loadStoredPositions();
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    setTimeout(() => this.renderStatsChart(), 0);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onViewportChange);
      window.removeEventListener('orientationchange', this.onViewportChange);
      window.removeEventListener('scroll', this.onScrollChange);
      window.visualViewport?.removeEventListener('resize', this.onViewportChange);
      window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
    }
    if (this.statsChart) {
      this.statsChart.destroy();
      this.statsChart = null;
    }
  }

  private onViewportChange = (): void => {
    this.updateViewportState();
  };

  private onScrollChange = (): void => {
    this.updateScrollTopVisibility();
  };

  private updateViewportState(): void {
    if (typeof window === 'undefined') return;
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    this.viewportWidth.set(Math.round(width));
    this.viewportHeight.set(Math.round(height));
    this.isSmartphoneViewport.set(width < 768);
  }

  private updateScrollTopVisibility(): void {
    if (typeof window === 'undefined') return;
    this.showScrollTop.set(window.scrollY > 280);
  }

  scrollToTop(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const group = await firstValueFrom(this.groupDetailApiService.getGroup(this.groupId));
      this.group.set(group);

      const gamesLimit = this.getGamesLoadLimit(group);
      const [games, events] = await Promise.all([
        firstValueFrom(this.groupDetailApiService.getGames(this.groupId, gamesLimit)),
        firstValueFrom(this.groupDetailApiService.getEvents(this.groupId)),
      ]);

      this.games.set(games);
      this.events.set(events);

      if (group.userRole === 'ADMIN') {
        this.loadGroupApplications();
      } else {
        this.groupApplications.set([]);
      }

      this.loadRanking(this.rankingMode() === 'previous');
      if (this.pendingRecordGameFromDraft || sessionStorage.getItem('playGameRecordDraft')) {
        const opened = this.openRecordGameFromDraft();
        this.pendingRecordGameFromDraft = false;
        this.clearOpenRecordGameQueryParam();
        if (!opened) {
          this.showAlert('Error', 'Could not load the live game draft.');
        }
      }
      this.renderStatsChart();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'error' in err &&
        typeof (err as { error?: { message?: string } }).error?.message === 'string'
          ? (err as { error?: { message?: string } }).error!.message!
          : 'Failed to load group';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  private getGamesLoadLimit(group: GroupDetail | null): number {
    const retentionDays = group?.historyRetentionDays ?? 30;
    const computedLimit = retentionDays * 5;
    return Math.min(1000, Math.max(100, computedLimit));
  }

  loadGroupApplications(): void {
    this.applicationsLoading.set(true);
    this.applicationsError.set(null);

    this.groupDetailApiService.getGroupApplications(this.groupId).subscribe({
      next: (apps) => {
        this.groupApplications.set(apps);
        this.applicationsLoading.set(false);
      },
      error: (err) => {
        this.applicationsError.set('Unable to load applications right now.');
        this.applicationsLoading.set(false);
      },
    });
  }

  loadRanking(snapshot = false): void {
    this.groupDetailApiService.getRanking(this.groupId, snapshot).subscribe({
      next: (ranking) => {
        if (snapshot) {
          this.ranking.set(
            ranking.map((entry) => ({ ...entry, trend: 'same' as const, positionChange: 0 }))
          );
          return;
        }

        const isFirstLoad = this.storedCurrentPositions.size === 0;
        const rankingChanged =
          !isFirstLoad && hasRankingChanged(ranking, this.storedCurrentPositions);

        if (rankingChanged) {
          this.baselinePositions = new Map(this.storedCurrentPositions);
        }

        const rankingWithTrends: RankingEntryWithTrend[] = buildRankingWithTrends(
          ranking,
          this.baselinePositions,
          isFirstLoad,
        );

        if (isFirstLoad || rankingChanged) {
          this.savePositions(ranking, isFirstLoad);
        }

        this.ranking.set(rankingWithTrends);
      },
      error: () => {
        this.ranking.set([]);
      },
    });
  }

  private getStorageKey(): string {
    return getRankingStorageKey(this.groupId);
  }

  private loadStoredPositions(): void {
    const state = loadRankingStoredState(localStorage, this.getStorageKey());
    this.baselinePositions = state.baselinePositions;
    this.storedCurrentPositions = state.currentPositions;
  }

  private savePositions(ranking: RankingEntry[], isFirstLoad: boolean): void {
    const currentPositions = toPositionRecord(ranking);

    let baselineToSave: Record<string, number>;

    if (isFirstLoad) {
      // On first load, baseline = current (so no trends are shown initially)
      baselineToSave = { ...currentPositions };
      this.baselinePositions = toPositionMap(baselineToSave);
    } else {
      // On subsequent saves (ranking changed), use the in-memory baseline
      baselineToSave = mapToPositionRecord(this.baselinePositions);
    }

    saveRankingStoredState(
      localStorage,
      this.getStorageKey(),
      baselineToSave,
      currentPositions,
    );

    // Update in-memory current positions
    this.storedCurrentPositions = toPositionMap(currentPositions);
  }

  goBack(): void {
    const fallback = this.authService.isAuthenticated() ? '/groups' : '/login';
    this.router.navigateByUrl(
      this.navigationHistoryService.getBackTarget(this.router.url, fallback),
    );
  }

  copyInviteCode(): void {
    const code = this.group()?.inviteCode;
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  // Body scroll locking for modals
  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }

  // Deck Modal
  openDeckModal(): void {
    this.deckName = '';
    this.deckColors = '';
    this.deckType = '';
    this.deckArchidektUrl = '';
    this.deckError.set(null);
    this.showDeckModal.set(true);
    this.lockBodyScroll();
  }

  closeDeckModal(): void {
    this.showDeckModal.set(false);
    this.colorDropdownOpen = false;
    this.unlockBodyScroll();
  }

  // Color dropdown methods (Add Deck)
  openColorDropdown(): void {
    this.colorDropdownOpen = true;
  }

  closeColorDropdown(): void {
    this.colorDropdownOpen = false;
  }

  closeColorDropdownDelayed(): void {
    setTimeout(() => {
      this.colorDropdownOpen = false;
    }, 150);
  }

  selectColor(color: string): void {
    this.deckColors = color;
    this.colorDropdownOpen = false;
  }

  // Color dropdown methods (Edit Deck)
  openEditColorDropdown(): void {
    this.editColorDropdownOpen = true;
  }

  closeEditColorDropdown(): void {
    this.editColorDropdownOpen = false;
  }

  closeEditColorDropdownDelayed(): void {
    setTimeout(() => {
      this.editColorDropdownOpen = false;
    }, 150);
  }

  selectEditColor(color: string): void {
    this.editDeckColors = color;
    this.editColorDropdownOpen = false;
  }

  createDeck(): void {
    const validation = validateDeckFormInput({
      name: this.deckName,
      colors: this.deckColors,
      type: this.deckType,
      archidektUrl: this.deckArchidektUrl,
      allowedColors: this.colorOptions,
      allowedTypes: this.typeOptions,
    });
    if (validation.error || !validation.value) {
      this.deckError.set(validation.error ?? 'Invalid deck input');
      return;
    }

    this.deckLoading.set(true);
    this.deckError.set(null);

    this.groupDetailApiService
      .createDeck({
        name: validation.value.name,
        colors: validation.value.colors,
        type: validation.value.type,
        groupId: this.groupId,
        archidektUrl: validation.value.archidektUrl,
      })
      .subscribe({
        next: () => {
          this.deckLoading.set(false);
          this.showDeckModal.set(false);
          this.unlockBodyScroll();
          this.loadData();
        },
        error: (err) => {
          this.deckLoading.set(false);
          this.deckError.set(resolveApiErrorMessage(err, 'Failed to create deck'));
        },
      });
  }

  // Game Modal
  openPlayGame(): void {
    if (this.isSmartphoneViewport()) {
      this.showAlert(
        'Display too small',
        'New Game is not available on smartphones. Please use Record Game instead.',
        'info'
      );
      return;
    }
    if (!this.canStartPlayGame()) return;
    this.router.navigate(['/groups', this.groupId, 'play']);
  }

  canStartPlayGame(): boolean {
    if (!this.isEmailVerified()) return false;
    if (!this.isAdmin()) return false;
    if (this.isSeasonPaused()) return false;
    if (this.isSmartphoneViewport()) return false;
    const decks = this.group()?.decks || [];
    const activeDecks = decks.filter((deck) => deck.isActive);
    return activeDecks.length >= 2;
  }

  playGameDisabledReason(): string {
    if (!this.isEmailVerified()) {
      return 'Verify your email to start a live game';
    }
    if (!this.isAdmin()) {
      return 'Only group admins can start New Game';
    }
    if (this.isSeasonPaused()) {
      const pauseUntil = this.group()?.seasonPauseUntil;
      if (pauseUntil) {
        return `Season is paused until ${this.formatDate(pauseUntil)}.`;
      }
      return 'Season is paused. Recording games is disabled.';
    }
    if (this.isSmartphoneViewport()) {
      return 'Display too small for New Game. Please use Record Game.';
    }
    return this.canStartPlayGame()
      ? 'Start a new live game'
      : 'Add at least two active decks to start a live game';
  }

  private openRecordGameFromDraft(): boolean {
    const draft = sessionStorage.getItem('playGameRecordDraft');
    if (!draft) return false;
    try {
      const data = JSON.parse(draft) as {
        groupId: string;
        placements: { deckId: string; rank: number; playerName?: string }[];
      };
      if (data.groupId !== this.groupId) return false;
      this.gamePlacements = data.placements
        .filter((p) => p.deckId)
        .map((p) => ({
          deckId: p.deckId,
          rank: p.rank,
          playerName: p.playerName || '',
        }))
        .sort((a, b) => a.rank - b.rank);
      this.deckSearchTerms = [];
      this.deckDropdownOpen = [];
      this.gameError.set(null);
      this.prefilledGame.set(true);
      this.showGameModal.set(true);
      this.lockBodyScroll();
      sessionStorage.removeItem('playGameRecordDraft');
      return true;
    } catch {
      sessionStorage.removeItem('playGameRecordDraft');
      return false;
    }
  }

  private clearOpenRecordGameQueryParam(): void {
    if (this.route.snapshot.queryParamMap.has('openRecordGame')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openRecordGame: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  openGameModal(): void {
    // Initialize with 2 slots (minimum for a game)
    this.gamePlacements = [
      { deckId: '', rank: 1, playerName: '' },
      { deckId: '', rank: 2, playerName: '' },
    ];
    this.deckSearchTerms = [];
    this.deckDropdownOpen = [];
    this.gameError.set(null);
    this.prefilledGame.set(false);
    this.showGameModal.set(true);
    this.lockBodyScroll();
  }

  closeGameModal(): void {
    this.showGameModal.set(false);
    this.prefilledGame.set(false);
    this.unlockBodyScroll();
  }

  addPlayer(): void {
    if (this.prefilledGame()) return;
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
    if (this.prefilledGame()) return;
    const removedRank = Number(this.gamePlacements[index].rank);
    this.gamePlacements.splice(index, 1);

    // Shift down all ranks that were higher than the removed rank
    this.gamePlacements.forEach((p) => {
      if (Number(p.rank) > removedRank) {
        p.rank = Number(p.rank) - 1;
      }
    });
  }

  createGame(): void {
    const validation = validateGamePlacementsInput(this.gamePlacements);
    if (validation.error || !validation.value) {
      this.gameError.set(validation.error ?? 'Invalid game input');
      return;
    }

    this.gameLoading.set(true);
    this.gameError.set(null);

    this.groupDetailApiService
      .createGame({
        groupId: this.groupId,
        placements: validation.value,
      })
      .subscribe({
        next: () => {
          this.gameLoading.set(false);
          this.showGameModal.set(false);
          this.unlockBodyScroll();
          this.loadData();
        },
        error: (err) => {
          this.gameLoading.set(false);
          this.gameError.set(resolveApiErrorMessage(err, 'Failed to record game'));
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

    this.groupDetailApiService.undoLastGame(this.groupId).subscribe({
      next: () => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.loadData();
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to undo game'));
      },
    });
  }

  // Edit Deck Modal
  openEditDeckModal(deck: Deck): void {
    this.editingDeck = deck;
    this.editDeckName = deck.name;
    this.editDeckColors = deck.colors;
    this.editDeckType = deck.type || '';
    this.editDeckOwnerId = deck.owner.id;
    this.editDeckIsActive = deck.isActive;
    this.editDeckArchidektUrl = deck.archidektId
      ? `https://archidekt.com/decks/${deck.archidektId}`
      : '';
    this.editDeckError.set(null);
    this.showEditDeckModal.set(true);
    this.lockBodyScroll();
  }

  closeEditDeckModal(): void {
    this.showEditDeckModal.set(false);
    this.editingDeck = null;
    this.editDeckOwnerId = '';
    this.editColorDropdownOpen = false;
    this.unlockBodyScroll();
  }

  canEditDeck(deck: Deck): boolean {
    return this.isAdmin() || deck.owner.id === this.currentUserId();
  }

  updateDeck(): void {
    if (!this.editingDeck) {
      this.editDeckError.set('Deck not found');
      return;
    }
    const validation = validateDeckFormInput({
      name: this.editDeckName,
      colors: this.editDeckColors,
      type: this.editDeckType,
      archidektUrl: this.editDeckArchidektUrl,
      allowedColors: this.colorOptions,
      allowedTypes: this.typeOptions,
    });
    if (validation.error || !validation.value) {
      this.editDeckError.set(validation.error ?? 'Invalid deck input');
      return;
    }

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.groupDetailApiService
      .updateDeck(this.editingDeck.id, {
        name: validation.value.name,
        colors: validation.value.colors,
        type: validation.value.type,
        isActive: this.editDeckIsActive,
        archidektUrl: validation.value.archidektUrl,
      })
      .subscribe({
        next: () => {
          this.editDeckLoading.set(false);
          this.showEditDeckModal.set(false);
          this.editingDeck = null;
          this.unlockBodyScroll();
          this.loadData();
        },
        error: (err) => {
          this.editDeckLoading.set(false);
          this.editDeckError.set(resolveApiErrorMessage(err, 'Failed to update deck'));
        },
      });
  }

  refreshArchidekt(): void {
    if (!this.editingDeck?.archidektId) return;

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.groupDetailApiService.refreshDeckArchidekt(this.editingDeck.id).subscribe({
      next: (updatedDeck) => {
        this.editDeckLoading.set(false);
        this.editingDeck = updatedDeck;
        this.showAlert('Success', 'Archidekt data refreshed successfully', 'success');
      },
      error: (err) => {
        this.editDeckLoading.set(false);
        this.editDeckError.set(resolveApiErrorMessage(err, 'Failed to refresh Archidekt data'));
      },
    });
  }

  requestDeleteDeck(): void {
    if (!this.editingDeck) return;
    this.showConfirmation(
      'Delete deck',
      `Delete deck "${this.editingDeck.name}"? This cannot be undone.`,
      () => this.executeDeleteDeck()
    );
  }

  private executeDeleteDeck(): void {
    if (!this.editingDeck) return;
    this.confirmModalLoading.set(true);
    this.editDeckError.set(null);

    this.groupDetailApiService.deleteDeck(this.editingDeck.id).subscribe({
      next: () => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showEditDeckModal.set(false);
        this.editingDeck = null;
        this.loadData();
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to delete deck'));
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

  promoteMember(member: { userId: string; user: { inAppName: string } }): void {
    this.groupDetailApiService.updateMemberRole(this.groupId, member.userId, 'ADMIN').subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to promote member'));
      },
    });
  }

  demoteMember(member: { userId: string; user: { inAppName: string } }): void {
    this.groupDetailApiService.updateMemberRole(this.groupId, member.userId, 'MEMBER').subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to demote member'));
      },
    });
  }

  promoteMemberById(userId: string): void {
    const member = this.group()?.members.find((m) => m.userId === userId);
    if (!member) return;
    this.promoteMember(member);
  }

  demoteMemberById(userId: string): void {
    const member = this.group()?.members.find((m) => m.userId === userId);
    if (!member) return;
    this.demoteMember(member);
  }

  removeMemberById(userId: string): void {
    const member = this.group()?.members.find((m) => m.userId === userId);
    if (!member) return;
    this.removeMember(member);
  }

  private executeRemoveMember(): void {
    if (!this.memberToRemove) return;

    this.confirmModalLoading.set(true);

    this.groupDetailApiService.removeMember(this.groupId, this.memberToRemove.userId).subscribe({
      next: () => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.loadData();
      },
      error: (err) => {
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to remove member'));
      },
    });
  }

  acceptApplication(userId: string): void {
    if (this.applicationActionLoading()) return;
    this.applicationActionLoading.set(true);
    this.groupDetailApiService.acceptGroupApplication(this.groupId, userId).subscribe({
      next: () => {
        this.applicationActionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.applicationActionLoading.set(false);
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to accept application'));
      },
    });
  }

  rejectApplication(userId: string): void {
    if (this.applicationActionLoading()) return;
    this.applicationActionLoading.set(true);
    this.groupDetailApiService.rejectGroupApplication(this.groupId, userId).subscribe({
      next: () => {
        this.applicationActionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.applicationActionLoading.set(false);
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to reject application'));
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

    this.groupDetailApiService.regenerateInviteCode(this.groupId).subscribe({
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
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to regenerate invite code'));
      },
    });
  }

  // Edit Group Modal
  openEditGroupModal(): void {
    const group = this.group();
    if (!group) return;

    this.editGroupName = group.name;
    this.editGroupDescription = group.description || '';
    this.editGroupError.set(null);
    this.showEditGroupModal.set(true);
    this.lockBodyScroll();
  }

  closeEditGroupModal(): void {
    this.showEditGroupModal.set(false);
    this.unlockBodyScroll();
  }

  openGroupSettingsModal(): void {
    const group = this.group();
    if (!group) return;

    this.editHistoryRetentionDays = group.historyRetentionDays ?? 30;
    this.groupSettingsError.set(null);
    this.groupImageError.set(null);
    this.groupImagePreview = null;
    this.groupImageFile = null;
    this.showGroupSettingsModal.set(true);
    this.lockBodyScroll();
  }

  closeGroupSettingsModal(): void {
    this.showGroupSettingsModal.set(false);
    this.groupImagePreview = null;
    this.groupImageFile = null;
    this.unlockBodyScroll();
  }

  openSeasonSettingsModal(): void {
    const group = this.group();
    if (!group) return;

    this.editSeasonName = group.activeSeasonName || '';
    this.editSeasonEndsAt = group.activeSeasonEndsAt
      ? group.activeSeasonEndsAt.slice(0, 10)
      : '';
    this.editSeasonStartAt = group.activeSeasonStartedAt
      ? group.activeSeasonStartedAt.slice(0, 10)
      : '';
    this.editSeasonPauseDays = group.seasonPauseDays ?? 0;
    this.editNextSeasonName = group.nextSeasonName || '';
    this.editNextSeasonStartsAt = group.nextSeasonStartsAt
      ? group.nextSeasonStartsAt.slice(0, 10)
      : '';
    this.editNextSeasonEndsAt = group.nextSeasonEndsAt
      ? group.nextSeasonEndsAt.slice(0, 10)
      : '';
    this.editNextSeasonIsSuccessive = group.nextSeasonIsSuccessive ?? false;
    this.editNextSeasonInterval = group.nextSeasonInterval || '';
    this.editNextSeasonIntermissionDays = group.nextSeasonIntermissionDays ?? 0;
    this.seasonSettingsError.set(null);
    this.showSeasonSettingsModal.set(true);
    this.lockBodyScroll();
  }

  closeSeasonSettingsModal(): void {
    this.showSeasonSettingsModal.set(false);
    this.unlockBodyScroll();
  }

  openMemberSettingsModal(): void {
    this.showMemberSettingsModal.set(true);
    if (this.isAdmin()) {
      this.loadGroupApplications();
    }
    this.lockBodyScroll();
  }

  closeMemberSettingsModal(): void {
    this.showMemberSettingsModal.set(false);
    this.unlockBodyScroll();
  }

  openInviteUserModal(): void {
    if (!this.isAdmin()) return;

    this.inviteUserSearchQuery = '';
    this.inviteUserSearchResults.set([]);
    this.inviteUserSearchError.set(null);
    this.inviteUserSearchInfo.set(null);
    this.inviteUserActionError.set(null);
    this.inviteUserActionSuccess.set(null);
    this.inviteEmailAddress = '';
    this.inviteEmailError.set(null);
    this.inviteEmailSuccess.set(null);
    this.showInviteUserModal.set(true);
    this.lockBodyScroll();
  }

  closeInviteUserModal(): void {
    this.showInviteUserModal.set(false);
    this.unlockBodyScroll();
  }

  searchInvitableUsers(): void {
    const validation = validateInviteSearchQuery(this.inviteUserSearchQuery);
    if (validation.error || !validation.value) {
      this.inviteUserSearchResults.set([]);
      this.inviteUserSearchError.set(validation.error ?? 'Invalid search query');
      this.inviteUserSearchInfo.set(null);
      return;
    }
    const query = validation.value;
    this.inviteUserSearchQuery = query;

    this.inviteUserSearchLoading.set(true);
    this.inviteUserSearchError.set(null);
    this.inviteUserSearchInfo.set(null);
    this.inviteUserActionError.set(null);
    this.inviteUserActionSuccess.set(null);

    this.groupDetailApiService.searchInvitableUsers(this.groupId, query).subscribe({
      next: (response) => {
        this.inviteUserSearchResults.set(response.items);
        this.inviteUserSearchInfo.set(response.infoMessage ?? null);
        this.inviteUserSearchLoading.set(false);
      },
      error: (err) => {
        this.inviteUserSearchLoading.set(false);
        this.inviteUserSearchInfo.set(null);
        this.inviteUserSearchError.set(resolveApiErrorMessage(err, 'Failed to search users'));
      },
    });
  }

  sendUserInvite(targetUserId: string): void {
    if (this.inviteUserActionLoading()) return;

    this.inviteUserActionLoading.set(true);
    this.inviteUserActionError.set(null);
    this.inviteUserActionSuccess.set(null);
    this.inviteUserSearchInfo.set(null);

    this.groupDetailApiService.createUserInvite(this.groupId, targetUserId).subscribe({
      next: (result) => {
        this.inviteUserActionLoading.set(false);
        this.inviteUserActionSuccess.set(result.message || 'Invite sent');
        this.inviteUserSearchResults.set(
          this.inviteUserSearchResults().filter((user) => user.id !== targetUserId),
        );
      },
      error: (err) => {
        this.inviteUserActionLoading.set(false);
        this.inviteUserActionError.set(resolveApiErrorMessage(err, 'Failed to send invite'));
      },
    });
  }

  sendEmailInvite(): void {
    const validation = validateInviteEmailInput(this.inviteEmailAddress);
    if (validation.error || !validation.value) {
      this.inviteEmailError.set(validation.error ?? 'Invalid email address');
      return;
    }
    const email = validation.value;

    this.inviteEmailLoading.set(true);
    this.inviteEmailError.set(null);
    this.inviteEmailSuccess.set(null);

    this.groupDetailApiService.createEmailInvite(this.groupId, email).subscribe({
      next: (result) => {
        this.inviteEmailLoading.set(false);
        this.inviteEmailSuccess.set(result.message || 'Email invite sent');
        this.inviteEmailAddress = '';
      },
      error: (err) => {
        this.inviteEmailLoading.set(false);
        this.inviteEmailError.set(resolveApiErrorMessage(err, 'Failed to send email invite'));
      },
    });
  }

  updateGroup(): void {
    const validation = validateGroupEditInput(this.editGroupName, this.editGroupDescription);
    if (validation.error || !validation.value) {
      this.editGroupError.set(validation.error ?? 'Invalid group input');
      return;
    }

    this.editGroupLoading.set(true);
    this.editGroupError.set(null);

    this.groupDetailApiService
      .updateGroup(this.groupId, {
        name: validation.value.name,
        description: validation.value.description,
      })
      .subscribe({
        next: () => {
          this.editGroupLoading.set(false);
          this.showEditGroupModal.set(false);
          this.unlockBodyScroll();
          this.loadData();
        },
        error: (err) => {
          this.editGroupLoading.set(false);
          this.editGroupError.set(resolveApiErrorMessage(err, 'Failed to update group'));
        },
      });
  }

  updateGroupSettings(): void {
    this.groupSettingsLoading.set(true);
    this.groupSettingsError.set(null);

    this.groupDetailApiService
      .updateGroup(this.groupId, {
        historyRetentionDays: this.editHistoryRetentionDays,
      })
      .subscribe({
        next: () => {
          this.groupSettingsLoading.set(false);
          this.showGroupSettingsModal.set(false);
          this.unlockBodyScroll();
          this.loadData();
        },
        error: (err) => {
          this.groupSettingsLoading.set(false);
          this.groupSettingsError.set(resolveApiErrorMessage(err, 'Failed to update settings'));
        },
      });
  }

  assignDeckOwner(): void {
    if (!this.editingDeck) return;

    const validation = validateDeckOwnerAssignmentInput({
      ownerId: this.editDeckOwnerId,
      currentOwnerId: this.editingDeck.owner.id,
      knownOwnerIds: new Set(this.deckOwnerOptions().map((member) => member.id)),
    });
    if (validation.error || !validation.value) {
      this.editDeckError.set(validation.error ?? 'Invalid owner selection');
      return;
    }
    if (validation.value.noChange) {
      return;
    }

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.groupDetailApiService
      .updateDeck(this.editingDeck.id, { ownerId: validation.value.ownerId })
      .subscribe({
        next: (updatedDeck) => {
          this.editDeckLoading.set(false);
          const stillCanEditDeck = this.canEditDeck(updatedDeck);
          this.editingDeck = updatedDeck;
          this.editDeckOwnerId = updatedDeck.owner.id;

          if (!stillCanEditDeck) {
            this.closeEditDeckModal();
          }

          this.showAlert(
            'Success',
            `Deck owner assigned to ${updatedDeck.owner.inAppName}.`,
            'success',
          );
          this.loadData();
        },
        error: (err) => {
          this.editDeckLoading.set(false);
          this.editDeckError.set(
            resolveApiErrorMessage(err, 'Failed to assign deck owner'),
          );
        },
      });
  }

  updateSeasonSettings(): void {
    const dayValidationError = validateSeasonDayInputs(
      this.editSeasonPauseDays,
      this.editNextSeasonIntermissionDays,
    );
    if (dayValidationError) {
      this.seasonSettingsError.set(dayValidationError);
      return;
    }

    const nextSeasonStartMin = getNextSeasonStartMinDateFromState({
      editSeasonEndsAt: this.editSeasonEndsAt,
      editSeasonPauseDays: this.editSeasonPauseDays,
      seasonPauseUntil: this.group()?.seasonPauseUntil,
    });
    if (
      this.editNextSeasonStartsAt &&
      nextSeasonStartMin &&
      this.editNextSeasonStartsAt < nextSeasonStartMin
    ) {
      this.seasonSettingsError.set(
        `Next season start must be on or after ${nextSeasonStartMin}.`,
      );
      return;
    }

    this.seasonSettingsLoading.set(true);
    this.seasonSettingsError.set(null);
    const seasonStartLocked = !!this.group()?.activeSeasonStartedAt;

    this.groupDetailApiService
      .updateGroup(this.groupId, {
        activeSeasonName: this.editSeasonName.trim() || null,
        activeSeasonEndsAt: this.editSeasonEndsAt || null,
        activeSeasonStartedAt: seasonStartLocked ? undefined : this.editSeasonStartAt || null,
        seasonPauseDays: this.editSeasonPauseDays,
        nextSeasonName: this.editNextSeasonName.trim() || null,
        nextSeasonStartsAt: this.editNextSeasonStartsAt || null,
        nextSeasonEndsAt: this.editNextSeasonEndsAt || null,
        nextSeasonIsSuccessive: this.editNextSeasonIsSuccessive,
        nextSeasonInterval: this.editNextSeasonIsSuccessive
          ? this.editNextSeasonInterval || null
          : null,
        nextSeasonIntermissionDays: this.editNextSeasonIsSuccessive
          ? this.editNextSeasonIntermissionDays
          : 0,
      })
      .subscribe({
        next: () => {
          this.seasonSettingsLoading.set(false);
          this.closeSeasonSettingsModal();
          this.loadData();
        },
        error: (err) => {
          this.seasonSettingsLoading.set(false);
          this.seasonSettingsError.set(resolveApiErrorMessage(err, 'Failed to update season settings'));
        },
      });
  }

  onNextSeasonSuccessiveChange(enabled: boolean): void {
    this.editNextSeasonIsSuccessive = enabled;
    if (enabled && !this.editNextSeasonInterval) {
      this.editNextSeasonInterval = 'MONTHLY';
    }
    if (!enabled) {
      this.editNextSeasonIntermissionDays = 0;
    }
  }

  getNextSeasonStartMinDate(): string {
    return getNextSeasonStartMinDateFromState({
      editSeasonEndsAt: this.editSeasonEndsAt,
      editSeasonPauseDays: this.editSeasonPauseDays,
      seasonPauseUntil: this.group()?.seasonPauseUntil,
    });
  }

  requestEndSeason(): void {
    const group = this.group();
    const activeSeasonDataAvailable = hasActiveSeasonData(group);
    const confirmationMessage = activeSeasonDataAvailable
      ? 'Do you want to end the current season now? This ends the current league immediately and creates a ranking snapshot.'
      : 'Do you want to remove the planned next season (and active pause, if present)?';

    this.showConfirmation(
      'End current Season',
      confirmationMessage,
      () => {
        this.confirmModalLoading.set(true);
        this.executeSeasonReset();
      },
    );
  }

  private executeSeasonReset(): void {
    this.seasonResetLoading.set(true);
    this.groupDetailApiService.resetSeason(this.groupId).subscribe({
      next: () => {
        this.seasonResetLoading.set(false);
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.closeSeasonSettingsModal();
        this.loadData();
      },
      error: (err) => {
        this.seasonResetLoading.set(false);
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to end season'));
      },
    });
  }

  onGroupImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) {
      this.groupImageFile = null;
      this.groupImagePreview = null;
      return;
    }
    const validation = validateGroupImageSelection(file);
    if (validation.error || !validation.value) {
      this.groupImageFile = null;
      this.groupImagePreview = null;
      this.groupImageError.set(validation.error ?? 'Invalid image file');
      return;
    }

    this.groupImageError.set(null);
    this.groupImageFile = validation.value;
    this.groupImagePreview = URL.createObjectURL(validation.value);
  }

  uploadGroupImage(): void {
    const validation = validateGroupImageSelection(this.groupImageFile);
    if (validation.error || !validation.value) {
      this.groupImageError.set(validation.error ?? 'Invalid image file');
      return;
    }
    const file = validation.value;

    this.groupImageUploading.set(true);
    this.groupImageError.set(null);

    this.groupDetailApiService.uploadGroupImage(this.groupId, file).subscribe({
      next: (result) => {
        this.groupImageUploading.set(false);
        const currentGroup = this.group();
        if (currentGroup) {
          this.group.set({ ...currentGroup, imageUrl: result.imageUrl });
        }
        this.groupImageFile = null;
        this.groupImagePreview = null;
      },
      error: (err) => {
        this.groupImageUploading.set(false);
        this.groupImageError.set(resolveApiErrorMessage(err, 'Failed to upload image'));
      },
    });
  }

  // Delete Group
  requestDeleteGroup(): void {
    this.showConfirmation(
      'Delete group',
      'Delete this group? This cannot be undone.',
      () => this.executeDeleteGroup()
    );
  }

  private executeDeleteGroup(): void {
    this.deleteGroupLoading.set(true);
    this.confirmModalLoading.set(true);

    this.groupDetailApiService.deleteGroup(this.groupId).subscribe({
      next: () => {
        this.deleteGroupLoading.set(false);
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.router.navigate(['/groups']);
      },
      error: (err) => {
        this.deleteGroupLoading.set(false);
        this.confirmModalLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', resolveApiErrorMessage(err, 'Failed to delete group'));
      },
    });
  }

  formatDate(dateString: string): string {
    return formatLocalDate(dateString);
  }

  setHistoryFilter(filter: 'all' | 'games' | 'events'): void {
    this.historyFilter.set(filter);
    this.historyPage.set(1); // Reset to first page when filter changes
  }

  // Confirmation Modal helpers
  showConfirmation(title: string, message: string, action: () => void): void {
    this.confirmModalTitle = title;
    this.confirmModalMessage = message;
    this.confirmModalAction = action;
    this.confirmModalLoading.set(false);
    this.showConfirmModal.set(true);
    this.lockBodyScroll();
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmModalAction = null;
    this.memberToRemove = null;
    this.unlockBodyScroll();
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
    this.lockBodyScroll();
  }

  closeAlertModal(): void {
    this.showAlertModal.set(false);
    this.unlockBodyScroll();
  }

  dismissWinnersBanner(): void {
    this.groupDetailApiService.dismissSeasonBanner(this.groupId).subscribe({
      next: () => this.loadData(),
      error: () => this.loadData(),
    });
  }

  toggleDecksCollapsed(): void {
    this.decksCollapsed.set(!this.decksCollapsed());
  }

  toggleMembersCollapsed(): void {
    this.membersCollapsed.set(!this.membersCollapsed());
  }

  toggleStatsCollapsed(): void {
    const next = !this.statsCollapsed();
    this.statsCollapsed.set(next);
    if (next) {
      if (this.statsChart) {
        this.statsChart.destroy();
        this.statsChart = null;
      }
    } else {
      setTimeout(() => this.renderStatsChart(), 0);
    }
  }

  onStatsChartReady(ref: ElementRef<HTMLCanvasElement> | null): void {
    if (!ref) {
      this.statsChartRef = undefined;
      if (this.statsChart) {
        this.statsChart.destroy();
        this.statsChart = null;
      }
      return;
    }
    this.statsChartRef = ref;
    this.renderStatsChart();
  }

  toggleRankingMode(): void {
    const next = this.rankingMode() === 'current' ? 'previous' : 'current';
    this.rankingMode.set(next);
    this.loadRanking(next === 'previous');
  }

  setStatsCategory(category: 'colors' | 'decks' | 'players'): void {
    this.statsCategory.set(category);
    if (category === 'colors') {
      this.statsOption.set('colors_perf_combo');
    } else if (category === 'decks') {
      const firstDeck = this.sortedDecks()[0];
      this.statsDeckId.set(firstDeck?.id ?? null);
      this.statsOption.set('decks_perf_trend');
      this.statsDeckSearch.set('');
      this.statsDeckDropdownOpen.set(false);
    } else {
      this.statsOption.set('players_games');
    }
    this.renderStatsChart();
  }

  setStatsOption(option: string): void {
    this.statsOption.set(option);
    this.renderStatsChart();
  }

  setStatsDeckId(deckId: string): void {
    this.statsDeckId.set(deckId);
    this.renderStatsChart();
  }

  setStatsDeckSearch(term: string): void {
    this.statsDeckSearch.set(term);
    const filtered = this.filteredStatsDecks();
    if (filtered.length > 0) {
      const selected = this.statsDeckId();
      if (!selected || !filtered.some((d) => d.id === selected)) {
        this.statsDeckId.set(filtered[0].id);
      }
    }
    this.renderStatsChart();
  }

  onStatsDeckSearchChange(value: string): void {
    if (this.statsDeckId()) {
      this.statsDeckId.set(null);
    }
    this.statsDeckSearch.set(value);
    this.statsDeckDropdownOpen.set(true);
  }

  openStatsDeckDropdown(): void {
    if (this.statsDeckDropdownCloseTimer) {
      clearTimeout(this.statsDeckDropdownCloseTimer);
      this.statsDeckDropdownCloseTimer = null;
    }
    this.statsDeckDropdownOpen.set(true);
  }

  closeStatsDeckDropdownDelayed(): void {
    this.statsDeckDropdownCloseTimer = setTimeout(() => {
      this.statsDeckDropdownOpen.set(false);
      if (this.statsDeckId()) {
        this.statsDeckSearch.set('');
      }
    }, 200);
  }

  selectStatsDeck(deckId: string): void {
    this.statsDeckId.set(deckId);
    this.statsDeckSearch.set('');
    this.statsDeckDropdownOpen.set(false);
    this.renderStatsChart();
  }

  clearStatsDeckSelection(): void {
    this.statsDeckId.set(null);
    this.statsDeckSearch.set('');
    this.statsDeckDropdownOpen.set(true);
    this.renderStatsChart();
  }

  private renderStatsChart(): void {
    const config = this.buildStatsChartConfig();

    if (this.statsChart) {
      this.statsChart.destroy();
      this.statsChart = null;
    }

    if (!config) {
      return;
    }

    if (!this.viewInitialized || this.statsCollapsed() || !this.statsChartRef) {
      setTimeout(() => this.renderStatsChart(), 0);
      return;
    }

    const canvas = this.statsChartRef.nativeElement;
    this.statsChart = new Chart(canvas, config);
  }

  private buildStatsChartConfig(): ChartConfiguration | null {
    const category = this.statsCategory();
    const option = this.statsOption();
    this.statsMessage.set(null);

    if (!this.group()) {
      this.statsMessage.set('No data available yet.');
      return null;
    }

    if (category === 'colors') {
      return this.buildColorChart(option);
    }
    if (category === 'decks') {
      return this.buildDeckChart(option);
    }
    return this.buildPlayerChart(option);
  }

  private buildColorChart(option: string): ChartConfiguration | null {
    const decks = this.group()?.decks || [];
    if (decks.length === 0) {
      this.statsMessage.set('No decks available for statistics.');
      return null;
    }

    const colorLabels = ['W', 'U', 'B', 'R', 'G', 'C'];

    if (option === 'colors_distribution') {
      const counts = colorLabels.map((label) =>
        decks.filter((d) => {
          const colors = this.getSortedColors(d.colors);
          return label === 'C' ? colors.length === 0 : colors.includes(label);
        }).length
      );
      return this.buildColorBarChart(colorLabels, counts, 'Deck count');
    }

    if (option === 'colors_combo_distribution') {
      const comboCounts = new Map<string, number>();
      for (const deck of decks) {
        const combo = this.getSortedColors(deck.colors).join('') || 'C';
        comboCounts.set(combo, (comboCounts.get(combo) || 0) + 1);
      }
      const labels = [...comboCounts.keys()];
      const values = labels.map((l) => comboCounts.get(l) || 0);
        return this.buildColorBarChart(
          labels.map((l) => (l === 'C' ? 'Colorless' : l)),
          values,
          'Deck count',
          true,
          true,
          undefined,
          true,
        );
      }

      if (option === 'colors_perf') {
        const values = colorLabels.map((label) => {
          const deckList = decks.filter((d) => {
            const colors = this.getSortedColors(d.colors);
            return label === 'C' ? colors.length === 0 : colors.includes(label);
          }
          );
          if (deckList.length === 0) return 0;
          const total = deckList.reduce((sum, d) => sum + d.performanceRating, 0);
          return Number((total / deckList.length).toFixed(1));
        });
        return this.buildColorBarChart(colorLabels, values, 'Avg performance');
      }

      if (option === 'colors_deck_types') {
        const seasonGames = this.getSeasonGames();
        const playedDeckIds = new Set<string>();
        for (const game of seasonGames) {
          for (const placement of game.placements) {
            if (placement.deck?.id) {
              playedDeckIds.add(placement.deck.id);
            }
          }
        }
        const typeCounts = new Map<string, number>();
        for (const type of this.typeOptions) {
          typeCounts.set(type, 0);
        }
        let unknownCount = 0;
        for (const deck of decks) {
          if (!playedDeckIds.has(deck.id)) continue;
          const type = deck.type?.trim();
          if (type && typeCounts.has(type)) {
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
          } else {
            unknownCount += 1;
          }
        }
        const labels = [...typeCounts.keys()];
        const values = labels.map((label) => typeCounts.get(label) || 0);
        if (unknownCount > 0) {
          labels.push('Unknown');
          values.push(unknownCount);
        }
        const config = buildBarChart(labels, values, 'Deck count');
        if (config.options?.scales && config.options.scales['y']) {
          config.options.scales['y'].ticks = {
            ...config.options.scales['y'].ticks,
            precision: 0,
          };
        }
        return config;
      }

      // default: avg performance by color combo
      const comboPerf = new Map<string, { total: number; count: number }>();
      for (const deck of decks) {
        const combo = this.getSortedColors(deck.colors).join('') || 'C';
        const entry = comboPerf.get(combo) || { total: 0, count: 0 };
        entry.total += deck.performanceRating;
        entry.count += 1;
        comboPerf.set(combo, entry);
      }
      const sorted = [...comboPerf.entries()]
        .map(([combo, entry]) => ({
          label: combo === 'C' ? 'Colorless' : combo,
          value: Number((entry.total / entry.count).toFixed(1)),
        }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
      const labels = sorted.map((d) => d.label);
      const values = sorted.map((d) => d.value);
      return this.buildColorBarChart(labels, values, 'Avg performance', false, true, undefined, true);
    }

  private buildDeckChart(option: string): ChartConfiguration | null {
    const decks = this.group()?.decks || [];
    if (decks.length === 0) {
      this.statsMessage.set('No decks available for statistics.');
      return null;
    }

    const deckId = this.statsDeckId() || decks[0]?.id;
    if (!deckId) {
      this.statsMessage.set('Select a deck to view statistics.');
      return null;
    }

    if (option === 'decks_games_played') {
      const seasonGames = this.getSeasonGames();
      const deckStats = decks.map((deck) => {
        const count = seasonGames.filter((g) =>
          g.placements.some((p) => p.deck?.id === deck.id)
        ).length;
        return { id: deck.id, name: deck.name, count };
      }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const labels = deckStats.map((d) => d.name);
      const counts = deckStats.map((d) => d.count);
      const selectedId = this.statsDeckId() || deckStats[0]?.id;
      const barColors = deckStats.map((d) =>
        d.id === selectedId ? '#ff6b35' : '#7f5af0'
      );
      const labelColors = deckStats.map((d) =>
        d.id === selectedId ? '#ff6b35' : '#b6b6c9'
      );

      return buildBarChart(labels, counts, 'Games played', {
        datasetColors: barColors,
        tickColors: labelColors,
      });
    }

    const series = getDeckSeries(this.getSeasonGames(), deckId);
    if (series.length === 0) {
      this.statsMessage.set('No games found for this deck.');
      return null;
    }
    const labels = series.map((item) =>
      formatLocalDate(item.game.playedAt, { day: '2-digit', month: '2-digit' })
    );

    if (option === 'decks_rank_trend') {
      const rankSeries = getDeckRankSeries(
        this.getSeasonGames(),
        this.group()?.decks || [],
        deckId,
      );
      const data = rankSeries.map((item) => item.rank);
      return buildLineChart(labels, [
        {
          label: 'Rank',
          data,
          borderColor: '#ff6b35',
          backgroundColor: 'rgba(255,107,53,0.2)',
        },
      ], {
        scales: {
          y: {
            reverse: true,
            ticks: { precision: 0 },
          },
        },
      });
    }

    // default: performance trend with group average
    const points = series.map((item) => item.placement.points);
    const groupAvg = series.map((item) => {
      const total = item.game.placements.reduce((sum, p) => sum + p.points, 0);
      return Number((total / item.game.placements.length).toFixed(1));
    });
    return buildLineChart(labels, [
      {
        label: 'Deck points',
        data: points,
        borderColor: '#7f5af0',
        backgroundColor: 'rgba(127,90,240,0.2)',
      },
      {
        label: 'Group average',
        data: groupAvg,
        borderColor: '#00b5a8',
        backgroundColor: 'rgba(0,181,168,0.2)',
      },
    ]);
  }

  private buildPlayerChart(option: string): ChartConfiguration | null {
    const group = this.group();
    if (!group) return null;

    const decks = group.decks || [];
    if (decks.length === 0) {
      this.statsMessage.set('No decks available for statistics.');
      return null;
    }

    const ownerMap = new Map<string, { name: string; games: number; ratings: number[] }>();
    for (const member of group.members) {
      ownerMap.set(member.userId, { name: member.user.inAppName, games: 0, ratings: [] });
    }

    const deckOwnerMap = new Map<string, string>();
    for (const deck of decks) {
      deckOwnerMap.set(deck.id, deck.owner.id);
      const owner = ownerMap.get(deck.owner.id);
      if (owner) {
        owner.ratings.push(deck.performanceRating);
      }
    }

    for (const game of this.getSeasonGames()) {
      for (const placement of game.placements) {
        const deckId = placement.deck?.id;
        if (!deckId) continue;
        const ownerId = deckOwnerMap.get(deckId);
        if (!ownerId) continue;
        const owner = ownerMap.get(ownerId);
        if (owner) {
          owner.games += 1;
        }
      }
    }

    const labels = [...ownerMap.values()].map((o) => o.name);
    if (labels.length === 0) {
      this.statsMessage.set('No members available for statistics.');
      return null;
    }

    if (option === 'players_perf') {
      const groupAvg =
        decks.reduce((sum, d) => sum + d.performanceRating, 0) / decks.length;
      const values = [...ownerMap.values()].map((o) => {
        if (o.ratings.length === 0) return 0;
        return Number((o.ratings.reduce((s, r) => s + r, 0) / o.ratings.length).toFixed(1));
      });
      return buildLineAndBarChart(labels, values, groupAvg);
    }

    if (option === 'players_colors') {
      const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C'];
      const colorPalette: Record<string, string> = {
        W: '#f9faf4',
        U: '#0e68ab',
        B: '#150b00',
        R: '#d3202a',
        G: '#00733e',
        C: '#ccc2c0',
      };

      const currentUserId = this.currentUserId();
      const targetMember = group.members.find((m) => m.userId === currentUserId)
        ?? group.members[0];
      if (!targetMember) {
        this.statsMessage.set('No members available for statistics.');
        return null;
      }

      const targetDecks = decks.filter((deck) => deck.owner.id === targetMember.userId);
      if (targetDecks.length === 0) {
        this.statsMessage.set('No decks available for this player.');
        return null;
      }

      const counts = colorOrder.map((color) => {
        let total = 0;
        for (const deck of targetDecks) {
          const colors = this.getSortedColors(deck.colors);
          const deckColors = colors.length === 0 ? ['C'] : colors;
          if (deckColors.includes(color)) {
            total += 1;
          }
        }
        return total;
      });

      const datasetColors = colorOrder.map((color) => colorPalette[color] || '#7f5af0');
      return this.buildColorBarChart(
        colorOrder,
        counts,
        'Deck count',
        true,
        false,
        datasetColors,
      );
    }

    // default: games played
    const values = [...ownerMap.values()].map((o) => o.games);
    return buildBarChart(labels, values, 'Games played');
  }

    private buildColorBarChart(
      labels: string[],
      data: number[],
      label: string,
      integerAxis = false,
      monoPrefixSingles = false,
      datasetColors?: string[],
      tooltipIcons = false,
    ): ChartConfiguration {
      const options = createBaseChartOptions();
    const maxIconCount = Math.max(
      ...labels.map((l) => (l === 'Colorless' ? 1 : String(l).length)),
      1
    );
    options.layout = { padding: { bottom: Math.max(18, maxIconCount * 16 + 4) } };
    if (options.scales && options.scales['x']) {
      options.scales['x'].ticks = {
        ...options.scales['x'].ticks,
        callback: () => '',
      };
    }
      if (integerAxis && options.scales && options.scales['y']) {
        options.scales['y'].ticks = {
          ...options.scales['y'].ticks,
          precision: 0,
        };
      }
      if (!options.plugins) options.plugins = {};
      if (tooltipIcons) {
        options.plugins.tooltip = {
          enabled: false,
          external: (context) => this.renderColorComboTooltip(context, monoPrefixSingles),
        };
      } else {
        options.plugins.tooltip = {
          callbacks: {
            title: (items) =>
              items.length
                ? getColorComboName(String(items[0].label), monoPrefixSingles)
                : '',
          },
        };
      }

      return {
        type: 'bar',
        data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: datasetColors || '#7f5af0',
          },
        ],
        },
        options,
        plugins: [this.colorIconPlugin],
      };
    }

  private renderColorComboTooltip(
    context: { chart: Chart; tooltip: any },
    monoPrefixSingles: boolean,
  ): void {
    const { chart, tooltip } = context;
    const tooltipEl = this.getOrCreateColorComboTooltip(chart);

    if (!tooltip || tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    const dataPoint = tooltip.dataPoints?.[0];
    if (!dataPoint) return;

    const rawLabel = String(dataPoint.label ?? '');
    const title = getColorComboName(rawLabel, monoPrefixSingles);
    const icons = this.getColorIconPathsForLabel(rawLabel);
    const valueLabel = dataPoint.dataset?.label ? `${dataPoint.dataset.label}: ` : '';
    const value = dataPoint.formattedValue ?? '';

    const iconsHtml = icons
      .map((src) => `<img class="chart-tooltip__icon" src="${src}" alt="" />`)
      .join('');

    tooltipEl.innerHTML = `
      <div class="chart-tooltip__title">
        <span class="chart-tooltip__name">${title}</span>
        <span class="chart-tooltip__icons">${iconsHtml}</span>
      </div>
      <div class="chart-tooltip__value">${valueLabel}${value}</div>
    `;

    tooltipEl.style.opacity = '1';
    tooltipEl.style.left = `${tooltip.caretX}px`;
    tooltipEl.style.top = `${tooltip.caretY}px`;
  }

  private getOrCreateColorComboTooltip(chart: Chart): HTMLDivElement {
    const parent = chart.canvas.parentNode as HTMLElement | null;
    if (!parent) {
      const fallback = document.createElement('div');
      return fallback;
    }

    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    let tooltipEl = parent.querySelector<HTMLDivElement>('.chart-tooltip--color-combo');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'chart-tooltip chart-tooltip--color-combo';
      tooltipEl.style.opacity = '0';
      parent.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  private getColorIconPathsForLabel(label: string): string[] {
    const sorted = this.getSortedColors(label);
    if (sorted.length === 0) {
      return [getManaIconPath('C')];
    }
    return sorted.map((color) => getManaIconPath(color));
  }

  private getColorIcon(color: string): HTMLImageElement {
    const key = color.toUpperCase();
    if (this.colorIconCache.has(key)) {
      return this.colorIconCache.get(key)!;
    }
    const img = new Image();
    img.src = getManaIconPath(key);
    this.colorIconCache.set(key, img);
    return img;
  }

  private getSeasonGames(): Game[] {
    const start = this.group()?.activeSeasonStartedAt;
    if (!start) {
      return this.games();
    }
    const startDate = new Date(start);
    const end = this.group()?.activeSeasonEndsAt;
    const endDate = end ? new Date(end) : null;
    return this.games().filter((g) => {
      const played = new Date(g.playedAt);
      if (played < startDate) return false;
      if (endDate && played > endDate) return false;
      return true;
    });
  }
}
