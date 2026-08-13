UPDATE "workout_exercises" we SET "exercise_id" = e."id"
FROM "exercises" e WHERE lower(e."name") = lower(we."name") AND we."exercise_id" IS NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ALTER COLUMN "exercise_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "name";
