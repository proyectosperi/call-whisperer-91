import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Call1Record, Call1Status, GroupType } from '@/types/database';

interface Call1WithContact {
  id: string;
  contact_id: string;
  caller_id?: string;
  status: Call1Status;
  target_group?: GroupType;
  observation?: string;
  called_at?: string;
  created_at: string;
  updated_at: string;
  contact: {
    id: string;
    country_code: string;
    phone_number: string;
    full_phone: string;
    source_group?: GroupType;
    course: { id: string; code: string; name: string };
  };
}

export function useCall1Data(courseId?: string) {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<Call1WithContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('call1_records')
        .select(`
          *,
          contact:contacts!call1_records_contact_id_fkey(
            id,
            country_code,
            phone_number,
            full_phone,
            source_group,
            course:courses!contacts_course_id_fkey(id, code, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('caller_id', user.id);
      }

      if (courseId) {
        query = query.eq('contact.course_id', courseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRecords((data as Call1WithContact[]) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRecord = async (
    recordId: string,
    updates: { status?: Call1Status; target_group?: GroupType; observation?: string }
  ) => {
    const { error } = await supabase
      .from('call1_records')
      .update({
        ...updates,
        called_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;
    await fetchData();
  };

  return { records, isLoading, error, refetch: fetchData, updateRecord };
}
