import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SysAdminGuard } from '../auth/guards/sysadmin.guard';
import { AdminService } from './admin.service';
import { AdminSearchGroupsQueryDto } from './dto/search-groups-query.dto';
import { RenameUserDto } from './dto/rename-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { CreateNewsEntryDto } from './dto/create-news-entry.dto';
import { AdminListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { AdminBulkFeedbackActionDto } from './dto/bulk-feedback-action.dto';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, SysAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('groups')
  searchGroups(
    @Query() queryDto: AdminSearchGroupsQueryDto,
  ) {
    return this.adminService.searchGroups(
      queryDto.query ?? '',
      queryDto.page,
      queryDto.pageSize,
    );
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id', ParseCuidPipe) groupId: string) {
    return this.adminService.deleteGroup(groupId);
  }

  @Patch('users/:id/rename')
  renameUser(@Param('id', ParseCuidPipe) userId: string, @Body() dto: RenameUserDto) {
    return this.adminService.renameUser(userId, dto.inAppName);
  }

  @Patch('groups/:groupId/members/:userId/role')
  updateMemberRole(
    @Param('groupId', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.adminService.updateMemberRole(groupId, userId, dto.role);
  }

  @Delete('groups/:groupId/members/:userId')
  removeMember(
    @Param('groupId', ParseCuidPipe) groupId: string,
    @Param('userId', ParseCuidPipe) userId: string,
  ) {
    return this.adminService.removeMember(groupId, userId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseCuidPipe) userId: string) {
    return this.adminService.deleteUserAccount(userId);
  }

  @Post('news')
  createNews(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateNewsEntryDto,
  ) {
    return this.adminService.createNewsEntry(user.id, dto);
  }

  @Get('feedback')
  listFeedback(@Query() queryDto: AdminListFeedbackQueryDto) {
    return this.adminService.listFeedback(queryDto);
  }

  @Get('feedback/unread-count')
  getFeedbackUnreadCount() {
    return this.adminService.getFeedbackUnreadCount();
  }

  @Get('analytics')
  getAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return this.adminService.getAnalytics(queryDto);
  }

  @Patch('feedback/mark-read')
  markFeedbackAsRead(@Body() dto: AdminBulkFeedbackActionDto) {
    return this.adminService.markFeedbackAsRead(dto.ids);
  }

  @Delete('feedback')
  deleteFeedback(@Body() dto: AdminBulkFeedbackActionDto) {
    return this.adminService.deleteFeedback(dto.ids);
  }
}
