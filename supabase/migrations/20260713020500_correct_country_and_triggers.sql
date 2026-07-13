-- ============================================================================
-- 1. CORRECTIONS GEOGRAPHIQUES (CÔTE D'IVOIRE)
-- ============================================================================

-- Modifier les valeurs par défaut de la table students
ALTER TABLE students ALTER COLUMN nationality SET DEFAULT 'Ivoirienne';
ALTER TABLE students ALTER COLUMN country SET DEFAULT 'Côte d''Ivoire';

-- Mettre à jour les données existantes de la table students
UPDATE students 
SET country = 'Côte d''Ivoire' 
WHERE country = 'Bénin';

UPDATE students 
SET nationality = 'Ivoirienne' 
WHERE nationality = 'Béninoise';

-- Mettre à jour les indicatifs téléphoniques de +229 (Bénin) vers +255 / +225 (Côte d'Ivoire)
UPDATE students 
SET phone = REPLACE(phone, '+229', '+225'),
    whatsapp_phone = REPLACE(whatsapp_phone, '+229', '+225'),
    emergency_contact_phone = REPLACE(emergency_contact_phone, '+229', '+225');

-- Mettre à jour les indicatifs et domaines e-mails des enseignants
UPDATE teachers
SET phone = REPLACE(phone, '+229', '+225'),
    email = REPLACE(email, '@ibr-benin.org', '@ibr-bonoua.org');

-- Mettre à jour la configuration générale dans la table settings
UPDATE settings
SET value = jsonb_set(
      jsonb_set(
        value, 
        '{address}', 
        '"Bonoua, Côte d''Ivoire"'
      ),
      '{email}',
      '"contact@ibr-bonoua.org"'
    )
WHERE key = 'institute_info';


-- ============================================================================
-- 2. FONCTION DE ROLES ET TRIGGERS DE SECURITE D'ACCES
-- ============================================================================

-- Fonction d'aide pour vérifier si l'utilisateur possède l'un des rôles passés en paramètre
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC role_names text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.roles r ON up.role_id = r.id
    WHERE up.user_id = auth.uid()
    AND r.name = ANY(role_names)
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour assigner automatiquement le rôle 'super_admin' au tout premier utilisateur inscrit
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
  v_count integer;
BEGIN
  -- Compter le nombre de profils utilisateurs existants
  SELECT count(*) INTO v_count FROM public.user_profiles;
  
  -- Si c'est le premier profil créé dans le système, on lui attribue super_admin. Sinon, viewer.
  IF v_count = 0 THEN
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin';
  ELSE
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'viewer';
  END IF;
  
  NEW.role_id := v_role_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_assign_default_role ON user_profiles;
CREATE TRIGGER trigger_assign_default_role
BEFORE INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_default_role();

-- Trigger pour empêcher un utilisateur d'escalader ses privilèges lui-même (changer son rôle)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role_id IS DISTINCT FROM NEW.role_id AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Seul un Super Administrateur peut modifier le rôle d''un utilisateur.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_role_escalation ON user_profiles;
CREATE TRIGGER trigger_prevent_role_escalation
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_escalation();

-- Promouvoir rétroactivement l'utilisateur existant au rôle super_admin si le système n'en a qu'un
UPDATE user_profiles
SET role_id = (SELECT id FROM roles WHERE name = 'super_admin')
WHERE id IN (
  SELECT id FROM user_profiles
  LIMIT 1
);


-- ============================================================================
-- 3. SECURISATION DES REGLES RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- --- CORE ACADEMIC TABLES ---

-- academic_years
DROP POLICY IF EXISTS "insert_academic_years_auth" ON academic_years;
CREATE POLICY "insert_academic_years_auth" ON academic_years FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_academic_years_auth" ON academic_years;
CREATE POLICY "update_academic_years_auth" ON academic_years FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_academic_years_auth" ON academic_years;
CREATE POLICY "delete_academic_years_auth" ON academic_years FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- programs
DROP POLICY IF EXISTS "insert_programs_auth" ON programs;
CREATE POLICY "insert_programs_auth" ON programs FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_programs_auth" ON programs;
CREATE POLICY "update_programs_auth" ON programs FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_programs_auth" ON programs;
CREATE POLICY "delete_programs_auth" ON programs FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- levels
DROP POLICY IF EXISTS "insert_levels_auth" ON levels;
CREATE POLICY "insert_levels_auth" ON levels FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_levels_auth" ON levels;
CREATE POLICY "update_levels_auth" ON levels FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_levels_auth" ON levels;
CREATE POLICY "delete_levels_auth" ON levels FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- promotions
DROP POLICY IF EXISTS "insert_promotions_auth" ON promotions;
CREATE POLICY "insert_promotions_auth" ON promotions FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "update_promotions_auth" ON promotions;
CREATE POLICY "update_promotions_auth" ON promotions FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "delete_promotions_auth" ON promotions;
CREATE POLICY "delete_promotions_auth" ON promotions FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- students
DROP POLICY IF EXISTS "insert_students_auth" ON students;
CREATE POLICY "insert_students_auth" ON students FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "update_students_auth" ON students;
CREATE POLICY "update_students_auth" ON students FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "delete_students_auth" ON students;
CREATE POLICY "delete_students_auth" ON students FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- student_documents
DROP POLICY IF EXISTS "insert_student_documents_auth" ON student_documents;
CREATE POLICY "insert_student_documents_auth" ON student_documents FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "update_student_documents_auth" ON student_documents;
CREATE POLICY "update_student_documents_auth" ON student_documents FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "delete_student_documents_auth" ON student_documents;
CREATE POLICY "delete_student_documents_auth" ON student_documents FOR DELETE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

-- enrollments
DROP POLICY IF EXISTS "insert_enrollments_auth" ON enrollments;
CREATE POLICY "insert_enrollments_auth" ON enrollments FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "update_enrollments_auth" ON enrollments;
CREATE POLICY "update_enrollments_auth" ON enrollments FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "delete_enrollments_auth" ON enrollments;
CREATE POLICY "delete_enrollments_auth" ON enrollments FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- matricule_sequences
DROP POLICY IF EXISTS "insert_matricule_sequences_auth" ON matricule_sequences;
CREATE POLICY "insert_matricule_sequences_auth" ON matricule_sequences FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));

DROP POLICY IF EXISTS "update_matricule_sequences_auth" ON matricule_sequences;
CREATE POLICY "update_matricule_sequences_auth" ON matricule_sequences FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary'));

-- settings
DROP POLICY IF EXISTS "insert_settings_auth" ON settings;
CREATE POLICY "insert_settings_auth" ON settings FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin'));

DROP POLICY IF EXISTS "update_settings_auth" ON settings;
CREATE POLICY "update_settings_auth" ON settings FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin'));

-- audit_logs (L'écriture est autorisée à tous pour pouvoir tracer, la lecture est réservée à l'admin)
DROP POLICY IF EXISTS "select_audit_logs_auth" ON audit_logs;
CREATE POLICY "select_audit_logs_auth" ON audit_logs FOR SELECT 
  TO authenticated USING (has_any_role('super_admin'));


-- --- ACADEMIC GRADING TABLES ---

-- teachers
DROP POLICY IF EXISTS "insert_teachers_auth" ON teachers;
CREATE POLICY "insert_teachers_auth" ON teachers FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_teachers_auth" ON teachers;
CREATE POLICY "update_teachers_auth" ON teachers FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_teachers_auth" ON teachers;
CREATE POLICY "delete_teachers_auth" ON teachers FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- modules
DROP POLICY IF EXISTS "insert_modules_auth" ON modules;
CREATE POLICY "insert_modules_auth" ON modules FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_modules_auth" ON modules;
CREATE POLICY "update_modules_auth" ON modules FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_modules_auth" ON modules;
CREATE POLICY "delete_modules_auth" ON modules FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- subjects
DROP POLICY IF EXISTS "insert_subjects_auth" ON subjects;
CREATE POLICY "insert_subjects_auth" ON subjects FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_subjects_auth" ON subjects;
CREATE POLICY "update_subjects_auth" ON subjects FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_subjects_auth" ON subjects;
CREATE POLICY "delete_subjects_auth" ON subjects FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- teacher_assignments
DROP POLICY IF EXISTS "insert_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "insert_teacher_assignments_auth" ON teacher_assignments FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "update_teacher_assignments_auth" ON teacher_assignments FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_teacher_assignments_auth" ON teacher_assignments;
CREATE POLICY "delete_teacher_assignments_auth" ON teacher_assignments FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- grades (Saisie réservée à l'administrateur, au directeur académique, et à l'enseignant)
DROP POLICY IF EXISTS "insert_grades_auth" ON grades;
CREATE POLICY "insert_grades_auth" ON grades FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'teacher'));

DROP POLICY IF EXISTS "update_grades_auth" ON grades;
CREATE POLICY "update_grades_auth" ON grades FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'teacher'));

DROP POLICY IF EXISTS "delete_grades_auth" ON grades;
CREATE POLICY "delete_grades_auth" ON grades FOR DELETE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

-- grade_history (Seuls les habilités peuvent journaliser l'historique des notes)
DROP POLICY IF EXISTS "insert_grade_history_auth" ON grade_history;
CREATE POLICY "insert_grade_history_auth" ON grade_history FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'teacher'));

-- annual_results
DROP POLICY IF EXISTS "insert_annual_results_auth" ON annual_results;
CREATE POLICY "insert_annual_results_auth" ON annual_results FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_annual_results_auth" ON annual_results;
CREATE POLICY "update_annual_results_auth" ON annual_results FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_annual_results_auth" ON annual_results;
CREATE POLICY "delete_annual_results_auth" ON annual_results FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- rankings
DROP POLICY IF EXISTS "insert_rankings_auth" ON rankings;
CREATE POLICY "insert_rankings_auth" ON rankings FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_rankings_auth" ON rankings;
CREATE POLICY "update_rankings_auth" ON rankings FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_rankings_auth" ON rankings;
CREATE POLICY "delete_rankings_auth" ON rankings FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- academic_decisions
DROP POLICY IF EXISTS "insert_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "insert_academic_decisions_auth" ON academic_decisions FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "update_academic_decisions_auth" ON academic_decisions FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_academic_decisions_auth" ON academic_decisions;
CREATE POLICY "delete_academic_decisions_auth" ON academic_decisions FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- retakes
DROP POLICY IF EXISTS "insert_retakes_auth" ON retakes;
CREATE POLICY "insert_retakes_auth" ON retakes FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "update_retakes_auth" ON retakes;
CREATE POLICY "update_retakes_auth" ON retakes FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director'));

DROP POLICY IF EXISTS "delete_retakes_auth" ON retakes;
CREATE POLICY "delete_retakes_auth" ON retakes FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- generated_documents
DROP POLICY IF EXISTS "insert_generated_documents_auth" ON generated_documents;
CREATE POLICY "insert_generated_documents_auth" ON generated_documents FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary'));


-- --- FINANCIAL & BOOKLET TABLES ---

-- fee_categories
DROP POLICY IF EXISTS "insert_fee_categories_auth" ON fee_categories;
CREATE POLICY "insert_fee_categories_auth" ON fee_categories FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_fee_categories_auth" ON fee_categories;
CREATE POLICY "update_fee_categories_auth" ON fee_categories FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_fee_categories_auth" ON fee_categories;
CREATE POLICY "delete_fee_categories_auth" ON fee_categories FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- tuition_fee_structures
DROP POLICY IF EXISTS "insert_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "insert_tuition_fee_structures_auth" ON tuition_fee_structures FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "update_tuition_fee_structures_auth" ON tuition_fee_structures FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_tuition_fee_structures_auth" ON tuition_fee_structures;
CREATE POLICY "delete_tuition_fee_structures_auth" ON tuition_fee_structures FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- student_fee_accounts
DROP POLICY IF EXISTS "insert_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "insert_student_fee_accounts_auth" ON student_fee_accounts FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "update_student_fee_accounts_auth" ON student_fee_accounts FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_student_fee_accounts_auth" ON student_fee_accounts;
CREATE POLICY "delete_student_fee_accounts_auth" ON student_fee_accounts FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- student_fee_items
DROP POLICY IF EXISTS "insert_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "insert_student_fee_items_auth" ON student_fee_items FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "update_student_fee_items_auth" ON student_fee_items FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_student_fee_items_auth" ON student_fee_items;
CREATE POLICY "delete_student_fee_items_auth" ON student_fee_items FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- payment_schedules
DROP POLICY IF EXISTS "insert_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "insert_payment_schedules_auth" ON payment_schedules FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "update_payment_schedules_auth" ON payment_schedules FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_payment_schedules_auth" ON payment_schedules;
CREATE POLICY "delete_payment_schedules_auth" ON payment_schedules FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- payments
DROP POLICY IF EXISTS "insert_payments_auth" ON payments;
CREATE POLICY "insert_payments_auth" ON payments FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_payments_auth" ON payments;
CREATE POLICY "update_payments_auth" ON payments FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_payments_auth" ON payments;
CREATE POLICY "delete_payments_auth" ON payments FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- payment_allocations
DROP POLICY IF EXISTS "insert_payment_allocations_auth" ON payment_allocations;
CREATE POLICY "insert_payment_allocations_auth" ON payment_allocations FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_payment_allocations_auth" ON payment_allocations;
CREATE POLICY "delete_payment_allocations_auth" ON payment_allocations FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- payment_receipts
DROP POLICY IF EXISTS "insert_payment_receipts_auth" ON payment_receipts;
CREATE POLICY "insert_payment_receipts_auth" ON payment_receipts FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_payment_receipts_auth" ON payment_receipts;
CREATE POLICY "update_payment_receipts_auth" ON payment_receipts FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

-- discounts
DROP POLICY IF EXISTS "insert_discounts_auth" ON discounts;
CREATE POLICY "insert_discounts_auth" ON discounts FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_discounts_auth" ON discounts;
CREATE POLICY "update_discounts_auth" ON discounts FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_discounts_auth" ON discounts;
CREATE POLICY "delete_discounts_auth" ON discounts FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- student_cards
DROP POLICY IF EXISTS "insert_student_cards_auth" ON student_cards;
CREATE POLICY "insert_student_cards_auth" ON student_cards FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary', 'finance'));

DROP POLICY IF EXISTS "update_student_cards_auth" ON student_cards;
CREATE POLICY "update_student_cards_auth" ON student_cards FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'academic_director', 'secretary', 'finance'));

DROP POLICY IF EXISTS "delete_student_cards_auth" ON student_cards;
CREATE POLICY "delete_student_cards_auth" ON student_cards FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- card_reprints
DROP POLICY IF EXISTS "insert_card_reprints_auth" ON card_reprints;
CREATE POLICY "insert_card_reprints_auth" ON card_reprints FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'academic_director', 'secretary', 'finance'));

-- training_booklets
DROP POLICY IF EXISTS "insert_training_booklets_auth" ON training_booklets;
CREATE POLICY "insert_training_booklets_auth" ON training_booklets FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_training_booklets_auth" ON training_booklets;
CREATE POLICY "update_training_booklets_auth" ON training_booklets FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_training_booklets_auth" ON training_booklets;
CREATE POLICY "delete_training_booklets_auth" ON training_booklets FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- booklet_packs
DROP POLICY IF EXISTS "insert_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "insert_booklet_packs_auth" ON booklet_packs FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "update_booklet_packs_auth" ON booklet_packs FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_booklet_packs_auth" ON booklet_packs;
CREATE POLICY "delete_booklet_packs_auth" ON booklet_packs FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- booklet_pack_items
DROP POLICY IF EXISTS "insert_booklet_pack_items_auth" ON booklet_pack_items;
CREATE POLICY "insert_booklet_pack_items_auth" ON booklet_pack_items FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_booklet_pack_items_auth" ON booklet_pack_items;
CREATE POLICY "delete_booklet_pack_items_auth" ON booklet_pack_items FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- booklet_orders
DROP POLICY IF EXISTS "insert_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "insert_booklet_orders_auth" ON booklet_orders FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "update_booklet_orders_auth" ON booklet_orders FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_booklet_orders_auth" ON booklet_orders;
CREATE POLICY "delete_booklet_orders_auth" ON booklet_orders FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- booklet_order_items
DROP POLICY IF EXISTS "insert_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "insert_booklet_order_items_auth" ON booklet_order_items FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "update_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "update_booklet_order_items_auth" ON booklet_order_items FOR UPDATE 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "delete_booklet_order_items_auth" ON booklet_order_items;
CREATE POLICY "delete_booklet_order_items_auth" ON booklet_order_items FOR DELETE 
  TO authenticated USING (has_any_role('super_admin'));

-- booklet_deliveries
DROP POLICY IF EXISTS "insert_booklet_deliveries_auth" ON booklet_deliveries;
CREATE POLICY "insert_booklet_deliveries_auth" ON booklet_deliveries FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

-- booklet_stock_movements
DROP POLICY IF EXISTS "insert_booklet_stock_movements_auth" ON booklet_stock_movements;
CREATE POLICY "insert_booklet_stock_movements_auth" ON booklet_stock_movements FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));

-- financial_audit_logs
DROP POLICY IF EXISTS "select_financial_audit_logs_auth" ON financial_audit_logs;
CREATE POLICY "select_financial_audit_logs_auth" ON financial_audit_logs FOR SELECT 
  TO authenticated USING (has_any_role('super_admin', 'finance'));

DROP POLICY IF EXISTS "insert_financial_audit_logs_auth" ON financial_audit_logs;
CREATE POLICY "insert_financial_audit_logs_auth" ON financial_audit_logs FOR INSERT 
  TO authenticated WITH CHECK (has_any_role('super_admin', 'finance'));
