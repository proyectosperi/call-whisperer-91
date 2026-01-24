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

        // Total contacts
        const { count: totalContacts } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });

        // Contacts by country
        const { data: countryData } = await supabase
          .from('contacts')
          .select('country_code')
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            data?.forEach((c) => {
              counts[c.country_code] = (counts[c.country_code] || 0) + 1;
            });
            return {
              data: Object.entries(counts).map(([country, count]) => ({ country, count })),
            };
          });

        // Contacts by group
        const { data: groupData } = await supabase
          .from('contacts')
          .select('source_group')
          .then(({ data }) => {
            const counts: Record<string, number> = {};
            data?.forEach((c) => {
              if (c.source_group) {
                counts[c.source_group] = (counts[c.source_group] || 0) + 1;
              }
            });
            return {
              data: Object.entries(counts).map(([group, count]) => ({
                group: group as GroupType,
                count,
              })),
            };
          });

        // Call1 by status
        let call1Query = supabase.from('call1_records').select('status');
        if (!isAdmin) {
          call1Query = call1Query.eq('caller_id', user.id);
        }
        const { data: call1Data } = await call1Query.then(({ data }) => {
          const counts: Record<string, number> = {};
          data?.forEach((c) => {
            counts[c.status] = (counts[c.status] || 0) + 1;
          });
          return {
            data: Object.entries(counts).map(([status, count]) => ({
              status: status as Call1Status,
              count,
            })),
          };
        });

        // Call2 by status
        let call2Query = supabase.from('call2_records').select('status');
        if (!isAdmin) {
          call2Query = call2Query.eq('caller_id', user.id);
        }
        const { data: call2Data } = await call2Query.then(({ data }) => {
          const counts: Record<string, number> = {};
          data?.forEach((c) => {
            counts[c.status] = (counts[c.status] || 0) + 1;
          });
          return {
            data: Object.entries(counts).map(([status, count]) => ({
              status: status as Call2Status,
              count,
            })),
          };
        });

        // Contacts by caller (admin only)
        let callerData: { caller: string; count: number }[] = [];
        if (isAdmin) {
          const { data: call1Callers } = await supabase
            .from('call1_records')
            .select('caller_id, profiles!call1_records_caller_id_fkey(full_name)')
            .not('caller_id', 'is', null);
          
          const counts: Record<string, number> = {};
          call1Callers?.forEach((c: any) => {
            const name = c.profiles?.full_name || 'Sin asignar';
            counts[name] = (counts[name] || 0) + 1;
          });
          callerData = Object.entries(counts).map(([caller, count]) => ({ caller, count }));
        }

        setStats({
          totalContacts: totalContacts || 0,
          contactsByCountry: countryData || [],
          contactsByGroup: groupData || [],
          call1ByStatus: call1Data || [],
          call2ByStatus: call2Data || [],
          contactsByCaller: callerData,
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
