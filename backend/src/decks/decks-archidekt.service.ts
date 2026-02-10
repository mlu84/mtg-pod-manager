import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DecksArchidektService {
  private readonly logger = new Logger(DecksArchidektService.name);

  extractArchidektId(urlOrId: string): string | null {
    if (!urlOrId || urlOrId.trim() === '') return null;

    const trimmed = urlOrId.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(/decks\/(\d+)/);
    if (match) {
      return match[1];
    }

    return null;
  }

  async fetchArchidektData(archidektId: string): Promise<{
    imageUrl: string | null;
    commanderName: string | null;
    colorIdentity: string[];
  } | null> {
    try {
      const response = await fetch(
        `https://archidekt.com/api/decks/${archidektId}/`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Archidekt API returned ${response.status} for deck ${archidektId}`,
        );
        return null;
      }

      const data = await response.json();

      let imageUrl: string | null = null;
      if (data.featured) {
        imageUrl = data.featured.startsWith('http')
          ? data.featured
          : `https://archidekt.com${data.featured}`;
      }

      let commanderName: string | null = null;
      const colorIdentity = new Set<string>();

      if (data.cards && Array.isArray(data.cards)) {
        for (const card of data.cards) {
          const isCommander = card.categories?.some(
            (cat: string) => cat.toLowerCase() === 'commander',
          );
          if (isCommander && card.card?.oracleCard?.name) {
            commanderName = commanderName
              ? `${commanderName} / ${card.card.oracleCard.name}`
              : card.card.oracleCard.name;
          }

          if (card.card?.oracleCard?.colorIdentity) {
            for (const color of card.card.oracleCard.colorIdentity) {
              colorIdentity.add(color);
            }
          }
        }
      }

      return {
        imageUrl,
        commanderName,
        colorIdentity: Array.from(colorIdentity),
      };
    } catch (error) {
      this.logger.error('Error fetching Archidekt data', error);
      return null;
    }
  }
}
