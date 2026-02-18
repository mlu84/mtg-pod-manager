import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../auth/guards/verified-user.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

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
    @Query('groupId', ParseCuidPipe) groupId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user?: CurrentUserType,
  ) {
    return this.gamesService.findAllInGroup(groupId, user!.id, limit);
  }

  @Get('ranking')
  getRanking(
    @Query('groupId', ParseCuidPipe) groupId: string,
    @Query('snapshot', new DefaultValuePipe(false), ParseBoolPipe) snapshot: boolean,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.getRanking(groupId, user.id, snapshot);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.findOne(id, user.id);
  }

  @Delete('undo')
  @UseGuards(VerifiedUserGuard)
  undoLastGame(
    @Query('groupId', ParseCuidPipe) groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.gamesService.undoLastGame(groupId, user.id);
  }
}
