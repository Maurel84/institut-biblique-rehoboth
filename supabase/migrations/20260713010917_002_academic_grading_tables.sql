/*
# Academic Grading Tables - IBR Gestion Académique

Creates tables for teachers, modules, subjects, teacher assignments, grades,
grade history, annual results, rankings, and academic decisions.

## Tables Created
1. teachers - Teacher records
2. modules - Training modules (5 modules per level)
3. subjects - Subjects linked to modules
4. teacher_assignments - Assign teachers to subjects per academic year/level
5. grades - Student grades per subject
6. grade_history - Audit trail for grade modifications
7. annual_results - Computed annual results per student
8. rankings - Class rankings
9. academic_decisions - Pass/fail/redouble decisions
10. retakes - Retake exam tracking

## Security
- RLS enabled on all tables, authenticated-only access
*/

-- ============================================================================
-- TEACHERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name text NOT NULL,
  first_name text NOT NULL,
  title text,
  phone text,
  email text,
  specialty text,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'inactif', 'vacataire')),
  observations text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_teachers_auth" ON teachers;
CREATE POLICY "select_teachers_auth" ON teachers FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "insert_teachers_auth" ON teachers;
CREATE POLICY "insert_teachers_auth" ON teachers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_teachers_auth" ON teachers;
CREATE POLICY "update_teachers_auth" ON teachers FOR UPDATE TO authenticated USING (deleted_at IS NULL) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_teachers_auth" ON teachers;
CREATE POLICY "delete_teachers_auth" ON teachers FOR DELETE TO authenticated USING (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_teachers_last_name ON teachers(last_name);

-- ============================================================================
-- MODULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  color text DEFAULT '#1e40af',
  level_id uuid REFERENCES levels(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('planifie', 'actif', 'termine', 'archive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(code, level_id, academic_year_id)
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_modules_auth" ON modules;
CREATE POLICY "select_modules_auth" ON modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_modules_auth" ON modules;
CREATE POLICY "insert_modules_auth" ON modules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_modules_auth" ON modules;
CREATE POLICY "update_modules_auth" ON modules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_modules_auth" ON modules;
CREATE POLICY "delete_modules_auth" ON modules FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_modules_level_year ON modules(level_id, academic_year_id);

-- ============================================================================
-- SUBJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  coefficient numeric NOT NULL DEFAULT 1,
  max_score numeric NOT NULL DEFAULT 20,
  min_score numeric NOT NULL DEFAULT 0,
  passing_threshold numeric NOT NULL DEFAULT 10,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(code, level_id, academic_year_id)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_subjects_auth" ON subjects;
CREATE POLICY "select_subjects_auth" ON subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_subjects_auth" ON subjects;
CREATE POLICY "insert_subjects_auth" ON subjects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_subjects_auth" ON subjects;
CREATE POLICY "update_subjects_auth" ON subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_subjects_auth" ON subjects;
CREATE POLICY "delete_subjects_auth" ON subjects FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_subjects_module ON subjects(module_id);
CREATE INDEX IF NOT EXISTS idx_subjects_level_year ON subjects(level_id, academic_year_id);

-- ============================================================================
-- TEACHER ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, subject_id, academic_year_id)
);

ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "select_teacher_assignments_auth" ON teacher_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "insert_teacher_assignments_auth" ON teacher_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "update_teacher_assignments_auth" ON teacher_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "delete_teacher_assignments_auth" ON teacher_assignments FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- GRADES
-- ============================================================================
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  score numeric,
  is_absent boolean NOT NULL DEFAULT false,
  is_not_available boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'validated', 'corrected', 'locked')),
  observation text,
  entered_by uuid REFERENCES auth.users(id),
  entered_at timestamptz DEFAULT now(),
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, subject_id, academic_year_id)
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_grades_auth" ON grades;
CREATE POLICY "select_grades_auth" ON grades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_grades_auth" ON grades;
CREATE POLICY "insert_grades_auth" ON grades FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_grades_auth" ON grades;
CREATE POLICY "update_grades_auth" ON grades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_grades_auth" ON grades;
CREATE POLICY "delete_grades_auth" ON grades FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_year ON grades(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_grades_status ON grades(status);

-- ============================================================================
-- GRADE HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS grade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  old_score numeric,
  new_score numeric,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_grade_history_auth" ON grade_history;
CREATE POLICY "select_grade_history_auth" ON grade_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_grade_history_auth" ON grade_history;
CREATE POLICY "insert_grade_history_auth" ON grade_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_grade_history_grade ON grade_history(grade_id);

-- ============================================================================
-- ANNUAL RESULTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS annual_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  total_points numeric,
  average numeric,
  weighted_average numeric,
  subjects_passed integer DEFAULT 0,
  subjects_failed integer DEFAULT 0,
  subjects_counted integer DEFAULT 0,
  pass_rate numeric,
  rank integer,
  decision text CHECK (decision IN ('admis', 'admis_reserve', 'ajourne', 'redoublant', 'exclu', 'abandon', 'dossier_incomplet', 'passage_superieur', 'diplome')),
  computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year_id)
);

ALTER TABLE annual_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_annual_results_auth" ON annual_results;
CREATE POLICY "select_annual_results_auth" ON annual_results FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_annual_results_auth" ON annual_results;
CREATE POLICY "insert_annual_results_auth" ON annual_results FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_annual_results_auth" ON annual_results;
CREATE POLICY "update_annual_results_auth" ON annual_results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_annual_results_auth" ON annual_results;
CREATE POLICY "delete_annual_results_auth" ON annual_results FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_annual_results_student_year ON annual_results(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_annual_results_year_level ON annual_results(academic_year_id, level_id);

-- ============================================================================
-- RANKINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  rank integer NOT NULL,
  average numeric NOT NULL,
  decision text,
  computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year_id, level_id)
);

ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_rankings_auth" ON rankings;
CREATE POLICY "select_rankings_auth" ON rankings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_rankings_auth" ON rankings;
CREATE POLICY "insert_rankings_auth" ON rankings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_rankings_auth" ON rankings;
CREATE POLICY "update_rankings_auth" ON rankings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_rankings_auth" ON rankings;
CREATE POLICY "delete_rankings_auth" ON rankings FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rankings_year_level ON rankings(academic_year_id, level_id);

-- ============================================================================
-- ACADEMIC DECISIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('admis', 'admis_reserve', 'ajourne', 'redoublant', 'exclu', 'abandon', 'dossier_incomplet', 'passage_superieur', 'diplome')),
  reason text,
  min_average numeric,
  max_failed_subjects integer,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE academic_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "select_academic_decisions_auth" ON academic_decisions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "insert_academic_decisions_auth" ON academic_decisions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "update_academic_decisions_auth" ON academic_decisions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "delete_academic_decisions_auth" ON academic_decisions FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- RETAKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS retakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  original_score numeric,
  retake_score numeric,
  final_score numeric,
  replacement_rule text NOT NULL DEFAULT 'replace' CHECK (replacement_rule IN ('replace', 'best', 'average', 'capped')),
  cap_value numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE retakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_retakes_auth" ON retakes;
CREATE POLICY "select_retakes_auth" ON retakes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_retakes_auth" ON retakes;
CREATE POLICY "insert_retakes_auth" ON retakes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_retakes_auth" ON retakes;
CREATE POLICY "update_retakes_auth" ON retakes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_retakes_auth" ON retakes;
CREATE POLICY "delete_retakes_auth" ON retakes FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- GENERATED DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_number text UNIQUE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  data jsonb,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_generated_documents_auth" ON generated_documents;
CREATE POLICY "select_generated_documents_auth" ON generated_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_generated_documents_auth" ON generated_documents;
CREATE POLICY "insert_generated_documents_auth" ON generated_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_generated_docs_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_docs_student ON generated_documents(student_id);

-- Apply updated_at triggers to new tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    AND table_name NOT IN (
      SELECT tgname FROM pg_trigger WHERE tgname = 'set_updated_at'
    )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;
