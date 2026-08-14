CREATE TABLE "training_session_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_exercise_id" uuid NOT NULL,
	"reps" integer NOT NULL,
	"weight_kg" numeric(6, 2),
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_session_exercises" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "training_session_sets" ADD CONSTRAINT "training_session_sets_session_exercise_id_training_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."training_session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_session_sets_sessionExerciseId_idx" ON "training_session_sets" USING btree ("session_exercise_id");