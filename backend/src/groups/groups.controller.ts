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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupsService } from './groups.service';
import { EventsService } from '../events/events.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateUserInviteDto } from './dto/create-user-invite.dto';
import { CreateEmailInviteDto } from './dto/create-email-invite.dto';
import { SearchGroupsQueryDto } from './dto/search-groups-query.dto';
import { SearchInvitableUsersQueryDto } from './dto/search-invitable-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../auth/guards/verified-user.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { createImageUploadInterceptorOptions } from '../common/upload/image-upload.util';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

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

  @Get('search')
  search(
    @Query() queryDto: SearchGroupsQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.search(
      queryDto.query ?? '',
      user.id,
      queryDto.page,
      queryDto.pageSize,
    );
  }

  @Get('invites/incoming')
  getIncomingInvites(@CurrentUser() user: CurrentUserType) {
    return this.groupsService.getIncomingInvites(user.id);
  }

  @Get('applications/incoming')
  getIncomingApplications(@CurrentUser() user: CurrentUserType) {
    return this.groupsService.getIncomingApplications(user.id);
  }

  @Get('invites/sent')
  getSentInvites(@CurrentUser() user: CurrentUserType) {
    return this.groupsService.getSentInvites(user.id);
  }

  @Post('invites/:inviteId/accept')
  @UseGuards(VerifiedUserGuard)
  acceptInvite(
    @Param('inviteId', ParseCuidPipe) inviteId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.acceptInvite(inviteId, user.id);
  }

  @Post('invites/:inviteId/reject')
  @UseGuards(VerifiedUserGuard)
  rejectInvite(
    @Param('inviteId', ParseCuidPipe) inviteId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.rejectInvite(inviteId, user.id);
  }

  @Delete('invites/:inviteId')
  @UseGuards(VerifiedUserGuard)
  cancelSentInvite(
    @Param('inviteId', ParseCuidPipe) inviteId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.cancelSentInvite(inviteId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseCuidPipe) id: string,
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

  @Get(':id/invitable-users')
  @UseGuards(VerifiedUserGuard)
  searchInvitableUsers(
    @Param('id', ParseCuidPipe) groupId: string,
    @Query() queryDto: SearchInvitableUsersQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.searchInvitableUsers(
      groupId,
      user.id,
      queryDto.query ?? '',
    );
  }

  @Post(':id/invites/user')
  @UseGuards(VerifiedUserGuard)
  createUserInvite(
    @Param('id', ParseCuidPipe) groupId: string,
    @Body() createUserInviteDto: CreateUserInviteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.createUserInvite(
      groupId,
      user.id,
      createUserInviteDto.targetUserId,
    );
  }

  @Post(':id/invites/email')
  @UseGuards(VerifiedUserGuard)
  createEmailInvite(
    @Param('id', ParseCuidPipe) groupId: string,
    @Body() createEmailInviteDto: CreateEmailInviteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.createEmailInvite(
      groupId,
      user.id,
      createEmailInviteDto.email,
    );
  }

  @Post(':id/applications')
  @UseGuards(VerifiedUserGuard)
  applyToGroup(
    @Param('id', ParseCuidPipe) groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.createApplication(groupId, user.id);
  }

  @Get(':id/applications')
  getApplications(
    @Param('id', ParseCuidPipe) groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.getApplications(groupId, user.id);
  }

  @Post(':id/applications/:userId/accept')
  @UseGuards(VerifiedUserGuard)
  acceptApplication(
    @Param('id', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) applicantUserId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.acceptApplication(
      groupId,
      applicantUserId,
      user.id,
    );
  }

  @Post(':id/applications/:userId/reject')
  @UseGuards(VerifiedUserGuard)
  rejectApplication(
    @Param('id', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) applicantUserId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.rejectApplication(
      groupId,
      applicantUserId,
      user.id,
    );
  }

  @Post(':id/season-reset')
  @UseGuards(VerifiedUserGuard)
  resetSeason(
    @Param('id', ParseCuidPipe) groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.resetSeason(groupId, user.id);
  }

  @Post(':id/season-banner/dismiss')
  @UseGuards(VerifiedUserGuard)
  dismissSeasonBanner(
    @Param('id', ParseCuidPipe) groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.dismissWinnersBanner(groupId, user.id);
  }

  @Patch(':id')
  @UseGuards(VerifiedUserGuard)
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.update(id, updateGroupDto, user.id);
  }

  @Post(':id/image')
  @UseGuards(VerifiedUserGuard)
  @UseInterceptors(FileInterceptor('file', createImageUploadInterceptorOptions()))
  uploadGroupImage(
    @Param('id', ParseCuidPipe) groupId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.updateGroupImage(groupId, user.id, file);
  }

  @Delete(':id/members/:userId')
  @UseGuards(VerifiedUserGuard)
  removeMember(
    @Param('id', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) memberUserId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.removeMember(groupId, memberUserId, user.id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(VerifiedUserGuard)
  updateMemberRole(
    @Param('id', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) memberUserId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.updateMemberRole(
      groupId,
      memberUserId,
      updateMemberRoleDto.role,
      user.id,
    );
  }

  @Post(':id/regenerate-code')
  @UseGuards(VerifiedUserGuard)
  regenerateInviteCode(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.regenerateInviteCode(id, user.id);
  }

  @Delete(':id')
  @UseGuards(VerifiedUserGuard)
  remove(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.remove(id, user.id);
  }

  @Get(':id/events')
  async getEvents(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Verify user is a member first
    await this.groupsService.findOne(id, user.id);
    return this.eventsService.getEvents(id);
  }
}
