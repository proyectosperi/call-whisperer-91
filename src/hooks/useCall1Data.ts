import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseDateString } from '@/lib/dateUtils';
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
    course: { id: string; code: string; name: string; campaign_start_date?: string | null };
    country?: { id: string; name: string; code: string };
  };
  caller?: {
    full_name: string;
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
      
      // Primero obtener los registros de call1
      let query = supabase
        .from('call1_records')
        .select('*')
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

      // Obtener IDs únicos de contactos y callers
      const contactIds = [...new Set(recordsData.map(r => r.contact_id))];
      const callerIds = [...new Set(recordsData.map(r => r.caller_id).filter(Boolean))];

      // Obtener contactos con cursos y países
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, country_code, phone_number, full_phone, source_group, course_id, country_id, courses(id, code, name, campaign_start_date), countries(id, name, code)')
        .in('id', contactIds);

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
      }

      // Obtener perfiles de callers
      const { data: callers, error: callersError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', callerIds);

      if (callersError) {
        console.error('Error fetching callers:', callersError);
      }

      // Mapear los datos
      const contactsMap = new Map((contacts || []).map(c => [c.id, c]));
      const callersMap = new Map((callers || []).map(p => [p.user_id, p]));

      const enrichedRecords = recordsData.map(record => {
        const contact = contactsMap.get(record.contact_id);
        const caller = record.caller_id ? callersMap.get(record.caller_id) : null;

        if (!contact) return null;

        return {
          ...record,
          contact: {
            id: contact.id,
            country_code: contact.country_code,
            phone_number: contact.phone_number,
            full_phone: contact.full_phone,
            source_group: contact.source_group,
            course: Array.isArray(contact.courses) ? contact.courses[0] : contact.courses,
            country: Array.isArray(contact.countries) ? contact.countries[0] : contact.countries,
          },
          caller: caller ? { full_name: caller.full_name } : undefined,
        };
      }).filter(Boolean) as Call1WithContact[];

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
