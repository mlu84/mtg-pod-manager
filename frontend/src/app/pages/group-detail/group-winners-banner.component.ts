import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupDetail } from '../../models/group.model';
import { getManaSymbols as toManaSymbols } from './color-utils';

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
  @Output() dismiss = new EventEmitter<void>();

  get info(): string | null {
    if (!this.banner) return null;
    const endedAt = new Date(this.banner.endedAt);
    return `Season ended ${endedAt.toLocaleDateString('en-US')}`;
  }

  getManaSymbols(colors: string): string[] {
    return toManaSymbols(colors);
  }
}
