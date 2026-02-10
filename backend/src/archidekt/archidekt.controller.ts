import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SysAdminGuard } from '../auth/guards/sysadmin.guard';

@Controller('archidekt')
@UseGuards(JwtAuthGuard, SysAdminGuard)
export class ArchidektController {
  private readonly logger = new Logger(ArchidektController.name);

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
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(`Archidekt API error: ${details}`);
      return { error: 'Failed to fetch deck from Archidekt' };
    }
  }
}
