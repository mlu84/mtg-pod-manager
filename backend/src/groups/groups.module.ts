import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsApplicationsService } from './groups-applications.service';
import { GroupsCrudService } from './groups-crud.service';
import { GroupsInviteService } from './groups-invite.service';
import { GroupsMediaService } from './groups-media.service';
import { GroupsMembersService } from './groups-members.service';
import { GroupsMembershipService } from './groups-membership.service';
import { GroupsQueryService } from './groups-query.service';
import { GroupsSeasonService } from './groups-season.service';
import { GroupsInvitationsService } from './groups-invitations.service';
import { GroupsInvitationsPolicyService } from './groups-invitations-policy.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupsApplicationsService,
    GroupsCrudService,
    GroupsInviteService,
    GroupsMediaService,
    GroupsMembersService,
    GroupsMembershipService,
    GroupsQueryService,
    GroupsSeasonService,
    GroupsInvitationsService,
    GroupsInvitationsPolicyService,
  ],
  exports: [GroupsService, GroupsMembershipService],
})
export class GroupsModule {}
