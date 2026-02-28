import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { HistoryItem } from './history-utils';

@Component({
  selector: 'app-group-history-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-history-card.component.html',
  styleUrl: './group-history-card.component.scss',
})
export class GroupHistoryCardComponent implements OnChanges {
  @Input({ required: true }) historyCollapsed!: boolean;
  @Input({ required: true }) historyFilter!: 'all' | 'games' | 'events';
  @Input({ required: true }) historyDeckFilter!: string;
  @Input({ required: true }) historyDeckOptions!: Array<{ id: string; name: string }>;
  @Input({ required: true }) filteredHistoryLength!: number;
  @Input({ required: true }) paginatedHistory!: HistoryItem[];
  @Input({ required: true }) historyTotalPages!: number;
  @Input({ required: true }) historyPage!: number;
  @Input() searchInputsReadonly = false;
  @Input({ required: true }) isAdmin!: boolean;
  @Input({ required: true }) isEmailVerified!: boolean;
  @Input({ required: true }) gamesLength!: number;
  @Input({ required: true }) formatDate!: (date: string) => string;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];

  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() historyFilterChange = new EventEmitter<'all' | 'games' | 'events'>();
  @Output() historyDeckFilterChange = new EventEmitter<string>();
  @Output() historyPageChange = new EventEmitter<number>();
  @Output() undoLast = new EventEmitter<void>();

  deckFilterInput = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historyDeckFilter'] || changes['historyDeckOptions']) {
      this.deckFilterInput = this.getDeckNameById(this.historyDeckFilter);
    }
  }

  toggleCard(): void {
    this.toggleCollapsed.emit();
  }

  setFilter(filter: 'all' | 'games' | 'events'): void {
    this.historyFilterChange.emit(filter);
  }

  onDeckFilterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.deckFilterInput = input.value;

    if (!value) {
      this.historyDeckFilterChange.emit('');
      return;
    }

    const exactMatch = this.historyDeckOptions.find(
      (deck) => deck.name.toLowerCase() === value.toLowerCase(),
    );
    if (exactMatch) {
      this.historyDeckFilterChange.emit(exactMatch.id);
    }
  }

  onDeckFilterBlur(): void {
    const value = this.deckFilterInput.trim();
    if (!value) {
      this.historyDeckFilterChange.emit('');
      this.deckFilterInput = '';
      return;
    }

    const exactMatch = this.historyDeckOptions.find(
      (deck) => deck.name.toLowerCase() === value.toLowerCase(),
    );
    if (exactMatch) {
      this.deckFilterInput = exactMatch.name;
      this.historyDeckFilterChange.emit(exactMatch.id);
      return;
    }

    this.deckFilterInput = this.getDeckNameById(this.historyDeckFilter);
  }

  clearDeckFilter(): void {
    this.deckFilterInput = '';
    this.historyDeckFilterChange.emit('');
  }

  setPage(page: number): void {
    this.historyPageChange.emit(page);
  }

  undoLastGame(): void {
    this.undoLast.emit();
  }

  private getDeckNameById(deckId: string): string {
    if (!deckId) return '';
    return this.historyDeckOptions.find((deck) => deck.id === deckId)?.name || '';
  }
}
