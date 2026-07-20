import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Guard de identidade do usuario (separado do ApiKeyGuard global).
 * Aplicar com @UseGuards(JwtAuthGuard) nas rotas que precisam saber "quem" chama.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Token ausente');
    try {
      (request as any).user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
