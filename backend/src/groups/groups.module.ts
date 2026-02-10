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

@Module({
  imports: [PrismaModule],
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
  ],
  exports: [GroupsService, GroupsMembershipService],
})
export class GroupsModule {}
