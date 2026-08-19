ALTER TABLE "training_session_exercises" ADD COLUMN "pair_group_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "pair_group_id" uuid;--> statement-breakpoint
CREATE INDEX "training_session_exercises_sessionId_pairGroupId_idx" ON "training_session_exercises" USING btree ("session_id","pair_group_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_planId_pairGroupId_idx" ON "workout_exercises" USING btree ("plan_id","pair_group_id");