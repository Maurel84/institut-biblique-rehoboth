-- Add permission columns to user_profiles
ALTER TABLE IF EXISTS public.user_profiles 
ADD COLUMN IF NOT EXISTS can_manage_academic boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_grades boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_finances boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_users boolean NOT NULL DEFAULT false;

-- Initialize default permissions based on roles for existing users
UPDATE public.user_profiles up
SET 
  can_manage_academic = (r.name IN ('super_admin', 'educator')),
  can_manage_grades = (r.name IN ('super_admin', 'educator', 'teacher')),
  can_manage_finances = (r.name IN ('super_admin', 'accountant')),
  can_manage_users = (r.name = 'super_admin')
FROM public.roles r
WHERE up.role_id = r.id;

-- Trigger function to automatically set permissions based on role on insertion
CREATE OR REPLACE FUNCTION public.set_default_permissions()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name text;
BEGIN
  -- Get role name
  SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
  
  -- Set flags
  NEW.can_manage_academic := (v_role_name IN ('super_admin', 'educator'));
  NEW.can_manage_grades := (v_role_name IN ('super_admin', 'educator', 'teacher'));
  NEW.can_manage_finances := (v_role_name IN ('super_admin', 'accountant'));
  NEW.can_manage_users := (v_role_name = 'super_admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_default_permissions ON public.user_profiles;
CREATE TRIGGER trigger_set_default_permissions
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_default_permissions();

-- Update has_any_role helper function to check both direct role AND explicit permissions
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC role_names text[])
RETURNS boolean AS $$
DECLARE
  v_user_profile public.user_profiles%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM public.user_profiles WHERE user_id = auth.uid() AND is_active = true;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 1. Check if user belongs to one of the specified roles (or is super_admin which bypasses everything)
  IF EXISTS (
    SELECT 1 FROM public.roles r 
    WHERE r.id = v_user_profile.role_id 
      AND (r.name = ANY(role_names) OR r.name = 'super_admin')
  ) THEN
    RETURN true;
  END IF;

  -- 2. Check if user has explicit permission matching the requested action context
  -- If 'educator' is checked, allow if can_manage_academic is true
  IF 'educator' = ANY(role_names) AND v_user_profile.can_manage_academic = true THEN
    RETURN true;
  END IF;

  -- If 'teacher' is checked, allow if can_manage_grades is true
  IF 'teacher' = ANY(role_names) AND v_user_profile.can_manage_grades = true THEN
    RETURN true;
  END IF;

  -- If 'accountant' is checked, allow if can_manage_finances = true
  IF 'accountant' = ANY(role_names) AND v_user_profile.can_manage_finances = true THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
