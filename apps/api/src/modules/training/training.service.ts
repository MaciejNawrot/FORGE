import type {
  AddTrainingSessionExerciseInput,
  CreateTrainingSessionInput,
  LastPerformanceEntry,
  TrainingSession,
  TrainingSessionExercise,
  TrainingSessionWithExercises,
} from '@acme/contracts';
import { Injectable } from '@nestjs/common';
import { TrainingRepository } from './training.repository.js';

@Injectable()
export class TrainingService {
  constructor(private readonly trainingRepository: TrainingRepository) {}

  async listSessions(userId: string, from?: string, to?: string): Promise<TrainingSession[]> {
    return this.trainingRepository.listSessions(userId, from, to);
  }

  async getSession(id: string, userId: string): Promise<TrainingSessionWithExercises | undefined> {
    const session = await this.trainingRepository.findSessionById(id, userId);
    if (!session) return undefined;
    const exercises = await this.trainingRepository.listSessionExercises(id);
    return { ...session, exercises };
  }

  async createSession(userId: string, input: CreateTrainingSessionInput): Promise<TrainingSession> {
    return this.trainingRepository.createSession({
      userId,
      planId: input.planId ?? null,
      date: input.date,
      type: input.type,
      notes: input.notes ?? null,
    });
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    return this.trainingRepository.removeSession(id, userId);
  }

  async addExercise(
    sessionId: string,
    userId: string,
    input: AddTrainingSessionExerciseInput,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const position = await this.trainingRepository.nextPosition(sessionId);
    const created = await this.trainingRepository.addExercise({
      sessionId,
      exerciseId: input.exerciseId,
      sets: input.sets,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position,
    });
    return this.trainingRepository.findSessionExerciseById(created.id, sessionId);
  }

  async removeExercise(sessionId: string, exerciseId: string, userId: string): Promise<boolean> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return false;
    return this.trainingRepository.removeExercise(exerciseId, sessionId);
  }

  async getLastPerformance(userId: string, exerciseIds: string[]): Promise<LastPerformanceEntry[]> {
    if (exerciseIds.length === 0) return [];
    const map = await this.trainingRepository.lastPerformanceByExerciseIds(userId, exerciseIds);
    return exerciseIds.flatMap((exerciseId) => {
      const entry = map.get(exerciseId);
      return entry ? [{ exerciseId, ...entry }] : [];
    });
  }
}
