import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupsModule } from '../groups/groups.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GamesScoringService } from './games-scoring.service';

@Module({
  imports: [PrismaModule, GroupsModule],
  controllers: [GamesController],
  providers: [GamesService, GamesScoringService],
  exports: [GamesService],
})
export class GamesModule {}
