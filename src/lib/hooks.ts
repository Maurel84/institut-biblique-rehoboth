import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type {
  AcademicYear, Program, Level, Role, Setting
} from '../types';

export function useCurrentAcademicYear() {
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('academic_years')
      .select('*')
      .eq('is_current', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setYear(data as AcademicYear);
        setLoading(false);
      });
  }, []);

  return { year, loading };
}

export function useAcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('academic_years')
      .select('*')
      .order('name', { ascending: false });
    setYears((data as AcademicYear[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { years, loading, refresh };
}

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setPrograms((data as Program[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { programs, loading, refresh };
}

export function useLevels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('levels')
      .select('*')
      .order('order_index');
    setLevels((data as Level[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { levels, loading, refresh };
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('roles')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setRoles((data as Role[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { roles, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*');
    const map: Record<string, Setting> = {};
    (data as Setting[])?.forEach((s) => { map[s.key] = s; });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { settings, loading, refresh };
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const show = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return { toast, show };
}
