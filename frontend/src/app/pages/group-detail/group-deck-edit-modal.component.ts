import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-deck-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-deck-edit-modal.component.html',
  styleUrl: './group-deck-edit-modal.component.scss',
})
export class GroupDeckEditModalComponent {
  @Input({ required: true }) assignOwnerOptions!: Array<{
    id: string;
    inAppName: string;
  }>;
  @Input({ required: true }) editDeckError!: string | null;
  @Input({ required: true }) editDeckLoading!: boolean;
  @Input({ required: true }) editDeckName!: string;
  @Input({ required: true }) editDeckColors!: string;
  @Input({ required: true }) editDeckType!: string;
  @Input({ required: true }) editDeckOwnerId!: string;
  @Input({ required: true }) currentDeckOwnerId!: string;
  @Input({ required: true }) editDeckIsActive!: boolean;
  @Input({ required: true }) editDeckArchidektUrl!: string;
  @Input({ required: true }) editColorDropdownOpen!: boolean;
  @Input({ required: true }) colorOptions!: string[];
  @Input({ required: true }) typeOptions!: string[];
  @Input({ required: true }) getManaSymbols!: (colors: string) => string[];
  @Input({ required: true }) hasArchidektId!: boolean;

  @Output() editDeckNameChange = new EventEmitter<string>();
  @Output() editDeckColorsChange = new EventEmitter<string>();
  @Output() editDeckTypeChange = new EventEmitter<string>();
  @Output() editDeckOwnerIdChange = new EventEmitter<string>();
  @Output() editDeckIsActiveChange = new EventEmitter<boolean>();
  @Output() editDeckArchidektUrlChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() assignOwner = new EventEmitter<void>();
  @Output() openEditColorDropdown = new EventEmitter<void>();
  @Output() closeEditColorDropdown = new EventEmitter<void>();
  @Output() selectEditColor = new EventEmitter<string>();
  @Output() refreshArchidekt = new EventEmitter<void>();
  @Output() requestDeleteDeck = new EventEmitter<void>();

  canAssignOwner(): boolean {
    const selectedOwnerId = this.editDeckOwnerId?.trim();
    return (
      !!selectedOwnerId &&
      selectedOwnerId !== this.currentDeckOwnerId &&
      !this.editDeckLoading
    );
  }
}
