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

  async listSessions(
    userId: string,
    from?: string,
    to?: string,
    planId?: string,
  ): Promise<TrainingSession[]> {
    return this.trainingRepository.listSessions(userId, from, to, planId);
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

    const existing = await this.trainingRepository.findGroupByExercise(sessionId, input.exerciseId);

    // One transaction so a failed set insert can't strand an empty group —
    // a zero-set card has no add-set form, so the UI could not recover from it.
    const groupId = await this.trainingRepository.withTransaction(async (tx) => {
      let group = existing;
      if (!group) {
        const position = await this.trainingRepository.nextPosition(sessionId, tx);
        group = await this.trainingRepository.createExerciseGroup(
          { sessionId, exerciseId: input.exerciseId, position },
          tx,
        );
      }

      const setPosition = await this.trainingRepository.nextSetPosition(group.id, tx);
      await this.trainingRepository.addSet(
        {
          sessionExerciseId: group.id,
          reps: input.reps,
          weightKg: input.weightKg ?? null,
          position: setPosition,
        },
        tx,
      );
      return group.id;
    });

    return this.trainingRepository.findSessionExerciseById(groupId, sessionId);
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
    // Repository set mutations scope by group id, not session id — verify the
    // group really belongs to this session before touching anything.
    const group = await this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
    if (!group) return undefined;
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
    const group = await this.trainingRepository.findSessionExerciseById(exerciseLogId, sessionId);
    if (!group) return false;
    // Delete + emptiness check + cascade delete must not interleave with a
    // concurrent set insert, so they run as one transaction.
    return this.trainingRepository.withTransaction(async (tx) => {
      const removed = await this.trainingRepository.removeSet(setId, exerciseLogId, tx);
      if (!removed) return false;
      const hasRemaining = await this.trainingRepository.hasRemainingSets(exerciseLogId, tx);
      if (!hasRemaining) await this.trainingRepository.removeExercise(exerciseLogId, sessionId, tx);
      return true;
    });
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
