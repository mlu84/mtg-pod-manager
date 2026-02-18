import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupDetail } from '../../models/group.model';
import { getManaSymbols as toManaSymbols } from './color-utils';
import { formatLocalDate } from '../../core/utils/date-utils';

type WinnersBanner = NonNullable<GroupDetail['winnersBanner']>;

@Component({
  selector: 'app-group-winners-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-winners-banner.component.html',
  styleUrl: './group-winners-banner.component.scss',
})
export class GroupWinnersBannerComponent {
  @Input({ required: true }) banner!: WinnersBanner;
  @Input({ required: true }) defaultDeckImage!: string;
  @Output() dismiss = new EventEmitter<void>();

  get info(): string | null {
    if (!this.banner) return null;
    return `Season ended ${formatLocalDate(this.banner.endedAt)}`;
  }

  getManaSymbols(colors: string): string[] {
    return toManaSymbols(colors);
  }
}
