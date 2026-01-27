-- Nueva migración para arreglar políticas RLS de contacts y profiles
-- Esta migración complementa la anterior 20260127160000_fix_rls_policies.sql

-- Arreglar políticas RLS para contacts
-- Eliminar políticas antiguas de contacts si existen
DROP POLICY IF EXISTS "Admins can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Callers can view assigned contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can update all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;

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

-- Arreglar políticas RLS para profiles para que admins vean todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Nueva política para que admins vean todos los perfiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
