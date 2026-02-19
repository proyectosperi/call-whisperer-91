import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obtener el total exacto de registros de llamada sin el límite de 1000 filas.
 * Usa funciones RPC de la base de datos para conteos precisos.
 */
export function useCallTotalCount(callType: 'call1' | 'call2') {
  const { user, isAdmin } = useAuth();
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        setIsLoading(true);
        const callerId = isAdmin ? null : user.id;
        const rpcName = callType === 'call1' ? 'get_call1_total_count' : 'get_call2_total_count';

        const { data, error } = await supabase.rpc(rpcName, { p_caller_id: callerId });
        if (error) throw error;

        setTotalCount(Number(data) || 0);
      } catch (err) {
        console.error(`Error fetching ${callType} total count:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
  }, [user, isAdmin, callType]);

  return { totalCount, isLoading };
}
