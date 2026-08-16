import type { Exercise } from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { ExercisesRepository } from './exercises.repository.js';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async list(search?: string): Promise<Exercise[]> {
    return this.exercisesRepository.list(search);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    return this.exercisesRepository.findById(id);
  }
}
