-- ============================================================================
-- 1. ACADEMIC YEARS
-- ============================================================================
INSERT INTO academic_years (name, start_date, end_date, status, is_current) VALUES
  ('2025', '2024-10-01', '2025-07-31', 'closed', false),
  ('2026', '2025-10-01', '2026-07-31', 'open', true)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- 2. PROGRAMS & LEVELS
-- ============================================================================
INSERT INTO programs (name, code, description) VALUES
  ('Théologie Biblique', 'THEO', 'Formation théologique et pastorale biblique')
ON CONFLICT (code) DO NOTHING;

INSERT INTO levels (name, code, order_index, program_id, is_active) VALUES
  ('Première année', 'B1', 1, (SELECT id FROM programs WHERE code = 'THEO'), true),
  ('Deuxième année', 'B2', 2, (SELECT id FROM programs WHERE code = 'THEO'), true)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- 3. PROMOTIONS
-- ============================================================================
INSERT INTO promotions (name, code, academic_year_id, level_id, program_id) VALUES
  ('Promotion B1 2025', 'B1-2025', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), (SELECT id FROM programs WHERE code = 'THEO')),
  ('Promotion B2 2025', 'B2-2025', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), (SELECT id FROM programs WHERE code = 'THEO')),
  ('Promotion B1 2026', 'B1-2026', (SELECT id FROM academic_years WHERE name = '2026'), (SELECT id FROM levels WHERE code = 'B1'), (SELECT id FROM programs WHERE code = 'THEO')),
  ('Promotion B2 2026', 'B2-2026', (SELECT id FROM academic_years WHERE name = '2026'), (SELECT id FROM levels WHERE code = 'B2'), (SELECT id FROM programs WHERE code = 'THEO'))
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- 4. TEACHERS
-- ============================================================================
INSERT INTO teachers (last_name, first_name, title, phone, email, specialty, status) VALUES
  ('ASSAMOI', 'Honoré', 'Professeur', '+225 07070707', 'hassamoi@ibr-bonoua.org', 'Théologie', 'actif'),
  ('ATJ', 'Enseignant', 'Pasteur', '+225 07080808', 'atj@ibr-bonoua.org', 'Théologie Pratique', 'actif'),
  ('TOKPA', 'Joël', 'Professeur', '+225 07090909', 'jtokpa@ibr-bonoua.org', 'Ancien/Nouveau Testament', 'actif'),
  ('GOME', 'Jacques', 'Professeur', '+225 07101010', 'jgome@ibr-bonoua.org', 'Evangélisation & Cure d''âme', 'actif'),
  ('KPLI', 'Félix', 'Professeur', '+225 07111111', 'fkpli@ibr-bonoua.org', 'Louange et Adoration', 'actif'),
  ('SIBE', 'Enseignant', 'Pasteur', '+225 07121212', 'sibe@ibr-bonoua.org', 'Théologie Systématique', 'actif'),
  ('AMAPUL', 'Enseignant', 'Professeur', '+225 07131313', 'amapul@ibr-bonoua.org', 'Ministère Pastoral', 'actif');


-- ============================================================================
-- 5. MODULES & SUBJECTS (2025)
-- ============================================================================
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025');
  b1_id uuid := (SELECT id FROM levels WHERE code = 'B1');
  b2_id uuid := (SELECT id FROM levels WHERE code = 'B2');
  m1_b1 uuid;
  m2_b1 uuid;
  m3_b1 uuid;
  m4_b1 uuid;
  m5_b1 uuid;
  m1_b2 uuid;
  m2_b2 uuid;
  m3_b2 uuid;
  m4_b2 uuid;
  m5_b2 uuid;
  t_assamoi uuid := (SELECT id FROM teachers WHERE last_name = 'ASSAMOI');
  t_atj uuid := (SELECT id FROM teachers WHERE last_name = 'ATJ');
  t_tokpa uuid := (SELECT id FROM teachers WHERE last_name = 'TOKPA');
  t_gome uuid := (SELECT id FROM teachers WHERE last_name = 'GOME');
  t_kpli uuid := (SELECT id FROM teachers WHERE last_name = 'KPLI');
  t_sibe uuid := (SELECT id FROM teachers WHERE last_name = 'SIBE');
  t_amapul uuid := (SELECT id FROM teachers WHERE last_name = 'AMAPUL');
BEGIN
  -- MODULES B1
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('1er Module', 'M1-B1', 1, '#059669', b1_id, ay_id) RETURNING id INTO m1_b1;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('2ème Module', 'M2-B1', 2, '#2563eb', b1_id, ay_id) RETURNING id INTO m2_b1;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('3ème Module', 'M3-B1', 3, '#dc2626', b1_id, ay_id) RETURNING id INTO m3_b1;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('4ème Module', 'M4-B1', 4, '#d97706', b1_id, ay_id) RETURNING id INTO m4_b1;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('5ème Module', 'M5-B1', 5, '#7c3aed', b1_id, ay_id) RETURNING id INTO m5_b1;

  -- MODULES B2
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('Module 1', 'M1-B2', 1, '#059669', b2_id, ay_id) RETURNING id INTO m1_b2;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('Module 2', 'M2-B2', 2, '#2563eb', b2_id, ay_id) RETURNING id INTO m2_b2;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('Module 3', 'M3-B2', 3, '#dc2626', b2_id, ay_id) RETURNING id INTO m3_b2;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('Module 4', 'M4-B2', 4, '#d97706', b2_id, ay_id) RETURNING id INTO m4_b2;
  
  INSERT INTO modules (name, code, order_index, color, level_id, academic_year_id)
  VALUES ('Module 5', 'M5-B2', 5, '#7c3aed', b2_id, ay_id) RETURNING id INTO m5_b2;

  -- SUBJECTS B1
  INSERT INTO subjects (code, name, module_id, level_id, academic_year_id, teacher_id, coefficient, order_index) VALUES
    ('B1-S01', 'EVANGILE DE JEAN', m1_b1, b1_id, ay_id, t_assamoi, 1, 1),
    ('B1-S02', 'OBEISSANCE', m1_b1, b1_id, ay_id, t_atj, 1, 2),
    ('B1-S03', 'RETOUR AUX FONDAMENTAUX', m1_b1, b1_id, ay_id, t_atj, 1, 3),
    ('B1-S04', 'ACTES DES APOTRES', m1_b1, b1_id, ay_id, t_assamoi, 1, 4),
    ('B1-S05', 'SURVOL DU NOUVEAU TESTAMENT', m2_b1, b1_id, ay_id, t_assamoi, 1, 1),
    ('B1-S06', 'SURVOL DE L''ANCIEN TESTAMENT', m2_b1, b1_id, ay_id, t_tokpa, 1, 2),
    ('B1-S07', 'ALLIANCE DE SANG', m2_b1, b1_id, ay_id, t_gome, 1, 3),
    ('B1-S08', 'EVANGELISATION DES ENFANTS', m3_b1, b1_id, ay_id, t_gome, 1, 1),
    ('B1-S09', 'EVANGELISATION PERSONNELLE', m3_b1, b1_id, ay_id, t_tokpa, 1, 2),
    ('B1-S10', 'MARIAGE ET FAMILLE', m3_b1, b1_id, ay_id, t_gome, 1, 3),
    ('B1-S11', 'FOI ET GUERISON', m4_b1, b1_id, ay_id, t_assamoi, 1, 1),
    ('B1-S12', 'CURE D''AME ET DELIVRANCE', m4_b1, b1_id, ay_id, t_gome, 1, 2),
    ('B1-S13', 'CHRISTOLOGIE', m4_b1, b1_id, ay_id, t_tokpa, 1, 3),
    ('B1-S14', 'TECHNOLOGIE DES CROISADES', m5_b1, b1_id, ay_id, t_gome, 1, 1),
    ('B1-S15', 'LOUANGE ET ADORATION', m5_b1, b1_id, ay_id, t_kpli, 1, 2);

  -- SUBJECTS B2
  INSERT INTO subjects (code, name, module_id, level_id, academic_year_id, teacher_id, coefficient, order_index) VALUES
    ('B2-S01', 'EPITRE AUX HEBREUX', m1_b2, b2_id, ay_id, t_assamoi, 1, 1),
    ('B2-S02', 'ECCLESIOLOGIE', m1_b2, b2_id, ay_id, t_atj, 1, 2),
    ('B2-S03', 'HISTOIRE DE L''EGLISE', m1_b2, b2_id, ay_id, t_assamoi, 1, 3),
    ('B2-S04', 'MISSION', m1_b2, b2_id, ay_id, t_assamoi, 1, 4),
    ('B2-S05', 'HOMILETIQUE', m2_b2, b2_id, ay_id, t_atj, 1, 1),
    ('B2-S06', 'ADMINISTRATION DE L''EGLISE', m2_b2, b2_id, ay_id, t_assamoi, 1, 2),
    ('B2-S07', 'COMMUNICATION TRANSCULTURELLE', m2_b2, b2_id, ay_id, t_atj, 1, 3),
    ('B2-S08', 'THEOLOGIE', m3_b2, b2_id, ay_id, t_assamoi, 1, 1),
    ('B2-S09', 'POSSEDER LA TERRE', m3_b2, b2_id, ay_id, t_atj, 1, 2),
    ('B2-S10', 'THEME MAJEUR DES PROPHETES', m4_b2, b2_id, ay_id, t_sibe, 1, 1),
    ('B2-S11', 'CROISSANCE DE L''EGLISE', m4_b2, b2_id, ay_id, t_amapul, 1, 2),
    ('B2-S12', 'ESCATHOLOGIE', m4_b2, b2_id, ay_id, t_assamoi, 1, 3),
    ('B2-S13', 'ANTHROPOLOGIE', m4_b2, b2_id, ay_id, t_gome, 1, 4),
    ('B2-S14', 'ETHIQUE MINISTERIELLE', m5_b2, b2_id, ay_id, t_atj, 1, 1),
    ('B2-S15', 'MINISTERE PASTORALE', m5_b2, b2_id, ay_id, t_amapul, 1, 2),
    ('B2-S16', 'EPITRE DE PAUL', m5_b2, b2_id, ay_id, t_amapul, 1, 3);
END $$;


-- ============================================================================
-- 6. STUDENTS
-- ============================================================================
-- B1 Students
INSERT INTO students (id, matricule, last_name, first_name, sex, nationality, country, academic_status, first_enrollment_date, current_level_id)
VALUES
  ('c3100000-0001-4000-8000-000000000001', '0137/IBR/B1', 'AKOI DEDOU', 'ENERST JEAN MICHEL', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'suspendu', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0002-4000-8000-000000000002', '0138/IBR/B1', 'ASSEMIEN', 'DANIEL', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'suspendu', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0003-4000-8000-000000000003', '0139/IBR/B1', 'DIBY', 'AYANA ANGELE', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'actif', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0004-4000-8000-000000000004', '0140/IBR/B1', 'KADJO', 'AMBI PATRICIA', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'actif', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0005-4000-8000-000000000005', '0142/IBR/B1', 'M''BETTO LAURE', 'epse TOTTI', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'actif', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0006-4000-8000-000000000006', '0143/IBR/B1', 'KOUAME', 'HI PIERRE PATRICE', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'actif', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0007-4000-8000-000000000007', '0144/IBR/B1', 'SEHI', 'ULRICH', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'suspendu', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3100000-0008-4000-8000-000000000008', '0145/IBR/B1', 'TOKPA CHEBANIA', 'JEAN EMMANUEL', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'actif', '2024-10-01', (SELECT id FROM levels WHERE code = 'B1')),
  ('c3200000-0001-4000-8000-000000000001', '0127/IBR/B2', 'ABLAN', 'MARIE JOSEE', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0002-4000-8000-000000000002', '0128/IBR/B2', 'GNAZALE', 'epse AGOHI-N''GUESSAN NADEGE', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0003-4000-8000-000000000003', '0129/IBR/B2', 'EBRIN', 'JEAN HENOC', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0004-4000-8000-000000000004', '0130/IBR/B2', 'SERI OLGA EDWIGE', 'epse SERI', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0005-4000-8000-000000000005', '0131/IBR/B2', 'YAO YAH ROLANDE', 'epse DJAHI', 'F', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0006-4000-8000-000000000006', '0132/IBR/B2', 'YESSOUGNON', 'LAZARD', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'diplome', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2')),
  ('c3200000-0007-4000-8000-000000000007', '0107/IBR/B2', 'GODE DADIE', 'FIRMIN', 'M', 'Ivoirienne', 'Côte d''Ivoire', 'suspendu', '2023-10-01', (SELECT id FROM levels WHERE code = 'B2'));


-- ============================================================================
-- 7. MATRICULE SEQUENCES
-- ============================================================================
INSERT INTO matricule_sequences (sequence_number, level_code, used_by_student, used_at) VALUES
  (137, 'B1', 'c3100000-0001-4000-8000-000000000001', now()),
  (138, 'B1', 'c3100000-0002-4000-8000-000000000002', now()),
  (139, 'B1', 'c3100000-0003-4000-8000-000000000003', now()),
  (140, 'B1', 'c3100000-0004-4000-8000-000000000004', now()),
  (142, 'B1', 'c3100000-0005-4000-8000-000000000005', now()),
  (143, 'B1', 'c3100000-0006-4000-8000-000000000006', now()),
  (144, 'B1', 'c3100000-0007-4000-8000-000000000007', now()),
  (145, 'B1', 'c3100000-0008-4000-8000-000000000008', now()),
  (127, 'B2', 'c3200000-0001-4000-8000-000000000001', now()),
  (128, 'B2', 'c3200000-0002-4000-8000-000000000002', now()),
  (129, 'B2', 'c3200000-0003-4000-8000-000000000003', now()),
  (130, 'B2', 'c3200000-0004-4000-8000-000000000004', now()),
  (131, 'B2', 'c3200000-0005-4000-8000-000000000005', now()),
  (132, 'B2', 'c3200000-0006-4000-8000-000000000006', now()),
  (107, 'B2', 'c3200000-0007-4000-8000-000000000007', now());


-- ============================================================================
-- 8. ENROLLMENTS (2025)
-- ============================================================================
INSERT INTO enrollments (id, student_id, academic_year_id, program_id, level_id, enrollment_type, status, enrollment_date, validated_at)
VALUES
  -- 1ère Année B1
  ('e3100000-0001-4000-8000-000000000001', 'c3100000-0001-4000-8000-000000000001', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0002-4000-8000-000000000002', 'c3100000-0002-4000-8000-000000000002', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0003-4000-8000-000000000003', 'c3100000-0003-4000-8000-000000000003', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0004-4000-8000-000000000004', 'c3100000-0004-4000-8000-000000000004', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0005-4000-8000-000000000005', 'c3100000-0005-4000-8000-000000000005', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0006-4000-8000-000000000006', 'c3100000-0006-4000-8000-000000000006', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0007-4000-8000-000000000007', 'c3100000-0007-4000-8000-000000000007', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),
  ('e3100000-0008-4000-8000-000000000008', 'c3100000-0008-4000-8000-000000000008', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B1'), 'inscription', 'validated', '2024-10-01', now()),

  -- 2ème Année B2
  ('e3200000-0001-4000-8000-000000000001', 'c3200000-0001-4000-8000-000000000001', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0002-4000-8000-000000000002', 'c3200000-0002-4000-8000-000000000002', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0003-4000-8000-000000000003', 'c3200000-0003-4000-8000-000000000003', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0004-4000-8000-000000000004', 'c3200000-0004-4000-8000-000000000004', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0005-4000-8000-000000000005', 'c3200000-0005-4000-8000-000000000005', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0006-4000-8000-000000000006', 'c3200000-0006-4000-8000-000000000006', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now()),
  ('e3200000-0007-4000-8000-000000000007', 'c3200000-0007-4000-8000-000000000007', (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM programs WHERE code = 'THEO'), (SELECT id FROM levels WHERE code = 'B2'), 'reinscription', 'validated', '2024-10-01', now());


-- ============================================================================
-- 9. GRADES INSERTION (2025)
-- ============================================================================
-- Helper procedure to insert grade
CREATE OR REPLACE PROCEDURE public.insert_std_grade(
  p_matricule text,
  p_subject_code text,
  p_score numeric
)
AS $$
DECLARE
  v_student_id uuid;
  v_subject_id uuid;
  v_ay_id uuid;
  v_level_id uuid;
  v_enrollment_id uuid;
BEGIN
  SELECT id, current_level_id INTO v_student_id, v_level_id FROM students WHERE matricule = p_matricule;
  SELECT id, academic_year_id INTO v_subject_id, v_ay_id FROM subjects WHERE code = p_subject_code;
  SELECT id INTO v_enrollment_id FROM enrollments WHERE student_id = v_student_id AND academic_year_id = v_ay_id;
  
  IF v_student_id IS NOT NULL AND v_subject_id IS NOT NULL THEN
    INSERT INTO grades (student_id, subject_id, enrollment_id, academic_year_id, level_id, score, status, entered_at)
    VALUES (v_student_id, v_subject_id, v_enrollment_id, v_ay_id, v_level_id, p_score, 'validated', now())
    ON CONFLICT (student_id, subject_id, academic_year_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- POPULATE B1 GRADES
-- 1. AKOI DEDOU ENERST JEAN MICHEL (0137/IBR/B1)
CALL insert_std_grade('0137/IBR/B1', 'B1-S01', 33);
CALL insert_std_grade('0137/IBR/B1', 'B1-S02', 44);
CALL insert_std_grade('0137/IBR/B1', 'B1-S03', 35);
CALL insert_std_grade('0137/IBR/B1', 'B1-S04', 80);
CALL insert_std_grade('0137/IBR/B1', 'B1-S05', 52);
CALL insert_std_grade('0137/IBR/B1', 'B1-S06', 47);
CALL insert_std_grade('0137/IBR/B1', 'B1-S07', 38);
CALL insert_std_grade('0137/IBR/B1', 'B1-S08', 10);
CALL insert_std_grade('0137/IBR/B1', 'B1-S09', 16.5);
CALL insert_std_grade('0137/IBR/B1', 'B1-S10', 65);
CALL insert_std_grade('0137/IBR/B1', 'B1-S11', 45);
CALL insert_std_grade('0137/IBR/B1', 'B1-S12', 15);
CALL insert_std_grade('0137/IBR/B1', 'B1-S13', 30);
CALL insert_std_grade('0137/IBR/B1', 'B1-S14', 24.5);
CALL insert_std_grade('0137/IBR/B1', 'B1-S15', 31);

-- 2. ASSEMIEN DANIEL (0138/IBR/B1)
CALL insert_std_grade('0138/IBR/B1', 'B1-S05', 78);
CALL insert_std_grade('0138/IBR/B1', 'B1-S06', 62.5);
CALL insert_std_grade('0138/IBR/B1', 'B1-S07', 73);
CALL insert_std_grade('0138/IBR/B1', 'B1-S08', 70);
CALL insert_std_grade('0138/IBR/B1', 'B1-S09', 30);
CALL insert_std_grade('0138/IBR/B1', 'B1-S10', 60);
CALL insert_std_grade('0138/IBR/B1', 'B1-S11', 70);
CALL insert_std_grade('0138/IBR/B1', 'B1-S14', 78.5);
CALL insert_std_grade('0138/IBR/B1', 'B1-S15', 32.5);

-- 3. DIBY AYANA ANGELE (0139/IBR/B1)
CALL insert_std_grade('0139/IBR/B1', 'B1-S01', 80);
CALL insert_std_grade('0139/IBR/B1', 'B1-S02', 95);
CALL insert_std_grade('0139/IBR/B1', 'B1-S03', 73);
CALL insert_std_grade('0139/IBR/B1', 'B1-S04', 90);
CALL insert_std_grade('0139/IBR/B1', 'B1-S05', 95);
CALL insert_std_grade('0139/IBR/B1', 'B1-S06', 62.5);
CALL insert_std_grade('0139/IBR/B1', 'B1-S07', 80);
CALL insert_std_grade('0139/IBR/B1', 'B1-S08', 100);
CALL insert_std_grade('0139/IBR/B1', 'B1-S09', 81.5);
CALL insert_std_grade('0139/IBR/B1', 'B1-S10', 100);
CALL insert_std_grade('0139/IBR/B1', 'B1-S11', 59);
CALL insert_std_grade('0139/IBR/B1', 'B1-S12', 86);
CALL insert_std_grade('0139/IBR/B1', 'B1-S13', 80);
CALL insert_std_grade('0139/IBR/B1', 'B1-S14', 76);
CALL insert_std_grade('0139/IBR/B1', 'B1-S15', 80);

-- 4. KADJO AMBI PATRICIA (0140/IBR/B1)
CALL insert_std_grade('0140/IBR/B1', 'B1-S01', 80);
CALL insert_std_grade('0140/IBR/B1', 'B1-S02', 78);
CALL insert_std_grade('0140/IBR/B1', 'B1-S03', 71);
CALL insert_std_grade('0140/IBR/B1', 'B1-S04', 86);
CALL insert_std_grade('0140/IBR/B1', 'B1-S05', 93);
CALL insert_std_grade('0140/IBR/B1', 'B1-S06', 64);
CALL insert_std_grade('0140/IBR/B1', 'B1-S07', 79);
CALL insert_std_grade('0140/IBR/B1', 'B1-S08', 65);
CALL insert_std_grade('0140/IBR/B1', 'B1-S09', 48.5);
CALL insert_std_grade('0140/IBR/B1', 'B1-S10', 60);
CALL insert_std_grade('0140/IBR/B1', 'B1-S11', 74.5);
CALL insert_std_grade('0140/IBR/B1', 'B1-S12', 90);
CALL insert_std_grade('0140/IBR/B1', 'B1-S13', 30);
CALL insert_std_grade('0140/IBR/B1', 'B1-S14', 75);
CALL insert_std_grade('0140/IBR/B1', 'B1-S15', 59);

-- 5. M'BETTO LAURE epse TOTTI (0142/IBR/B1)
CALL insert_std_grade('0142/IBR/B1', 'B1-S01', 60);
CALL insert_std_grade('0142/IBR/B1', 'B1-S02', 72);
CALL insert_std_grade('0142/IBR/B1', 'B1-S03', 80);
CALL insert_std_grade('0142/IBR/B1', 'B1-S04', 77);
CALL insert_std_grade('0142/IBR/B1', 'B1-S05', 92);
CALL insert_std_grade('0142/IBR/B1', 'B1-S06', 58);
CALL insert_std_grade('0142/IBR/B1', 'B1-S07', 55);
CALL insert_std_grade('0142/IBR/B1', 'B1-S08', 60);
CALL insert_std_grade('0142/IBR/B1', 'B1-S09', 55.25);
CALL insert_std_grade('0142/IBR/B1', 'B1-S10', 100);
CALL insert_std_grade('0142/IBR/B1', 'B1-S11', 51.5);
CALL insert_std_grade('0142/IBR/B1', 'B1-S12', 80);
CALL insert_std_grade('0142/IBR/B1', 'B1-S13', 70);
CALL insert_std_grade('0142/IBR/B1', 'B1-S14', 74.25);
CALL insert_std_grade('0142/IBR/B1', 'B1-S15', 54.5);

-- 6. KOUAME HI PIERRE PATRICE (0143/IBR/B1)
CALL insert_std_grade('0143/IBR/B1', 'B1-S01', 67);
CALL insert_std_grade('0143/IBR/B1', 'B1-S02', 57);
CALL insert_std_grade('0143/IBR/B1', 'B1-S03', 43);
CALL insert_std_grade('0143/IBR/B1', 'B1-S04', 65);
CALL insert_std_grade('0143/IBR/B1', 'B1-S06', 62.5);
CALL insert_std_grade('0143/IBR/B1', 'B1-S07', 43);
CALL insert_std_grade('0143/IBR/B1', 'B1-S08', 67);
CALL insert_std_grade('0143/IBR/B1', 'B1-S09', 34.5);
CALL insert_std_grade('0143/IBR/B1', 'B1-S10', 75);
CALL insert_std_grade('0143/IBR/B1', 'B1-S11', 47);
CALL insert_std_grade('0143/IBR/B1', 'B1-S12', 96);
CALL insert_std_grade('0143/IBR/B1', 'B1-S13', 65);
CALL insert_std_grade('0143/IBR/B1', 'B1-S14', 50);
CALL insert_std_grade('0143/IBR/B1', 'B1-S15', 6);

-- 7. SEHI ULRICH (0144/IBR/B1)
CALL insert_std_grade('0144/IBR/B1', 'B1-S05', 95);
CALL insert_std_grade('0144/IBR/B1', 'B1-S13', 25);

-- 8. TOKPA CHEBANIA JEAN EMMANUEL (0145/IBR/B1)
CALL insert_std_grade('0145/IBR/B1', 'B1-S01', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S02', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S03', 88);
CALL insert_std_grade('0145/IBR/B1', 'B1-S04', 90);
CALL insert_std_grade('0145/IBR/B1', 'B1-S05', 97);
CALL insert_std_grade('0145/IBR/B1', 'B1-S06', 87.5);
CALL insert_std_grade('0145/IBR/B1', 'B1-S07', 95);
CALL insert_std_grade('0145/IBR/B1', 'B1-S08', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S09', 87.5);
CALL insert_std_grade('0145/IBR/B1', 'B1-S10', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S11', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S12', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S13', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S14', 100);
CALL insert_std_grade('0145/IBR/B1', 'B1-S15', 91.5);


-- POPULATE B2 GRADES
-- 1. ABLAN MARIE JOSEE (0127/IBR/B2)
CALL insert_std_grade('0127/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S02', 85);
CALL insert_std_grade('0127/IBR/B2', 'B2-S03', 90);
CALL insert_std_grade('0127/IBR/B2', 'B2-S04', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S05', 87.5);
CALL insert_std_grade('0127/IBR/B2', 'B2-S06', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S07', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S08', 90);
CALL insert_std_grade('0127/IBR/B2', 'B2-S09', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S10', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S11', 95);
CALL insert_std_grade('0127/IBR/B2', 'B2-S12', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S13', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S14', 100);
CALL insert_std_grade('0127/IBR/B2', 'B2-S15', 70);
CALL insert_std_grade('0127/IBR/B2', 'B2-S16', 100);

-- 2. GNAZALE epse AGOHI-N'GUESSAN NADEGE (0128/IBR/B2)
CALL insert_std_grade('0128/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0128/IBR/B2', 'B2-S02', 90);
CALL insert_std_grade('0128/IBR/B2', 'B2-S03', 85);
CALL insert_std_grade('0128/IBR/B2', 'B2-S04', 95);
CALL insert_std_grade('0128/IBR/B2', 'B2-S05', 85);
CALL insert_std_grade('0128/IBR/B2', 'B2-S06', 95);
CALL insert_std_grade('0128/IBR/B2', 'B2-S07', 93);
CALL insert_std_grade('0128/IBR/B2', 'B2-S08', 85);
CALL insert_std_grade('0128/IBR/B2', 'B2-S09', 98);
CALL insert_std_grade('0128/IBR/B2', 'B2-S10', 100);
CALL insert_std_grade('0128/IBR/B2', 'B2-S11', 86);
CALL insert_std_grade('0128/IBR/B2', 'B2-S12', 100);
CALL insert_std_grade('0128/IBR/B2', 'B2-S13', 95);
CALL insert_std_grade('0128/IBR/B2', 'B2-S14', 100);
CALL insert_std_grade('0128/IBR/B2', 'B2-S15', 95);
CALL insert_std_grade('0128/IBR/B2', 'B2-S16', 100);

-- 3. GODE DADIE FIRMIN (0107/IBR/B2)
CALL insert_std_grade('0107/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0107/IBR/B2', 'B2-S02', 75);
CALL insert_std_grade('0107/IBR/B2', 'B2-S03', 90);
CALL insert_std_grade('0107/IBR/B2', 'B2-S04', 100);
CALL insert_std_grade('0107/IBR/B2', 'B2-S05', 59);
CALL insert_std_grade('0107/IBR/B2', 'B2-S07', 80);
CALL insert_std_grade('0107/IBR/B2', 'B2-S08', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S09', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S10', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S11', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S12', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S13', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S14', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S15', 0);
CALL insert_std_grade('0107/IBR/B2', 'B2-S16', 0);

-- 4. EBRIN JEAN HENOC (0129/IBR/B2)
CALL insert_std_grade('0129/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0129/IBR/B2', 'B2-S02', 60);
CALL insert_std_grade('0129/IBR/B2', 'B2-S03', 90);
CALL insert_std_grade('0129/IBR/B2', 'B2-S04', 70);
CALL insert_std_grade('0129/IBR/B2', 'B2-S05', 19.5);
CALL insert_std_grade('0129/IBR/B2', 'B2-S06', 88);
CALL insert_std_grade('0129/IBR/B2', 'B2-S07', 30);
CALL insert_std_grade('0129/IBR/B2', 'B2-S08', 30);
CALL insert_std_grade('0129/IBR/B2', 'B2-S10', 30);
CALL insert_std_grade('0129/IBR/B2', 'B2-S11', 37);
CALL insert_std_grade('0129/IBR/B2', 'B2-S12', 80);
CALL insert_std_grade('0129/IBR/B2', 'B2-S13', 49);
CALL insert_std_grade('0129/IBR/B2', 'B2-S14', 80);
CALL insert_std_grade('0129/IBR/B2', 'B2-S15', 50);
CALL insert_std_grade('0129/IBR/B2', 'B2-S16', 100);

-- 5. YESSOUGNON LAZARD (0132/IBR/B2)
CALL insert_std_grade('0132/IBR/B2', 'B2-S01', 50);
CALL insert_std_grade('0132/IBR/B2', 'B2-S02', 50);
CALL insert_std_grade('0132/IBR/B2', 'B2-S03', 85);
CALL insert_std_grade('0132/IBR/B2', 'B2-S04', 70);
CALL insert_std_grade('0132/IBR/B2', 'B2-S05', 60.5);
CALL insert_std_grade('0132/IBR/B2', 'B2-S06', 94);
CALL insert_std_grade('0132/IBR/B2', 'B2-S07', 78);
CALL insert_std_grade('0132/IBR/B2', 'B2-S08', 75);
CALL insert_std_grade('0132/IBR/B2', 'B2-S09', 80);
CALL insert_std_grade('0132/IBR/B2', 'B2-S10', 95);
CALL insert_std_grade('0132/IBR/B2', 'B2-S11', 35);
CALL insert_std_grade('0132/IBR/B2', 'B2-S12', 80);
CALL insert_std_grade('0132/IBR/B2', 'B2-S13', 80);
CALL insert_std_grade('0132/IBR/B2', 'B2-S14', 100);
CALL insert_std_grade('0132/IBR/B2', 'B2-S15', 85);
CALL insert_std_grade('0132/IBR/B2', 'B2-S16', 100);

-- 6. SERI OLGA EDWIGE epse SERI (0130/IBR/B2)
CALL insert_std_grade('0130/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0130/IBR/B2', 'B2-S02', 85);
CALL insert_std_grade('0130/IBR/B2', 'B2-S03', 90);
CALL insert_std_grade('0130/IBR/B2', 'B2-S04', 100);
CALL insert_std_grade('0130/IBR/B2', 'B2-S05', 88);
CALL insert_std_grade('0130/IBR/B2', 'B2-S06', 90);
CALL insert_std_grade('0130/IBR/B2', 'B2-S07', 93);
CALL insert_std_grade('0130/IBR/B2', 'B2-S08', 85);
CALL insert_std_grade('0130/IBR/B2', 'B2-S09', 100);
CALL insert_std_grade('0130/IBR/B2', 'B2-S10', 100);
CALL insert_std_grade('0130/IBR/B2', 'B2-S11', 100);
CALL insert_std_grade('0130/IBR/B2', 'B2-S12', 85);
CALL insert_std_grade('0130/IBR/B2', 'B2-S13', 95);

-- 7. YAO YAH ROLANDE epse DJAHI (0131/IBR/B2)
CALL insert_std_grade('0131/IBR/B2', 'B2-S01', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S02', 90);
CALL insert_std_grade('0131/IBR/B2', 'B2-S03', 90);
CALL insert_std_grade('0131/IBR/B2', 'B2-S04', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S05', 82.5);
CALL insert_std_grade('0131/IBR/B2', 'B2-S06', 98);
CALL insert_std_grade('0131/IBR/B2', 'B2-S07', 80);
CALL insert_std_grade('0131/IBR/B2', 'B2-S08', 55);
CALL insert_std_grade('0131/IBR/B2', 'B2-S09', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S10', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S11', 96);
CALL insert_std_grade('0131/IBR/B2', 'B2-S12', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S13', 80);
CALL insert_std_grade('0131/IBR/B2', 'B2-S14', 90);
CALL insert_std_grade('0131/IBR/B2', 'B2-S15', 100);
CALL insert_std_grade('0131/IBR/B2', 'B2-S16', 100);

-- Supprimer la procédure helper
DROP PROCEDURE public.insert_std_grade(text, text, numeric);


-- ============================================================================
-- 10. ANNUAL RESULTS & RANKINGS (2025)
-- ============================================================================
-- B1 Results & Rankings
INSERT INTO annual_results (student_id, academic_year_id, level_id, average, weighted_average, rank, decision)
VALUES
  ((SELECT id FROM students WHERE matricule = '0145/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 95.77, 95.77, 1, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0139/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 82.53, 82.53, 2, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0140/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 71.87, 71.87, 3, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0142/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 66.63, 66.63, 4, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0143/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 56.40, 56.40, 5, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0138/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 39.77, 39.77, 6, 'ajourne'),
  ((SELECT id FROM students WHERE matricule = '0137/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 37.73, 37.73, 7, 'ajourne'),
  ((SELECT id FROM students WHERE matricule = '0144/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 8.00, 8.00, 8, 'ajourne');

INSERT INTO rankings (student_id, academic_year_id, level_id, rank, average, decision)
VALUES
  ((SELECT id FROM students WHERE matricule = '0145/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 1, 95.77, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0139/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 2, 82.53, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0140/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 3, 71.87, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0142/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 4, 66.63, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0143/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 5, 56.40, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0138/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 6, 39.77, 'Ajourné'),
  ((SELECT id FROM students WHERE matricule = '0137/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 7, 37.73, 'Ajourné'),
  ((SELECT id FROM students WHERE matricule = '0144/IBR/B1'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B1'), 8, 8.00, 'Ajourné');

-- B2 Results & Rankings
INSERT INTO annual_results (student_id, academic_year_id, level_id, average, weighted_average, rank, decision)
VALUES
  ((SELECT id FROM students WHERE matricule = '0127/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 94.84, 94.84, 1, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0128/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 94.19, 94.19, 2, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0130/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 93.15, 93.15, 3, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0131/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 91.34, 91.34, 4, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0132/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 76.09, 76.09, 5, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0129/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 57.09, 57.09, 6, 'admis'),
  ((SELECT id FROM students WHERE matricule = '0107/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 31.50, 31.50, 7, 'ajourne');

INSERT INTO rankings (student_id, academic_year_id, level_id, rank, average, decision)
VALUES
  ((SELECT id FROM students WHERE matricule = '0127/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 1, 94.84, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0128/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 2, 94.19, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0130/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 3, 93.15, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0131/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 4, 91.34, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0132/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 5, 76.09, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0129/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 6, 57.09, 'Admis'),
  ((SELECT id FROM students WHERE matricule = '0107/IBR/B2'), (SELECT id FROM academic_years WHERE name = '2025'), (SELECT id FROM levels WHERE code = 'B2'), 7, 31.50, 'Ajourné');


-- ============================================================================
-- 11. FEE STRUCTURES & FINANCIAL ACCOUNTS (2025)
-- ============================================================================
-- Fee categories
INSERT INTO fee_categories (name, code, description, is_mandatory, order_index) VALUES
  ('Frais d''inscription', 'INSCRIPTION', 'Frais d''inscription annuelle', true, 1),
  ('Scolarité', 'SCOLARITE', 'Frais de scolarité annuels', true, 2),
  ('Frais de carte', 'CARTE', 'Frais de carte d''étudiant', true, 3),
  ('Frais d''examen', 'EXAMEN', 'Frais d''examen', true, 4),
  ('Fascicules', 'FASCICULES', 'Frais de fascicules de formation', false, 5),
  ('Frais de diplôme', 'DIPLOME', 'Frais de diplôme en fin de cycle', false, 6)
ON CONFLICT (code) DO NOTHING;

-- Tuition fee structures for 2025
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025');
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
    (ay_id, p_id, b1_id, fc_ins, 25000, 1),
    (ay_id, p_id, b1_id, fc_sco, 150000, 3),
    (ay_id, p_id, b1_id, fc_car, 2000, 1),
    (ay_id, p_id, b1_id, fc_exa, 10000, 1),
    (ay_id, p_id, b2_id, fc_ins, 25000, 1),
    (ay_id, p_id, b2_id, fc_sco, 170000, 3),
    (ay_id, p_id, b2_id, fc_car, 2000, 1),
    (ay_id, p_id, b2_id, fc_exa, 10000, 1),
    (ay_id, p_id, b2_id, fc_dip, 30000, 1)
  ON CONFLICT DO NOTHING;
END $$;

-- Initialize Accounts
DO $$
DECLARE
  ay_id uuid := (SELECT id FROM academic_years WHERE name = '2025');
  s record;
  sfa_id uuid;
  fee_row record;
  v_total_due numeric;
BEGIN
  FOR s IN SELECT id, current_level_id, (SELECT id FROM enrollments WHERE student_id = students.id AND academic_year_id = ay_id) as enrollment_id FROM students LOOP
    v_total_due := 0;
    
    INSERT INTO student_fee_accounts (student_id, academic_year_id, enrollment_id, level_id, total_due, total_paid, total_discount, remaining, is_up_to_date)
    VALUES (s.id, ay_id, s.enrollment_id, s.current_level_id, 0, 0, 0, 0, false)
    RETURNING id INTO sfa_id;

    FOR fee_row IN
      SELECT fc.id as cat_id, tfs.amount as fee_amount, fc.is_mandatory
      FROM fee_categories fc
      JOIN tuition_fee_structures tfs ON tfs.fee_category_id = fc.id
      WHERE tfs.academic_year_id = ay_id AND tfs.level_id = s.current_level_id
    LOOP
      v_total_due := v_total_due + fee_row.fee_amount;
      
      INSERT INTO student_fee_items (student_fee_account_id, fee_category_id, original_amount, discount_amount, final_amount, amount_paid, remaining, is_mandatory)
      VALUES (sfa_id, fee_row.cat_id, fee_row.fee_amount, 0, fee_row.fee_amount, 0, fee_row.fee_amount, fee_row.is_mandatory);
    END LOOP;
    
    UPDATE student_fee_accounts SET total_due = v_total_due, remaining = v_total_due WHERE id = sfa_id;
  END LOOP;
END $$;


-- ============================================================================
-- 12. SETTINGS INITIALIZATION
-- ============================================================================
INSERT INTO settings (key, value, category, description) VALUES
  ('institute_info', '{"name":"Institut Biblique Rehoboth","short_name":"IBR","address":"Bonoua, Côte d''Ivoire","phone":"+225 07070707","email":"contact@ibr-bonoua.org","director":"Directeur Général","logo_url":""}', 'general', 'Informations générales de l''institut'),
  ('matricule_config', '{"institute_code":"IBR","separator":"/","digits":4,"start_number":1,"level_suffixes":{"B1":"B1","B2":"B2"},"conservation_rule":"permanent","allow_manual":true}', 'matricule', 'Configuration de la génération des matricules'),
  ('grading_config', '{"method":"weighted","round_decimals":2,"empty_note_ignored":true,"absence_equals_zero":false,"use_coefficients":true,"ranking_method":"standard"}', 'grading', 'Configuration du calcul des moyennes et classements'),
  ('financial_config', '{"currency":"FCFA","exam_access_threshold":75,"card_fee_required":true,"late_penalty":0}', 'financial', 'Configuration financière')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
