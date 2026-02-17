import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsApplicationsService } from './groups-applications.service';
import { GroupsCrudService } from './groups-crud.service';
import { GroupsInviteService } from './groups-invite.service';
import { GroupsMediaService } from './groups-media.service';
import { GroupsMembersService } from './groups-members.service';
import { GroupsQueryService } from './groups-query.service';
import { GroupsSeasonService } from './groups-season.service';
import { GroupsInvitationsService } from './groups-invitations.service';

@Injectable()
export class GroupsService {
  constructor(
    private groupsCrudService: GroupsCrudService,
    private groupsQueryService: GroupsQueryService,
    private groupsApplicationsService: GroupsApplicationsService,
    private groupsMembersService: GroupsMembersService,
    private groupsInviteService: GroupsInviteService,
    private groupsMediaService: GroupsMediaService,
    private groupsSeasonService: GroupsSeasonService,
    private groupsInvitationsService: GroupsInvitationsService,
  ) {}

  create(createGroupDto: CreateGroupDto, userId: string) {
    return this.groupsCrudService.create(createGroupDto, userId);
  }

  findAllForUser(userId: string) {
    return this.groupsQueryService.findAllForUser(userId);
  }

  search(query: string, userId: string, page?: string, pageSize?: string) {
    return this.groupsQueryService.search(query, userId, page, pageSize);
  }

  findOne(groupId: string, userId: string) {
    return this.groupsQueryService.findOne(groupId, userId);
  }

  joinByCode(inviteCode: string, userId: string) {
    return this.groupsInviteService.joinByCode(inviteCode, userId);
  }

  createApplication(groupId: string, userId: string) {
    return this.groupsApplicationsService.createApplication(groupId, userId);
  }

  getApplications(groupId: string, userId: string) {
    return this.groupsApplicationsService.getApplications(groupId, userId);
  }

  getIncomingApplications(userId: string) {
    return this.groupsApplicationsService.getIncomingApplications(userId);
  }

  acceptApplication(groupId: string, applicantUserId: string, adminUserId: string) {
    return this.groupsApplicationsService.acceptApplication(
      groupId,
      applicantUserId,
      adminUserId,
    );
  }

  rejectApplication(groupId: string, applicantUserId: string, adminUserId: string) {
    return this.groupsApplicationsService.rejectApplication(
      groupId,
      applicantUserId,
      adminUserId,
    );
  }

  update(groupId: string, updateGroupDto: UpdateGroupDto, userId: string) {
    return this.groupsCrudService.update(groupId, updateGroupDto, userId);
  }

  removeMember(groupId: string, memberUserId: string, requestingUserId: string) {
    return this.groupsMembersService.removeMember(
      groupId,
      memberUserId,
      requestingUserId,
    );
  }

  updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: 'ADMIN' | 'MEMBER',
    requestingUserId: string,
  ) {
    return this.groupsMembersService.updateMemberRole(
      groupId,
      memberUserId,
      role,
      requestingUserId,
    );
  }

  regenerateInviteCode(groupId: string, userId: string) {
    return this.groupsInviteService.regenerateInviteCode(groupId, userId);
  }

  remove(groupId: string, userId: string) {
    return this.groupsCrudService.remove(groupId, userId);
  }

  updateGroupImage(groupId: string, userId: string, file: Express.Multer.File) {
    return this.groupsMediaService.updateGroupImage(groupId, userId, file);
  }

  ensureSeasonUpToDate(groupId: string): Promise<void> {
    return this.groupsSeasonService.ensureSeasonUpToDate(groupId);
  }

  resetSeason(groupId: string, userId: string): Promise<void> {
    return this.groupsSeasonService.resetSeason(groupId, userId);
  }

  getLastSeasonRanking(groupId: string) {
    return this.groupsSeasonService.getLastSeasonRanking(groupId);
  }

  dismissWinnersBanner(groupId: string, userId: string): Promise<void> {
    return this.groupsSeasonService.dismissWinnersBanner(groupId, userId);
  }

  searchInvitableUsers(groupId: string, userId: string, query: string) {
    return this.groupsInvitationsService.searchInvitableUsers(groupId, userId, query);
  }

  createUserInvite(groupId: string, userId: string, targetUserId: string) {
    return this.groupsInvitationsService.createUserInvite(groupId, userId, targetUserId);
  }

  createEmailInvite(groupId: string, userId: string, email: string) {
    return this.groupsInvitationsService.createEmailInvite(groupId, userId, email);
  }

  getIncomingInvites(userId: string) {
    return this.groupsInvitationsService.getIncomingInvites(userId);
  }

  acceptInvite(inviteId: string, userId: string) {
    return this.groupsInvitationsService.acceptInvite(inviteId, userId);
  }

  rejectInvite(inviteId: string, userId: string) {
    return this.groupsInvitationsService.rejectInvite(inviteId, userId);
  }

  getSentInvites(userId: string) {
    return this.groupsInvitationsService.getSentInvites(userId);
  }

  cancelSentInvite(inviteId: string, userId: string) {
    return this.groupsInvitationsService.cancelSentInvite(inviteId, userId);
  }
}
