import { contract } from '@acme/contracts';
import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { RequestWithSession } from '../../common/guards/session.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { TrainingService } from './training.service.js';

const trainingContract = contract.training;

@Controller()
@UseGuards(SessionGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @TsRestHandler(trainingContract)
  async handler(@Req() request: RequestWithSession) {
    const userId = request.currentUser.id;

    return tsRestHandler(trainingContract, {
      listSessions: async ({ query }) => {
        const sessions = await this.trainingService.listSessions(userId, query.from, query.to);
        return { status: 200, body: sessions };
      },

      getSession: async ({ params }) => {
        const session = await this.trainingService.getSession(params.id, userId);
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
      },

      createSession: async ({ body }) => {
        const session = await this.trainingService.createSession(userId, body);
        return { status: 201, body: session };
      },

      removeSession: async ({ params }) => {
        const removed = await this.trainingService.removeSession(params.id, userId);
        if (!removed) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 204, body: undefined };
      },

      addSessionExercise: async ({ params, body }) => {
        const exercise = await this.trainingService.addExercise(params.sessionId, userId, body);
        if (!exercise) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 201, body: exercise };
      },

      removeSessionExercise: async ({ params }) => {
        const removed = await this.trainingService.removeExercise(
          params.sessionId,
          params.exerciseId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 204, body: undefined };
      },
    });
  }
}
