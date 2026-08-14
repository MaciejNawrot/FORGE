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

  async finishSession(
    id: string,
    userId: string,
    durationSeconds: number,
  ): Promise<TrainingSession | undefined> {
    return this.trainingRepository.finishSession(id, userId, durationSeconds);
  }

  async removeSession(id: string, userId: string): Promise<boolean> {
    return this.trainingRepository.removeSession(id, userId);
  }

  /** Logs one set. Finds-or-creates the exercise group, then appends the set. */
  async addExercise(
    sessionId: string,
    userId: string,
    input: AddTrainingSessionExerciseInput,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;

    let group = await this.trainingRepository.findGroupByExercise(sessionId, input.exerciseId);
    if (!group) {
      const position = await this.trainingRepository.nextPosition(sessionId);
      group = await this.trainingRepository.createExerciseGroup({
        sessionId,
        exerciseId: input.exerciseId,
        position,
      });
    }

    const setPosition = await this.trainingRepository.nextSetPosition(group.id);
    await this.trainingRepository.addSet({
      sessionExerciseId: group.id,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      position: setPosition,
    });

    return this.trainingRepository.findSessionExerciseById(group.id, sessionId);
  }

  async updateSet(
    sessionId: string,
    exerciseLogId: string,
    setId: string,
    userId: string,
    input: { reps: number; weightKg: number | null },
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateSet(setId, exerciseLogId, input);
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
  }

  /** Removes one set; if it was the group's last set, removes the group too. */
  async removeSet(
    sessionId: string,
    exerciseLogId: string,
    setId: string,
    userId: string,
  ): Promise<boolean> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return false;
    const removed = await this.trainingRepository.removeSet(setId, exerciseLogId);
    if (!removed) return false;
    const hasRemaining = await this.trainingRepository.hasRemainingSets(exerciseLogId);
    if (!hasRemaining) await this.trainingRepository.removeExercise(exerciseLogId, sessionId);
    return true;
  }

  async updateExerciseNotes(
    sessionId: string,
    exerciseLogId: string,
    userId: string,
    notes: string | null,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateExerciseNotes(
      exerciseLogId,
      sessionId,
      notes,
    );
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
  }

  async updateExerciseRest(
    sessionId: string,
    exerciseLogId: string,
    userId: string,
    restSeconds: number,
  ): Promise<TrainingSessionExercise | undefined> {
    const session = await this.trainingRepository.findSessionById(sessionId, userId);
    if (!session) return undefined;
    const updated = await this.trainingRepository.updateExerciseRest(
      exerciseLogId,
      sessionId,
      restSeconds,
    );
    if (!updated) return undefined;
    return this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
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
