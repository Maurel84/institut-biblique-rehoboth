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
