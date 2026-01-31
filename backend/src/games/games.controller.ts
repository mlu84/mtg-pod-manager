import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../auth/guards/verified-user.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @UseGuards(VerifiedUserGuard)
  create(
    @Body() createGameDto: CreateGameDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.create(createGameDto, user.id);
  }

  @Get()
  findAllInGroup(
    @Query('groupId') groupId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    return this.gamesService.findAllInGroup(
      groupId,
      user!.id,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('ranking')
  getRanking(
    @Query('groupId') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.getRanking(groupId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.findOne(id, user.id);
  }

  @Delete('undo')
  @UseGuards(VerifiedUserGuard)
  undoLastGame(
    @Query('groupId') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.undoLastGame(groupId, user.id);
  }
}
