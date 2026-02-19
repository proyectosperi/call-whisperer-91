-- Función RPC para obtener el total exacto de call1_records (sin límite 1000)
CREATE OR REPLACE FUNCTION get_call1_total_count(p_caller_id uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)
  FROM public.call1_records
  WHERE (p_caller_id IS NULL OR caller_id = p_caller_id);
$$;

-- Función RPC para obtener el total exacto de call2_records (sin límite 1000)
CREATE OR REPLACE FUNCTION get_call2_total_count(p_caller_id uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)
  FROM public.call2_records
  WHERE (p_caller_id IS NULL OR caller_id = p_caller_id);
$$;

-- Función RPC para obtener conteos del dashboard (totales de contactos, call1 y call2 por status)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_caller_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'total_contacts', (SELECT COUNT(*) FROM public.contacts),
    'call1_by_status', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT status, COUNT(*) as count
        FROM public.call1_records
        WHERE (p_caller_id IS NULL OR caller_id = p_caller_id)
        GROUP BY status
      ) t
    ),
    'call2_by_status', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT status, COUNT(*) as count
        FROM public.call2_records
        WHERE (p_caller_id IS NULL OR caller_id = p_caller_id)
        GROUP BY status
      ) t
    ),
    'contacts_by_country', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT country_code as country, COUNT(*) as count
        FROM public.contacts
        GROUP BY country_code
      ) t
    ),
    'contacts_by_group', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT source_group as group, COUNT(*) as count
        FROM public.contacts
        WHERE source_group IS NOT NULL
        GROUP BY source_group
      ) t
    ),
    'contacts_by_caller', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT p.full_name as caller, COUNT(*) as count
        FROM public.call1_records cr
        LEFT JOIN public.profiles p ON p.user_id = cr.caller_id
        WHERE cr.caller_id IS NOT NULL
        GROUP BY p.full_name
      ) t
    )
  );
$$;