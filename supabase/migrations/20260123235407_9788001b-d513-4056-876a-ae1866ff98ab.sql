-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'caller');

-- Enum para estados de Llamada 1
CREATE TYPE public.call1_status AS ENUM ('confirmara', 'no_contesta', 'asistira', 'no_asistira', 'se_unio', 'no_se_une');

-- Enum para estados de Llamada 2
CREATE TYPE public.call2_status AS ENUM ('matriculado', 'no_matriculado', 'no_contesta', 'confirmara', 'siguiente_mes');

-- Enum para grupos
CREATE TYPE public.group_type AS ENUM ('G1', 'G2', 'G3', 'G4', 'M1');

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Tabla de cursos
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  campaign_start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de países
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone_code TEXT NOT NULL
);

-- Tabla principal de números/contactos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  full_phone TEXT GENERATED ALWAYS AS (country_code || phone_number) STORED,
  country_id UUID REFERENCES public.countries(id),
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  source_group group_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, phone_number, course_id)
);

-- Tabla de Llamada 1
CREATE TABLE public.call1_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES auth.users(id),
  status call1_status NOT NULL DEFAULT 'no_contesta',
  target_group group_type,
  observation TEXT,
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Llamada 2
CREATE TABLE public.call2_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES auth.users(id),
  status call2_status NOT NULL DEFAULT 'no_contesta',
  origin_group group_type,
  target_group group_type,
  observation TEXT,
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para historial de métricas por grupo y curso
CREATE TABLE public.group_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  group_type group_type NOT NULL,
  contact_count INTEGER NOT NULL DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, group_type, recorded_date)
);

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call1_records_updated_at BEFORE UPDATE ON public.call1_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call2_records_updated_at BEFORE UPDATE ON public.call2_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call1_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call2_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_roles (solo admins pueden gestionar)
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies para courses (todos autenticados pueden ver, solo admins modificar)
CREATE POLICY "Authenticated can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para countries (todos pueden ver)
CREATE POLICY "Authenticated can view countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para contacts
CREATE POLICY "Admins can manage contacts" ON public.contacts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Callers can view assigned contacts" ON public.contacts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.call1_records WHERE contact_id = contacts.id AND caller_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.call2_records WHERE contact_id = contacts.id AND caller_id = auth.uid()
  )
);

-- RLS Policies para call1_records
CREATE POLICY "Admins can manage call1" ON public.call1_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Callers can view own call1" ON public.call1_records FOR SELECT USING (caller_id = auth.uid());
CREATE POLICY "Callers can update own call1" ON public.call1_records FOR UPDATE USING (caller_id = auth.uid());

-- RLS Policies para call2_records
CREATE POLICY "Admins can manage call2" ON public.call2_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Callers can view own call2" ON public.call2_records FOR SELECT USING (caller_id = auth.uid());
CREATE POLICY "Callers can update own call2" ON public.call2_records FOR UPDATE USING (caller_id = auth.uid());

-- RLS Policies para group_metrics
CREATE POLICY "Authenticated can view metrics" ON public.group_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage metrics" ON public.group_metrics FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insertar países comunes de Latinoamérica
INSERT INTO public.countries (code, name, phone_code) VALUES
('PE', 'Perú', '+51'),
('MX', 'México', '+52'),
('CO', 'Colombia', '+57'),
('AR', 'Argentina', '+54'),
('CL', 'Chile', '+56'),
('EC', 'Ecuador', '+593'),
('BO', 'Bolivia', '+591'),
('VE', 'Venezuela', '+58'),
('US', 'Estados Unidos', '+1'),
('ES', 'España', '+34');