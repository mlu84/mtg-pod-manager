import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HistoryItem } from './history-utils';

@Component({
  selector: 'app-group-history-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-history-card.component.html',
  styleUrl: './group-history-card.component.scss',
})
export class GroupHistoryCardComponent {
  @Input({ required: true }) historyFilter!: 'all' | 'games' | 'events';
  @Input({ required: true }) filteredHistoryLength!: number;
  @Input({ required: true }) paginatedHistory!: HistoryItem[];
  @Input({ required: true }) historyTotalPages!: number;
  @Input({ required: true }) historyPage!: number;
  @Input({ required: true }) isAdmin!: boolean;
  @Input({ required: true }) isEmailVerified!: boolean;
  @Input({ required: true }) gamesLength!: number;
  @Input({ required: true }) formatDate!: (date: string) => string;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];

  @Output() historyFilterChange = new EventEmitter<'all' | 'games' | 'events'>();
  @Output() historyPageChange = new EventEmitter<number>();
  @Output() undoLast = new EventEmitter<void>();

  setFilter(filter: 'all' | 'games' | 'events'): void {
    this.historyFilterChange.emit(filter);
  }

  setPage(page: number): void {
    this.historyPageChange.emit(page);
  }

  undoLastGame(): void {
    this.undoLast.emit();
  }
}
