import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

interface CallerWithProfile extends Profile {
  role: 'caller';
}

export function useCallers() {
  const [callers, setCallers] = useState<CallerWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCallers();
  }, []);

  const fetchCallers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all users with caller role
      const { data: callerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'caller');

      if (rolesError) throw rolesError;

      if (!callerRoles || callerRoles.length === 0) {
        setCallers([]);
        return;
      }

      const userIds = callerRoles.map((r) => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      setCallers(
        (profiles || []).map((p) => ({
          ...p,
          role: 'caller' as const,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading callers');
    } finally {
      setIsLoading(false);
    }
  };

  return { callers, isLoading, error, refetch: fetchCallers };
}
