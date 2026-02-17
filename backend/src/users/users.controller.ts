import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/applications')
  getApplications(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getApplications(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: CurrentUserType,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('me/avatar')
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
  uploadAvatar(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Delete('me')
  deleteOwnAccount(@CurrentUser() user: CurrentUserType) {
    return this.usersService.deleteOwnAccount(user.id);
  }
}
