import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseDateString } from '@/lib/dateUtils';
import type { Call2Record, Call2Status, GroupType } from '@/types/database';

interface Call2WithContact {
  id: string;
  contact_id: string;
  caller_id?: string;
  status: Call2Status;
  origin_group?: GroupType;
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
    course: { id: string; code: string; name: string; campaign_start_date?: string | null };
    country?: { id: string; name: string; code: string };
  };
  caller?: {
    full_name: string;
  };
}

export function useCall2Data(courseId?: string) {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<Call2WithContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Obtener registros con contactos, cursos y países en un solo query usando JOIN
      let query = supabase
        .from('call2_records')
        .select(`
          id,
          contact_id,
          caller_id,
          status,
          origin_group,
          target_group,
          observation,
          called_at,
          created_at,
          updated_at,
          contact:contacts(
            id,
            country_code,
            phone_number,
            full_phone,
            course_id,
            country_id,
            course:courses(id, code, name, campaign_start_date),
            country:countries(id, name, code)
          )
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('caller_id', user.id);
      }

      const { data: recordsData, error: recordsError } = await query;

      if (recordsError) throw recordsError;
      if (!recordsData || recordsData.length === 0) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      // Extraer IDs únicos de callers para obtener nombres
      const callerIds = [...new Set(recordsData.map((r: any) => r.caller_id).filter(Boolean))];

      // Obtener perfiles de callers
      const { data: callers, error: callersError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', callerIds);

      if (callersError) {
        console.error('Error fetching callers:', callersError);
      }

      // Mapear callers
      const callersMap = new Map((callers || []).map(p => [p.user_id, p]));

      // Enriquecer los registros con datos del caller
      const enrichedRecords = recordsData.map((record: any) => {
        const caller = record.caller_id ? callersMap.get(record.caller_id) : null;
        const contact = record.contact;

        if (!contact) return null;

        return {
          id: record.id,
          contact_id: record.contact_id,
          caller_id: record.caller_id,
          status: record.status,
          origin_group: record.origin_group,
          target_group: record.target_group,
          observation: record.observation,
          called_at: record.called_at,
          created_at: record.created_at,
          updated_at: record.updated_at,
          contact: {
            id: contact.id,
            country_code: contact.country_code,
            phone_number: contact.phone_number,
            full_phone: contact.full_phone,
            course: contact.course,
            country: contact.country,
          },
          caller: caller ? { full_name: caller.full_name } : undefined,
        };
      }).filter(Boolean) as Call2WithContact[];

      // Filtrar por curso si es necesario
      let finalRecords = enrichedRecords;
      if (courseId) {
        finalRecords = enrichedRecords.filter(r => r.contact.course.id === courseId);
      }

      // Ordenar por fecha de inicio del curso (más próximo primero)
      finalRecords.sort((a, b) => {
        const dateA = a.contact.course.campaign_start_date;
        const dateB = b.contact.course.campaign_start_date;
        
        // Los que no tienen fecha van al final
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return parseDateString(dateA).getTime() - parseDateString(dateB).getTime();
      });

      setRecords(finalRecords);
    } catch (err) {
      setError(err as Error);
      console.error('Error in fetchData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRecord = async (
    recordId: string,
    updates: { status?: Call2Status; target_group?: GroupType; observation?: string }
  ) => {
    const { error } = await supabase
      .from('call2_records')
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
