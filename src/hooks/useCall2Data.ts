import { useState, useEffect, useCallback, useRef } from 'react';
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

// Caché global para mantener datos entre navegaciones
const dataCache: {
  records: Call2WithContact[];
  lastFetch: number;
  userId: string | null;
} = {
  records: [],
  lastFetch: 0,
  userId: null,
};

// Tiempo de caché: 5 minutos
const CACHE_DURATION = 5 * 60 * 1000;

export function useCall2Data(courseId?: string) {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<Call2WithContact[]>(dataCache.records);
  const [isLoading, setIsLoading] = useState(dataCache.records.length === 0);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    // Usar caché si es válida y no se fuerza refresh
    const now = Date.now();
    const cacheValid = 
      !forceRefresh &&
      dataCache.userId === user.id &&
      dataCache.records.length > 0 &&
      (now - dataCache.lastFetch) < CACHE_DURATION;
    
    if (cacheValid) {
      let cachedRecords = dataCache.records;
      if (courseId) {
        cachedRecords = cachedRecords.filter(r => r.contact.course.id === courseId);
      }
      setRecords(cachedRecords);
      setIsLoading(false);
      return;
    }

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
      
      if (!isMounted.current) return;
      
      if (!recordsData || recordsData.length === 0) {
        dataCache.records = [];
        dataCache.lastFetch = now;
        dataCache.userId = user.id;
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

      if (!isMounted.current) return;

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

      // Ordenar por fecha de inicio del curso (más próximo primero)
      enrichedRecords.sort((a, b) => {
        const dateA = a.contact.course.campaign_start_date;
        const dateB = b.contact.course.campaign_start_date;
        
        // Los que no tienen fecha van al final
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return parseDateString(dateA).getTime() - parseDateString(dateB).getTime();
      });

      // Guardar en caché
      dataCache.records = enrichedRecords;
      dataCache.lastFetch = now;
      dataCache.userId = user.id;

      // Filtrar por curso si es necesario
      let finalRecords = enrichedRecords;
      if (courseId) {
        finalRecords = enrichedRecords.filter(r => r.contact.course.id === courseId);
      }

      setRecords(finalRecords);
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        console.error('Error in fetchData:', err);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user, isAdmin, courseId]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
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
    
    // Actualizar el registro localmente sin recargar todo
    setRecords(prev => prev.map(r => 
      r.id === recordId 
        ? { ...r, ...updates, called_at: new Date().toISOString() }
        : r
    ));
    
    // Actualizar también la caché
    dataCache.records = dataCache.records.map(r =>
      r.id === recordId
        ? { ...r, ...updates, called_at: new Date().toISOString() }
        : r
    );
  };

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { records, isLoading, error, refetch, updateRecord };
}
