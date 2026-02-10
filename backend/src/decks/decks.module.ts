import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupsModule } from '../groups/groups.module';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { DecksArchidektService } from './decks-archidekt.service';

@Module({
  imports: [PrismaModule, GroupsModule],
  controllers: [DecksController],
  providers: [DecksService, DecksArchidektService],
  exports: [DecksService],
})
export class DecksModule {}
