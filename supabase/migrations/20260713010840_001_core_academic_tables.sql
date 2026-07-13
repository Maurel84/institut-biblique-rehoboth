/*
# Core Academic Tables - IBR Gestion Académique

Creates foundational tables: roles, permissions, user_profiles, academic_years,
programs, levels, promotions, students, student_documents, enrollments,
matricule_sequences, settings, audit_logs.

Security: RLS on all tables, authenticated-only access, super_admin helper function.
*/

-- Helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role_id IN (SELECT id FROM roles WHERE name = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_roles_authenticated" ON roles;
CREATE POLICY "select_roles_authenticated" ON roles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_roles_super_admin" ON roles;
CREATE POLICY "insert_roles_super_admin" ON roles FOR INSERT
  TO authenticated WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "update_roles_super_admin" ON roles;
CREATE POLICY "update_roles_super_admin" ON roles FOR UPDATE
  TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_validate boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_permissions_authenticated" ON permissions;
CREATE POLICY "select_permissions_authenticated" ON permissions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_permissions_super_admin" ON permissions;
CREATE POLICY "manage_permissions_super_admin" ON permissions FOR ALL
  TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================================
-- USER PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id),
  first_name text,
  last_name text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_super_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_super_admin());

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_super_admin())
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

-- ============================================================================
-- ACADEMIC YEARS
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'preparation' CHECK (status IN ('preparation', 'open', 'closed', 'archived')),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_academic_years_auth" ON academic_years;
CREATE POLICY "select_academic_years_auth" ON academic_years FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_academic_years_auth" ON academic_years;
CREATE POLICY "insert_academic_years_auth" ON academic_years FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_academic_years_auth" ON academic_years;
CREATE POLICY "update_academic_years_auth" ON academic_years FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_academic_years_auth" ON academic_years;
CREATE POLICY "delete_academic_years_auth" ON academic_years FOR DELETE
  TO authenticated USING (true);

-- ============================================================================
-- PROGRAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_programs_auth" ON programs;
CREATE POLICY "select_programs_auth" ON programs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_programs_auth" ON programs;
CREATE POLICY "insert_programs_auth" ON programs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_programs_auth" ON programs;
CREATE POLICY "update_programs_auth" ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_programs_auth" ON programs;
CREATE POLICY "delete_programs_auth" ON programs FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- LEVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_levels_auth" ON levels;
CREATE POLICY "select_levels_auth" ON levels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_levels_auth" ON levels;
CREATE POLICY "insert_levels_auth" ON levels FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_levels_auth" ON levels;
CREATE POLICY "update_levels_auth" ON levels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_levels_auth" ON levels;
CREATE POLICY "delete_levels_auth" ON levels FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PROMOTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_promotions_auth" ON promotions;
CREATE POLICY "select_promotions_auth" ON promotions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_promotions_auth" ON promotions;
CREATE POLICY "insert_promotions_auth" ON promotions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_promotions_auth" ON promotions;
CREATE POLICY "update_promotions_auth" ON promotions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_promotions_auth" ON promotions;
CREATE POLICY "delete_promotions_auth" ON promotions FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- STUDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text UNIQUE,
  photo_url text,
  last_name text NOT NULL,
  first_name text NOT NULL,
  sex text CHECK (sex IN ('M', 'F')),
  birth_date date,
  birth_place text,
  nationality text DEFAULT 'Béninoise',
  marital_status text,
  married_name text,
  phone text,
  whatsapp_phone text,
  email text,
  residence_address text,
  city text,
  country text DEFAULT 'Bénin',
  church text,
  denomination text,
  pastor_name text,
  ministry_role text,
  emergency_contact_name text,
  emergency_contact_phone text,
  first_enrollment_date date,
  current_level_id uuid REFERENCES levels(id) ON DELETE SET NULL,
  current_promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  academic_status text NOT NULL DEFAULT 'preinscrit' CHECK (academic_status IN (
    'preinscrit', 'inscrit', 'actif', 'suspendu', 'abandonne', 'exclu',
    'redoublant', 'admis_superieur', 'diplome', 'ancien_etudiant'
  )),
  observations text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_students_auth" ON students;
CREATE POLICY "select_students_auth" ON students FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "insert_students_auth" ON students;
CREATE POLICY "insert_students_auth" ON students FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_students_auth" ON students;
CREATE POLICY "update_students_auth" ON students FOR UPDATE TO authenticated USING (deleted_at IS NULL) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_students_auth" ON students;
CREATE POLICY "delete_students_auth" ON students FOR DELETE TO authenticated USING (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_students_matricule ON students(matricule);
CREATE INDEX IF NOT EXISTS idx_students_last_name ON students(last_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(academic_status);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);

-- ============================================================================
-- STUDENT DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  file_url text,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_student_documents_auth" ON student_documents;
CREATE POLICY "select_student_documents_auth" ON student_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_student_documents_auth" ON student_documents;
CREATE POLICY "insert_student_documents_auth" ON student_documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_student_documents_auth" ON student_documents;
CREATE POLICY "update_student_documents_auth" ON student_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_student_documents_auth" ON student_documents;
CREATE POLICY "delete_student_documents_auth" ON student_documents FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- ENROLLMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  enrollment_type text NOT NULL DEFAULT 'inscription' CHECK (enrollment_type IN ('inscription', 'reinscription')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'cancelled')),
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id),
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, academic_year_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_enrollments_auth" ON enrollments;
CREATE POLICY "select_enrollments_auth" ON enrollments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_enrollments_auth" ON enrollments;
CREATE POLICY "insert_enrollments_auth" ON enrollments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_enrollments_auth" ON enrollments;
CREATE POLICY "update_enrollments_auth" ON enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_enrollments_auth" ON enrollments;
CREATE POLICY "delete_enrollments_auth" ON enrollments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_level ON enrollments(level_id);

-- ============================================================================
-- MATRICULE SEQUENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS matricule_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number integer NOT NULL,
  level_code text NOT NULL,
  used_by_student uuid REFERENCES students(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sequence_number, level_code)
);

ALTER TABLE matricule_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_matricule_sequences_auth" ON matricule_sequences;
CREATE POLICY "select_matricule_sequences_auth" ON matricule_sequences FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_matricule_sequences_auth" ON matricule_sequences;
CREATE POLICY "insert_matricule_sequences_auth" ON matricule_sequences FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_matricule_sequences_auth" ON matricule_sequences;
CREATE POLICY "update_matricule_sequences_auth" ON matricule_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_settings_auth" ON settings;
CREATE POLICY "select_settings_auth" ON settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_settings_auth" ON settings;
CREATE POLICY "insert_settings_auth" ON settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_settings_auth" ON settings;
CREATE POLICY "update_settings_auth" ON settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs_auth" ON audit_logs;
CREATE POLICY "select_audit_logs_auth" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_audit_logs_auth" ON audit_logs;
CREATE POLICY "insert_audit_logs_auth" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;
