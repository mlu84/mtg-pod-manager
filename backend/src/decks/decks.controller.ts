import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../auth/guards/verified-user.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  @UseGuards(VerifiedUserGuard)
  create(
    @Body() createDeckDto: CreateDeckDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.create(createDeckDto, user.id);
  }

  @Get()
  findAllInGroup(
    @Query('groupId') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.findAllInGroup(groupId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(VerifiedUserGuard)
  update(
    @Param('id') id: string,
    @Body() updateDeckDto: UpdateDeckDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.update(id, updateDeckDto, user.id);
  }

  @Post(':id/refresh-archidekt')
  @UseGuards(VerifiedUserGuard)
  refreshArchidekt(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.refreshArchidekt(id, user.id);
  }

  @Delete(':id')
  @UseGuards(VerifiedUserGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.decksService.remove(id, user.id);
  }
}
