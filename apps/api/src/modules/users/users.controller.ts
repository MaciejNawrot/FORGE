import { contract } from '@acme/contracts';
import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { EmailAlreadyExistsError, UsersService } from './users.service.js';

const usersContract = contract.users;

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(usersContract)
  async handler() {
    return tsRestHandler(usersContract, {
      list: async ({ query }) => {
        const result = await this.usersService.list(query.page, query.pageSize);
        return { status: 200, body: result };
      },

      get: async ({ params }) => {
        const user = await this.usersService.findById(params.id);
        if (!user) {
          return { status: 404, body: { message: 'User not found' } };
        }
        return { status: 200, body: user };
      },

      create: async ({ body }) => {
        try {
          const user = await this.usersService.create(body);
          return { status: 201, body: user };
        } catch (error) {
          if (error instanceof EmailAlreadyExistsError) {
            return {
              status: 409,
              body: { message: error.message, code: 'EMAIL_ALREADY_EXISTS' },
            };
          }
          throw error;
        }
      },

      update: async ({ params, body }) => {
        try {
          const user = await this.usersService.update(params.id, body);
          if (!user) {
            return { status: 404, body: { message: 'User not found' } };
          }
          return { status: 200, body: user };
        } catch (error) {
          if (error instanceof EmailAlreadyExistsError) {
            return {
              status: 409,
              body: { message: error.message, code: 'EMAIL_ALREADY_EXISTS' },
            };
          }
          throw error;
        }
      },

      remove: async ({ params }) => {
        const removed = await this.usersService.remove(params.id);
        if (!removed) {
          return { status: 404, body: { message: 'User not found' } };
        }
        return { status: 204, body: undefined };
      },
    });
  }
}
