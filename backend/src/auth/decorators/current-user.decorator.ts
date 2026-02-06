import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserType {
  id: string;
  email: string;
  inAppName: string;
  emailVerified: boolean;
  systemRole: 'USER' | 'SYSADMIN';
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;

    if (data) {
      return user[data];
    }

    return user;
  },
);
