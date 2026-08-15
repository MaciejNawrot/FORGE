-- The pre-per-set logging flow inserted a fresh training_session_exercises row
-- on every logged set, so historical sessions can hold several groups for one
-- (session_id, exercise_id) pair. Merge them into the earliest group.

-- Step 1: re-point every duplicate group's sets onto the canonical group,
-- renumbering position contiguously (canonical group's own sets first, then
-- each later duplicate's sets appended in order). Must run before the delete
-- below, otherwise the ON DELETE cascade would take the sets with it.
UPDATE training_session_sets s
SET session_exercise_id = m.canonical_id,
    position = m.new_position
FROM (
  SELECT st.id,
         g.canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY g.canonical_id
           ORDER BY g.group_rank, st.position, st.created_at, st.id
         ) - 1 AS new_position
  FROM training_session_sets st
  JOIN (
    SELECT id,
           first_value(id) OVER w AS canonical_id,
           row_number() OVER w AS group_rank
    FROM training_session_exercises
    WHERE (session_id, exercise_id) IN (
      SELECT session_id, exercise_id
      FROM training_session_exercises
      GROUP BY session_id, exercise_id
      HAVING count(*) > 1
    )
    WINDOW w AS (PARTITION BY session_id, exercise_id ORDER BY created_at, position, id)
  ) g ON g.id = st.session_exercise_id
) m
WHERE s.id = m.id;
--> statement-breakpoint
-- Step 2: drop the now set-less duplicate groups, keeping the earliest one.
DELETE FROM training_session_exercises e
WHERE EXISTS (
  SELECT 1
  FROM training_session_exercises c
  WHERE c.session_id = e.session_id
    AND c.exercise_id = e.exercise_id
    AND (c.created_at, c.position, c.id) < (e.created_at, e.position, e.id)
);
