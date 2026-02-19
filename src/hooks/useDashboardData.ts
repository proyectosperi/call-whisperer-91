import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GroupType, Call1Status, Call2Status } from '@/types/database';

interface DashboardStats {
  totalContacts: number;
  contactsByCountry: { country: string; count: number }[];
  contactsByGroup: { group: GroupType; count: number }[];
  call1ByStatus: { status: Call1Status; count: number }[];
  call2ByStatus: { status: Call2Status; count: number }[];
  contactsByCaller: { caller: string; count: number }[];
  recentActivity: {
    id: string;
    type: 'call1' | 'call2';
    status: string;
    phone: string;
    caller: string;
    time: string;
  }[];
}

export function useDashboardData() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Usar RPC para obtener todos los stats en una sola llamada sin límite de 1000 filas
        const callerId = isAdmin ? null : user.id;
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_dashboard_stats', { p_caller_id: callerId });

        if (rpcError) throw rpcError;

        const data = rpcData as {
          total_contacts: number;
          call1_by_status: { status: Call1Status; count: number }[] | null;
          call2_by_status: { status: Call2Status; count: number }[] | null;
          contacts_by_country: { country: string; count: number }[] | null;
          contacts_by_group: { group: GroupType; count: number }[] | null;
          contacts_by_caller: { caller: string; count: number }[] | null;
        };

        setStats({
          totalContacts: data.total_contacts || 0,
          contactsByCountry: data.contacts_by_country || [],
          contactsByGroup: data.contacts_by_group || [],
          call1ByStatus: data.call1_by_status || [],
          call2ByStatus: data.call2_by_status || [],
          contactsByCaller: data.contacts_by_caller || [],
          recentActivity: [],
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  return { stats, isLoading, error };
}
