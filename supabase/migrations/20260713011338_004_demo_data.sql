/*
# Demo Data - IBR Gestion Académique

Seeds the database with demonstration data:
- 6 roles, 1 academic year, 1 program, 2 levels, 5 modules per level
- All subjects for Year 1 and Year 2, 8 teachers, 10 students with matricules
- 10 enrollments, sample grades, fee categories, tuition structures
- Student fee accounts with payments, training booklets with stock
- Settings (institute info, matricule config)
*/

-- ROLES
INSERT INTO roles (name, label, description, is_system) VALUES
  ('super_admin', 'Super Administrateur', 'Accès complet à toute l''application', true),
  ('academic_director', 'Direction Académique', 'Gestion académique, validation des notes et résultats', true),
  ('secretary', 'Secrétariat', 'Inscriptions, fiches étudiants, listes de classe', true),
  ('teacher', 'Enseignant', 'Saisie des notes pour ses matières', true),
  ('finance', 'Service Financier', 'Paiements, reçus, fascicules, stock', true),
  ('viewer', 'Consultation', 'Consultation uniquement', true)
ON CONFLICT (name) DO NOTHING;

-- SETTINGS
INSERT INTO settings (key, value, category, description) VALUES
  ('institute_info', '{"name":"Institut Biblique Rehoboth","short_name":"IBR","address":"Bonoua, Bénin","phone":"+229 00 00 00 00","email":"contact@ibr-benin.org","director":"Directeur Général","logo_url":""}', 'general', 'Informations générales de l''institut'),
  ('matricule_config', '{"institute_code":"IBR","separator":"/","digits":4,"start_number":1,"level_suffixes":{"B1":"B1","B2":"B2"},"conservation_rule":"permanent","allow_manual":false}', 'matricule', 'Configuration de la génération des matricules'),
  ('grading_config', '{"method":"weighted","round_decimals":2,"empty_note_ignored":true,"absence_equals_zero":false,"use_coefficients":true,"ranking_method":"standard"}', 'grading', 'Configuration du calcul des moyennes et classements'),
  ('financial_config', '{"currency":"FCFA","exam_access_threshold":75,"card_fee_required":true,"late_penalty":0}', 'financial', 'Configuration financière')
ON CONFLICT (key) DO NOTHING;

-- ACADEMIC YEAR
INSERT INTO academic_years (name, start_date, end_date, status, is_current) VALUES
  ('2025-2026', '2025-10-01', '2026-07-31', 'open', true)
ON CONFLICT (name) DO NOTHING;

-- PROGRAM
INSERT INTO programs (name, code, description) VALUES
  ('Théologie Biblique', 'THEO', 'Programme de formation théologique biblique')
ON CONFLICT (code) DO NOTHING;

-- LEVELS
INSERT INTO levels (name, code, order_index, program_id, is_active) VALUES
  ('Première année', 'B1', 1, (SELECT id FROM programs WHERE code = 'THEO'), true),
  ('Deuxième année', 'B2', 2, (SELECT id FROM programs WHERE code = 'THEO'), true)
ON CONFLICT (code) DO NOTHING;

-- MODULES
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
  mod_colors text[] := ARRAY['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed'];
  i integer;
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id, status)
    VALUES ('Module ' || i, 'M' || i || '-B1', i, mod_colors[i], b1_id, ay_id, 'actif')
    ON CONFLICT (code, level_id, academic_year_id) DO NOTHING;
    INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id, status)
    VALUES ('Module ' || i, 'M' || i || '-B2', i, mod_colors[i], b2_id, ay_id, 'actif')
    ON CONFLICT (code, level_id, academic_year_id) DO NOTHING;
  END LOOP;
END $$;

-- TEACHERS
INSERT INTO teachers (last_name, first_name, title, phone, email, specialty, status) VALUES
  ('HOUNKPE', 'Jean', 'Pasteur', '+229 97000000', 'jhounkpe@ibr-benin.org', 'Nouveau Testament', 'actif'),
  ('ADANDE', 'Pierre', 'Pasteur', '+229 97000001', 'padande@ibr-benin.org', 'Ancien Testament', 'actif'),
  ('DOSSOU', 'Marie', 'Docteur', '+229 97000002', 'mdossou@ibr-benin.org', 'Theologie Pratique', 'actif'),
  ('KOUASSI', 'David', 'Pasteur', '+229 97000003', 'dkouassi@ibr-benin.org', 'Evangelisation', 'actif'),
  ('AGBO', 'Samuel', 'Professeur', '+229 97000004', 'sagbo@ibr-benin.org', 'Histoire de l''Eglise', 'actif'),
  ('FANOU', 'Esther', 'Pasteur', '+229 97000005', 'efanou@ibr-benin.org', 'Cure d''ame', 'actif'),
  ('HOUETO', 'Benjamin', 'Pasteur', '+229 97000006', 'bhoueto@ibr-benin.org', 'Mission', 'actif'),
  ('ZINSOU', 'Grace', 'Professeur', '+229 97000007', 'gzinsou@ibr-benin.org', 'Ethique ministerielle', 'actif')
ON CONFLICT DO NOTHING;

-- SUBJECTS Year 1
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  m1 uuid := (SELECT id FROM modules WHERE code = 'M1-B1');
  m2 uuid := (SELECT id FROM modules WHERE code = 'M2-B1');
  m3 uuid := (SELECT id FROM modules WHERE code = 'M3-B1');
  m4 uuid := (SELECT id FROM modules WHERE code = 'M4-B1');
  m5 uuid := (SELECT id FROM modules WHERE code = 'M5-B1');
  t1 uuid := (SELECT id FROM teachers WHERE last_name = 'HOUNKPE');
  t2 uuid := (SELECT id FROM teachers WHERE last_name = 'ADANDE');
  t3 uuid := (SELECT id FROM teachers WHERE last_name = 'DOSSOU');
  t4 uuid := (SELECT id FROM teachers WHERE last_name = 'KOUASSI');
  t6 uuid := (SELECT id FROM teachers WHERE last_name = 'FANOU');
  t7 uuid := (SELECT id FROM teachers WHERE last_name = 'HOUETO');
BEGIN
  INSERT INTO subjects (code, name, module_id, level_id, academic_year_id, teacher_id, coefficient, order_index) VALUES
    ('B1-S01', 'Evangile de Jean', m1, b1_id, ay_id, t1, 2, 1),
    ('B1-S02', 'Obéissance', m1, b1_id, ay_id, t1, 1, 2),
    ('B1-S03', 'Retour aux fondamentaux', m1, b1_id, ay_id, t1, 1, 3),
    ('B1-S04', 'Actes des Apôtres', m2, b1_id, ay_id, t1, 2, 1),
    ('B1-S05', 'Survol du Nouveau Testament', m2, b1_id, ay_id, t1, 2, 2),
    ('B1-S06', 'Survol de l''Ancien Testament', m2, b1_id, ay_id, t2, 2, 3),
    ('B1-S07', 'Alliance de sang', m3, b1_id, ay_id, t2, 1, 1),
    ('B1-S08', 'Evangélisation des enfants', m3, b1_id, ay_id, t4, 1, 2),
    ('B1-S09', 'Evangélisation personnelle', m3, b1_id, ay_id, t4, 1, 3),
    ('B1-S10', 'Mariage et famille', m3, b1_id, ay_id, t3, 1, 4),
    ('B1-S11', 'Foi et guérison', m4, b1_id, ay_id, t6, 1, 1),
    ('B1-S12', 'Cure d''ame et délivrance', m4, b1_id, ay_id, t6, 2, 2),
    ('B1-S13', 'Christologie', m4, b1_id, ay_id, t1, 2, 3),
    ('B1-S14', 'Technologie des croisades', m5, b1_id, ay_id, t4, 1, 1),
    ('B1-S15', 'Louange et adoration', m5, b1_id, ay_id, t7, 1, 2)
  ON CONFLICT (code, level_id, academic_year_id) DO NOTHING;
END $$;

-- SUBJECTS Year 2
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
  m1 uuid := (SELECT id FROM modules WHERE code = 'M1-B2');
  m2 uuid := (SELECT id FROM modules WHERE code = 'M2-B2');
  m3 uuid := (SELECT id FROM modules WHERE code = 'M3-B2');
  m4 uuid := (SELECT id FROM modules WHERE code = 'M4-B2');
  m5 uuid := (SELECT id FROM modules WHERE code = 'M5-B2');
  t1 uuid := (SELECT id FROM teachers WHERE last_name = 'HOUNKPE');
  t2 uuid := (SELECT id FROM teachers WHERE last_name = 'ADANDE');
  t3 uuid := (SELECT id FROM teachers WHERE last_name = 'DOSSOU');
  t4 uuid := (SELECT id FROM teachers WHERE last_name = 'KOUASSI');
  t5 uuid := (SELECT id FROM teachers WHERE last_name = 'AGBO');
  t6 uuid := (SELECT id FROM teachers WHERE last_name = 'FANOU');
  t7 uuid := (SELECT id FROM teachers WHERE last_name = 'HOUETO');
  t8 uuid := (SELECT id FROM teachers WHERE last_name = 'ZINSOU');
BEGIN
  INSERT INTO subjects (code, name, module_id, level_id, academic_year_id, teacher_id, coefficient, order_index) VALUES
    ('B2-S01', 'Epître aux Hébreux', m1, b2_id, ay_id, t1, 2, 1),
    ('B2-S02', 'Ecclesiologie', m1, b2_id, ay_id, t1, 2, 2),
    ('B2-S03', 'Histoire de l''Eglise', m1, b2_id, ay_id, t5, 2, 3),
    ('B2-S04', 'Mission', m2, b2_id, ay_id, t7, 2, 1),
    ('B2-S05', 'Homilétique', m2, b2_id, ay_id, t1, 2, 2),
    ('B2-S06', 'Administration de l''Eglise', m2, b2_id, ay_id, t3, 1, 3),
    ('B2-S07', 'Communication transculturelle', m2, b2_id, ay_id, t7, 1, 4),
    ('B2-S08', 'Théologie', m3, b2_id, ay_id, t1, 2, 1),
    ('B2-S09', 'Posséder la terre', m3, b2_id, ay_id, t4, 1, 2),
    ('B2-S10', 'Thèmes majeurs des prophètes', m3, b2_id, ay_id, t2, 2, 3),
    ('B2-S11', 'Croissance de l''Eglise', m4, b2_id, ay_id, t5, 1, 1),
    ('B2-S12', 'Eschatologie', m4, b2_id, ay_id, t1, 2, 2),
    ('B2-S13', 'Anthropologie', m4, b2_id, ay_id, t3, 1, 3),
    ('B2-S14', 'Ethique ministérielle', m5, b2_id, ay_id, t8, 2, 1),
    ('B2-S15', 'Ministère pastoral', m5, b2_id, ay_id, t6, 2, 2),
    ('B2-S16', 'Epîtres de Paul', m5, b2_id, ay_id, t1, 2, 3)
  ON CONFLICT (code, level_id, academic_year_id) DO NOTHING;
END $$;

-- STUDENTS
DO $$
DECLARE
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
BEGIN
  INSERT INTO students (matricule, last_name, first_name, sex, birth_date, birth_place, nationality, phone, whatsapp_phone, email, city, country, church, denomination, pastor_name, ministry_role, emergency_contact_name, emergency_contact_phone, first_enrollment_date, current_level_id, academic_status) VALUES
    ('0127/IBR/B1', 'AKPO', 'Daniel', 'M', '1995-03-15', 'Bonoua', 'Béninoise', '+229 96111111', '+229 96111111', 'dakpo@email.com', 'Bonoua', 'Bénin', 'Eglise Evangélique Rehoboth', 'Evangélique', 'Pasteur Jean', 'Diacre', 'AKPO Marc', '+229 96000001', '2025-10-01', b1_id, 'actif'),
    ('0128/IBR/B1', 'GUEDE', 'Sarah', 'F', '1998-07-22', 'Porto-Novo', 'Béninoise', '+229 96222222', '+229 96222222', 'sguede@email.com', 'Porto-Novo', 'Bénin', 'Assemblée de Dieu', 'Pentecôtiste', 'Pasteur Pierre', 'Chef de choeur', 'GUEDE Marie', '+229 96000002', '2025-10-01', b1_id, 'actif'),
    ('0129/IBR/B1', 'KOUASSI', 'Emmanuel', 'M', '1993-11-05', 'Abomey', 'Béninoise', '+229 96333333', '+229 96333333', 'ekouassi@email.com', 'Abomey', 'Bénin', 'Eglise Baptiste', 'Baptiste', 'Pasteur Benjamin', 'Ancien', 'KOUASSI Paul', '+229 96000003', '2025-10-01', b1_id, 'actif'),
    ('0130/IBR/B1', 'FANOU', 'Ruth', 'F', '2000-01-30', 'Bonoua', 'Béninoise', '+229 96444444', '+229 96444444', 'rfanou@email.com', 'Bonoua', 'Bénin', 'Eglise de la Grâce', 'Evangélique', 'Pasteur Samuel', 'Secrétaire', 'FANOU Esther', '+229 96000004', '2025-10-01', b1_id, 'actif'),
    ('0131/IBR/B1', 'HOUETO', 'Jonathan', 'M', '1996-09-12', 'Ouidah', 'Béninoise', '+229 96555555', '+229 96555555', 'jhoueto@email.com', 'Ouidah', 'Bénin', 'Eglise du Réveil', 'Evangélique', 'Pasteur David', 'Evangéliste', 'HOUETO Grace', '+229 96000005', '2025-10-01', b1_id, 'actif'),
    ('0132/IBR/B1', 'ZINSOU', 'Deborah', 'F', '1999-05-18', 'Bonoua', 'Béninoise', '+229 96666666', '+229 96666666', 'dzinsou@email.com', 'Bonoua', 'Bénin', 'Eglise Biblique', 'Evangélique', 'Pasteur Jean', 'Monitrice', 'ZINSOU Lucie', '+229 96000006', '2025-10-01', b1_id, 'actif'),
    ('0145/IBR/B2', 'ADANDE', 'Joseph', 'M', '1994-02-10', 'Bonoua', 'Béninoise', '+229 96777777', '+229 96777777', 'jadande@email.com', 'Bonoua', 'Bénin', 'Eglise du Plein Evangile', 'Pentecôtiste', 'Pasteur Joseph', 'Pasteur stagiaire', 'ADANDE Victoire', '+229 96000007', '2024-10-01', b2_id, 'actif'),
    ('0146/IBR/B2', 'DOSSOU', 'Esther', 'F', '1997-08-25', 'Calavi', 'Béninoise', '+229 96888888', '+229 96888888', 'edossou@email.com', 'Calavi', 'Bénin', 'Eglise Vivante', 'Evangélique', 'Pasteur Marie', 'Diaconesse', 'DOSSOU Anne', '+229 96000008', '2024-10-01', b2_id, 'actif'),
    ('0147/IBR/B2', 'AGBO', 'Moïse', 'M', '1992-12-03', 'Parakou', 'Béninoise', '+229 96999999', '+229 96999999', 'magbo@email.com', 'Parakou', 'Bénin', 'Eglise Apostolique', 'Apostolique', 'Pasteur Moïse', 'Ancien', 'AGBO David', '+229 96000009', '2024-10-01', b2_id, 'actif'),
    ('0148/IBR/B2', 'HOUNKPE', 'Lydia', 'F', '1998-04-14', 'Bonoua', 'Béninoise', '+229 96000010', '+229 96000010', 'lhounkpe@email.com', 'Bonoua', 'Bénin', 'Eglise Rehoboth', 'Evangélique', 'Pasteur Jean', 'Monitrice', 'HOUNKPE Rose', '+229 96000011', '2024-10-01', b2_id, 'actif')
  ON CONFLICT (matricule) DO NOTHING;
END $$;

-- MATRICULE SEQUENCES
DO $$
DECLARE
  i integer;
  s_id uuid;
BEGIN
  FOR i IN 127..132 LOOP
    SELECT id INTO s_id FROM students WHERE matricule = '0' || lpad(i::text, 3, '0') || '/IBR/B1';
    IF s_id IS NOT NULL THEN
      INSERT INTO matricule_sequences (sequence_number, level_code, used_by_student, used_at)
      VALUES (i, 'B1', s_id, now()) ON CONFLICT DO NOTHING;
    END IF;
    s_id := NULL;
  END LOOP;
  FOR i IN 145..148 LOOP
    SELECT id INTO s_id FROM students WHERE matricule = '0' || lpad(i::text, 3, '0') || '/IBR/B2';
    IF s_id IS NOT NULL THEN
      INSERT INTO matricule_sequences (sequence_number, level_code, used_by_student, used_at)
      VALUES (i, 'B2', s_id, now()) ON CONFLICT DO NOTHING;
    END IF;
    s_id := NULL;
  END LOOP;
END $$;

-- ENROLLMENTS
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  p_id uuid := (SELECT id FROM programs WHERE code = 'THEO');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  s record;
BEGIN
  FOR s IN SELECT id, current_level_id FROM students WHERE deleted_at IS NULL LOOP
    INSERT INTO enrollments (student_id, academic_year_id, program_id, level_id, enrollment_type, status, enrollment_date, validated_at)
    VALUES (s.id, ay_id, p_id, s.current_level_id,
      CASE WHEN s.current_level_id = b1_id THEN 'inscription' ELSE 'reinscription' END,
      'validated', CURRENT_DATE, now())
    ON CONFLICT (student_id, academic_year_id) DO NOTHING;
  END LOOP;
END $$;

-- FEE CATEGORIES
INSERT INTO fee_categories (name, code, description, is_mandatory, order_index) VALUES
  ('Frais d''inscription', 'INSCRIPTION', 'Frais d''inscription annuelle', true, 1),
  ('Scolarité', 'SCOLARITE', 'Frais de scolarité annuels', true, 2),
  ('Frais de carte', 'CARTE', 'Frais de carte d''étudiant', true, 3),
  ('Frais d''examen', 'EXAMEN', 'Frais d''examen', true, 4),
  ('Fascicules', 'FASCICULES', 'Frais de fascicules de formation', false, 5),
  ('Frais de diplôme', 'DIPLOME', 'Frais de diplôme en fin de cycle', false, 6)
ON CONFLICT (code) DO NOTHING;

-- TUITION FEE STRUCTURES
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  p_id uuid := (SELECT id FROM programs WHERE code = 'THEO');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
  fc_ins uuid := (SELECT id FROM fee_categories WHERE code = 'INSCRIPTION');
  fc_sco uuid := (SELECT id FROM fee_categories WHERE code = 'SCOLARITE');
  fc_car uuid := (SELECT id FROM fee_categories WHERE code = 'CARTE');
  fc_exa uuid := (SELECT id FROM fee_categories WHERE code = 'EXAMEN');
  fc_dip uuid := (SELECT id FROM fee_categories WHERE code = 'DIPLOME');
BEGIN
  INSERT INTO tuition_fee_structures (academic_year_id, program_id, level_id, fee_category_id, amount, number_of_installments) VALUES
    (ay_id, p_id, b1_id, fc_ins, 25000, 1), (ay_id, p_id, b1_id, fc_sco, 150000, 3),
    (ay_id, p_id, b1_id, fc_car, 2000, 1), (ay_id, p_id, b1_id, fc_exa, 10000, 1),
    (ay_id, p_id, b2_id, fc_ins, 25000, 1), (ay_id, p_id, b2_id, fc_sco, 170000, 3),
    (ay_id, p_id, b2_id, fc_car, 2000, 1), (ay_id, p_id, b2_id, fc_exa, 10000, 1),
    (ay_id, p_id, b2_id, fc_dip, 30000, 1)
  ON CONFLICT DO NOTHING;
END $$;

-- STUDENT FEE ACCOUNTS + ITEMS + PAYMENTS
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  s record;
  v_total_due numeric;
  v_total_paid numeric;
  fee_row record;
  v_amount numeric;
  sfa_id uuid;
  sfi_id uuid;
  pay_id uuid;
  v_receipt text;
  v_count integer := 0;
  v_partial numeric;
BEGIN
  FOR s IN SELECT st.id, st.current_level_id, e.id as enrollment_id
    FROM students st
    JOIN enrollments e ON e.student_id = st.id AND e.academic_year_id = ay_id
    WHERE st.deleted_at IS NULL
    LIMIT 4
  LOOP
    v_total_due := 0;
    v_total_paid := 0;

    INSERT INTO student_fee_accounts (student_id, academic_year_id, enrollment_id, level_id, total_due, total_paid, total_discount, remaining, is_up_to_date)
    VALUES (s.id, ay_id, s.enrollment_id, s.current_level_id, 0, 0, 0, 0, false)
    RETURNING id INTO sfa_id;

    FOR fee_row IN
      SELECT fc.id as cat_id, fc.code as cat_code, fc.is_mandatory as cat_mandatory, tfs.amount as fee_amount
      FROM fee_categories fc
      JOIN tuition_fee_structures tfs ON tfs.fee_category_id = fc.id
      WHERE tfs.academic_year_id = ay_id AND tfs.level_id = s.current_level_id
    LOOP
      v_amount := fee_row.fee_amount;
      v_total_due := v_total_due + v_amount;

      INSERT INTO student_fee_items (student_fee_account_id, fee_category_id, original_amount, discount_amount, final_amount, amount_paid, remaining, is_mandatory)
      VALUES (sfa_id, fee_row.cat_id, v_amount, 0, v_amount, 0, v_amount, fee_row.cat_mandatory)
      RETURNING id INTO sfi_id;

      IF fee_row.cat_code = 'INSCRIPTION' AND v_count < 2 THEN
        v_count := v_count + 1;
        pay_id := gen_random_uuid();
        v_receipt := 'REC-2025-' || lpad(v_count::text, 4, '0');
        INSERT INTO payments (id, student_id, academic_year_id, enrollment_id, student_fee_account_id, amount, payment_method, payment_date, receipt_number, status)
        VALUES (pay_id, s.id, ay_id, s.enrollment_id, sfa_id, v_amount, 'especes', CURRENT_DATE, v_receipt, 'paid');
        INSERT INTO payment_allocations (payment_id, student_fee_item_id, amount) VALUES (pay_id, sfi_id, v_amount);
        INSERT INTO payment_receipts (receipt_number, payment_id, student_id, amount, payment_method) VALUES (v_receipt, pay_id, s.id, v_amount, 'especes');
        v_total_paid := v_total_paid + v_amount;
        UPDATE student_fee_items SET amount_paid = v_amount, remaining = 0 WHERE id = sfi_id;
      ELSIF fee_row.cat_code = 'SCOLARITE' AND v_count < 2 THEN
        v_count := v_count + 1;
        pay_id := gen_random_uuid();
        v_receipt := 'REC-2025-' || lpad(v_count::text, 4, '0');
        v_partial := CASE WHEN fee_row.fee_amount > 50000 THEN 50000 ELSE fee_row.fee_amount END;
        INSERT INTO payments (id, student_id, academic_year_id, enrollment_id, student_fee_account_id, amount, payment_method, payment_date, receipt_number, status)
        VALUES (pay_id, s.id, ay_id, s.enrollment_id, sfa_id, v_partial, 'mobile_money', CURRENT_DATE, v_receipt, 'paid');
        INSERT INTO payment_allocations (payment_id, student_fee_item_id, amount) VALUES (pay_id, sfi_id, v_partial);
        INSERT INTO payment_receipts (receipt_number, payment_id, student_id, amount, payment_method) VALUES (v_receipt, pay_id, s.id, v_partial, 'mobile_money');
        v_total_paid := v_total_paid + v_partial;
        UPDATE student_fee_items SET amount_paid = v_partial, remaining = fee_row.fee_amount - v_partial WHERE id = sfi_id;
      END IF;
    END LOOP;

    UPDATE student_fee_accounts
    SET total_due = v_total_due, total_paid = v_total_paid, remaining = v_total_due - v_total_paid,
        is_up_to_date = (v_total_paid >= v_total_due)
    WHERE id = sfa_id;
  END LOOP;
END $$;

-- TRAINING BOOKLETS
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
  b record;
BEGIN
  INSERT INTO training_booklets (code, title, level_id, academic_year_id, unit_price, stock_quantity, min_stock_threshold, is_mandatory, version, is_active) VALUES
    ('FASC-001', 'Fascicule Evangile de Jean', b1_id, ay_id, 1500, 50, 10, true, '1.0', true),
    ('FASC-002', 'Fascicule Actes des Apôtres', b1_id, ay_id, 1500, 40, 10, true, '1.0', true),
    ('FASC-003', 'Fascicule Survol NT', b1_id, ay_id, 2000, 30, 10, true, '1.0', true),
    ('FASC-004', 'Fascicule Cure d''ame', b1_id, ay_id, 1500, 25, 5, false, '1.0', true),
    ('FASC-005', 'Fascicule Christologie', b1_id, ay_id, 2000, 35, 10, true, '1.0', true),
    ('FASC-006', 'Fascicule Epître aux Hébreux', b2_id, ay_id, 2000, 20, 10, true, '1.0', true),
    ('FASC-007', 'Fascicule Eschatologie', b2_id, ay_id, 2500, 15, 5, true, '1.0', true),
    ('FASC-008', 'Fascicule Ministère pastoral', b2_id, ay_id, 2000, 18, 5, true, '1.0', true)
  ON CONFLICT (code) DO NOTHING;

  FOR b IN SELECT id, stock_quantity FROM training_booklets LOOP
    INSERT INTO booklet_stock_movements (booklet_id, movement_type, quantity, reference, note)
    VALUES (b.id, 'initial', b.stock_quantity, 'INIT', 'Stock initial')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- SAMPLE GRADES
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  s record;
  subj record;
  v_score numeric;
  v_counter integer := 0;
BEGIN
  FOR s IN SELECT id FROM students WHERE current_level_id = b1_id AND deleted_at IS NULL LIMIT 3 LOOP
    v_counter := v_counter + 1;
    FOR subj IN SELECT id FROM subjects WHERE level_id = b1_id AND academic_year_id = ay_id ORDER BY order_index LIMIT 5 LOOP
      v_score := 8 + (v_counter * 1.5) + (random() * 6);
      IF v_score > 20 THEN v_score := 20; END IF;
      v_score := round(v_score::numeric, 2);
      INSERT INTO grades (student_id, subject_id, academic_year_id, level_id, score, status, entered_at)
      VALUES (s.id, subj.id, ay_id, b1_id, v_score, 'validated', now())
      ON CONFLICT (student_id, subject_id, academic_year_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- TEACHER ASSIGNMENTS
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025-2026');
  subj record;
BEGIN
  FOR subj IN SELECT id, teacher_id, level_id, module_id FROM subjects WHERE academic_year_id = ay_id AND teacher_id IS NOT NULL LOOP
    INSERT INTO teacher_assignments (teacher_id, subject_id, academic_year_id, level_id, module_id)
    VALUES (subj.teacher_id, subj.id, ay_id, subj.level_id, subj.module_id)
    ON CONFLICT (teacher_id, subject_id, academic_year_id) DO NOTHING;
  END LOOP;
END $$;
