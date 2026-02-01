import { Module } from '@nestjs/common';
import { ArchidektController } from './archidekt.controller';

@Module({
  controllers: [ArchidektController],
})
export class ArchidektModule {}
