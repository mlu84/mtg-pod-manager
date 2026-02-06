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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupsService } from './groups.service';
import { EventsService } from '../events/events.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
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

  @Get('search')
  search(
    @Query('query') query: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.search(query, user.id, page, pageSize);
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

  @Post(':id/applications')
  @UseGuards(VerifiedUserGuard)
  applyToGroup(
    @Param('id') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.createApplication(groupId, user.id);
  }

  @Get(':id/applications')
  getApplications(
    @Param('id') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.getApplications(groupId, user.id);
  }

  @Post(':id/applications/:userId/accept')
  @UseGuards(VerifiedUserGuard)
  acceptApplication(
    @Param('id') groupId: string,
    @Param('userId') applicantUserId: string,
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
    @Param('id') groupId: string,
    @Param('userId') applicantUserId: string,
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
    @Param('id') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.resetSeason(groupId, user.id);
  }

  @Post(':id/season-banner/dismiss')
  @UseGuards(VerifiedUserGuard)
  dismissSeasonBanner(
    @Param('id') groupId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.dismissWinnersBanner(groupId, user.id);
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

  @Post(':id/image')
  @UseGuards(VerifiedUserGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Unsupported image type'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadGroupImage(
    @Param('id') groupId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.groupsService.updateGroupImage(groupId, user.id, file);
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

  @Patch(':id/members/:userId/role')
  @UseGuards(VerifiedUserGuard)
  updateMemberRole(
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
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
