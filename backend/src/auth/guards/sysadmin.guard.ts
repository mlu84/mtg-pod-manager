import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SysAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { systemRole?: string } | undefined;

    if (!user || user.systemRole !== 'SYSADMIN') {
      throw new ForbiddenException('Sysadmin access required');
    }

    return true;
  }
}
