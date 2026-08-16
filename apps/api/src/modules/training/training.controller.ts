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
        const sessions = await this.trainingService.listSessions(
          userId,
          query.from,
          query.to,
          query.planId,
        );
        return { status: 200, body: sessions };
      },

      lastPerformance: async ({ query }) => {
        const exerciseIds = query.exerciseIds.split(',');
        const entries = await this.trainingService.getLastPerformance(userId, exerciseIds);
        return { status: 200, body: entries };
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

      finishSession: async ({ params, body }) => {
        const session = await this.trainingService.finishSession(
          params.id,
          userId,
          body.durationSeconds,
        );
        if (!session) return { status: 404, body: { message: 'Training session not found' } };
        return { status: 200, body: session };
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

      updateSessionSet: async ({ params, body }) => {
        const exercise = await this.trainingService.updateSet(
          params.sessionId,
          params.exerciseId,
          params.setId,
          userId,
          body,
        );
        if (!exercise) return { status: 404, body: { message: 'Set not found' } };
        return { status: 200, body: exercise };
      },

      removeSessionSet: async ({ params }) => {
        const removed = await this.trainingService.removeSet(
          params.sessionId,
          params.exerciseId,
          params.setId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Set not found' } };
        return { status: 204, body: undefined };
      },

      updateSessionExerciseNotes: async ({ params, body }) => {
        const exercise = await this.trainingService.updateExerciseNotes(
          params.sessionId,
          params.exerciseId,
          userId,
          body.notes,
        );
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
      },

      updateSessionExerciseRest: async ({ params, body }) => {
        const exercise = await this.trainingService.updateExerciseRest(
          params.sessionId,
          params.exerciseId,
          userId,
          body.restSeconds,
        );
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
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
