import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RankingEntryWithTrend } from '../../models/game.model';

@Component({
  selector: 'app-group-ranking-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-ranking-card.component.html',
  styleUrl: './group-ranking-card.component.scss',
})
export class GroupRankingCardComponent {
  @Input({ required: true }) activeSeasonEndsAt!: string | null | undefined;
  @Input({ required: true }) activeSeasonName!: string | null | undefined;
  @Input({ required: true }) seasonCountdown!: string | null;
  @Input({ required: true }) seasonCountdownState!: 'normal' | 'warning' | 'critical';
  @Input({ required: true }) rankingMode!: 'current' | 'previous';
  @Input({ required: true }) snapshotAvailable!: boolean;
  @Input({ required: true }) ranking!: RankingEntryWithTrend[];
  @Input({ required: true }) paginatedRanking!: RankingEntryWithTrend[];
  @Input({ required: true }) rankingPage!: number;
  @Input({ required: true }) rankingTotalPages!: number;
  @Input({ required: true }) defaultDeckImage!: string;
  @Input({ required: true }) getColorGradient!: (colors: string) => string;
  @Input({ required: true }) getDeckImageUrl!: (deckId: string) => string | null;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];
  @Input({ required: true }) getArchidektUrl!: (deckId: string) => string | null;

  @Output() rankingModeToggle = new EventEmitter<void>();
  @Output() rankingPageChange = new EventEmitter<number>();

  toggleRankingMode(): void {
    this.rankingModeToggle.emit();
  }

  setRankingPage(page: number): void {
    this.rankingPageChange.emit(page);
  }
}
