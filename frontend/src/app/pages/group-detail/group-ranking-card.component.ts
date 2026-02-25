import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { RankingEntryWithTrend } from '../../models/game.model';
import { sanitizeSearchInput } from '../../core/utils/input-validation';

@Component({
  selector: 'app-group-ranking-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-ranking-card.component.html',
  styleUrl: './group-ranking-card.component.scss',
})
export class GroupRankingCardComponent implements OnChanges {
  @Input({ required: true }) activeSeasonEndsAt!: string | null | undefined;
  @Input({ required: true }) activeSeasonName!: string | null | undefined;
  @Input({ required: true }) seasonCountdown!: string | null;
  @Input({ required: true }) seasonCountdownState!: 'normal' | 'warning' | 'critical';
  @Input({ required: true }) formatDate!: (date: string) => string;
  @Input({ required: true }) rankingMode!: 'current' | 'previous';
  @Input({ required: true }) snapshotAvailable!: boolean;
  @Input({ required: true }) ranking!: RankingEntryWithTrend[];
  @Input({ required: true }) paginatedRanking!: RankingEntryWithTrend[];
  @Input({ required: true }) rankingPage!: number;
  @Input({ required: true }) rankingTotalPages!: number;
  @Input({ required: true }) showTrends!: boolean;
  @Input({ required: true }) hasRankingData!: boolean;
  @Input({ required: true }) rankingSearchVisible!: boolean;
  @Input({ required: true }) rankingSearchTerm!: string;
  @Input({ required: true }) defaultDeckImage!: string;
  @Input({ required: true }) getColorGradient!: (colors: string) => string;
  @Input({ required: true }) getDeckImageUrl!: (deckId: string) => string | null;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];
  @Input({ required: true }) getArchidektUrl!: (deckId: string) => string | null;
  @Input() isSmartphonePortrait = false;

  @Output() rankingModeToggle = new EventEmitter<void>();
  @Output() rankingPageChange = new EventEmitter<number>();
  @Output() rankingSearchToggle = new EventEmitter<void>();
  @Output() rankingSearchChange = new EventEmitter<string>();
  @Output() rankingGamesFilterSelect = new EventEmitter<string>();

  private expandedEntryIds = signal<Set<string>>(new Set());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSmartphonePortrait'] && !this.isSmartphonePortrait) {
      this.expandedEntryIds.set(new Set());
    }
  }

  toggleRankingMode(): void {
    this.rankingModeToggle.emit();
  }

  setRankingPage(page: number): void {
    this.rankingPageChange.emit(page);
  }

  toggleRankingSearch(): void {
    this.rankingSearchToggle.emit();
  }

  handleRankingSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.rankingSearchChange.emit(sanitizeSearchInput(input.value, 100));
  }

  clearRankingSearch(): void {
    this.rankingSearchChange.emit('');
  }

  selectHistoryDeckFromRanking(deckId: string): void {
    this.rankingGamesFilterSelect.emit(deckId);
  }

  toggleEntryExpansion(entryId: string): void {
    if (!this.isSmartphonePortrait) return;
    this.expandedEntryIds.update((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  isEntryExpanded(entryId: string): boolean {
    return this.expandedEntryIds().has(entryId);
  }
}
