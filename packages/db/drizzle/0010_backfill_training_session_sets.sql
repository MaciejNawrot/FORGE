INSERT INTO training_session_sets (session_exercise_id, reps, weight_kg, position)
SELECT id, reps, weight_kg, generate_series(0, sets - 1)
FROM training_session_exercises;
