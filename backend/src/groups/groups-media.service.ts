import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsMembershipService } from './groups-membership.service';
import { toImageDataUrl } from './groups-image.util';

@Injectable()
export class GroupsMediaService {
  constructor(
    private prisma: PrismaService,
    private membershipService: GroupsMembershipService,
  ) {}

  async updateGroupImage(
    groupId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.membershipService.ensureAdmin(groupId, userId);

    if (!file) {
      throw new BadRequestException('No image provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        groupImage: file.buffer,
        groupImageMime: file.mimetype,
      },
      select: {
        groupImage: true,
        groupImageMime: true,
      },
    });

    return {
      imageUrl: toImageDataUrl(updated.groupImage, updated.groupImageMime),
    };
  }
}
