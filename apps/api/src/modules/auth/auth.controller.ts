import { contract } from '@acme/contracts';
import { Controller, Req } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { FastifyRequest } from 'fastify';
import { stashSetCookies } from '../../common/fastify-cookie-bridge.js';
import { AuthService } from './auth.service.js';

const authContract = contract.auth;

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @TsRestHandler(authContract)
  async handler(@Req() request: FastifyRequest) {
    return tsRestHandler(authContract, {
      register: async ({ body }) => {
        try {
          const { user, expiresAt, headers } = await this.authService.register(body);
          stashSetCookies(request, headers);
          return { status: 201, body: { user, expiresAt: expiresAt ?? new Date() } };
        } catch (error) {
          return { status: 409, body: { message: (error as Error).message } };
        }
      },

      login: async ({ body }) => {
        try {
          const { user, expiresAt, headers } = await this.authService.login(body);
          stashSetCookies(request, headers);
          return { status: 200, body: { user, expiresAt: expiresAt ?? new Date() } };
        } catch (error) {
          return { status: 401, body: { message: (error as Error).message } };
        }
      },

      logout: async ({ headers }) => {
        const { headers: setHeaders } = await this.authService.logout(headers);
        stashSetCookies(request, setHeaders);
        return { status: 204, body: undefined };
      },

      session: async ({ headers }) => {
        const result = await this.authService.getSession(headers);
        if (!result) {
          return { status: 401, body: { message: 'Not authenticated' } };
        }
        return { status: 200, body: { user: result.user, expiresAt: result.session.expiresAt } };
      },
    });
  }
}
