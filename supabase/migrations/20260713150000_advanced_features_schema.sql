-- Add student_number to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_number text;

-- Add enrollment_matricule to enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS enrollment_matricule text;

-- Add is_exempted to grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS is_exempted boolean NOT NULL DEFAULT false;

-- Create academic_bonus_types
CREATE TABLE IF NOT EXISTS academic_bonus_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  default_points numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academic_bonus_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bonus_types_auth" ON academic_bonus_types;
CREATE POLICY "select_bonus_types_auth" ON academic_bonus_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_bonus_types_auth" ON academic_bonus_types;
CREATE POLICY "manage_bonus_types_auth" ON academic_bonus_types FOR ALL TO authenticated USING (true);

-- Create student_academic_bonuses
CREATE TABLE IF NOT EXISTS student_academic_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  bonus_type_id uuid NOT NULL REFERENCES academic_bonus_types(id) ON DELETE CASCADE,
  points numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year_id, bonus_type_id)
);

ALTER TABLE student_academic_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_student_bonuses_auth" ON student_academic_bonuses;
CREATE POLICY "select_student_bonuses_auth" ON student_academic_bonuses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_student_bonuses_auth" ON student_academic_bonuses;
CREATE POLICY "manage_student_bonuses_auth" ON student_academic_bonuses FOR ALL TO authenticated USING (true);

-- Add some default bonus types if they don't exist
INSERT INTO academic_bonus_types (code, name, description, default_points)
VALUES 
  ('ASSIDUITE', 'Bonus d''assiduité', 'Bonus accordé pour la présence régulière aux cours', 1.0),
  ('PARTICIPATION', 'Bonus de participation', 'Bonus accordé pour l''engagement actif et le leadership', 0.5)
ON CONFLICT (code) DO NOTHING;

-- Define check_duplicate_matricules function
CREATE OR REPLACE FUNCTION check_duplicate_matricules()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  matricule text,
  student_number text,
  academic_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.first_name, s.last_name, s.matricule, s.student_number, s.academic_status
  FROM students s
  WHERE s.deleted_at IS NULL
    AND s.matricule IS NOT NULL
    AND s.matricule IN (
      SELECT m.matricule
      FROM students m
      WHERE m.deleted_at IS NULL
      GROUP BY m.matricule
      HAVING COUNT(*) > 1
    )
  ORDER BY s.matricule, s.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resequence matricules alphabetically for a cohort
CREATE OR REPLACE FUNCTION resequence_matricules_alphabetically(target_year_id uuid, target_level_id uuid)
RETURNS void AS $$
DECLARE
  start_num integer;
  level_code_val text;
  r RECORD;
  idx integer;
  new_mat text;
  seq_str text;
BEGIN
  -- Get level code
  SELECT code INTO level_code_val FROM levels WHERE id = target_level_id;
  
  -- Determine the starting sequence for the target year.
  -- It should be the maximum sequence number used in PREVIOUS academic years for this level + 1.
  -- If none, default to 1.
  SELECT COALESCE(MAX(ms.sequence_number), 0) + 1 INTO start_num
  FROM matricule_sequences ms
  WHERE ms.level_code = level_code_val
    AND ms.used_by_student NOT IN (
      SELECT student_id 
      FROM enrollments 
      WHERE academic_year_id = target_year_id 
        AND level_id = target_level_id
    );

  -- Loop through all validated enrollments for this year and level sorted alphabetically by student name
  idx := start_num;
  FOR r IN 
    SELECT e.id AS enrollment_id, s.id AS student_id, s.last_name, s.first_name
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.academic_year_id = target_year_id
      AND e.level_id = target_level_id
      AND e.status = 'validated'
    ORDER BY s.last_name, s.first_name, s.id
  LOOP
    seq_str := lpad(idx::text, 4, '0');
    new_mat := seq_str || '/IBR/' || level_code_val;

    -- Update enrollment
    UPDATE enrollments 
    SET enrollment_matricule = new_mat
    WHERE id = r.enrollment_id;

    -- Update student active matricule, student_number and current level
    UPDATE students 
    SET matricule = new_mat,
        student_number = seq_str,
        current_level_id = target_level_id
    WHERE id = r.student_id;

    -- Update matricule_sequences
    DELETE FROM matricule_sequences 
    WHERE used_by_student = r.student_id 
      AND level_code = level_code_val;

    INSERT INTO matricule_sequences (sequence_number, level_code, used_by_student, used_at)
    VALUES (idx, level_code_val, r.student_id, now());

    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
