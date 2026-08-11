import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../../modules/auth/auth.service.js';

export type SessionUser = { id: string; email: string; name: string };
export type RequestWithSession = FastifyRequest & { currentUser: SessionUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const session = await this.authService.getSession(request.headers);
    if (!session) throw new UnauthorizedException('Not authenticated');
    request.currentUser = session.user;
    return true;
  }
}
