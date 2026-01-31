import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { EventsService } from '../events/events.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../auth/guards/verified-user.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly eventsService: EventsService,
  ) {}

  @Post()
  @UseGuards(VerifiedUserGuard)
  create(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.create(createGroupDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserType) {
    return this.groupsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.findOne(id, user.id);
  }

  @Post('join')
  join(
    @Body() joinGroupDto: JoinGroupDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.joinByCode(joinGroupDto.inviteCode, user.id);
  }

  @Patch(':id')
  @UseGuards(VerifiedUserGuard)
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.update(id, updateGroupDto, user.id);
  }

  @Delete(':id/members/:userId')
  @UseGuards(VerifiedUserGuard)
  removeMember(
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.removeMember(groupId, memberUserId, user.id);
  }

  @Post(':id/regenerate-code')
  @UseGuards(VerifiedUserGuard)
  regenerateInviteCode(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.regenerateInviteCode(id, user.id);
  }

  @Delete(':id')
  @UseGuards(VerifiedUserGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.remove(id, user.id);
  }

  @Get(':id/events')
  async getEvents(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Verify user is a member first
    await this.groupsService.findOne(id, user.id);
    return this.eventsService.getEvents(id);
  }
}
