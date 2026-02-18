import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Deck } from '../../models/group.model';

@Component({
  selector: 'app-group-decks-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-decks-card.component.html',
  styleUrl: './group-decks-card.component.scss',
})
export class GroupDecksCardComponent {
  @Input({ required: true }) deckSortMode!: 'name' | 'type' | 'colors';
  @Input({ required: true }) decksCollapsed!: boolean;
  @Input({ required: true }) isEmailVerified!: boolean;
  @Input({ required: true }) decksLength!: number;
  @Input({ required: true }) decksSearchTerm!: string;
  @Input({ required: true }) filteredDecks!: Deck[];
  @Input({ required: true }) paginatedDecks!: Deck[];
  @Input({ required: true }) decksPage!: number;
  @Input({ required: true }) decksTotalPages!: number;
  @Input({ required: true }) defaultDeckImage!: string;
  @Input({ required: true }) getColorGradient!: (colors: string) => string;
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];
  @Input({ required: true }) getDeckTypeLabel!: (type: string | undefined) => string;
  @Input({ required: true }) canEditDeck!: (deck: Deck) => boolean;

  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() addDeck = new EventEmitter<void>();
  @Output() editDeck = new EventEmitter<Deck>();
  @Output() decksSearchChange = new EventEmitter<string>();
  @Output() deckSortModeChange = new EventEmitter<'name' | 'type' | 'colors'>();
  @Output() decksPageChange = new EventEmitter<number>();
}
