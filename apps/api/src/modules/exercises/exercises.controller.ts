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
    });
  }
}
