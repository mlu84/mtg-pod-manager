import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function isAllowedImageMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]);
}

export function validateImageUploadFile(
  file: Express.Multer.File | null | undefined,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException('No image provided');
  }
  if (!isAllowedImageMimeType(file.mimetype)) {
    throw new BadRequestException('Unsupported image type');
  }
}

export function createImageUploadInterceptorOptions(): MulterOptions {
  return {
    limits: { fileSize: IMAGE_UPLOAD_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!isAllowedImageMimeType(file.mimetype)) {
        return cb(new BadRequestException('Unsupported image type'), false);
      }
      cb(null, true);
    },
  };
}

