import { contract } from '@acme/contracts';
import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ExercisesService } from './exercises.service.js';

const exercisesContract = contract.exercises;

@Controller()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @TsRestHandler(exercisesContract)
  async handler() {
    return tsRestHandler(exercisesContract, {
      listExercises: async ({ query }) => {
        const items = await this.exercisesService.list(query.search);
        return { status: 200, body: items };
      },
      getExercise: async ({ params }) => {
        const exercise = await this.exercisesService.getExercise(params.id);
        if (!exercise) return { status: 404, body: { message: 'Exercise not found' } };
        return { status: 200, body: exercise };
      },
    });
  }
}
