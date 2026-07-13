-- ============================================================================
-- FIX: PERMETTRE AUX REQUÊTES DIRECTES (SQL EDITOR) DE MODIFIER LES RÔLES
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  -- Si auth.uid() est NULL, cela signifie que la requête est exécutée en direct
  -- par l'administrateur système via l'éditeur SQL de Supabase ou les migrations.
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role_id IN (SELECT id FROM roles WHERE name = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
