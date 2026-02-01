import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('archidekt')
@UseGuards(JwtAuthGuard)
export class ArchidektController {
  @Get('decks/:id')
  async getDeck(@Param('id') id: string) {
    const deckId = parseInt(id, 10);
    if (isNaN(deckId)) {
      return { error: 'Invalid deck ID' };
    }

    try {
      const response = await fetch(
        `https://archidekt.com/api/decks/${deckId}/`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Deck not found' };
        }
        return { error: `API error: ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Archidekt API error:', error);
      return { error: 'Failed to fetch deck from Archidekt' };
    }
  }
}
