import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { GroupDetail, Deck, GroupApplication } from '../../models/group.model';
import { Game, RankingEntry, RankingEntryWithTrend, GroupEvent } from '../../models/game.model';
import { VALID_COLORS, VALID_DECK_TYPES } from './deck-constants';
import Chart from 'chart.js/auto';
import { ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('statsChart') statsChartRef?: ElementRef<HTMLCanvasElement>;
  private statsChart: Chart | null = null;
  private viewInitialized = false;
  private colorIconCache = new Map<string, HTMLImageElement>();
  private colorIconPlugin = {
    id: 'colorIconPlugin',
    afterDraw: (chart: Chart) => {
      if (!chart?.scales?.['x']) return;
      const xScale = chart.scales['x'];
      const ctx = chart.ctx;
      const labels = chart.data.labels || [];

      labels.forEach((label: any, index: number) => {
        const labelText = String(label);
        const colors = labelText === 'Colorless' || labelText === 'C'
          ? ['C']
          : labelText.split('');
        const iconSize = 16;
        const isCombo = colors.length > 1;
        const totalWidth = isCombo ? iconSize : colors.length * iconSize;
        const totalHeight = isCombo ? colors.length * iconSize : iconSize;
        const startX = xScale.getPixelForTick(index) - totalWidth / 2;
        const startY = xScale.bottom + 4;

        colors.forEach((c, i) => {
          const icon = this.getColorIcon(c);
          if (!icon?.complete) {
            icon.onload = () => chart.draw();
          }
          if (icon?.complete) {
            const x = startX;
            const y = isCombo ? startY + i * iconSize : startY;
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
  groupImageUploading = signal(false);
  groupImageError = signal<string | null>(null);
  groupImagePreview: string | null = null;
  private groupImageFile: File | null = null;
  editSeasonName = '';
  editSeasonEndsAt = '';
  editSeasonStartAt = '';
  editSeasonPauseDays = 0;
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
      if (this.isValidRankConfiguration(allRanks)) {
        availableRanks.push(testRank);
      }
    }

    return availableRanks;
  }

  // Check if a rank configuration is valid (respects tie rules)
  private isValidRankConfiguration(sortedRanks: number[]): boolean {
    let expectedMinRank = 1;

    for (let i = 0; i < sortedRanks.length; i++) {
      const rank = sortedRanks[i];

      // Rank must match expectedMinRank (no gaps allowed)
      if (rank !== expectedMinRank) {
        return false;
      }

      // Rank must not exceed total player count
      if (rank > sortedRanks.length) {
        return false;
      }

      // Count ties at this rank and calculate next expected rank
      let tieCount = 1;
      while (i + 1 < sortedRanks.length && sortedRanks[i + 1] === rank) {
        tieCount++;
        i++;
      }
      expectedMinRank = rank + tieCount;
    }

    return true;
  }

  // Get available decks for a placement slot (excludes already selected decks)
  getAvailableDecksForSlot(slotIndex: number): { id: string; name: string }[] {
    const selectedDeckIds = this.gamePlacements
      .filter((_, i) => i !== slotIndex)
      .map((p) => p.deckId)
      .filter((id) => id !== '');

    return this.activeDecks().filter((deck) => !selectedDeckIds.includes(deck.id));
  }

  // Get filtered decks based on search term
  getFilteredDecksForSlot(slotIndex: number): { id: string; name: string }[] {
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
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

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
  isSeasonPaused = computed(() => {
    const pauseUntil = this.group()?.seasonPauseUntil;
    if (!pauseUntil) return false;
    return new Date() < new Date(pauseUntil);
  });
  snapshotAvailable = computed(() => {
    return !!this.group()?.lastSeasonId;
  });
  canResetSeason = computed(() => {
    const start = this.group()?.activeSeasonStartedAt;
    const end = this.group()?.activeSeasonEndsAt;
    return !!start && !!end;
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
  winnersBannerInfo = computed(() => {
    const banner = this.group()?.winnersBanner;
    if (!banner) return null;
    const endedAt = new Date(banner.endedAt);
    return `Season ended ${endedAt.toLocaleDateString('de-DE')}`;
  });

  // Default deck image when no Archidekt image is available
  readonly defaultDeckImage = '/assets/images/deckBG_default.jpg';
  readonly defaultGroupImage = '/assets/images/deckBG_default.jpg';

  // MTG color definitions for border gradients
  readonly mtgColors: Record<string, string> = {
    W: '#F9FAF4',
    U: '#0E68AB',
    B: '#150B00',
    R: '#D3202A',
    G: '#00733E',
  };

  // Canonical WUBRG order
  readonly colorOrder = ['W', 'U', 'B', 'R', 'G'];

  // Mapping from color combination names to WUBRG codes
  readonly colorNameMapping: Record<string, string> = {
    // Colorless
    'colorless': '',
    // Mono colors
    'mono-white': 'W',
    'mono-blue': 'U',
    'mono-black': 'B',
    'mono-red': 'R',
    'mono-green': 'G',
    // Guilds (2 colors)
    'azorius': 'WU',
    'dimir': 'UB',
    'rakdos': 'BR',
    'gruul': 'RG',
    'selesnya': 'GW',
    'orzhov': 'WB',
    'izzet': 'UR',
    'golgari': 'BG',
    'boros': 'RW',
    'simic': 'GU',
    // Shards & Wedges (3 colors)
    'bant': 'GWU',
    'esper': 'WUB',
    'grixis': 'UBR',
    'jund': 'BRG',
    'naya': 'RGW',
    'abzan': 'WBG',
    'jeskai': 'URW',
    'sultai': 'BGU',
    'mardu': 'RWB',
    'temur': 'GUR',
    // Nephilim (4 colors - named by missing color)
    'growth': 'GWUB',      // without Red
    'artifice': 'WUBR',    // without Green
    'aggression': 'UBRG',  // without White
    'altruism': 'RGWU',    // without Black
    'chaos': 'BRGW',       // without Blue
    // 5 colors
    'wubrg': 'WUBRG',
  };

  // Get sorted colors in WUBRG order
  getSortedColors(colors: string): string[] {
    const lowerColors = colors.toLowerCase();

    // First try to match known color combination names
    const mappedColors = this.colorNameMapping[lowerColors];
    if (mappedColors !== undefined) {
      const colorChars = mappedColors.toUpperCase().split('');
      return this.colorOrder.filter((c) => colorChars.includes(c));
    }

    // Fallback: try to extract individual color letters (for legacy data like "WUB")
    const colorChars = colors.toUpperCase().split('');
    return this.colorOrder.filter((c) => colorChars.includes(c));
  }

  // Get CSS gradient for deck border based on colors
  getColorGradient(colors: string): string {
    const sortedColors = this.getSortedColors(colors);

    if (sortedColors.length === 0) {
      return '#A8A495'; // Default gold/neutral
    }

    if (sortedColors.length === 1) {
      return this.mtgColors[sortedColors[0]];
    }

    // Create gradient with color stops
    const stops = sortedColors.map((color, index) => {
      const percentage = (index / (sortedColors.length - 1)) * 100;
      return `${this.mtgColors[color]} ${percentage}%`;
    });

    return `linear-gradient(to right, ${stops.join(', ')})`;
  }

  // Get mana symbol paths for display
  getManaSymbols(colors: string): string[] {
    const sortedColors = this.getSortedColors(colors);
    // If no colors (colorless), return the colorless symbol
    if (sortedColors.length === 0) {
      return ['/assets/images/mana-c.svg'];
    }
    return sortedColors.map((c) => `/assets/images/mana-${c.toLowerCase()}.svg`);
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

  filteredDecks = computed(() => {
    const decks = this.sortedDecks();
    const searchTerm = this.decksSearchTerm().toLowerCase().trim();

    if (!searchTerm) {
      return decks;
    }

    return decks.filter((deck) =>
      deck.name.toLowerCase().includes(searchTerm) ||
      deck.owner.inAppName.toLowerCase().includes(searchTerm) ||
      deck.colors.toLowerCase().includes(searchTerm)
    );
  });

  decksTotalPages = computed(() =>
    Math.ceil(this.filteredDecks().length / this.decksPageSize)
  );

  paginatedDecks = computed(() => {
    const decks = this.filteredDecks();
    const start = (this.decksPage() - 1) * this.decksPageSize;
    return decks.slice(start, start + this.decksPageSize);
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

  sortedDecks = computed(() => {
    const decks = this.group()?.decks || [];
    return [...decks].sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredStatsDecks = computed(() => {
    const term = this.statsDeckSearch().toLowerCase().trim();
    if (!term) return this.sortedDecks();
    return this.sortedDecks().filter((deck) =>
      deck.name.toLowerCase().includes(term) ||
      deck.owner.inAppName.toLowerCase().includes(term) ||
      deck.colors.toLowerCase().includes(term)
    );
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
  history = computed(() => {
    const retentionDays = this.group()?.historyRetentionDays ?? 30;
    const cutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );
    const items: { type: 'game' | 'event'; date: Date; data: Game | GroupEvent; gameNumber?: number }[] = [];

    // Games are sorted by playedAt descending, so calculate game numbers
    const gamesList = this.games().filter(
      (game) => new Date(game.playedAt) >= cutoff
    );
    const totalGames = gamesList.length;

    // Add games with their number (oldest = 1, newest = totalGames)
    for (let i = 0; i < gamesList.length; i++) {
      const game = gamesList[i];
      items.push({
        type: 'game',
        date: new Date(game.playedAt),
        data: game,
        gameNumber: totalGames - i, // Newest game has highest number
      });
    }

    // Add events (exclude GAME_RECORDED and GAME_UNDONE since games are shown separately)
    for (const event of this.events()) {
      if (new Date(event.createdAt) < cutoff) {
        continue;
      }
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

  // Filtered history based on selected filter
  filteredHistory = computed(() => {
    const filter = this.historyFilter();
    const items = this.history();

    if (filter === 'all') {
      return items;
    } else if (filter === 'games') {
      return items.filter((item) => item.type === 'game');
    } else {
      return items.filter((item) => item.type === 'event');
    }
  });

  constructor() {}

  ngOnInit(): void {
    this.updateViewportState();
    this.updateScrollTopVisibility();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('orientationchange', this.onViewportChange);
      window.addEventListener('scroll', this.onScrollChange);
    }
    this.groupId = this.route.snapshot.params['id'];
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
    this.isSmartphoneViewport.set(window.innerWidth < 768);
  }

  private updateScrollTopVisibility(): void {
    if (typeof window === 'undefined') return;
    this.showScrollTop.set(window.scrollY > 280);
  }

  scrollToTop(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getGroup(this.groupId).toPromise()
      .then((group) => {
        this.group.set(group!);
        const gamesLimit = this.getGamesLoadLimit(group || null);
        return Promise.all([
          this.apiService.getGames(this.groupId, gamesLimit).toPromise(),
          this.apiService.getEvents(this.groupId).toPromise(),
        ]).then(([games, events]) => ({ group, games, events }));
      })
      .then(({ group, games, events }) => {
        this.games.set(games!);
        this.events.set(events!);
        if (group?.userRole === 'ADMIN') {
          this.loadGroupApplications();
        } else {
          this.groupApplications.set([]);
        }
        this.loadRanking(this.rankingMode() === 'previous');
        this.openRecordGameFromDraft();
        this.loading.set(false);
        this.renderStatsChart();
      })
      .catch((err) => {
        this.error.set(err.error?.message || 'Failed to load group');
        this.loading.set(false);
      });
  }

  private getGamesLoadLimit(group: GroupDetail | null): number {
    const retentionDays = group?.historyRetentionDays ?? 30;
    const computedLimit = retentionDays * 5;
    return Math.min(1000, Math.max(100, computedLimit));
  }

  loadGroupApplications(): void {
    this.applicationsLoading.set(true);
    this.applicationsError.set(null);

    this.apiService.getGroupApplications(this.groupId).subscribe({
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
    this.apiService.getRanking(this.groupId, snapshot).subscribe({
      next: (ranking) => {
        if (snapshot) {
          this.ranking.set(
            ranking.map((entry) => ({ ...entry, trend: 'same' as const, positionChange: 0 }))
          );
          return;
        }

        const isFirstLoad = this.storedCurrentPositions.size === 0;
        const rankingChanged = !isFirstLoad && this.hasRankingChanged(ranking);

        if (rankingChanged) {
          this.baselinePositions = new Map(this.storedCurrentPositions);
        }

        const rankingWithTrends: RankingEntryWithTrend[] = ranking.map((entry) => {
          if (isFirstLoad) {
            return { ...entry, trend: 'same' as const, positionChange: 0 };
          }

          const baselinePosition = this.baselinePositions.get(entry.id);
          let trend: 'up' | 'down' | 'same' | 'new' = 'same';
          let positionChange = 0;

          if (baselinePosition === undefined) {
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
        archidektUrl: this.deckArchidektUrl || undefined,
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
          this.deckError.set(err.error?.message || 'Failed to create deck');
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
    const decks = this.group()?.decks || [];
    const activeDecks = decks.filter((deck) => deck.isActive);
    return activeDecks.length >= 2;
  }

  playGameDisabledReason(): string {
    if (this.isSmartphoneViewport()) {
      return 'Display too small for New Game. Please use Record Game.';
    }
    return this.canStartPlayGame()
      ? 'Start a new live game'
      : 'Add at least two active decks to start a live game';
  }

  private openRecordGameFromDraft(): void {
    const draft = sessionStorage.getItem('playGameRecordDraft');
    if (!draft) return;
    try {
      const data = JSON.parse(draft) as {
        groupId: string;
        placements: { deckId: string; rank: number; playerName?: string }[];
      };
      if (data.groupId !== this.groupId) return;
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
    } catch {
      sessionStorage.removeItem('playGameRecordDraft');
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
          this.unlockBodyScroll();
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
    this.editColorDropdownOpen = false;
    this.unlockBodyScroll();
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
        archidektUrl: this.editDeckArchidektUrl,
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
          this.editDeckError.set(err.error?.message || 'Failed to update deck');
        },
      });
  }

  refreshArchidekt(): void {
    if (!this.editingDeck?.archidektId) return;

    this.editDeckLoading.set(true);
    this.editDeckError.set(null);

    this.apiService.refreshDeckArchidekt(this.editingDeck.id).subscribe({
      next: (updatedDeck) => {
        this.editDeckLoading.set(false);
        this.editingDeck = updatedDeck;
        this.showAlert('Success', 'Archidekt data refreshed successfully', 'success');
      },
      error: (err) => {
        this.editDeckLoading.set(false);
        this.editDeckError.set(err.error?.message || 'Failed to refresh Archidekt data');
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

    this.apiService.deleteDeck(this.editingDeck.id).subscribe({
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
        this.showAlert('Error', err.error?.message || 'Failed to delete deck');
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
    this.apiService.updateMemberRole(this.groupId, member.userId, 'ADMIN').subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.showAlert('Error', err.error?.message || 'Failed to promote member');
      },
    });
  }

  demoteMember(member: { userId: string; user: { inAppName: string } }): void {
    this.apiService.updateMemberRole(this.groupId, member.userId, 'MEMBER').subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.showAlert('Error', err.error?.message || 'Failed to demote member');
      },
    });
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

  acceptApplication(userId: string): void {
    if (this.applicationActionLoading()) return;
    this.applicationActionLoading.set(true);
    this.apiService.acceptGroupApplication(this.groupId, userId).subscribe({
      next: () => {
        this.applicationActionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.applicationActionLoading.set(false);
        this.showAlert('Error', err.error?.message || 'Failed to accept application');
      },
    });
  }

  rejectApplication(userId: string): void {
    if (this.applicationActionLoading()) return;
    this.applicationActionLoading.set(true);
    this.apiService.rejectGroupApplication(this.groupId, userId).subscribe({
      next: () => {
        this.applicationActionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.applicationActionLoading.set(false);
        this.showAlert('Error', err.error?.message || 'Failed to reject application');
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
    this.editSeasonName = group.activeSeasonName || '';
    this.editSeasonEndsAt = group.activeSeasonEndsAt
      ? group.activeSeasonEndsAt.slice(0, 10)
      : '';
    this.editSeasonStartAt = group.activeSeasonStartedAt
      ? group.activeSeasonStartedAt.slice(0, 10)
      : '';
    this.editSeasonPauseDays = group.seasonPauseDays ?? 0;
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

  updateGroup(): void {
    if (!this.editGroupName) {
      this.editGroupError.set('Name is required');
      return;
    }

    this.editGroupLoading.set(true);
    this.editGroupError.set(null);

    this.apiService
      .updateGroup(this.groupId, {
        name: this.editGroupName,
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

  updateGroupSettings(): void {
    this.groupSettingsLoading.set(true);
    this.groupSettingsError.set(null);

    this.apiService
      .updateGroup(this.groupId, {
        historyRetentionDays: this.editHistoryRetentionDays,
        activeSeasonName: this.editSeasonName || undefined,
        activeSeasonEndsAt: this.editSeasonEndsAt || undefined,
        activeSeasonStartedAt: this.editSeasonStartAt || undefined,
        seasonPauseDays: this.editSeasonPauseDays,
      })
      .subscribe({
        next: () => {
          this.groupSettingsLoading.set(false);
          this.showGroupSettingsModal.set(false);
          this.loadData();
        },
        error: (err) => {
          this.groupSettingsLoading.set(false);
          this.groupSettingsError.set(err.error?.message || 'Failed to update settings');
        },
      });
  }

  requestSeasonReset(): void {
    this.showConfirmation(
      'Reset season',
      'Reset the current season? This will snapshot the ranking and reset deck stats.',
      () => this.executeSeasonReset()
    );
  }

  private executeSeasonReset(): void {
    this.seasonResetLoading.set(true);
    this.apiService.resetSeason(this.groupId).subscribe({
      next: () => {
        this.seasonResetLoading.set(false);
        this.closeConfirmModal();
        this.loadData();
      },
      error: (err) => {
        this.seasonResetLoading.set(false);
        this.closeConfirmModal();
        this.showAlert('Error', err.error?.message || 'Failed to reset season');
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

    this.groupImageFile = file;
    this.groupImagePreview = URL.createObjectURL(file);
  }

  uploadGroupImage(): void {
    if (!this.groupImageFile) {
      this.groupImageError.set('Please select an image first');
      return;
    }

    this.groupImageUploading.set(true);
    this.groupImageError.set(null);

    this.apiService.uploadGroupImage(this.groupId, this.groupImageFile).subscribe({
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
        this.groupImageError.set(err.error?.message || 'Failed to upload image');
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

    this.apiService.deleteGroup(this.groupId).subscribe({
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
    this.apiService.dismissSeasonBanner(this.groupId).subscribe({
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

  onStatsDeckSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.statsDeckId()) {
      this.statsDeckId.set(null);
    }
    this.statsDeckSearch.set(input.value);
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
          true
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
        const config = this.buildBarChart(labels, values, 'Deck count');
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
      return this.buildColorBarChart(labels, values, 'Avg performance', false, true);
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

      return this.buildBarChart(labels, counts, 'Games played', {
        datasetColors: barColors,
        tickColors: labelColors,
      });
    }

    const series = this.getDeckSeries(deckId);
    if (series.length === 0) {
      this.statsMessage.set('No games found for this deck.');
      return null;
    }
    const labels = series.map((item) =>
      new Date(item.game.playedAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      })
    );

    if (option === 'decks_rank_trend') {
      const rankSeries = this.getDeckRankSeries(deckId);
      const data = rankSeries.map((item) => item.rank);
      return this.buildLineChart(labels, [
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
    return this.buildLineChart(labels, [
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
      return this.buildLineAndBarChart(labels, values, groupAvg);
    }

    // default: games played
    const values = [...ownerMap.values()].map((o) => o.games);
    return this.buildBarChart(labels, values, 'Games played');
  }

  private getDeckSeries(deckId: string) {
    const games = [...this.getSeasonGames()].sort(
      (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
    );
    const series = games
      .map((game) => {
        const placement = game.placements.find((p) => p.deck?.id === deckId);
        return placement ? { game, placement } : null;
      })
      .filter((item): item is { game: Game; placement: Game['placements'][0] } => !!item);

    return series.slice(-10);
  }

  private getDeckRankSeries(deckId: string): { game: Game; rank: number }[] {
    const games = [...this.getSeasonGames()].sort(
      (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
    );
    const decks = this.group()?.decks || [];
    const stats = new Map<string, { name: string; games: number; performance: number }>();
    for (const deck of decks) {
      stats.set(deck.id, { name: deck.name, games: 0, performance: 0 });
    }

    const rankByGameId = new Map<string, number>();
    for (const game of games) {
      for (const placement of game.placements) {
        const deck = placement.deck;
        if (!deck?.id) continue;
        const entry = stats.get(deck.id);
        if (!entry) continue;
        entry.performance = this.calculateNewPerformance(
          entry.performance,
          entry.games,
          placement.points
        );
        entry.games += 1;
      }

      const ranked = [...stats.entries()].sort((a, b) => {
        const aStats = a[1];
        const bStats = b[1];
        if (bStats.performance !== aStats.performance) {
          return bStats.performance - aStats.performance;
        }
        if (bStats.games !== aStats.games) {
          return bStats.games - aStats.games;
        }
        return aStats.name.localeCompare(bStats.name);
      });

      const position = ranked.findIndex(([id]) => id === deckId);
      if (position >= 0) {
        rankByGameId.set(game.id, position + 1);
      }
    }

    return this.getDeckSeries(deckId)
      .map((item) => {
        const rank = rankByGameId.get(item.game.id);
        return rank ? { game: item.game, rank } : null;
      })
      .filter((item): item is { game: Game; rank: number } => !!item);
  }

  private calculateNewPerformance(
    currentPerformance: number,
    gamesPlayed: number,
    newPoints: number
  ): number {
    const newPerformance =
      (currentPerformance * gamesPlayed + newPoints) / (gamesPlayed + 1);
    return this.roundToOneDecimal(newPerformance);
  }

  private roundToOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private buildBarChart(
    labels: string[],
    data: number[],
    label: string,
    options?: { datasetColors?: string[]; tickColors?: string[] },
  ): ChartConfiguration {
    const chartOptions = this.baseChartOptions();
    if (options?.tickColors && chartOptions.scales && chartOptions.scales['x']) {
      chartOptions.scales['x'].ticks = {
        ...chartOptions.scales['x'].ticks,
        color: (ctx: { index: number }) => options.tickColors?.[ctx.index] || '#b6b6c9',
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
            backgroundColor: options?.datasetColors || '#7f5af0',
          },
        ],
      },
      options: chartOptions,
    };
  }

  private buildLineChart(
    labels: string[],
    datasets: ChartDataset<'line', number[]>[],
    overrides: ChartOptions = {},
  ): ChartConfiguration {
    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...this.baseChartOptions(),
        elements: {
          line: { tension: 0.2 },
        },
        ...overrides,
      },
    };
  }

  private buildLineAndBarChart(labels: string[], data: number[], avg: number): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg performance',
            data,
            backgroundColor: '#7f5af0',
          } as ChartDataset<'bar', number[]>,
          {
            type: 'line',
            label: 'Group average',
            data: labels.map(() => Number(avg.toFixed(1))),
            borderColor: '#00b5a8',
            backgroundColor: 'rgba(0,181,168,0.2)',
          } as ChartDataset<'line', number[]>,
        ],
      },
      options: this.baseChartOptions(),
    };
  }

    private buildColorBarChart(
      labels: string[],
      data: number[],
      label: string,
      integerAxis = false,
      monoPrefixSingles = false,
    ): ChartConfiguration {
      const options = this.baseChartOptions();
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
      options.plugins.tooltip = {
        callbacks: {
          title: (items) =>
            items.length
              ? this.getColorComboName(String(items[0].label), monoPrefixSingles)
              : '',
        },
      };

      return {
        type: 'bar',
        data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: '#7f5af0',
          },
        ],
        },
        options,
        plugins: [this.colorIconPlugin],
      };
    }

    private getColorComboName(label: string, monoPrefixSingles = false): string {
      const normalized = label.replace(/\s+/g, '').toUpperCase();
      if (normalized === 'COLORLESS' || normalized === 'C') return 'Colorless';
      const colorLetters = normalized.replace(/[^WUBRG]/g, '');
      const sortedLetters =
        colorLetters.length > 0
          ? this.colorOrder.filter((c) => colorLetters.includes(c)).join('')
          : normalized;
      const monoMap: Record<string, string> = {
        W: monoPrefixSingles ? 'Mono-White' : 'White',
        U: monoPrefixSingles ? 'Mono-Blue' : 'Blue',
        B: monoPrefixSingles ? 'Mono-Black' : 'Black',
        R: monoPrefixSingles ? 'Mono-Red' : 'Red',
        G: monoPrefixSingles ? 'Mono-Green' : 'Green',
      };
      if (monoMap[sortedLetters]) return monoMap[sortedLetters];
      const comboMap: Record<string, string> = {
        WU: 'Azorius',
        UB: 'Dimir',
        BR: 'Rakdos',
        RG: 'Gruul',
        WG: 'Selesnya',
        WB: 'Orzhov',
        UR: 'Izzet',
        BG: 'Golgari',
        WR: 'Boros',
        UG: 'Simic',
        WUB: 'Esper',
        UBR: 'Grixis',
        BRG: 'Jund',
        WRG: 'Naya',
        WUG: 'Bant',
        WBG: 'Abzan',
        WUR: 'Jeskai',
        BUG: 'Sultai',
        WBR: 'Mardu',
        URG: 'Temur',
        WUBR: 'Yore-Tiller',
        UBRG: 'Glint-Eye',
        WBRG: 'Dune-Brood',
        WURG: 'Ink-Treader',
        WUBG: 'Witch-Maw',
        WUBRG: 'Five-color',
      };
      return comboMap[sortedLetters] || label;
    }

  private baseChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#e2e2ef',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#b6b6c9' },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          ticks: { color: '#b6b6c9' },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    };
  }

  private getColorIcon(color: string): HTMLImageElement {
    const key = color.toUpperCase();
    if (this.colorIconCache.has(key)) {
      return this.colorIconCache.get(key)!;
    }
    const img = new Image();
    const map: Record<string, string> = {
      W: '/assets/images/mana-w.svg',
      U: '/assets/images/mana-u.svg',
      B: '/assets/images/mana-b.svg',
      R: '/assets/images/mana-r.svg',
      G: '/assets/images/mana-g.svg',
      C: '/assets/images/mana-c.svg',
    };
    img.src = map[key] || map['C'];
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
