-- Arreglar políticas RLS para call1_records y call2_records
-- El problema es que las políticas actuales no permiten ver registros sin caller_id asignado

-- Eliminar políticas antiguas de call1_records
DROP POLICY IF EXISTS "Admins can manage call1" ON public.call1_records;
DROP POLICY IF EXISTS "Callers can view own call1" ON public.call1_records;
DROP POLICY IF EXISTS "Callers can update own call1" ON public.call1_records;

-- Nuevas políticas para call1_records
-- Admins pueden ver y gestionar todos los registros
CREATE POLICY "Admins can view all call1" ON public.call1_records
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert call1" ON public.call1_records
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all call1" ON public.call1_records
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete call1" ON public.call1_records
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Callers pueden ver solo sus registros asignados
CREATE POLICY "Callers can view own call1" ON public.call1_records
  FOR SELECT
  USING (
    NOT public.has_role(auth.uid(), 'admin') 
    AND caller_id = auth.uid()
  );

-- Callers pueden actualizar solo sus registros asignados
CREATE POLICY "Callers can update own call1" ON public.call1_records
  FOR UPDATE
  USING (
    NOT public.has_role(auth.uid(), 'admin') 
    AND caller_id = auth.uid()
  );

-- Eliminar políticas antiguas de call2_records
DROP POLICY IF EXISTS "Admins can manage call2" ON public.call2_records;
DROP POLICY IF EXISTS "Callers can view own call2" ON public.call2_records;
DROP POLICY IF EXISTS "Callers can update own call2" ON public.call2_records;

-- Nuevas políticas para call2_records
-- Admins pueden ver y gestionar todos los registros
CREATE POLICY "Admins can view all call2" ON public.call2_records
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert call2" ON public.call2_records
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all call2" ON public.call2_records
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete call2" ON public.call2_records
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Callers pueden ver solo sus registros asignados
CREATE POLICY "Callers can view own call2" ON public.call2_records
  FOR SELECT
  USING (
    NOT public.has_role(auth.uid(), 'admin') 
    AND caller_id = auth.uid()
  );

-- Callers pueden actualizar solo sus registros asignados
CREATE POLICY "Callers can update own call2" ON public.call2_records
  FOR UPDATE
  USING (
    NOT public.has_role(auth.uid(), 'admin') 
    AND caller_id = auth.uid()
  );

-- Arreglar políticas RLS para contacts
-- Eliminar políticas antiguas de contacts
DROP POLICY IF EXISTS "Admins can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Callers can view assigned contacts" ON public.contacts;

-- Nuevas políticas para contacts
-- Admins pueden ver todos los contactos
CREATE POLICY "Admins can view all contacts" ON public.contacts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert contacts" ON public.contacts
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all contacts" ON public.contacts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contacts" ON public.contacts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Callers pueden ver contactos relacionados con sus llamadas
CREATE POLICY "Callers can view assigned contacts" ON public.contacts
  FOR SELECT
  USING (
    NOT public.has_role(auth.uid(), 'admin')
    AND (
      EXISTS (
        SELECT 1 FROM public.call1_records 
        WHERE contact_id = contacts.id AND caller_id = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.call2_records 
        WHERE contact_id = contacts.id AND caller_id = auth.uid()
      )
    )
  );

-- Arreglar políticas RLS para profiles
-- Eliminar política antigua
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Nueva política para que admins vean todos los perfiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
