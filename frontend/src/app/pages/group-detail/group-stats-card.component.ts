import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Deck } from '../../models/group.model';
import { sanitizeSearchInput } from '../../core/utils/input-validation';

type StatsCategory = 'colors' | 'decks' | 'players';

@Component({
  selector: 'app-group-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-stats-card.component.html',
  styleUrl: './group-stats-card.component.scss',
})
export class GroupStatsCardComponent implements OnDestroy {
  @Input({ required: true }) statsCollapsed!: boolean;
  @Input({ required: true }) statsMessage!: string | null;
  @Input({ required: true }) statsCategory!: StatsCategory;
  @Input({ required: true }) statsOption!: string;
  @Input({ required: true }) statsDeckId!: string | null;
  @Input({ required: true }) statsDeckSearch!: string;
  @Input({ required: true }) statsDeckDropdownOpen!: boolean;
  @Input({ required: true }) filteredStatsDecks!: Deck[];
  @Input({ required: true }) getDeckNameById!: (id: string) => string;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];

  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() statsCategoryChange = new EventEmitter<StatsCategory>();
  @Output() statsOptionChange = new EventEmitter<string>();
  @Output() statsDeckSearchChange = new EventEmitter<string>();
  @Output() openStatsDeckDropdown = new EventEmitter<void>();
  @Output() closeStatsDeckDropdownDelayed = new EventEmitter<void>();
  @Output() selectStatsDeck = new EventEmitter<string>();
  @Output() clearStatsDeckSelection = new EventEmitter<void>();
  @Output() chartReady = new EventEmitter<ElementRef<HTMLCanvasElement> | null>();

  @ViewChild('statsChart')
  set statsChartRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.chartReady.emit(ref ?? null);
  }

  ngOnDestroy(): void {
    this.chartReady.emit(null);
  }

  handleDeckSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.statsDeckSearchChange.emit(sanitizeSearchInput(input.value, 100));
  }
}
