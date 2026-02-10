import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-deck-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-deck-create-modal.component.html',
  styleUrl: './group-deck-create-modal.component.scss',
})
export class GroupDeckCreateModalComponent {
  @Input({ required: true }) deckError!: string | null;
  @Input({ required: true }) deckLoading!: boolean;
  @Input({ required: true }) deckName!: string;
  @Input({ required: true }) deckColors!: string;
  @Input({ required: true }) deckType!: string;
  @Input({ required: true }) deckArchidektUrl!: string;
  @Input({ required: true }) colorDropdownOpen!: boolean;
  @Input({ required: true }) colorOptions!: string[];
  @Input({ required: true }) typeOptions!: string[];
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];

  @Output() deckNameChange = new EventEmitter<string>();
  @Output() deckColorsChange = new EventEmitter<string>();
  @Output() deckTypeChange = new EventEmitter<string>();
  @Output() deckArchidektUrlChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() openColorDropdown = new EventEmitter<void>();
  @Output() closeColorDropdown = new EventEmitter<void>();
  @Output() selectColor = new EventEmitter<string>();
}
