import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { DecksModule } from './decks/decks.module';
import { GamesModule } from './games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { EventsModule } from './events/events.module';
import { ArchidektModule } from './archidekt/archidekt.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MailModule,
    EventsModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    DecksModule,
    GamesModule,
    ArchidektModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
