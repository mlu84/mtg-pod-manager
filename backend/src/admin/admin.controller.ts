import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SysAdminGuard } from '../auth/guards/sysadmin.guard';
import { AdminService } from './admin.service';
import { RenameUserDto } from './dto/rename-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, SysAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('groups')
  searchGroups(
    @Query('query') query: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.adminService.searchGroups(query, page, pageSize);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') groupId: string) {
    return this.adminService.deleteGroup(groupId);
  }

  @Patch('users/:id/rename')
  renameUser(@Param('id') userId: string, @Body() dto: RenameUserDto) {
    return this.adminService.renameUser(userId, dto.inAppName);
  }

  @Patch('groups/:groupId/members/:userId/role')
  updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.adminService.updateMemberRole(groupId, userId, dto.role);
  }

  @Delete('groups/:groupId/members/:userId')
  removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.removeMember(groupId, userId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUserAccount(userId);
  }
}
