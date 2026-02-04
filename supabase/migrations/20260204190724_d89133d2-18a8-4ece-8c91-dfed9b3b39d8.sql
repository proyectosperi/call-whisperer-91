-- Drop existing restrictive policies for callers
DROP POLICY IF EXISTS "Callers can view own call1" ON public.call1_records;
DROP POLICY IF EXISTS "Callers can update own call1" ON public.call1_records;

-- Recreate as permissive policies
CREATE POLICY "Callers can view own call1" 
ON public.call1_records 
FOR SELECT 
USING (caller_id = auth.uid());

CREATE POLICY "Callers can update own call1" 
ON public.call1_records 
FOR UPDATE 
USING (caller_id = auth.uid());