import { contract } from '@acme/contracts';
import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { RequestWithSession } from '../../common/guards/session.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { WorkoutsService } from './workouts.service.js';

const workoutsContract = contract.workouts;

@Controller()
@UseGuards(SessionGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @TsRestHandler(workoutsContract)
  async handler(@Req() request: RequestWithSession) {
    const userId = request.currentUser.id;

    return tsRestHandler(workoutsContract, {
      listPlans: async () => {
        const plans = await this.workoutsService.listPlans(userId);
        return { status: 200, body: plans };
      },

      listTemplates: async () => {
        const templates = await this.workoutsService.listTemplates();
        return { status: 200, body: templates };
      },

      forkPlan: async ({ params }) => {
        const plan = await this.workoutsService.forkPlan(params.id, userId);
        if (!plan) return { status: 404, body: { message: 'Template not found' } };
        return { status: 201, body: plan };
      },

      getPlan: async ({ params }) => {
        const plan = await this.workoutsService.getPlan(params.id, userId);
        if (!plan) return { status: 404, body: { message: 'Workout plan not found' } };
        return { status: 200, body: plan };
      },

      createPlan: async ({ body }) => {
        const plan = await this.workoutsService.createPlan(userId, body);
        return { status: 201, body: plan };
      },

      updatePlan: async ({ params, body }) => {
        const plan = await this.workoutsService.updatePlan(params.id, userId, body);
        if (!plan) return { status: 404, body: { message: 'Workout plan not found' } };
        return { status: 200, body: plan };
      },

      removePlan: async ({ params }) => {
        const removed = await this.workoutsService.removePlan(params.id, userId);
        if (!removed) return { status: 404, body: { message: 'Workout plan not found' } };
        return { status: 204, body: undefined };
      },

      addExercise: async ({ params, body }) => {
        const exercise = await this.workoutsService.addExercise(params.planId, userId, body);
        if (!exercise) return { status: 404, body: { message: 'Workout plan not found' } };
        return { status: 201, body: exercise };
      },

      updateExercise: async ({ params, body }) => {
        const exercise = await this.workoutsService.updateExercise(
          params.planId,
          params.exerciseId,
          userId,
          body,
        );
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
      },

      removeExercise: async ({ params }) => {
        const removed = await this.workoutsService.removeExercise(
          params.planId,
          params.exerciseId,
          userId,
        );
        if (!removed) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 204, body: undefined };
      },
    });
  }
}
