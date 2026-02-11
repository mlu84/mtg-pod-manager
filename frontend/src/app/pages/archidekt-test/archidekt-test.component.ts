import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ErrorReportingService } from '../../core/services/error-reporting.service';
import { formatLocalDate } from '../../core/utils/date-utils';

interface ArchidektCardEntry {
  categories?: string[];
  card?: {
    oracleCard?: {
      name?: string;
      colorIdentity?: string[];
    };
  };
}

interface ArchidektDescription {
  ops?: Array<{ insert?: string }>;
}

interface ArchidektNamedItem {
  name?: string;
}

interface ArchidektOwner {
  username?: string;
}

interface ArchidektDeckResponse {
  id: number;
  name: string;
  deckFormat?: number;
  owner?: ArchidektOwner;
  createdAt?: string;
  updatedAt?: string;
  viewCount?: number;
  cards?: ArchidektCardEntry[];
  categories?: ArchidektNamedItem[];
  deckTags?: ArchidektNamedItem[];
  private?: boolean;
  description?: ArchidektDescription;
}

type ArchidektApiResponse = ArchidektDeckResponse | { error: string };

@Component({
  selector: 'app-archidekt-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archidekt-test.component.html',
  styleUrl: './archidekt-test.component.scss',
})
export class ArchidektTestComponent {
  deckUrl = '';
  loading = signal(false);
  error = signal<string | null>(null);
  rawData = signal<ArchidektDeckResponse | null>(null);

  // Extracted useful data
  deckInfo = signal<{
    id: number;
    name: string;
    format: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    cardCount: number;
    commanderNames: string[];
    colorIdentity: string[];
    categories: string[];
    tags: string[];
    isPrivate: boolean;
    description: string;
  } | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private errorReporting: ErrorReportingService,
  ) {}

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  extractDeckId(url: string): string | null {
    // Match patterns like:
    // https://archidekt.com/decks/12784239/
    // https://archidekt.com/decks/12784239
    // archidekt.com/decks/12784239
    // 12784239
    const match = url.match(/(\d+)\/?$/);
    if (match) {
      return match[1];
    }
    const urlMatch = url.match(/decks\/(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return null;
  }

  fetchDeck(): void {
    const deckId = this.extractDeckId(this.deckUrl);
    if (!deckId) {
      this.error.set('Invalid deck URL or ID. Please enter a valid Archidekt deck URL.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.rawData.set(null);
    this.deckInfo.set(null);

    // Use backend proxy to avoid CORS issues
    const apiUrl = `${environment.apiUrl}/archidekt/decks/${deckId}`;

    this.http.get<ArchidektApiResponse>(apiUrl).subscribe({
      next: (data) => {
        if ('error' in data) {
          this.error.set(data.error);
          this.loading.set(false);
          return;
        }
        this.rawData.set(data);
        this.extractUsefulData(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const httpError =
          typeof err === 'object' && err !== null
            ? (err as {
                status?: number;
                message?: string;
                error?: { message?: string };
              })
            : undefined;
        this.errorReporting.report(err, 'archidekt-test.fetchDeck');
        this.error.set(
          httpError?.status === 404
            ? 'Deck not found. Please check the URL.'
            : httpError?.status === 401
            ? 'Please log in to use this feature.'
            : `Failed to fetch deck: ${httpError?.error?.message || httpError?.message || 'Unknown error'}`
        );
        this.loading.set(false);
      },
    });
  }

  private extractUsefulData(data: ArchidektDeckResponse): void {
    // Find commanders (cards in "Commander" category or with commander flag)
    const commanders: string[] = [];
    const allColors = new Set<string>();

    if (data.cards) {
      for (const card of data.cards) {
        // Check if card is in Commander category
        const isCommander = card.categories?.some(
          (cat: string) => cat.toLowerCase() === 'commander'
        );
        if (isCommander && card.card?.oracleCard?.name) {
          commanders.push(card.card.oracleCard.name);
        }

        // Collect color identity
        if (card.card?.oracleCard?.colorIdentity) {
          for (const color of card.card.oracleCard.colorIdentity) {
            allColors.add(color);
          }
        }
      }
    }

    // Extract description text
    let descriptionText = '';
    if (data.description?.ops) {
      descriptionText = data.description.ops
        .map((op) => op.insert || '')
        .join('')
        .trim();
    }

    // Map format number to name
    const formatMap: Record<number, string> = {
      1: 'Standard',
      2: 'Modern',
      3: 'Commander',
      4: 'Legacy',
      5: 'Vintage',
      6: 'Pauper',
      7: 'Pioneer',
      8: 'Historic',
      9: 'Brawl',
      10: 'Penny Dreadful',
      11: 'Oathbreaker',
      12: 'Duel Commander',
      13: 'Premodern',
      14: 'Explorer',
      15: 'Timeless',
    };

    this.deckInfo.set({
      id: data.id,
      name: data.name,
      format:
        data.deckFormat !== undefined
          ? formatMap[data.deckFormat] || `Format ${data.deckFormat}`
          : 'Unknown',
      owner: data.owner?.username || 'Unknown',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      viewCount: data.viewCount || 0,
      cardCount: data.cards?.length || 0,
      commanderNames: commanders,
      colorIdentity: Array.from(allColors),
      categories: data.categories?.map((c) => c.name || '').filter(Boolean) || [],
      tags: data.deckTags?.map((t) => t.name || '').filter(Boolean) || [],
      isPrivate: data.private || false,
      description: descriptionText,
    });
  }

  getColorName(color: string): string {
    const colorMap: Record<string, string> = {
      W: 'White',
      U: 'Blue',
      B: 'Black',
      R: 'Red',
      G: 'Green',
      C: 'Colorless',
    };
    return colorMap[color] || color;
  }

  getColorNamesString(colors: string[]): string {
    return colors.map((c) => this.getColorName(c)).join(', ');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return formatLocalDate(dateString, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
